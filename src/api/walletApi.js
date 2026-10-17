/**
 * @fileoverview Wallet Account API client for PayFlow FinTech platform.
 * Communicates with wallet-account-service (Port 8082).
 * Strictly typed with JSDoc annotations.
 */

/**
 * @typedef {'INR' | 'USD'} CurrencyCode
 */

/**
 * @typedef {Object} Wallet
 * @property {number} id - Database sequence ID.
 * @property {string} username - Account holder username.
 * @property {string} accountNumber - Unique IBAN/FinTech account number.
 * @property {CurrencyCode} currency - Wallet currency code.
 * @property {number} balance - Current available funds.
 * @property {number} version - JPA @Version optimistic locking revision count.
 * @property {string} updatedAt - ISO timestamp of last atomic state mutation.
 */

/**
 * @typedef {Object} DebitCreditRequest
 * @property {string} username - Account holder.
 * @property {CurrencyCode} currency - Currency to debit/credit.
 * @property {number} amount - Numerical transfer value.
 * @property {string} [referenceKey] - Transaction reference key for audit reconciliation.
 */

const WALLET_BASE_URL = '/api/v1/wallets';

/**
 * Fetches all wallets associated with a customer username.
 *
 * @param {string} username - Target customer username.
 * @returns {Promise<Wallet[]>} Array of multi-currency wallets.
 */
export async function getWallets(username) {
  try {
    const response = await fetch(`${WALLET_BASE_URL}/${username}`);
    if (!response.ok) throw new Error('Failed to retrieve wallets');
    return await response.json();
  } catch (err) {
    console.warn('Backend wallet API unreachable, falling back to local engine', err);
    return [];
  }
}

/**
 * Creates a new multi-currency wallet for an existing customer.
 *
 * @param {string} username - Customer username.
 * @param {CurrencyCode} currency - Wallet currency.
 * @returns {Promise<Wallet>} Newly initialized wallet with version 0.
 */
export async function createWallet(username, currency) {
  const response = await fetch(`${WALLET_BASE_URL}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, currency }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create wallet');
  }

  return await response.json();
}

/**
 * Executes an atomic debit against a wallet with JPA optimistic locking.
 *
 * @param {DebitCreditRequest} params - Debit parameters.
 * @returns {Promise<Wallet>} Updated wallet entity with incremented version.
 * @throws {Error} If insufficient funds or concurrent version conflict (HTTP 409).
 */
export async function debitWallet(params) {
  const response = await fetch(`${WALLET_BASE_URL}/debit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Debit failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Executes an atomic credit to a wallet with JPA optimistic locking.
 *
 * @param {DebitCreditRequest} params - Credit parameters.
 * @returns {Promise<Wallet>} Updated wallet entity with incremented version.
 */
export async function creditWallet(params) {
  const response = await fetch(`${WALLET_BASE_URL}/credit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Credit failed with status ${response.status}`);
  }

  return await response.json();
}
