import React from 'react';
import { motion } from 'motion/react';
import { Activity, Zap, HardDrive, AlertTriangle } from 'lucide-react';
import { KPIStats } from '../sim/SimulationMetricsManager';
import { cn } from '@/lib/utils';

interface KPIPanelProps {
  kpis?: KPIStats;
}

export const KPIPanel: React.FC<KPIPanelProps> = ({ kpis }) => {
  if (!kpis) return null;

  const metrics = [
    { 
      label: 'Tick Duration', 
      value: `${kpis.tickDuration.toFixed(2)}ms`, 
      icon: <Activity size={12} />, 
      status: kpis.tickDuration > 16 ? 'error' : kpis.tickDuration > 10 ? 'warning' : 'success',
      description: 'Simulation processing time per step'
    },
    { 
      label: 'Snapshot Size', 
      value: `${(kpis.snapshotSize / 1024).toFixed(1)}KB`, 
      icon: <HardDrive size={12} />, 
      status: kpis.snapshotSize > 500 * 1024 ? 'warning' : 'success',
      description: 'Serialized data passed between worker/main'
    },
    { 
      label: 'Timeout Rate', 
      value: `${(kpis.timeoutRate * 100).toFixed(1)}%`, 
      icon: <Zap size={12} />, 
      status: kpis.timeoutRate > 0.05 ? 'error' : kpis.timeoutRate > 0.01 ? 'warning' : 'success',
      description: 'Neural task timeout percentage'
    },
    { 
      label: 'Event Loss', 
      value: kpis.eventLossCount, 
      icon: <AlertTriangle size={12} />, 
      status: kpis.eventLossCount > 0 ? 'error' : 'success',
      description: 'Dropped history/log events'
    },
  ];

  return (
    <div className="bg-surface/80 border border-border/40 rounded-xl p-4 backdrop-blur-md mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-mono font-bold text-primary tracking-widest uppercase">System Performance KPIs</h3>
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-secondary animate-pulse" />
          <div className="w-1 h-1 rounded-full bg-secondary animate-pulse [animation-delay:0.2s]" />
          <div className="w-1 h-1 rounded-full bg-secondary animate-pulse [animation-delay:0.4s]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m, idx) => (
          <motion.div 
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex flex-col gap-1"
          >
            <div className="flex items-center gap-2 text-[9px] font-mono text-text-dark uppercase tracking-tight">
              {m.icon}
              {m.label}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className={cn(
                "text-lg font-headline font-black tracking-tighter",
                m.status === 'success' ? "text-secondary" : 
                m.status === 'warning' ? "text-warning" : "text-error"
              )}>
                {m.value}
              </span>
              {m.status !== 'success' && (
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  m.status === 'warning' ? "bg-warning shadow-neon-small" : "bg-error shadow-neon-small"
                )} />
              )}
            </div>
            <p className="text-[8px] font-mono text-text-dark/60 leading-tight">
              {m.description}
            </p>
          </motion.div>
        ))}
      </div>
      
      {/* Mini Chart Area Placeholder */}
      <div className="mt-4 pt-4 border-t border-border/20 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono text-text-dark uppercase">Neural Latency (P95)</span>
          <span className="text-[9px] font-mono font-bold text-primary">{kpis.taskLatencyP95.toFixed(1)}ms</span>
        </div>
        <div className="w-full h-1 bg-surface-dark rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, kpis.taskLatencyP95 / 2)}%` }}
            className={cn(
              "h-full rounded-full",
              kpis.taskLatencyP95 > 150 ? "bg-error shadow-neon-small" : "bg-primary shadow-neon-small"
            )}
          />
        </div>
      </div>
    </div>
  );
};
