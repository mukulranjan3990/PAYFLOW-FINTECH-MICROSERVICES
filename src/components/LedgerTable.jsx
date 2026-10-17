/**
 * @fileoverview Immutable Transaction Ledger Table.
 * Pure JavaScript with JSDoc typing and strict tabular numerals.
 */

import React, { useState } from 'react';
import { Search, Filter, Copy, Check, Clock, Server, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

/**
 * @param {Object} props
 * @param {import('../api/paymentApi.js').LedgerTransaction[]} props.transactions
 * @param {string} props.currentUser
 * @param {function(string, 'success'|'error'|'info'): void} props.onNotify
 */
export default function LedgerTable({ transactions, currentUser, onNotify }) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const filteredTransactions = transactions.filter((tx) => {
    if (filterStatus !== 'ALL' && tx.status !== filterStatus) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      tx.transactionRef.toLowerCase().includes(query) ||
      tx.idempotencyKey.toLowerCase().includes(query) ||
      tx.senderUsername.toLowerCase().includes(query) ||
      tx.receiverUsername.toLowerCase().includes(query)
    );
  });

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    onNotify(`Copied ${label} to clipboard`, 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Immutable Transaction Ledger</h2>
          <p className="text-xs text-slate-400">
            PostgreSQL <code className="text-slate-300 font-mono">fintech_ledger_db</code> · Flyway V1 Migration
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search ref or idempotency key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-48 sm:w-60"
            />
          </div>

          {/* Status Filter segmented buttons */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700/60">
            {['ALL', 'COMPLETED', 'FAILED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-all whitespace-nowrap shrink-0 ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-medium text-slate-400">
              <th className="py-2.5 px-4 font-medium">Ref & Idempotency Key</th>
              <th className="py-2.5 px-4 font-medium">Parties</th>
              <th className="py-2.5 px-4 font-medium text-right">Amount</th>
              <th className="py-2.5 px-4 font-medium">Status</th>
              <th className="py-2.5 px-4 font-medium">Host / Node</th>
              <th className="py-2.5 px-4 font-medium text-right">Settled At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No ledger transactions matching the selected criteria.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => {
                const isSender = tx.senderUsername.toLowerCase() === currentUser.toLowerCase();
                const isReceiver = tx.receiverUsername.toLowerCase() === currentUser.toLowerCase();

                return (
                  <tr key={tx.id || tx.transactionRef} className="hover:bg-slate-800/40 transition-colors">
                    {/* Ref & Idempotency Key */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-white">
                        <span>{tx.transactionRef}</span>
                        <button
                          onClick={() => handleCopy(tx.transactionRef, 'Txn Ref')}
                          className="text-slate-400 hover:text-slate-200 transition-colors"
                          title="Copy Transaction Ref"
                        >
                          {copiedKey === tx.transactionRef ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-[200px]">
                        <span>Key: {tx.idempotencyKey.slice(0, 16)}...</span>
                        <button
                          onClick={() => handleCopy(tx.idempotencyKey, 'Idempotency Key')}
                          className="hover:text-slate-200"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </td>

                    {/* Parties */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-slate-300">
                        <span className={isSender ? 'font-bold text-blue-400' : ''}>
                          {tx.senderUsername}
                        </span>
                        <span className="text-slate-400">➔</span>
                        <span className={isReceiver ? 'font-bold text-emerald-400' : ''}>
                          {tx.receiverUsername}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {isSender ? 'Outgoing debit' : isReceiver ? 'Incoming credit' : 'Platform transfer'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold">
                      <span className={tx.status === 'FAILED' ? 'text-slate-400 line-through' : isSender ? 'text-amber-400' : 'text-emerald-400'}>
                        {isSender ? '-' : '+'}{tx.currency === 'INR' ? '₹' : '$'} {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1 font-normal font-sans">
                        {tx.currency}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-medium ${
                          tx.status === 'COMPLETED'
                            ? 'text-emerald-400'
                            : tx.status === 'FAILED'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {tx.status === 'COMPLETED' ? 'Settled' : tx.status}
                      </span>
                    </td>

                    {/* Host / Node */}
                    <td className="py-3 px-4 text-[11px] font-mono text-slate-400">
                      <span className="bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50">
                        {tx.processedByHost || 'payment-ledger-pod'}
                      </span>
                    </td>

                    {/* Settled At */}
                    <td className="py-3 px-4 text-right text-[11px] font-mono text-slate-400 tabular-nums">
                      {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
