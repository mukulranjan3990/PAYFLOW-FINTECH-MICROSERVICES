/**
 * @fileoverview Payment Ledger API client for PayFlow FinTech platform.
 * Communicates with payment-ledger-service (Port 8083).
 * Strictly typed with JSDoc annotations.
 */

/**
 * @typedef {'INR' | 'USD'} CurrencyCode
 */

/**
 * @typedef {'COMPLETED' | 'FAILED' | 'PENDING'} TransactionStatus
 */

/**
 * @typedef {Object} TransferRequest
 * @property {string} senderUsername - Debited customer username.
 * @property {string} receiverUsername - Credited customer username.
 * @property {number} amount - Fund transfer quantity.
 * @property {CurrencyCode} currency - Currency unit (INR or USD).
 * @property {string} [idempotencyKey] - Unique UUID to prevent double-spending.
 */

/**
 * @typedef {Object} LedgerTransaction
 * @property {number} id - Sequence ID in immutable ledger database.
 * @property {string} transactionRef - Unique human-readable transfer code (e.g. PF-TXN-A1B2C3D4).
 * @property {string} idempotencyKey - UUID key protecting against network duplicate retries.
 * @property {string} senderUsername - Debited user.
 * @property {string} receiverUsername - Credited user.
 * @property {number} amount - Transferred quantity.
 * @property {CurrencyCode} currency - Currency code.
 * @property {TransactionStatus} status - Settlement status.
 * @property {string} processedByHost - Pod/container hostname that orchestrated the settlement.
 * @property {string} createdAt - ISO timestamp of ledger entry creation.
 */

/**
 * @typedef {Object} TelemetryResponse
 * @property {string} service - Microservice identifier.
 * @property {string} version - Semantic version.
 * @property {string} hostname - Server hostname.
 * @property {number} totalTransactionsProcessed - Total count of orchestrated transactions.
 * @property {string} activeEngine - Engine description.
 * @property {string} timestamp - Host timestamp.
 */

const PAYMENT_BASE_URL = '/api/v1/payments';

/**
 * Executes a P2P transfer protected by an Idempotency-Key.
 *
 * @param {TransferRequest} transferData - Money transfer specifications.
 * @param {string} [idempotencyKey] - Explicit HTTP header Idempotency-Key.
 * @returns {Promise<LedgerTransaction>} Completed ledger transaction record.
 * @throws {Error} If transfer fails validation or balance rules.
 */
export async function processTransfer(transferData, idempotencyKey) {
  const key = idempotencyKey || transferData.idempotencyKey || crypto.randomUUID();

  const response = await fetch(`${PAYMENT_BASE_URL}/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify({
      ...transferData,
      idempotencyKey: key,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Transfer failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Fetches transaction history for a specific customer.
 *
 * @param {string} username - Account holder username.
 * @returns {Promise<LedgerTransaction[]>} Array of historical ledger transactions.
 */
export async function getTransactionHistory(username) {
  try {
    const response = await fetch(`${PAYMENT_BASE_URL}/history/${username}`);
    if (!response.ok) throw new Error('Failed to retrieve history');
    return await response.json();
  } catch (err) {
    console.warn('Backend ledger API unreachable, using local store', err);
    return [];
  }
}

/**
 * Fetches all ledger transactions recorded across the entire FinTech platform.
 *
 * @returns {Promise<LedgerTransaction[]>} Full immutable transaction ledger.
 */
export async function getAllTransactions() {
  try {
    const response = await fetch(`${PAYMENT_BASE_URL}/history`);
    if (!response.ok) throw new Error('Failed to retrieve full ledger');
    return await response.json();
  } catch (err) {
    console.warn('Backend ledger API unreachable, using local store', err);
    return [];
  }
}

/**
 * Retrieves payment-ledger-service telemetry and throughput stats.
 *
 * @returns {Promise<TelemetryResponse>} Service telemetry payload.
 */
export async function getTelemetry() {
  const response = await fetch(`${PAYMENT_BASE_URL}/telemetry`);
  if (!response.ok) throw new Error('Failed to fetch telemetry');
  return await response.json();
}
