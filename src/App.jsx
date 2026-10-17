/**
 * @fileoverview Main FinTech Web Portal Application component.
 * Implements pure JavaScript with JSDoc annotations and clean modular structure.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar.jsx';
import AccountSummary from './components/AccountSummary.jsx';
import TransferForm from './components/TransferForm.jsx';
import LedgerTable from './components/LedgerTable.jsx';
import KafkaMonitor from './components/KafkaMonitor.jsx';
import SystemHealth from './components/SystemHealth.jsx';
import CodeInspector from './components/CodeInspector.jsx';
import { fintechEngine } from './services/fintechEngine.js';
import { kafkaBus } from './services/kafkaEventBus.js';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState('alice');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [kafkaEvents, setKafkaEvents] = useState([]);
  const [notification, setNotification] = useState(null);

  const refreshData = useCallback(() => {
    const userWallets = fintechEngine.getWallets(currentUser);
    setWallets(userWallets);

    const allTxns = fintechEngine.getAllTransactions();
    setTransactions(allTxns);
  }, [currentUser]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Subscribe to real-time Kafka event bus
  useEffect(() => {
    setKafkaEvents(kafkaBus.getEvents());

    const unsubscribe = kafkaBus.subscribe((record) => {
      setKafkaEvents((prev) => [record, ...prev.slice(0, 199)]);
      // When a ledger or wallet event lands, trigger data refresh
      if (record.topic === 'wallet-events' || record.topic === 'ledger-events') {
        const userWallets = fintechEngine.getWallets(currentUser);
        setWallets(userWallets);
        setTransactions(fintechEngine.getAllTransactions());
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 6000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600/30 selection:text-blue-200">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        kafkaEventCount={kafkaEvents.length}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Toast Notification Banner */}
        {notification && (
          <div
            className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border text-xs shadow-md transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/80 border-rose-800 text-rose-200'
                : 'bg-blue-950/80 border-blue-800 text-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
              )}
              <span className="leading-relaxed font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Banking & Transfers Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <AccountSummary
              currentUser={currentUser}
              wallets={wallets}
              onRefresh={refreshData}
              onNotify={showNotification}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <TransferForm
                  currentUser={currentUser}
                  wallets={wallets}
                  onTransferComplete={refreshData}
                  onNotify={showNotification}
                />
              </div>

              <div className="lg:col-span-7">
                <LedgerTable
                  transactions={transactions}
                  currentUser={currentUser}
                  onNotify={showNotification}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Kafka Event Stream */}
        {activeTab === 'kafka' && (
          <div className="space-y-6">
            <KafkaMonitor
              events={kafkaEvents}
              onClearEvents={() => {
                kafkaBus.clear();
                setKafkaEvents([]);
                showNotification('Kafka event buffer cleared', 'info');
              }}
            />
          </div>
        )}

        {/* Tab 3: Cloud Microservices & Health Probes */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            <SystemHealth />
          </div>
        )}

        {/* Tab 4: Java 21 Codebase Viewer */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            <CodeInspector />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-400">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
          <span>PayFlow FinTech Platform · Java 21 & Spring Boot 3.3.4 Multi-Module Microservices</span>
          <span className="font-mono text-[11px]">PostgreSQL · Flyway · Apache Kafka · Pure React JS</span>
        </div>
      </footer>
    </div>
  );
}
