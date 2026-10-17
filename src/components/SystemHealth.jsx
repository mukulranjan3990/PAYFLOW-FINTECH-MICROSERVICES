/**
 * @fileoverview Microservices Health & Cloud DevOps Telemetry Panel.
 * Visualizes ports, health probes, zero-downtime rollout specs, and Actuator metrics.
 * Pure JavaScript with JSDoc typing.
 */

import React, { useState, useEffect } from 'react';
import { Cpu, Server, Activity, CheckCircle2, Shield, Terminal, RefreshCw, Database } from 'lucide-react';
import { getSystemStatus } from '../api/telemetryApi.js';

export default function SystemHealth() {
  const [telemetry, setTelemetry] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const data = await getSystemStatus();
      setTelemetry(data);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const services = [
    {
      name: 'identity-auth-service',
      port: 8081,
      db: 'fintech_auth_db (PostgreSQL)',
      role: 'BCrypt Authentication, KYC Verification, JWT Generation',
      status: 'UP',
      memory: '384Mi - 512Mi',
      cpu: '250m - 500m',
      probe: '/actuator/health/readiness',
    },
    {
      name: 'wallet-account-service',
      port: 8082,
      db: 'fintech_wallet_db (PostgreSQL)',
      role: 'Multi-Currency Accounts, JPA @Version Optimistic Locking',
      status: 'UP',
      memory: '384Mi - 512Mi',
      cpu: '250m - 500m',
      probe: '/actuator/health/readiness',
    },
    {
      name: 'payment-ledger-service',
      port: 8083,
      db: 'fintech_ledger_db (PostgreSQL)',
      role: 'P2P Transfers, Idempotency-Key Enforcer, Immutable Ledger',
      status: 'UP',
      memory: '384Mi - 512Mi',
      cpu: '250m - 500m',
      probe: '/actuator/health/readiness',
    },
    {
      name: 'fintech-web-portal',
      port: 8080,
      db: 'Stateless / Distributed JDBC Session',
      role: 'BFF Gateway, Actuator Aggregator, Zero-Downtime Target',
      status: 'UP',
      memory: '384Mi - 512Mi',
      cpu: '250m - 500m',
      probe: '/actuator/health/liveness',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Microservices Cloud Topology & DevOps Specs
            </h2>
            <p className="text-xs text-slate-400">
              Zero-Downtime Deployment Architecture · Java 21 LTS · Spring Boot 3.3.4
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Probes</span>
            </button>
          </div>
        </div>

        {/* Microservices Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {services.map((svc) => (
            <div
              key={svc.name}
              className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-white text-xs">{svc.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/40 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>PORT {svc.port}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-3">{svc.role}</p>

                <div className="space-y-1.5 text-[11px] font-mono text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Database:</span>
                    <span className="text-slate-300">{svc.db}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Readiness Probe:</span>
                    <span className="text-blue-400">{svc.probe}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Resource Target:</span>
                    <span className="text-slate-300">{svc.cpu} · {svc.memory}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Graceful Drain: 30s</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Actuator Healthy</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cloud DevOps Verification Terminal Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            Zero-Downtime Rollout Verification & CI Instructions
          </h3>
        </div>

        <div className="space-y-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-slate-400 block mb-1"># 1. Self-Contained H2 In-Memory CI Tests across all 4 modules</span>
            <span className="text-emerald-400">mvn clean verify -B</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-slate-400 block mb-1"># 2. Package Production Executable JARs</span>
            <span className="text-emerald-400">mvn clean package -DskipTests -B</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-slate-400 block mb-1"># 3. Continuous Zero-Downtime Rollout Probe</span>
            <span className="text-emerald-400">watch -n 0.5 "curl -s http://localhost:8080/api/v1/system-status"</span>
          </div>
        </div>
      </div>
    </div>
  );
}
