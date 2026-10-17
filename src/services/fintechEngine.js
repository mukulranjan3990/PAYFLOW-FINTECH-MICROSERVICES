/**
 * @fileoverview FinTech Business Logic & Concurrency Engine for PayFlow platform.
 * Enforces JPA-style optimistic locking (@Version), Idempotency-Key deduplication,
 * and publishes events to the Kafka bus.
 * Fully typed with JSDoc annotations.
 */

import { kafkaBus } from './kafkaEventBus.js';

/**
 * @typedef {import('../api/walletApi.js').Wallet} Wallet
 * @typedef {import('../api/paymentApi.js').LedgerTransaction} LedgerTransaction
 * @typedef {import('../api/authApi.js').Customer} Customer
 */

class FintechEngine {
  constructor() {
    /** @type {Map<string, Customer>} */
    this.customers = new Map();

    /** @type {Map<string, Wallet>} Key: `${username}:${currency}` */
    this.wallets = new Map();

    /** @type {LedgerTransaction[]} */
    this.transactions = [];

    /** @type {Map<string, LedgerTransaction>} Idempotency key lookup */
    this.idempotencyStore = new Map();

    this.initDefaultData();
  }

  /**
   * Seeds the default verified FinTech accounts as defined in the master blueprint.
   */
  initDefaultData() {
    this.customers.set('alice', {
      id: 1001,
      username: 'alice',
      email: 'alice@payflow.bank',
      kycStatus: 'VERIFIED',
      createdAt: '2026-10-15T08:00:00Z',
    });

    this.customers.set('bob', {
      id: 1002,
      username: 'bob',
      email: 'bob@payflow.bank',
      kycStatus: 'VERIFIED',
      createdAt: '2026-10-15T08:30:00Z',
    });

    // Seed Alice Wallets
    this.wallets.set('alice:INR', {
      id: 1,
      username: 'alice',
      accountNumber: 'PF-INR-1001',
      currency: 'INR',
      balance: 50000.0,
      version: 0,
      updatedAt: new Date().toISOString(),
    });

    this.wallets.set('alice:USD', {
      id: 2,
      username: 'alice',
      accountNumber: 'PF-USD-1001',
      currency: 'USD',
      balance: 600.0,
      version: 0,
      updatedAt: new Date().toISOString(),
    });

    // Seed Bob Wallets
    this.wallets.set('bob:INR', {
      id: 3,
      username: 'bob',
      accountNumber: 'PF-INR-1002',
      currency: 'INR',
      balance: 25000.0,
      version: 0,
      updatedAt: new Date().toISOString(),
    });

    this.wallets.set('bob:USD', {
      id: 4,
      username: 'bob',
      accountNumber: 'PF-USD-1002',
      currency: 'USD',
      balance: 300.0,
      version: 0,
      updatedAt: new Date().toISOString(),
    });

    // Initial historical seed transaction
    const initialTx = {
      id: 1,
      transactionRef: 'PF-TXN-INIT-001',
      idempotencyKey: 'idem-seed-genesis-001',
      senderUsername: 'alice',
      receiverUsername: 'bob',
      amount: 1500.0,
      currency: 'INR',
      status: 'COMPLETED',
      processedByHost: 'payment-ledger-pod-01',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    };
    this.transactions.push(initialTx);
    this.idempotencyStore.set(initialTx.idempotencyKey, initialTx);

    // Initial Kafka event
    kafkaBus.publish(
      'ledger-events',
      initialTx.transactionRef,
      {
        event: 'LEDGER_GENESIS_INITIALIZED',
        transactionRef: initialTx.transactionRef,
        amount: initialTx.amount,
        currency: initialTx.currency,
        status: initialTx.status,
      },
      'payment-ledger-service'
    );
  }

  /**
   * Retrieves wallets for a given username.
   *
   * @param {string} username - Account username.
   * @returns {Wallet[]} List of multi-currency wallets.
   */
  getWallets(username) {
    const list = [];
    for (const [key, wallet] of this.wallets.entries()) {
      if (key.startsWith(`${username}:`)) {
        list.push({ ...wallet });
      }
    }
    return list;
  }

