import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WorldSnapshot } from '../../sim/types';
import { cn } from '../../lib/utils';

interface CraftingTabProps {
  snapshot: WorldSnapshot;
}

export const CraftingTab: React.FC<CraftingTabProps> = ({ snapshot }) => {
  const [activeSubject, setActiveSubject] = useState(0);
  const [activeTab, setActiveTab] = useState<'inventory' | 'world'>('inventory');
  const human = snapshot.humans[activeSubject];

  if (!human) return <div className="p-10 text-center font-mono text-text-dark">INVENTORY OFFLINE</div>;

  return (
    <div className="flex flex-col h-full bg-background pb-28">
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

      {/* Category Nav */}
      <div className="flex bg-surface-dim border-b border-border/40 p-2 gap-1 sticky top-11 z-20 shadow-md">
        {[
          { id: 'inventory', label: 'Inventory', icon: '🎒' },
          { id: 'world', label: 'World Items', icon: '🌍' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 px-4 py-1.5 text-[10px] font-headline font-bold uppercase tracking-tighter transition-all rounded border whitespace-nowrap",
              activeTab === tab.id ? "bg-primary/20 border-primary text-primary" : "bg-surface border-border text-text-dark"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'inventory' && (
            <motion.div key="inv" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
               <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                     <h4 className="text-[10px] font-headline font-bold text-text-dim uppercase tracking-widest">Backpack ({(human.inventory?.items || []).length}/20)</h4>
                     <span className="text-[9px] font-mono text-text-dark uppercase">Encumbrance: {Math.min(100, Math.round(((human.inventory?.items || []).length / 20) * 100))}%</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3">
                     {(human.inventory?.items || []).map((stack, i) => (
                       <div key={i} className="aspect-square rounded border bg-surface-dim border-border/60 hover:border-primary cursor-pointer active:scale-95 flex flex-col items-center justify-center relative group transition-all">
                           <span className="text-xl group-hover:scale-110 transition-transform">{stack.id === 'wood' ? '🪵' : stack.id === 'stone' ? '🪨' : stack.id === 'food' || stack.id === 'meat' ? '🥩' : stack.id === 'fruit' ? '🍎' : stack.id === 'herbs' ? '🌿' : '📦'}</span>
                           <span className="absolute bottom-1 right-1 text-[8px] font-mono text-text-dark font-bold">{stack.quantity}</span>
                           {stack.category === 'crafted' && <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-secondary shadow-neon-small" />}
                       </div>
                     ))}
                     {Array(Math.max(0, 16 - (human.inventory?.items || []).length)).fill(null).map((_, i) => (
                       <div key={`empty-${i}`} className="aspect-square rounded border bg-surface/30 border-border/20 border-dashed" />
                     ))}
                  </div>
               </div>

               {human.inventory?.items && human.inventory.items.length > 0 && (
                 <div className="hud-panel p-4 bg-surface-dim border-primary/20">
                    <h5 className="text-[9px] font-mono text-text-dark uppercase mb-3">Item Details</h5>
                    <div className="flex gap-4">
                       <div className="w-12 h-12 bg-surface rounded border border-border flex items-center justify-center text-2xl">{human.inventory.items[0].id === 'wood' ? '🪵' : human.inventory.items[0].id === 'stone' ? '🪨' : human.inventory.items[0].id === 'food' || human.inventory.items[0].id === 'meat' ? '🥩' : human.inventory.items[0].id === 'fruit' ? '🍎' : human.inventory.items[0].id === 'herbs' ? '🌿' : '📦'}</div>
                       <div className="flex-1">
                          <p className="text-[12px] font-headline font-bold text-primary tracking-widest uppercase">{human.inventory.items[0].name}</p>
                          <p className="text-[9px] text-text-dim leading-tight italic mt-1">A resource gathered from the island.</p>
                       </div>
                    </div>
                 </div>
               )}
            </motion.div>
          )}

          {activeTab === 'world' && (
            <motion.div key="world" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
               <div className="flex items-center gap-3 bg-surface p-2 rounded border border-border/40">
                  <span className="text-text-dark ml-1 italic opacity-60">Search around...</span>
                  <div className="flex-1" />
                  <button className="p-1 px-2 text-[9px] font-headline font-bold uppercase text-primary border border-primary/40 rounded bg-primary/5 hover:bg-primary/20 transition-all">Scan</button>
               </div>

               <div className="space-y-2.5">
                  {[
                    { icon: '🥥', name: 'Fallen Coconut', dist: '2m', detail: 'Could be food or water' },
                    { icon: '🦴', name: 'Scattered Bones', dist: '5m', detail: 'Material for early tools' },
                    { icon: '🌱', name: 'Strange Herb', dist: '8m', detail: 'Properties unknown' },
                    { icon: '🧱', name: 'Large Flat Stone', dist: '12m', detail: 'Base material' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-surface-dim border border-border/20 rounded hover:border-secondary transition-all group">
                       <span className="text-xl group-hover:rotate-12 transition-transform">{item.icon}</span>
                       <div className="flex-1">
                          <p className="text-[11px] font-medium text-text-dim">{item.name}</p>
                          <p className="text-[9px] text-text-dark uppercase tracking-tighter">{item.detail}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-mono text-secondary font-bold">{item.dist}</p>
                          <button className="text-[8px] font-headline font-bold uppercase text-primary tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Gather</button>
                       </div>
                    </div>
                  ))}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
