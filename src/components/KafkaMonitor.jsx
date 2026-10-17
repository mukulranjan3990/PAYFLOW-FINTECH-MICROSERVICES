/**
 * @fileoverview Apache Kafka Event Stream Monitor.
 * Visualizes Kafka topics, partition offsets, consumer groups, and message serialization.
 * Pure JavaScript with JSDoc typing.
 */

import React, { useState } from 'react';
import { Activity, Play, Pause, Trash2, Layers, Cpu, Radio, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { kafkaBus } from '../services/kafkaEventBus.js';

/**
 * @param {Object} props
 * @param {import('../services/kafkaEventBus.js').KafkaRecord[]} props.events
 * @param {function(): void} props.onClearEvents
 */
export default function KafkaMonitor({ events, onClearEvents }) {
  const [selectedTopic, setSelectedTopic] = useState('ALL');
  const [isPaused, setIsPaused] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState(null);

  const togglePause = () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    kafkaBus.setPaused(nextState);
  };

  const filteredEvents = events.filter((e) => {
    if (selectedTopic === 'ALL') return true;
    return e.topic === selectedTopic;
  });

  const getTopicColor = (topic) => {
    switch (topic) {
      case 'payment-events':
        return 'text-blue-400 bg-blue-950/60 border-blue-800/50';
      case 'wallet-events':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50';
      case 'ledger-events':
        return 'text-purple-400 bg-purple-950/60 border-purple-800/50';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Top Controls */}
      <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">Apache Kafka Event Broker</h2>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/40 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>3 Partitions Active</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Event-driven asynchronous ledger updates across microservices
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Topic Selectors */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700/60">
            {['ALL', 'payment-events', 'wallet-events', 'ledger-events'].map((topic) => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-all whitespace-nowrap shrink-0 ${
                  selectedTopic === topic
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <button
            onClick={togglePause}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isPaused
                ? 'bg-amber-600/20 text-amber-300 border-amber-600/40 hover:bg-amber-600/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={onClearEvents}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
            title="Clear event buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cluster Topic Partition Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950/40 border-b border-slate-800 text-xs">
        <div className="p-3 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <div>
              <span className="font-semibold text-white block">payment-events</span>
              <span className="text-[10px] text-slate-400 font-mono">payment-ledger-group</span>
            </div>
          </div>
          <span className="font-mono text-slate-400 text-[11px]">3 Partitions</span>
        </div>

        <div className="p-3 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="font-semibold text-white block">wallet-events</span>
              <span className="text-[10px] text-slate-400 font-mono">wallet-audit-group</span>
            </div>
          </div>
          <span className="font-mono text-slate-400 text-[11px]">3 Partitions</span>
        </div>

        <div className="p-3 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <div>
              <span className="font-semibold text-white block">ledger-events</span>
              <span className="text-[10px] text-slate-400 font-mono">analytics-sink-group</span>
            </div>
          </div>
          <span className="font-mono text-slate-400 text-[11px]">3 Partitions</span>
        </div>
      </div>

      {/* Event Feed List */}
      <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No Kafka events published yet on selected topic. Perform a transfer or race simulation above to stream live events.
          </div>
        ) : (
          filteredEvents.map((rec) => {
            const isExpanded = expandedRecordId === rec.id;
            return (
              <div key={rec.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedRecordId(isExpanded ? null : rec.id)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-blue-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getTopicColor(rec.topic)}`}>
                      {rec.topic}
                    </span>

                    <span className="font-mono text-[11px] text-slate-300 font-semibold">
                      {rec.payload?.event || 'EVENT'}
                    </span>

                    <span className="text-slate-400 font-mono text-[11px]">
                      Key: <span className="text-slate-300">{rec.key}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 tabular-nums">
                    <span>Partition: {rec.partition}</span>
                    <span>·</span>
                    <span>Offset: {rec.offset}</span>
                    <span>·</span>
                    <span className="bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50 text-slate-400">
                      {rec.producerService}
                    </span>
                    <span>·</span>
                    <span>
                      {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Expanded Payload Viewer */}
                {isExpanded && (
                  <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-400 mb-2 pb-1 border-b border-slate-900 text-[10px]">
                      <span>MESSAGE PAYLOAD JSON</span>
                      <span>ID: {rec.id}</span>
                    </div>
                    <pre className="text-blue-300 overflow-x-auto text-[11px] leading-relaxed">
                      {JSON.stringify(rec.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