  /**
   * Retrieves single wallet by username and currency.
   *
   * @param {string} username - Account holder.
   * @param {string} currency - Currency code.
   * @returns {Wallet|null} Cloned wallet object or null.
   */
  getWallet(username, currency) {
    const key = `${username}:${currency}`;
    const w = this.wallets.get(key);
    return w ? { ...w } : null;
  }

  /**
   * Executes a peer-to-peer money transfer with:
   * 1. Idempotency Key deduplication
   * 2. Optimistic locking (@Version validation)
   * 3. Kafka event propagation
   *
   * @param {Object} params - Transfer parameters.
   * @param {string} params.senderUsername - Debited user.
   * @param {string} params.receiverUsername - Credited user.
   * @param {number} params.amount - Value to transfer.
   * @param {'INR' | 'USD'} params.currency - Transfer currency.
   * @param {string} params.idempotencyKey - UUID idempotency token.
   * @param {number} [params.expectedVersion] - Client expected version for optimistic lock testing.
   * @returns {Promise<{ transaction: LedgerTransaction, isIdempotentReplay: boolean }>}
   */
  async executeTransfer({
    senderUsername,
    receiverUsername,
    amount,
    currency,
    idempotencyKey,
    expectedVersion,
  }) {
    // 1. Idempotency Key check
    if (this.idempotencyStore.has(idempotencyKey)) {
      const existing = this.idempotencyStore.get(idempotencyKey);
      // Publish telemetry notification
      kafkaBus.publish(
        'payment-events',
        idempotencyKey,
        {
          event: 'IDEMPOTENT_RETRY_INTERCEPTED',
          idempotencyKey,
          message: 'Duplicate request intercepted by payment-ledger-service. Zero balance alteration.',
          originalRef: existing.transactionRef,
        },
        'payment-ledger-service'
      );
      return { transaction: { ...existing }, isIdempotentReplay: true };
    }

    // Basic Validations
    if (!senderUsername || !receiverUsername) {
      throw new Error('Sender and receiver must both be specified');
    }
    if (senderUsername.toLowerCase() === receiverUsername.toLowerCase()) {
      throw new Error('Self-transfer is not permitted: Sender and receiver must differ');
    }
    if (!amount || amount <= 0) {
      throw new Error('Transfer amount must be strictly greater than 0');
    }

    const senderKey = `${senderUsername}:${currency}`;
    const receiverKey = `${receiverUsername}:${currency}`;

    const senderWallet = this.wallets.get(senderKey);
    const receiverWallet = this.wallets.get(receiverKey);

    if (!senderWallet) {
      throw new Error(`Sender wallet for ${currency} does not exist`);
    }
    if (!receiverWallet) {
      throw new Error(`Receiver ${receiverUsername} does not have an active ${currency} wallet`);
    }

    // 2. Optimistic Locking (@Version) Verification
    if (expectedVersion !== undefined && senderWallet.version !== expectedVersion) {
      // Simulate optimistic locking collision
      const error = new Error(
        `OptimisticLockingFailureException: Row was updated or deleted by another transaction (Current version is ${senderWallet.version}, expected ${expectedVersion})`
      );
      error.code = 'OPTIMISTIC_LOCK_COLLISION';
      throw error;
    }

    if (senderWallet.balance < amount) {
      throw new Error(
        `Insufficient funds: Available balance is ${currency} ${senderWallet.balance.toLocaleString()}, requested ${currency} ${amount.toLocaleString()}`
      );
    }

    const transactionRef = `PF-TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const host = 'payment-ledger-pod-01';

    // 3. Emit Kafka PAYMENT_INITIATED event
    kafkaBus.publish(
      'payment-events',
      transactionRef,
      {
        event: 'PAYMENT_INITIATED',
        transactionRef,
        idempotencyKey,
        sender: senderUsername,
        receiver: receiverUsername,
        amount,
        currency,
        timestamp: new Date().toISOString(),
      },
      'payment-ledger-service'
    );

    // 4. Atomic debit with version increment
    senderWallet.balance -= amount;
    senderWallet.version += 1;
    senderWallet.updatedAt = new Date().toISOString();

    kafkaBus.publish(
      'wallet-events',
      senderUsername,
      {
        event: 'WALLET_DEBITED',
        username: senderUsername,
        accountNumber: senderWallet.accountNumber,
        currency,
        amountDebited: amount,
        newBalance: senderWallet.balance,
        newVersion: senderWallet.version,
        reference: transactionRef,
      },
      'wallet-account-service'
    );

    // 5. Atomic credit with version increment
    receiverWallet.balance += amount;
    receiverWallet.version += 1;
    receiverWallet.updatedAt = new Date().toISOString();

    kafkaBus.publish(
      'wallet-events',
      receiverUsername,
      {
        event: 'WALLET_CREDITED',
        username: receiverUsername,
        accountNumber: receiverWallet.accountNumber,
        currency,
        amountCredited: amount,
        newBalance: receiverWallet.balance,
        newVersion: receiverWallet.version,
        reference: transactionRef,
      },
      'wallet-account-service'
    );

    // 6. Record Immutable Ledger Transaction
    /** @type {LedgerTransaction} */
    const record = {
      id: this.transactions.length + 1,
      transactionRef,
      idempotencyKey,
      senderUsername,
      receiverUsername,
      amount,
      currency,
      status: 'COMPLETED',
      processedByHost: host,
      createdAt: new Date().toISOString(),
    };

    this.transactions.unshift(record);
    this.idempotencyStore.set(idempotencyKey, record);

    // 7. Emit Kafka PAYMENT_COMPLETED event to ledger-events
    kafkaBus.publish(
      'ledger-events',
      transactionRef,
      {
        event: 'PAYMENT_COMPLETED',
        transactionRef,
        idempotencyKey,
        sender: senderUsername,
        receiver: receiverUsername,
        amount,
        currency,
        status: 'COMPLETED',
        settledByHost: host,
      },
      'payment-ledger-service'
    );

    return { transaction: { ...record }, isIdempotentReplay: false };
  }

  /**
   * Simulates a concurrent race condition to trigger a real JPA OptimisticLockingFailureException.
   *
   * @param {string} username - Account holder.
   * @param {'INR' | 'USD'} currency - Currency.
   * @returns {Promise<Object>} Outcome summary of concurrent attempts.
   */
  async simulateConcurrencyRace(username, currency = 'INR') {
    const wallet = this.getWallet(username, currency);
    if (!wallet) throw new Error('Wallet not found');

    const staleVersion = wallet.version;
    const idempotencyKey1 = `idem-race-${Date.now()}-1`;
    const idempotencyKey2 = `idem-race-${Date.now()}-2`;
    const targetUser = username === 'alice' ? 'bob' : 'alice';

    // Attempt 1 succeeds and increments version to staleVersion + 1
    const result1 = await this.executeTransfer({
      senderUsername: username,
      receiverUsername: targetUser,
      amount: 100,
      currency,
      idempotencyKey: idempotencyKey1,
      expectedVersion: staleVersion,
    });

    // Attempt 2 uses the stale version and MUST fail with OptimisticLockingFailureException
    let collisionOccurred = false;
    let collisionMessage = '';

    try {
      await this.executeTransfer({
        senderUsername: username,
        receiverUsername: targetUser,
        amount: 100,
        currency,
        idempotencyKey: idempotencyKey2,
        expectedVersion: staleVersion, // Stale! Current version is now staleVersion + 1
      });
    } catch (err) {
      collisionOccurred = true;
      collisionMessage = err.message;
      kafkaBus.publish(
        'wallet-events',
        username,
        {
          event: 'OPTIMISTIC_LOCK_COLLISION_DETECTED',
          message: 'Double-spending prevented: Version mismatch on concurrent write.',
          expectedVersion: staleVersion,
          actualVersion: this.getWallet(username, currency).version,
        },
        'wallet-account-service'
      );
    }

    return {
      successFirst: result1.transaction.transactionRef,
      collisionPrevented: collisionOccurred,
      collisionReason: collisionMessage,
    };
  }

  /**
   * Fetches all transactions recorded in the ledger.
   *
   * @returns {LedgerTransaction[]}
   */
  getAllTransactions() {
    return [...this.transactions];
  }

  /**
   * Fetches transactions for a specific user.
   *
   * @param {string} username
   * @returns {LedgerTransaction[]}
   */
  getTransactionsForUser(username) {
    return this.transactions.filter(
      (tx) =>
        tx.senderUsername.toLowerCase() === username.toLowerCase() ||
        tx.receiverUsername.toLowerCase() === username.toLowerCase()
    );
  }
}

export const fintechEngine = new FintechEngine();
