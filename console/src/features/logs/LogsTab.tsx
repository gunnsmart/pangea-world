import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WorldSnapshot } from '../../sim/types';
import { cn } from '../../lib/utils';
import { KPIPanel } from '../../components/KPIPanel';

interface LogsTabProps {
  snapshot: WorldSnapshot;
  timeline?: any[];
  onClearLogs?: () => void;
}

const BiometricWaveCanvas: React.FC<{ color: string; freq: number; amp: number; offset: number }> = ({ color, freq, amp, offset }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.offsetWidth || 140;
    const H = 32;
    canvas.width = W; canvas.height = H;

    let raf: number;
    let localOffset = offset;

    const frame = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath();
      localOffset += 0.05;
      for (let x = 0; x < W; x++) {
        const t = (x / W) * Math.PI * 2 * freq;
        const y = H / 2 + Math.sin(t + localOffset) * amp + Math.sin(t * 2.3 + 1) * amp * 0.3;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
      
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
      ctx.fillStyle = color + '1a'; ctx.fill();
      raf = requestAnimationFrame(frame);
    };

    frame();
    return () => cancelAnimationFrame(raf);
  }, [color, freq, amp, offset]);

  return <canvas ref={canvasRef} className="flex-1 h-[32px] mx-2" />;
};

