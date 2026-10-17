/**
 * @fileoverview Account Summary and multi-currency balance cards.
 * Displays JPA @Version optimistic locking count and race collision tester.
 * Pure JavaScript with JSDoc typing.
 */

import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, Zap, AlertTriangle, ArrowUpRight, Wallet as WalletIcon } from 'lucide-react';
import { fintechEngine } from '../services/fintechEngine.js';

/**
 * @param {Object} props
 * @param {string} props.currentUser
 * @param {import('../api/walletApi.js').Wallet[]} props.wallets
 * @param {function(): void} props.onRefresh
 * @param {function(string, 'success'|'error'|'info'): void} props.onNotify
 */
export default function AccountSummary({ currentUser, wallets, onRefresh, onNotify }) {
  const [isSimulatingRace, setIsSimulatingRace] = useState(false);

  const inrWallet = wallets.find((w) => w.currency === 'INR') || {
    balance: 0,
    version: 0,
    accountNumber: 'PF-INR-XXXX',
  };

  const usdWallet = wallets.find((w) => w.currency === 'USD') || {
    balance: 0,
    version: 0,
    accountNumber: 'PF-USD-XXXX',
  };

  const handleSimulateRaceCondition = async () => {
    setIsSimulatingRace(true);
    try {
      const outcome = await fintechEngine.simulateConcurrencyRace(currentUser, 'INR');
      onRefresh();
      if (outcome.collisionPrevented) {
        onNotify(
          `Double-spend prevented! First txn (${outcome.successFirst}) incremented @Version. Concurrent duplicate threw OptimisticLockingFailureException.`,
          'info'
        );
      } else {
        onNotify('Transfers completed', 'success');
      }
    } catch (err) {
      onNotify(err.message, 'error');
    } finally {
      setIsSimulatingRace(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* INR Wallet Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full pointer-events-none" />
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium tracking-wide">INDIAN RUPEE ACCOUNT</span>
            <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300">
              {inrWallet.accountNumber}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono tabular-nums">
              ₹ {Number(inrWallet.balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-400 font-mono">INR</span>
          </div>
          <p className="text-xs text-slate-400">
            Available for instant P2P settlement & ledger audit
          </p>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-[11px] font-mono text-blue-400 bg-blue-950/60 border border-blue-800/40 px-1.5 py-0.5 rounded">
              @Version: {inrWallet.version}
            </span>
            <span>Optimistic Lock</span>
          </div>
          <span className="text-[11px] text-slate-400">PostgreSQL · Flyway V1</span>
        </div>
      </div>

      {/* USD Wallet Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium tracking-wide">US DOLLAR ACCOUNT</span>
            <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300">
              {usdWallet.accountNumber}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono tabular-nums">
              $ {Number(usdWallet.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-400 font-mono">USD</span>
          </div>
          <p className="text-xs text-slate-400">
            Cross-currency multi-wallet asset reserve
          </p>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
              @Version: {usdWallet.version}
            </span>
            <span>Optimistic Lock</span>
          </div>
          <span className="text-[11px] text-slate-400">PostgreSQL · Flyway V1</span>
        </div>
      </div>

      {/* FinTech Concurrency & Double-Spend Defense Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium tracking-wide">CONCURRENCY & SAFETY</span>
            <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded">
              Zero Double-Spend
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Spring Data JPA uses numerical <code className="text-blue-400 font-mono">@Version</code> locking. If concurrent requests target the same account simultaneously, subsequent transactions trigger an <code className="text-amber-300 font-mono">OptimisticLockingFailureException</code>.
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col gap-2">
          <button
            onClick={handleSimulateRaceCondition}
            disabled={isSimulatingRace}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isSimulatingRace ? 'Simulating Collision...' : 'Test Concurrent Double-Spend Race'}</span>
          </button>
          <span className="text-[10px] text-slate-400 text-center">
            Fires 2 parallel debits on the current version to verify collision handling
          </span>
        </div>
      </div>
    </div>
  );
}
