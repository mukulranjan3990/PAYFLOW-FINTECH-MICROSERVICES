/**
 * @fileoverview Top navigation bar compliant with Top Bar Contract.
 * Pure JavaScript with JSDoc typing.
 */

import React from 'react';
import { ArrowLeftRight, Activity, Cpu, Code2, ShieldCheck, CheckCircle2 } from 'lucide-react';

/**
 * @param {Object} props
 * @param {string} props.activeTab
 * @param {function(string): void} props.setActiveTab
 * @param {string} props.currentUser
 * @param {function(string): void} props.setCurrentUser
 * @param {number} props.kafkaEventCount
 */
export default function Navbar({ activeTab, setActiveTab, currentUser, setCurrentUser, kafkaEventCount }) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-200">
      {/* Zone 1: Brand title wordmark (single line, no clutter) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm shadow-blue-500/20">
          PF
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            PayFlow FinTech
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Java 21 · Kafka · Ledger
          </span>
        </div>
      </div>

      {/* Zone 2: Clean single-line nav links */}
      <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'dashboard'
              ? 'bg-slate-800 text-blue-400 font-semibold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Banking & Transfers</span>
        </button>

        <button
          onClick={() => setActiveTab('kafka')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'kafka'
              ? 'bg-slate-800 text-blue-400 font-semibold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Kafka Event Stream</span>
          {kafkaEventCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono bg-blue-500/20 text-blue-300 rounded">
              {kafkaEventCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'telemetry'
              ? 'bg-slate-800 text-blue-400 font-semibold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Microservices & Probes</span>
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'code'
              ? 'bg-slate-800 text-blue-400 font-semibold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Java 21 Codebase</span>
        </button>
      </nav>

      {/* Zone 3: Active Account & Identity Switcher */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-lg p-1">
          <button
            onClick={() => setCurrentUser('alice')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              currentUser === 'alice'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            alice
          </button>
          <button
            onClick={() => setCurrentUser('bob')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              currentUser === 'bob'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            bob
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>KYC Verified</span>
        </div>
      </div>
    </header>
  );
}
