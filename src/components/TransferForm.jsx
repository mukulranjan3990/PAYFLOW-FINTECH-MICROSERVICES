/**
 * @fileoverview P2P Fund Transfer Form with Idempotency-Key protection.
 * Pure JavaScript with JSDoc typing.
 */

import React, { useState } from 'react';
import { Send, KeyRound, RefreshCw, CheckCircle, Repeat, ShieldAlert } from 'lucide-react';
import { fintechEngine } from '../services/fintechEngine.js';

/**
 * @param {Object} props
 * @param {string} props.currentUser
 * @param {import('../api/walletApi.js').Wallet[]} props.wallets
 * @param {function(): void} props.onTransferComplete
 * @param {function(string, 'success'|'error'|'info'): void} props.onNotify
 */
export default function TransferForm({ currentUser, wallets, onTransferComplete, onNotify }) {
  const [recipient, setRecipient] = useState(currentUser === 'alice' ? 'bob' : 'alice');
  const [currency, setCurrency] = useState('INR');
  const [amount, setAmount] = useState('1000');
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedKey, setLastSubmittedKey] = useState(null);

  const activeWallet = wallets.find((w) => w.currency === currency) || { balance: 0 };

  const handleGenerateNewKey = () => {
    setIdempotencyKey(crypto.randomUUID());
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      onNotify('Please enter a valid transfer amount greater than 0', 'error');
      return;
    }

    if (numAmount > activeWallet.balance) {
      onNotify(`Insufficient funds: Balance is ${currency} ${activeWallet.balance}`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await fintechEngine.executeTransfer({
        senderUsername: currentUser,
        receiverUsername: recipient,
        amount: numAmount,
        currency,
        idempotencyKey,
      });

      setLastSubmittedKey(idempotencyKey);
      onTransferComplete();

      if (result.isIdempotentReplay) {
        onNotify(
          `Idempotent Replay Intercepted! Key [${idempotencyKey.slice(0, 8)}...] was already processed. Returning cached ledger record PF-TXN-${result.transaction.transactionRef.slice(-6)}. Balance was NOT deducted again.`,
          'info'
        );
      } else {
        onNotify(
          `Transfer successful: ${currency} ${numAmount} sent to ${recipient}. Reference: ${result.transaction.transactionRef}`,
          'success'
        );
        // Automatically generate a new fresh key for next normal transfer
        setIdempotencyKey(crypto.randomUUID());
      }
    } catch (err) {
      onNotify(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestIdempotentReplay = async () => {
    if (!lastSubmittedKey) {
      onNotify('Perform a transfer first, then test replaying the same idempotency key.', 'info');
      return;
    }

    // Reuse the previous key to simulate duplicate network retry
    setIdempotencyKey(lastSubmittedKey);
    setIsSubmitting(true);
    try {
      const result = await fintechEngine.executeTransfer({
        senderUsername: currentUser,
        receiverUsername: recipient,
        amount: parseFloat(amount) || 1000,
        currency,
        idempotencyKey: lastSubmittedKey,
      });

      onTransferComplete();
      onNotify(
        `Idempotency-Key Success! The platform detected duplicate key [${lastSubmittedKey.slice(0, 8)}...]. Returned existing ledger record (${result.transaction.transactionRef}) with zero double-spending.`,
        'info'
      );
    } catch (err) {
      onNotify(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Peer-to-Peer Fund Transfer</h2>
          <p className="text-xs text-slate-400">
            Atomic debit/credit orchestration across wallet-account-service & payment-ledger-service
          </p>
        </div>

        <span className="text-[11px] font-mono bg-blue-950/60 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded">
          REST :8083 ➔ Kafka
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sender & Receiver */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Sender Account
            </label>
            <input
              type="text"
              readOnly
              value={`${currentUser} (You)`}
              className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Beneficiary / Recipient
            </label>
            <select
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-blue-500"
            >
              <option value="alice" disabled={currentUser === 'alice'}>alice (PF-INR-1001 / PF-USD-1001)</option>
              <option value="bob" disabled={currentUser === 'bob'}>bob (PF-INR-1002 / PF-USD-1002)</option>
            </select>
          </div>
        </div>

        {/* Currency & Amount */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Transfer Currency
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                  currency === 'INR'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                INR (₹)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                  currency === 'USD'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                Amount ({currency})
              </label>
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                Available: {currency === 'INR' ? '₹' : '$'} {Number(activeWallet.balance).toLocaleString()}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">
                {currency === 'INR' ? '₹' : '$'}
              </span>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter transfer amount"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs font-mono font-medium text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            {/* Amount quick chips */}
            <div className="flex items-center gap-1.5 mt-2">
              {[500, 1000, 2500, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String(val))}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Idempotency Key Section */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <KeyRound className="w-3.5 h-3.5 text-blue-400" />
              <span>HTTP Header: Idempotency-Key</span>
            </div>
            <button
              type="button"
              onClick={handleGenerateNewKey}
              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Regenerate UUID</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-blue-500"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Guarantees at-most-once execution during network drops or load-balancer retries.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors shadow-sm shadow-blue-600/20 whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Settling Transfer...' : `Transfer ${currency} ${amount || 0}`}</span>
          </button>

          {lastSubmittedKey && (
            <button
              type="button"
              onClick={handleTestIdempotentReplay}
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-amber-400 bg-amber-950/40 border border-amber-800/40 hover:bg-amber-900/30 rounded-lg transition-colors whitespace-nowrap"
              title="Resends request with identical Idempotency-Key to prove zero double-spend"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Replay Same Key</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
