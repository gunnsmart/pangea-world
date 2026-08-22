
import React, { useState } from 'react';
import { WorldSnapshot } from '../sim/types';
import { Activity, Clock, AlertTriangle, Cpu, Zap, Download, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '../lib/utils';

export function SimulationKPIs({ snapshot }: { snapshot: WorldSnapshot }) {
  const kpis = snapshot.kpis;
  const [workerDisabled, setWorkerDisabled] = useState(false);

  if (!kpis) return null;

  const handleToggleWorker = () => {
    const newState = !workerDisabled;
    setWorkerDisabled(newState);
    
    // Dispatch event to main simulation worker
    const event = new CustomEvent('PANGEA_SET_WORKER_MODE', { detail: { disabled: newState } });
    window.dispatchEvent(event);
  };

  const handleExport = () => {
    const snapshotData = {
      timestamp: Date.now(),
      kpis,
      day: snapshot.day,
      time: `${snapshot.time}:${snapshot.minute.toString().padStart(2, '0')}`
    };
    const blob = new Blob([JSON.stringify(snapshotData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pangea_metrics_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-surface/80 backdrop-blur-sm border border-border rounded-xl p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2 text-primary font-headline text-xs tracking-widest uppercase font-bold">
          <Activity size={14} />
          Simulation Health KPIs
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleToggleWorker}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-colors mr-2",
              workerDisabled ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
            )}
            title={workerDisabled ? "Workers Disabled (Main Thread Fallback)" : "Workers Enabled (Parallel Processing)"}
          >
            {workerDisabled ? <ToggleLeft size={12} /> : <ToggleRight size={12} />}
            {workerDisabled ? "Fallback" : "Workers"}
          </button>
          <button 
            onClick={handleExport}
            className="p-1.5 hover:bg-white/5 rounded-md text-text-dark hover:text-primary transition-colors"
            title="Export KPI Snapshot"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Latency */}
        <div className="bg-black/20 rounded-lg p-3 border border-border/40">
          <div className="flex items-center gap-2 text-[10px] text-text-dark uppercase font-bold mb-1">
            <Clock size={12} className="text-secondary" />
            Task Latency (p95)
          </div>
          <div className="text-lg font-mono font-bold text-secondary tracking-tighter">
            {kpis.taskLatencyP95.toFixed(1)}<span className="text-[10px] ml-0.5 opacity-60">ms</span>
          </div>
          <div className="text-[8px] text-text-dark mt-1">
            p50: {kpis.taskLatencyP50.toFixed(1)}ms
          </div>
        </div>

        {/* Worker Queue */}
        <div className="bg-black/20 rounded-lg p-3 border border-border/40">
          <div className="flex items-center gap-2 text-[10px] text-text-dark uppercase font-bold mb-1">
            <Cpu size={12} className="text-primary" />
            Worker Queue
          </div>
          <div className="text-lg font-mono font-bold text-primary tracking-tighter">
            {kpis.queueDepth.toFixed(1)}
          </div>
          <div className="text-[8px] text-text-dark mt-1">
            Active Fallbacks: {kpis.fallbackCount}
          </div>
        </div>

        {/* Reliability */}
        <div className="bg-black/20 rounded-lg p-3 border border-border/40">
          <div className="flex items-center gap-2 text-[10px] text-text-dark uppercase font-bold mb-1">
            <AlertTriangle size={12} className={kpis.timeoutRate > 0.05 ? "text-red-400" : "text-yellow-400"} />
            Timeout Rate
          </div>
          <div className={cn(
            "text-lg font-mono font-bold tracking-tighter",
            kpis.timeoutRate > 0.05 ? "text-red-400" : "text-yellow-400"
          )}>
            {(kpis.timeoutRate * 100).toFixed(1)}<span className="text-[10px] ml-0.5 opacity-60">%</span>
          </div>
        </div>

        {/* Neural Sparsity */}
        <div className="bg-black/20 rounded-lg p-3 border border-border/40">
          <div className="flex items-center gap-2 text-[10px] text-text-dark uppercase font-bold mb-1">
            <Zap size={12} className="text-tertiary" />
            Spike Sparsity
          </div>
          <div className="text-lg font-mono font-bold text-tertiary tracking-tighter">
            {(kpis.spikeSparsity * 100).toFixed(1)}<span className="text-[10px] ml-0.5 opacity-60">%</span>
          </div>
        </div>
      </div>

      <div className="bg-black/40 rounded-lg p-3 border border-white/5">
        <div className="text-[9px] text-text-dark uppercase font-bold mb-2 tracking-wider">Plasticity Magnitude</div>
        <div className="flex items-end gap-1 h-8">
           <div className="flex-1 bg-border/20 rounded-sm h-full relative overflow-hidden">
             <div 
               className="absolute bottom-0 left-0 right-0 bg-primary/40 transition-all duration-500" 
               style={{ height: `${Math.min(100, kpis.plasticityMagnitude * 5000)}%` }}
             />
           </div>
           <div className="text-[10px] font-mono font-bold text-primary w-12 text-right">
             {kpis.plasticityMagnitude.toFixed(4)}
           </div>
        </div>
      </div>
    </div>
  );
}