export const LogsTab: React.FC<LogsTabProps> = ({ snapshot, timeline, onClearLogs }) => {
  const [activeTab, setActiveTab] = useState<'worldlog' | 'timeline' | 'relations' | 'biometrics'>('worldlog');
  const [worldSubTab, setWorldSubTab] = useState<'log' | 'system' | 'events'>('log');
  const [relationSubTab, setRelationSubTab] = useState<'matrix' | 'family'>('matrix');
  const human = snapshot.humans[0];

  if (!human) return <div className="p-10 text-center font-mono text-text-dark">DATA LOGS OFFLINE</div>;

  const formattedEvents = (timeline || []).map(e => ({
    time: `Day ${e.day}`,
    text: e.description,
    type: e.event_type === 'daily_summary' ? 'system' : (['milestone', 'birth', 'death'].includes(e.event_type) ? 'event' : 'log'),
    important: ['milestone', 'birth', 'death'].includes(e.event_type),
    icon: e.event_type === 'birth' ? '👶' : e.event_type === 'milestone' ? '🚩' : e.event_type === 'daily_summary' ? '📊' : '📜'
  })).reverse();

  const systemLogs = formattedEvents.filter(l => l.type === 'system');
  const eventLogs = formattedEvents.filter(l => l.type === 'event');
  
  // Use snapshot.logs for the standard world log if events are sparse
  const worldLogsFromSnapshot = (snapshot.logs || []).map((msg, i) => ({
    time: 'LOG',
    text: msg,
    type: msg.includes('[SYSTEM]') ? 'system' : 'log',
    important: msg.includes('[CRITICAL]') || msg.includes('[WISDOM]'),
    icon: msg.includes('[WISDOM]') ? '💡' : msg.includes('[SYSTEM]') ? '⚙️' : '🌍'
  })).reverse();

  // Combine for the generic "log" view
  const worldLogs = [...worldLogsFromSnapshot, ...formattedEvents.filter(l => l.type === 'log')].slice(0, 50);
  
  // Merge system logs from snapshot into the system logs collection
  const allSystemLogs = [...systemLogs, ...worldLogsFromSnapshot.filter(l => l.type === 'system')].slice(0, 50);

  const displayLogs = worldSubTab === 'system' ? allSystemLogs : worldSubTab === 'events' ? eventLogs : worldLogs;

  return (
    <div className="flex flex-col h-full bg-background pb-28">
      {/* Dynamic Nav Control */}
      <div className="flex bg-surface-dim border-b border-border p-2 gap-1 sticky top-0 z-20 overflow-x-auto no-scrollbar items-center">
        {onClearLogs && (
          <button 
            onClick={() => {
              if (confirm('Are you sure you want to delete all historical logs?')) {
                onClearLogs();
              }
            }}
            className="px-3 py-1.5 bg-error/10 border border-error/30 text-error text-[10px] font-headline font-bold rounded uppercase hover:bg-error/20 transition-all mr-2 whitespace-nowrap"
          >
            Clear Data
          </button>
        )}
        {[
          { id: 'worldlog', label: 'World Log', icon: '📝' },
          { id: 'timeline', label: 'Timeline', icon: '⏳' },
          { id: 'relations', label: 'Relations', icon: '🔗' },
          { id: 'biometrics', label: 'Biometrics', icon: '💓' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 px-4 py-1.5 text-[10px] font-headline font-bold uppercase tracking-tighter transition-all rounded border whitespace-nowrap",
              activeTab === tab.id ? "text-primary border-primary bg-primary/5 shadow-neon-small" : "bg-surface border-border text-text-dark"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'biometrics' && (
            <motion.div key="bio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
               {[
                 { label: 'HEART RATE', val: 72, unit: 'BPM', freq: 5, col: '#ff4444' },
                 { label: 'BODY TEMP.', val: 36.7, unit: '°C', freq: 1.5, col: '#4fc3f7' },
                 { label: 'STRESS (Cortisol)', val: 22, unit: '%', freq: 2.5, col: '#a855f7' },
                 { label: 'BOND (Oxytocin)', val: 68, unit: '%', freq: 3.5, col: '#ffcc00' }
               ].map((v, i) => (
                 <div key={v.label} className="hud-panel p-4 bg-surface-dim/80">
                    <div className="flex justify-between items-center mb-4">
                       <span className="text-[10px] font-mono text-text-dark uppercase tracking-tighter">{v.label}</span>
                       <span className="text-sm font-headline font-bold text-text">{v.val} <span className="text-[9px] text-text-dark font-mono ml-1">{v.unit}</span></span>
                    </div>
                    <div className="h-12 w-full flex items-center bg-[#050810] rounded border border-border/20 px-2">
                       <BiometricWaveCanvas color={v.col} freq={v.freq} amp={10} offset={i * 1.5} />
                    </div>
                 </div>
               ))}
               <div className="hud-panel p-4 bg-surface-dim/80 flex items-center justify-between border-primary/20">
                  <div className="flex flex-col gap-2 flex-1 pr-6">
                    <span className="text-[9px] font-mono text-text-dark uppercase">CALORIES</span>
                    <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                       <div className="h-full bg-secondary shadow-neon-small" style={{ width: '70%' }} />
                    </div>
                  </div>
                  <div className="text-right">
                     <div className="text-sm font-mono font-bold text-text">1,842 <span className="text-[9px] text-text-dark">/ 2,600 kcal</span></div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'relations' && (
            <motion.div key="rel" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
               <div className="flex justify-around bg-surface-dim border border-border p-1 rounded-md mb-2">
                  <button 
                    onClick={() => setRelationSubTab('matrix')}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-headline font-bold uppercase transition-all rounded",
                      relationSubTab === 'matrix' ? "text-primary bg-primary/10" : "text-text-dark hover:text-text"
                    )}
                  >
                    Matrix
                  </button>
                  <button 
                    onClick={() => setRelationSubTab('family')}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-headline font-bold uppercase transition-all rounded",
                      relationSubTab === 'family' ? "text-primary bg-primary/10" : "text-text-dark hover:text-text"
                    )}
                  >
                    Family Tree
                  </button>
               </div>

               {relationSubTab === 'matrix' ? (
                 <>
                   <div className="hud-panel p-5 bg-surface-dim/90">
                      <div className="flex justify-between items-center mb-6">
                         <span className="text-[14px] font-headline font-bold text-primary">Adam</span>
                         <span className="badge badge-success px-4 py-1">Partner</span>
                         <span className="text-[14px] font-headline font-bold text-tertiary">Eve</span>
                      </div>

                      <div className="space-y-4">
                         {[
                           { label: 'Trust', val: 85, col: 'bg-primary' },
                           { label: 'Affinity', val: 88, col: 'bg-primary' },
                           { label: 'Conflict', val: 5, col: 'bg-error' },
                           { label: 'Intimacy', val: 92, col: 'bg-primary' },
                           { label: 'Cooperation', val: 93, col: 'bg-primary' }
                         ].map(stat => (
                           <div key={stat.label} className="flex flex-col gap-1.5">
                              <div className="flex justify-between text-[10px] font-mono uppercase">
                                 <span className="text-text-dark tracking-widest">{stat.label}</span>
                                 <span className="text-text-dim font-bold">{stat.val} / 100</span>
                              </div>
                              <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                 <motion.div initial={{ width: 0 }} animate={{ width: `${stat.val}%` }} className={cn("h-full", stat.col)} />
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-4">
                      <h5 className="text-[10px] font-headline font-bold text-text-dark uppercase tracking-widest px-2">RECENT INTERACTIONS</h5>
                      <div className="space-y-2.5">
                         {[
                           { act: 'Shared berries', change: '+Affinity', time: '2m ago', col: 'text-secondary' },
                           { act: 'Helped with crafting', change: '+Trust', time: '15m ago', col: 'text-primary' },
                           { act: 'Disagreed on explore', change: '+Conflict', time: '1h ago', col: 'text-error' },
                           { act: 'Rested together', change: '+Intimacy', time: '2h ago', col: 'text-error' }
                         ].map((int, i) => (
                           <div key={i} className="flex justify-between items-center p-3 bg-surface border border-border/20 rounded shadow-sm">
                              <span className="text-[11px] font-medium text-text-dim">👥 {int.act}</span>
                              <div className="flex items-center gap-4">
                                 <span className={cn("text-[10px] font-mono font-bold uppercase", int.col)}>{int.change}</span>
                                 <span className="text-[10px] font-mono text-text-dark">{int.time}</span>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                 </>
               ) : (
                 <div className="hud-panel p-10 bg-surface-dim/90 text-center flex flex-col items-center gap-4">
                    <div className="text-3xl">👨‍👩‍👧‍👦</div>
                    <p className="text-[11px] font-mono text-text-dark uppercase italic tracking-tighter leading-relaxed">
                       Genealogy data processing... <br/>
                       No multi-generational nodes detected beyond initial pair.
                    </p>
                    <div className="flex items-center gap-2 mt-4">
                       <span className="w-10 h-[1px] bg-border" />
                       <span className="text-[9px] font-mono text-primary animate-pulse">Scanning Lineage</span>
                       <span className="w-10 h-[1px] bg-border" />
                    </div>
                 </div>
               )}
            </motion.div>
          )}

          {activeTab === 'timeline' && (
            <motion.div key="time" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
               <div className="flex justify-between items-center px-4">
                  <h4 className="text-[11px] font-headline font-bold text-primary italic uppercase tracking-widest flex items-center gap-2">
                     <span className="animate-pulse">⏳</span> TIMELINE
                  </h4>
                  <span className="text-[8px] font-mono text-text-dark text-right leading-none uppercase">World History<br/>Day {Math.floor(snapshot.day)} | Year 1</span>
               </div>
               
               <div className="relative ml-4 pl-8 border-l border-border/40 space-y-8">
                  {formattedEvents.length > 0 ? formattedEvents.map((entry, idx) => (
                    <div key={idx} className="relative group">
                       <div className="absolute -left-10 top-1 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center group-hover:scale-125 transition-all">
                          <div className={cn("w-1.5 h-1.5 rounded-full group-hover:bg-primary", entry.important ? "bg-primary animate-pulse" : "bg-border-dim")} />
                       </div>
                       <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-mono font-bold text-text-dark bg-surface-dim self-start px-2 py-0.5 rounded border border-border/20">
                            {entry.time || 'NOW'}
                          </span>
                          <div className={cn(
                            "flex items-center gap-4 p-3 bg-surface-bright/40 border-l-2 border-r border-t border-b border-border/40 rounded-r-lg group-hover:bg-surface transition-all",
                            entry.important ? "border-l-primary" : "border-l-border"
                          )}>
                             <span className="text-lg opacity-80">{entry.icon || '📝'}</span>
                             <p className="text-[12px] font-medium text-text-dim leading-snug">{entry.text}</p>
                          </div>
                       </div>
                    </div>
                  )) : (
                    <div className="p-10 text-center text-text-dark opacity-50 italic text-[10px]">No historical data points yet.</div>
                  )}
               </div>
            </motion.div>
          )}

          {activeTab === 'worldlog' && (
            <motion.div key="world" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
               <div className="flex justify-around bg-surface-dim border border-border p-1 rounded-md mb-2">
                  <button 
                    onClick={() => setWorldSubTab('log')}
                    className={cn(
                      "flex-1 py-1.5 text-[9px] font-headline font-bold uppercase transition-all rounded",
                      worldSubTab === 'log' ? "text-primary bg-primary/10" : "text-text-dark hover:text-text"
                    )}
                  >
                    World Log
                  </button>
                  <button 
                    onClick={() => setWorldSubTab('system')}
                    className={cn(
                      "flex-1 py-1.5 text-[9px] font-headline font-bold uppercase transition-all rounded whitespace-nowrap",
                      worldSubTab === 'system' ? "text-primary bg-primary/10" : "text-text-dark hover:text-text"
                    )}
                  >
                    System
                  </button>
                  <button 
                    onClick={() => setWorldSubTab('events')}
                    className={cn(
                      "flex-1 py-1.5 text-[9px] font-headline font-bold uppercase transition-all rounded",
                      worldSubTab === 'events' ? "text-primary bg-primary/10" : "text-text-dark hover:text-text"
                    )}
                  >
                    Events
                  </button>
               </div>

               <div className="space-y-3">
                  {worldSubTab === 'system' && snapshot.kpis && <KPIPanel kpis={snapshot.kpis} />}
                  {displayLogs.length > 0 ? displayLogs.map((log, i) => (
                    <div key={i} className={cn(
                      "flex items-start gap-4 p-4 rounded-lg transition-all",
                      log.important ? "bg-primary/10 border border-primary shadow-neon-small" : "bg-surface/60 border border-border/40"
                    )}>
                       <span className="text-[10px] font-mono text-text-dark mt-0.5">{log.time || '00:00'}</span>
                       <div className="flex items-center gap-3.5 flex-1">
                          <span className={cn("text-lg opacity-80", log.important ? "animate-pulse" : "")}>{log.icon || '📜'}</span>
                          <div className="flex-1">
                            {log.important && <p className="text-[9px] font-headline font-black text-warning uppercase tracking-[0.2em] mb-1">Alert:</p>}
                            <p className={cn("text-[12px] leading-tight font-medium text-text")}>{log.text}</p>
                          </div>
                       </div>
                    </div>
                  )) : (
                    <div className="p-10 text-center text-text-dark opacity-50 italic text-[10px]">No active signals in this category.</div>
                  )}
               </div>

               <div className="hud-panel p-6 bg-[radial-gradient(circle_at_top_right,rgba(0,212,255,0.05)_0%,transparent_70%)] border-primary/20 text-center relative overflow-hidden mt-8">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[80px] rounded-full" />
                  <div className="text-[10px] font-headline font-bold text-primary/60 uppercase tracking-[0.3em] mb-4">Core Awareness</div>
                  <blockquote className="text-[14px] font-medium text-text leading-relaxed tracking-tight italic mb-4 px-2">
                    {human.thought ? `"${human.thought}"` : '"In a small island, every choice echoes."'}
                  </blockquote>
                  <cite className="text-[9px] font-mono text-text-dark not-italic uppercase tracking-[0.2em]">— {human.name.toUpperCase()}</cite>
                  
                  <div className="flex justify-center gap-3 mt-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-neon-small" />
                    <div className="w-1.5 h-1.5 rounded-full bg-surface-bright" />
                    <div className="w-1.5 h-1.5 rounded-full bg-surface-bright" />
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
