import React, { useState } from 'react';
import { motion } from 'motion/react';
import { WorldSnapshot } from '../../sim/types';
import { cn } from '../../lib/utils';

interface AgentsTabProps {
  snapshot: WorldSnapshot;
  neuralInsights: Record<string, string>;
  hormoneHistory?: any;
}

export const AgentsTab: React.FC<AgentsTabProps> = ({ snapshot }) => {
  const [activeSubject, setActiveSubject] = useState(0);
  const [activeView, setActiveView] = useState<'inventory' | 'skills' | 'memory' | 'relations' | 'stats'>('stats');
  const human = snapshot.humans[activeSubject];

  if (!human) return <div className="p-10 text-center text-text-dark font-mono">NO AGENTS DETECTED</div>;

  return (
    <div className="flex flex-col h-full bg-background pb-28">
      
      {/* Agent Selector Tabs */}
      <div className="flex bg-surface-dim border-b border-border p-2 gap-2 sticky top-0 z-20 overflow-x-auto no-scrollbar">
        {snapshot.humans.map((h, i) => (
          <button
            key={h.id}
            onClick={() => { setActiveSubject(i); setActiveView('stats'); }}
            className={cn(
              "flex-1 px-4 py-1.5 text-[10px] font-headline font-bold uppercase tracking-widest transition-all rounded border whitespace-nowrap",
              activeSubject === i 
                ? "bg-primary/20 border-primary text-primary shadow-neon-small" 
                : "bg-surface border-border text-text-dark"
            )}
          >
            {h.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
        
        {activeView === 'stats' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Profile Card */}
            <div className="flex gap-4">
              <div className="relative w-[140px] h-[180px] rounded-lg overflow-hidden border border-border bg-surface-dim shadow-2xl group shrink-0">
                <img 
                  src={human.imageUrl} 
                  alt={human.name} 
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-60" />
                <div className="absolute bottom-2 left-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      <span className="text-[10px] font-mono text-success uppercase font-bold tracking-tighter">Active</span>
                    </div>
                    <div className="text-[8px] font-mono text-text-dark uppercase mt-0.5">Subject_{human.id.substring(0,4)}</div>
                </div>
              </div>

              <div className="flex-1 space-y-2.5">
                  {[
                    { label: 'HP', val: Math.round(human.health), col: '#ff4444', icon: '❤️' },
                    { label: 'Energy', val: Math.round(human.energy), col: '#ffcc00', icon: '⚡' },
                    { label: 'Hydration', val: Math.round(Math.max(0, 100 - (human.thirst || 0))), col: '#4fc3f7', icon: '💧' },
                    { label: 'Nutrition', val: Math.round(Math.max(0, 100 - (human.hunger || 0))), col: '#ff8800', icon: '🍖' },
                    { label: 'Stress', val: Math.round(human.stress || 0), col: '#a855f7', icon: '🥵' },
                    { label: 'BPM', val: human.bloodPressure || 72, col: '#ff4444', icon: '💓', raw: true }
                  ].map(stat => (
                    <div key={stat.label} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center px-0.5">
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-text-dark uppercase tracking-tighter">
                            <span className="opacity-70 grayscale">{stat.icon}</span>
                            <span>{stat.label}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-text-dim">
                            {stat.val}{stat.raw ? '' : '%'}
                          </span>
                      </div>
                      {!stat.raw && (
                        <div className="h-1.2 w-full bg-border rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${stat.val}%` }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: stat.col }}
                            />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Current Action */}
            <div className="bg-surface-dim border border-primary/30 rounded-lg p-4 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-mono text-text-dark uppercase tracking-[0.2em]">{human.name} State</span>
                  <span className="text-[12px] font-headline font-bold text-primary italic transition-all group-hover:scale-105">
                    {human.neuroStability > 80 ? 'SYNC_HIGH' : human.neuroStability > 40 ? 'SYNC_MID' : 'SYNC_LOW'}
                  </span>
                </div>
                <div className="text-[13px] font-medium text-text mb-3 uppercase tracking-wider italic leading-tight">
                  {human.state === 'idle' ? 'Idle in base camp' : 
                   human.state === 'eating' ? 'Consuming resources' :
                   human.state === 'sleeping' ? 'Entering REM sleep' :
                   'Executing resource acquisition protocol'}
                </div>
                <div className="relative h-1 w-full bg-border rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: ['20%', '100%'] }}
                    transition={{ duration: 15, repeat: Infinity }}
                    className="h-full bg-primary shadow-neon-small"
                  />
                </div>
            </div>
          </motion.div>
        )}

        {activeView === 'inventory' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
             <div className="grid grid-cols-4 gap-3">
                {(human.inventory?.items || []).map((stack, i) => (
                   <div key={i} className="aspect-square bg-surface-dim border border-border/60 rounded flex flex-col items-center justify-center relative hover:border-primary transition-all">
                      <span className="text-2xl">{stack.id === 'wood' ? '🪵' : stack.id === 'stone' ? '🪨' : stack.id === 'food' || stack.id === 'meat' ? '🥩' : stack.id === 'fruit' ? '🍎' : stack.id === 'herbs' ? '🌿' : '📦'}</span>
                      <span className="absolute bottom-1 right-1 text-[9px] font-mono font-bold text-text-dark">{stack.quantity}</span>
                   </div>
                ))}
                {Array.from({ length: Math.max(0, 8 - (human.inventory?.items?.length || 0)) }).map((_, i) => (
                  <div key={`emp-${i}`} className="aspect-square bg-surface/30 border border-border/20 border-dashed rounded" />
                ))}
             </div>
             <p className="text-[10px] font-mono text-text-dark text-center uppercase">Inventory Capacity: {(human.inventory?.items?.length || 0)}/20</p>
          </motion.div>
        )}

        {activeView === 'skills' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
             {[
               { name: 'Hunting', key: 'hunting', icon: '🏹' },
               { name: 'Gathering', key: 'botany', icon: '🌿' },
               { name: 'Crafting', key: 'crafting', icon: '⚒' },
               { name: 'Social', key: 'social', icon: '💬' }
             ].map(skill => {
               const level = human.skills[skill.key] || 0;
               return (
                <div key={skill.name} className="bg-surface-dim p-3 rounded border border-border flex items-center gap-4">
                  <span className="text-xl">{skill.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[11px] font-headline font-bold uppercase tracking-widest">{skill.name}</span>
                      <span className="text-[9px] font-mono text-primary">LVL {Math.floor(level / 10)}</span>
                    </div>
                    <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(level % 10) * 10}%` }} />
                    </div>
                  </div>
                </div>
               );
             })}
          </motion.div>
        )}

        {activeView === 'memory' && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {(human.memory || []).slice(0, 5).map((m: any, i: number) => (
                <div key={i} className="p-3 bg-surface-dim border border-border/40 rounded italic text-[11px] text-text-dim">
                   "{m.description || 'Recent neural pattern stored...'}"
                </div>
              ))}
              {(!human.memory || human.memory.length === 0) && (
                <div className="p-10 text-center text-text-dark opacity-50 italic text-[10px]">No strong memories found.</div>
              )}
           </motion.div>
        )}

            {/* Interaction Menu */}
            <div className="grid grid-cols-5 gap-2 border-t border-border pt-6 mt-4">
               {[
                 { id: 'stats', label: 'Biometrics', icon: '📑' },
                 { id: 'inventory', label: 'Inventory', icon: '🎒' },
                 { id: 'skills', label: 'Cognition', icon: '🎯' },
                 { id: 'memory', label: 'Engrams', icon: '🧠' },
                 { id: 'relations', label: 'Network', icon: '👥' }
               ].map(item => (
                 <button 
                  key={item.id} 
                  onClick={() => setActiveView(item.id as any)}
                  className={cn(
                    "hud-panel p-2 flex flex-col items-center justify-center gap-1 bg-surface-bright border-border/40 transition-all group",
                    activeView === item.id ? "bg-primary/10 border-primary text-primary shadow-neon-small" : "hover:bg-surface hover:border-border text-text-dark"
                  )}
                 >
                    <span className={cn("text-base transition-all", activeView === item.id ? "grayscale-0 scale-110" : "grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100")}>{item.icon}</span>
                    <span className="text-[7px] font-mono uppercase tracking-tighter transition-colors">{item.label}</span>
                 </button>
               ))}
            </div>

            <div className="space-y-6 pt-4">
              {activeView === 'stats' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  {/* Biology / Hormones */}
                  <div className="hud-panel p-4 bg-surface-dim">
                    <h5 className="text-[9px] font-mono text-text-dark uppercase mb-3 tracking-widest border-b border-border/30 pb-1 flex items-center gap-2">
                       <div className="w-1 h-1 bg-secondary rounded-full" />
                       Hormone Regulation Index
                    </h5>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      {[
                        { label: 'Cortisol', val: human.hormones.cortisol, col: '#f87171', icon: '🧪' },
                        { label: 'Oxytocin', val: human.hormones.oxytocin, col: '#f472b6', icon: '💖' },
                        { label: 'Testosterone', val: human.hormones.testosterone, col: '#60a5fa', icon: '💠' },
                        { label: 'Estrogen', val: human.hormones.estrogen, col: '#fb7185', icon: '🎀' }
                      ].map(h => (
                        <div key={h.label} className="space-y-1">
                          <div className="flex justify-between items-center text-[8px] font-mono uppercase">
                             <span className="text-text-dark">{h.label}</span>
                             <span className="text-text-dim">{Math.round(h.val)}ng/mL</span>
                          </div>
                          <div className="h-1 bg-border rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${Math.min(100, (h.val / 100) * 100)}%` }}
                               className="h-full"
                               style={{ backgroundColor: h.col }}
                             />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Body Vitals */}
                  <div className="hud-panel p-4 bg-surface-dim border-primary/10">
                     <h5 className="text-[9px] font-mono text-text-dark uppercase mb-3 tracking-widest flex items-center gap-2">
                        <div className="w-1 h-1 bg-primary rounded-full shadow-neon-small" />
                        Peripheral Vitals
                     </h5>
                     <div className="flex gap-4 items-center">
                        <div className="text-center p-3 bg-surface border border-border/40 rounded flex-1">
                           <div className="text-[8px] font-mono text-text-dark uppercase">Core Temp</div>
                           <div className="text-[12px] font-headline font-bold text-text mt-0.5">{human.bodyTemp.toFixed(1)}°C</div>
                        </div>
                        <div className="text-center p-3 bg-surface border border-border/40 rounded flex-1">
                           <div className="text-[8px] font-mono text-text-dark uppercase">BP Ratio</div>
                           <div className="text-[12px] font-headline font-bold text-text mt-0.5">{Math.round(human.bloodPressure)}/80</div>
                        </div>
                        <div className="text-center p-3 bg-surface border border-border/40 rounded flex-1">
                           <div className="text-[8px] font-mono text-text-dark uppercase">Weight</div>
                           <div className="text-[12px] font-headline font-bold text-text mt-0.5">{Math.round(human.weight)}kg</div>
                        </div>
                     </div>
                  </div>
                </motion.div>
              )}

              {activeView === 'inventory' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                      {(human.inventory?.items || []).map((stack, i) => (
                        <div key={i} className="aspect-square bg-surface-dim border border-border/60 rounded flex flex-col items-center justify-center relative hover:border-primary transition-all group">
                            <span className="text-2xl group-hover:scale-110 transition-transform">
                              {stack.id === 'wood' ? '🪵' : (stack.id === 'stone' || stack.id === 'sharp_stone') ? '🪨' : (stack.id === 'food' || stack.id === 'meat') ? '🥩' : stack.id === 'fruit' ? '🍎' : stack.id === 'herbs' ? '🌿' : stack.id === 'stone_axe' ? '🪓' : stack.id === 'wooden_spear' ? '🔱' : '📦'}
                            </span>
                            <span className="absolute bottom-1 right-1 text-[9px] font-mono font-bold text-text-dark">{stack.quantity}</span>
                        </div>
                      ))}
                      {Array.from({ length: Math.max(0, 8 - (human.inventory?.items?.length || 0)) }).map((_, i) => (
                        <div key={`emp-${i}`} className="aspect-square bg-surface/30 border border-border/20 border-dashed rounded" />
                      ))}
                  </div>
                  <p className="text-[10px] font-mono text-text-dark text-center uppercase">Storage: {(human.inventory?.items || []).length}/20 Slots</p>
                </motion.div>
              )}

              {activeView === 'skills' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 gap-2">
                   {Object.entries(human.skills || {}).map(([name, level]) => (
                     <div key={name} className="bg-surface-dim p-2.5 rounded border border-border/40 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-surface border border-border flex items-center justify-center text-sm">
                           {name === 'hunting' ? '🏹' : name === 'crafting' ? '⚒' : name === 'botany' ? '🌿' : name === 'firemaking' ? '🔥' : '🧠'}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-end mb-0.5">
                            <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-text-dim">{name}</span>
                            <span className="text-[9px] font-mono text-primary font-bold">LV. {Math.floor((level as number) / 10)}</span>
                          </div>
                          <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                             <div className="h-full bg-primary/60 shadow-neon-small" style={{ width: `${(level as number) % 10 * 10}%` }} />
                          </div>
                        </div>
                     </div>
                   ))}
                </motion.div>
              )}

              {activeView === 'memory' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    {(human.memories || []).slice(0, 8).map((m: any, i: number) => (
                      <div key={i} className="p-3 bg-surface-dim border border-border/40 rounded relative overflow-hidden group">
                         <div className="absolute top-0 left-0 w-[2px] h-full bg-info/40 group-hover:bg-info transition-colors" />
                         <p className="italic text-[11px] text-text-dim leading-relaxed">"{m.description || 'Accessing engram memory pattern...'}"</p>
                         <div className="mt-1 flex justify-between items-center text-[7px] font-mono text-text-dark uppercase">
                            <span>Rel: {m.intensity?.toFixed(2) || '0.50'}</span>
                            <span>{new Date().toLocaleTimeString()}</span>
                         </div>
                      </div>
                    ))}
                    {(!human.memories || human.memories.length === 0) && (
                      <div className="p-10 text-center text-text-dark opacity-50 italic text-[10px]">Neural logs empty. Subject has no recent long-term memories.</div>
                    )}
                </motion.div>
              )}
            </div>

        {/* Operation Status */}
        <div className="space-y-4">
           {/* Current Action */}
           <div className="bg-surface-dim border border-primary/30 rounded-lg p-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <div className="flex justify-between items-start mb-2">
                 <span className="text-[9px] font-mono text-text-dark uppercase tracking-[0.2em]">{human.name} State</span>
                 <span className="text-[12px] font-headline font-bold text-primary italic transition-all group-hover:scale-105">
                    {Math.round(100 - (human.cognitiveLoad || 0))}%
                 </span>
              </div>
              <div className="text-[13px] font-medium text-text mb-3 uppercase tracking-wider italic leading-tight">
                 {human.thought || 'Processing environmental stimuli...'}
              </div>
              <div className="relative h-1.5 w-full bg-border rounded-full overflow-hidden">
                 <motion.div 
                   animate={{ width: ['20%', '100%'] }}
                   transition={{ duration: 15, repeat: Infinity }}
                   className="h-full bg-primary shadow-neon-small"
                 />
              </div>
              <div className="flex justify-between items-center mt-2.5 text-[9px] font-mono text-text-dark uppercase tracking-tighter">
                 <span>NEURAL_LOAD: {Math.round(human.cognitiveLoad || 0)}%</span>
                 <span className="text-primary/60">Path: {human.neuroStability > 70 ? 'Optimal' : 'Distorted'}</span>
              </div>
           </div>

           {/* Queued Action */}
           <div className="bg-surface-dim border border-border rounded-lg p-4 opacity-50">
              <span className="text-[9px] font-mono text-text-dark uppercase tracking-widest mb-2 block">Next Action (Queued)</span>
              <div className="text-[12px] font-medium text-text mb-3 uppercase tracking-wide italic">
                 Return to Base and Rest
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono">
                 <span className="text-text-dark uppercase">Priority: High</span>
                 <span className="text-text-dark font-bold">65%</span>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
