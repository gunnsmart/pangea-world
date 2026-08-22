import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain } from 'lucide-react';
import { WorldSnapshot } from '../../sim/types';
import { ACTION_ORDER } from '../../sim/action-system';
import { cn } from '../../lib/utils';
import { BrainVisualizer } from '../../components/BrainVisualizer';

interface NeuralTabProps {
  snapshot: WorldSnapshot;
  neuralInsights: Record<string, string>;
}

export const NeuralTab: React.FC<NeuralTabProps> = ({ snapshot }) => {
  const [activeSubject, setActiveSubject] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState<'brain' | 'stream'>('brain');
  const human = snapshot.humans[activeSubject];

  if (!human) return <div className="p-10 text-center font-mono text-text-dark">NEURAL LINK OFFLINE</div>;

  const lastOutputs = human.brainState?.lastOutputs || [];
  
  // Map outputs to action names and sort to find top desires
  const motorDesires = ACTION_ORDER.map((name, index) => ({
    label: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
    val: lastOutputs[index] || 0,
    col: name === human.action ? 'bg-secondary' : 'bg-primary'
  }))
  .sort((a, b) => b.val - a.val)
  .slice(0, 5);

  return (
    <div className="flex flex-col h-full bg-background pb-24">
      {/* Subject Selector */}
      <div className="flex bg-surface border-b border-border p-2 gap-2 sticky top-0 z-20 overflow-x-auto no-scrollbar">
        {snapshot.humans.map((h, i) => (
          <button
            key={h.id}
            onClick={() => setActiveSubject(i)}
            className={cn(
              "flex-1 px-4 py-1.5 text-[9px] font-headline font-bold uppercase tracking-widest transition-all rounded border whitespace-nowrap",
              activeSubject === i 
                ? "bg-primary/20 border-primary text-primary shadow-neon-small" 
                : "bg-surface-dim border-border text-text-dark opacity-70"
            )}
          >
            {h.name}
          </button>
        ))}
      </div>

      {/* Neural Tab Control */}
      <div className="flex bg-surface-dim border-b border-border/40 p-2 gap-2 sticky top-11 z-20 shadow-lg">
        <button
          onClick={() => setActiveSubTab('brain')}
          className={cn(
            "flex-1 py-1.5 text-[10px] font-headline font-bold uppercase tracking-widest transition-all rounded border",
            activeSubTab === 'brain' ? "bg-primary/20 border-primary text-primary" : "bg-surface border-border text-text-dark"
          )}
        >
          Neural Brain
        </button>
        <button
          onClick={() => setActiveSubTab('stream')}
          className={cn(
            "flex-1 py-1.5 text-[10px] font-headline font-bold uppercase tracking-widest transition-all rounded border",
            activeSubTab === 'stream' ? "bg-primary/20 border-primary text-primary" : "bg-surface border-border text-text-dark"
          )}
        >
          Thought Stream
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
        <AnimatePresence mode="wait">
          {activeSubTab === 'brain' ? (
            <motion.div
              key="brain"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="space-y-6"
            >
              {/* SNN Visualization */}
              <div className="hud-panel p-4 bg-surface-dim relative overflow-hidden group">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <Brain size={16} className="text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-headline font-bold tracking-[0.2em] uppercase">{human.name} SNN</span>
                  </div>
                  <span className="text-[8px] font-mono text-text-dark uppercase tracking-widest opacity-60">Spiking Neural Network</span>
                </div>
                <div className="h-[180px] w-full bg-[#040810] border border-border/40 rounded flex items-center justify-center p-2 overflow-hidden">
                   {human.brainState && (
                     <BrainVisualizer brainState={human.brainState} />
                   )}
                </div>
              </div>

              {/* Sensory Inputs - Consolidated into Brain View */}
              <div className="space-y-4">
                <span className="text-[10px] font-headline font-bold text-text-dark/80 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-4 h-[1px] bg-primary/40" /> SENSORY INPUTS
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { label: 'Vision', val: Math.min(1, (human.perception?.visibleEntities?.length || 0) / 10 + 0.2), ico: '👁️' },
                    { label: 'Hearing', val: Math.min(1, (human.perception?.heardSounds?.length || 0) / 5 + 0.1), ico: '👂' },
                    { label: 'Smell', val: Math.min(1, (human.perception?.smells?.length || 0) / 3 + 0.05), ico: '👃' },
                    { label: 'Taste', val: Math.min(1, (human.perception?.tastes?.length || 0) / 2), ico: '👅' },
                    { label: 'Touch', val: Math.min(1, (human.perception?.touches?.length || 0) / 3 + 0.3), ico: '🖐️' },
                    { label: 'Stress', val: (human.stress || 0) / 100, ico: '⚡' },
                    { label: 'Cognitive Load', val: (human.cognitiveLoad || 0) / 100, ico: '🧠' },
                    { label: 'Neuro Stability', val: (human.neuroStability || 0) / 100, ico: '⚖️' }
                  ].map(s => (
                    <div key={s.label} className="flex flex-col gap-1">
                      <div className="flex justify-between text-[9px] font-mono text-text-dark uppercase tracking-tighter">
                        <span className="flex items-center gap-1.5"><span className="opacity-60">{s.ico}</span> {s.label}</span>
                        <span className="text-text-dim text-[10px] font-bold">{s.val.toFixed(2)}</span>
                      </div>
                      <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${s.val * 100}%` }}
                          className="h-full bg-primary/40 transition-all duration-1000" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Motor Desires */}
              <div className="space-y-4">
                <span className="text-[10px] font-headline font-bold text-text-dark/80 uppercase tracking-widest flex items-center gap-2">
                   <div className="w-4 h-[1px] bg-secondary/40" /> MOTOR DESIRES (TOP 5)
                </span>
                <div className="space-y-3">
                  {motorDesires.map(s => (
                    <div key={s.label} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-text-dim uppercase tracking-widest">
                        <span>{s.label}</span>
                        <span className="font-bold">{s.val.toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-border rounded-full overflow-hidden text-[#00000000]">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${s.val * 100}%` }}
                           className={cn("h-full opacity-80 shadow-neon-small transition-all", s.col)} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="stream"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              {/* Thought Stream */}
              <div className="space-y-5">
                 <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-headline font-bold text-text-dim uppercase tracking-tighter">NEURAL STREAM</h4>
                    <span className="text-[8px] font-mono text-text-dark uppercase tracking-widest">LIVE COGNITION</span>
                 </div>

                 <div className="space-y-3.5">
                    {[
                      { ico: '🧠', text: human.thought, res: 0.82, time: 'Now', col: 'border-primary' },
                      ...((human.perception?.visibleEntities?.length || 0) > 0 ? [{ ico: '👁️', text: `I see ${human.perception.visibleEntities.length} entities nearby.`, res: 0.76, time: '1s ago', col: 'border-secondary' }] : []),
                      ...((human.perception?.heardSounds?.length || 0) > 0 ? [{ ico: '👂', text: `Sounds detected: ${human.perception.heardSounds[0]}`, res: 0.65, time: '2s ago', col: 'border-info' }] : []),
                      ...((human.memories?.length || 0) > 0 ? [{ ico: '🕯️', text: `Memory retrieved: ${human.memories[0].description}`, res: 0.88, time: '5s ago', col: 'border-caution' }] : []),
                    ].map((t, idx) => (
                      <div key={idx} className="flex items-start gap-4 p-3.5 bg-surface border-l-2 border-border/40 rounded-r-lg group hover:bg-surface-bright transition-all">
                         <div className={cn("w-9 h-9 shrink-0 rounded-full bg-background border flex items-center justify-center text-lg", t.col)}>
                            {t.ico}
                         </div>
                         <div className="flex-1">
                            <div className="flex justify-between items-start mb-1.5">
                               <p className="text-[12px] font-medium text-text leading-tight group-hover:text-primary transition-colors">{t.text}</p>
                               <span className="text-[9px] font-mono text-text-dark">{t.time}</span>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="flex items-center gap-1.5">
                                 <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-neon-small" />
                                 <span className="text-[9px] font-mono text-text-dark uppercase tracking-tighter">Resonance: {t.res}</span>
                               </div>
                            </div>
                         </div>
                      </div>
                    ))}
                    {(snapshot.humans.length === 0) && (
                      <div className="p-10 text-center text-dim italic text-xs">No active signals detected.</div>
                    )}
                 </div>
              </div>

              {/* Retrieved Knowledge */}
              <div className="space-y-4 pt-6 border-t border-border/50">
                 <h4 className="text-[10px] font-headline font-bold text-text-dark uppercase tracking-widest">RETRIEVED KNOWLEDGE</h4>
                 <div className="space-y-3">
                   {[
                     { ico: '🐟', text: "Rivers attract biological entities.", src: "Heuristic 01", res: 0.91 },
                     { ico: '🏔️', text: "Upstream vectors yield cleaner liquid resources.", src: "Survival Protocol", res: 0.88 },
                     { ico: '☀️', text: "High solar elevation increases thermal stress.", src: "Standard Operation", res: 0.73 }
                   ].map((k, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-surface-dim border border-border/40 rounded-md">
                         <div className="text-xl opacity-80">{k.ico}</div>
                         <div className="flex-1">
                            <p className="text-[10px] text-text-dim font-medium leading-none mb-1">{k.text}</p>
                            <span className="text-[8px] font-mono text-text-dark uppercase">Source: {k.src}</span>
                         </div>
                         <div className="text-sm font-headline font-bold text-secondary">{k.res}</div>
                      </div>
                   ))}
                 </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
