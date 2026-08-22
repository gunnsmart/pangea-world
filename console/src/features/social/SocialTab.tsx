
import React from 'react';
import { motion } from 'motion/react';
import { WorldSnapshot, Tribe, HumanState, TribeRelation } from '../../sim/types';
import { SocialMatrix } from '../../components/SocialMatrix';
import { FamilyTree } from '../../components/FamilyTree';
import { Users, Globe, BookOpen, Warehouse, MapPin, Shield, Star, Share2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SocialTabProps {
  snapshot: WorldSnapshot;
}

export const SocialTab: React.FC<SocialTabProps> = ({ snapshot }) => {
  const { tribes = [], humans = [] } = snapshot;

  const cohesion = humans.length > 0 ? (humans.reduce((acc, h) => {
    const rels = Object.values(h.emotions?.relationships || {}) as any[];
    if (rels.length === 0) return acc + 50;
    return acc + (rels.reduce((rAcc: number, r) => rAcc + (r.trust || 0), 0) / rels.length);
  }, 0) / humans.length) : 0;

  const conflict = humans.length > 0 ? (humans.reduce((acc, h) => {
    const rels = Object.values(h.emotions?.relationships || {}) as any[];
    if (rels.length === 0) return acc;
    return acc + (rels.reduce((rAcc: number, r) => rAcc + (r.conflict || 0), 0) / rels.length);
  }, 0) / humans.length) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-8 pb-48"
    >
      {/* Topology & Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Social Entropy Dashboard */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          <div className="glass-panel p-6 border border-primary/20 rounded-3xl relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Users className="w-16 h-16 text-primary" />
            </div>
            <div className="text-[10px] font-headline font-bold text-primary/40 uppercase tracking-[0.2em] mb-4">Neural_Social_Entropy</div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[9px] font-mono text-dim uppercase">Collective_Cohesion</span>
                  <span className="text-xl font-mono font-bold text-primary">{cohesion.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${cohesion}%` }} className="h-full bg-primary shadow-neon" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[9px] font-mono text-dim uppercase">Conflict_Potential</span>
                  <span className="text-xl font-mono font-bold text-error">{conflict.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${conflict}%` }} className="h-full bg-error shadow-[0_0_10px_rgba(255,62,62,0.5)]" />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="text-[8px] font-headline font-bold text-dim uppercase mb-2">Active_Pathways</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-white/5 rounded-xl border border-white/5 text-center">
                    <div className="text-[12px] font-mono text-tertiary font-bold">{humans.length * 2}</div>
                    <div className="text-[7px] text-dim uppercase">Sync_Nodes</div>
                  </div>
                  <div className="p-2 bg-white/5 rounded-xl border border-white/5 text-center">
                    <div className="text-[12px] font-mono text-secondary font-bold">{tribes.length}</div>
                    <div className="text-[7px] text-dim uppercase">Tribe_Cores</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Share2 className="w-5 h-5 text-primary" />
               </div>
               <div>
                  <h2 className="text-xl font-headline font-bold tracking-tighter uppercase">Topology</h2>
                  <div className="text-[8px] font-mono text-dim tracking-[0.2em] uppercase">Emergent Relationship Networks</div>
               </div>
            </div>
          </div>
          <FamilyTree humans={humans} />
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/20">
                  <Globe className="w-5 h-5 text-secondary" />
               </div>
               <div>
                  <h2 className="text-xl font-headline font-bold tracking-tighter uppercase">Affinity Matrix</h2>
                  <div className="text-[8px] font-mono text-dim tracking-[0.2em] uppercase">High-dimensional state</div>
               </div>
            </div>
          </div>
          <SocialMatrix humans={humans} />
        </div>
      </div>

      {/* Tribes Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/20">
                  <Users className="w-6 h-6 text-secondary" />
               </div>
               <div>
                  <h2 className="text-2xl font-headline font-bold tracking-tighter">Tribal Registry</h2>
                  <div className="text-[10px] font-mono text-dim tracking-[0.2em] uppercase">Active cultural structures</div>
               </div>
            </div>

            <div className="space-y-4">
                {tribes.map(tribe => (
                  <TribeCard key={tribe.id} tribe={tribe} humans={humans} allTribes={tribes} />
                ))}
                {tribes.length === 0 && (
                  <div className="glass p-8 text-center text-dim text-sm italic">
                    No tribes have formed in this cycle...
                  </div>
                )}
            </div>
        </div>

        {/* Diplomacy & Relations */}
        <div className="space-y-4">
           <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Globe className="w-6 h-6 text-primary" />
               </div>
               <div>
                  <h2 className="text-2xl font-headline font-bold tracking-tighter">Global Diplomacy</h2>
                  <div className="text-[10px] font-mono text-dim tracking-[0.2em] uppercase">Inter-tribal Geopolitics</div>
               </div>
            </div>
            
           <div className="glass rounded-3xl p-8 space-y-6">
             <div className="space-y-4">
                {tribes.length > 1 ? (
                  <div className="space-y-6">
                    {tribes.map(tA => (
                      <div key={`dip-${tA.id}`} className="space-y-3">
                        <div className="text-[10px] font-mono text-primary font-bold uppercase tracking-widest">{tA.name} Relations</div>
                        <div className="grid grid-cols-1 gap-2">
                           {(Object.values(tA.relations || {}) as TribeRelation[]).map(rel => {
                             const other = tribes.find(t => t.id === rel.tribeId);
                             if (!other) return null;
                             return (
                               <div key={`${tA.id}-to-${rel.tribeId}`} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                 <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-[10px] font-bold">
                                     {other.name[0]}
                                   </div>
                                   <span className="text-xs font-headline font-bold">{other.name}</span>
                                 </div>
                                 <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-end">
                                       <span className="text-[8px] font-mono text-dim uppercase">Trust</span>
                                       <span className="text-xs font-mono text-primary">{Math.round(rel.trust)}%</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                       <span className="text-[8px] font-mono text-dim uppercase">Hostility</span>
                                       <span className={cn("text-xs font-mono", rel.hostility > 50 ? "text-error" : "text-dim")}>
                                         {Math.round(rel.hostility)}%
                                       </span>
                                    </div>
                                    {rel.alliance && (
                                       <div className="px-2 py-1 rounded bg-secondary/20 border border-secondary/40 text-[8px] font-headline font-bold text-secondary uppercase animate-pulse">
                                         ALLIED
                                       </div>
                                    )}
                                 </div>
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-dim text-sm italic opacity-50">
                    Diplomacy requires multiple tribal units to engage in interaction...
                  </div>
                )}
             </div>

             <div className="pt-6 border-t border-white/5">
                <div className="flex items-center gap-3 mb-4">
                   <BookOpen className="w-5 h-5 text-tertiary" />
                   <h3 className="text-lg font-headline font-bold tracking-tighter">Rules of Engagement</h3>
                </div>
                <div className="space-y-4">
                  <InsightItem 
                      title="Trust & Hostility" 
                      description="Trust reflects the reliability of a tribe. Hostility increases if resource zones overlap or during scarcity events."
                      icon={Shield}
                      color="text-primary"
                  />
                  <InsightItem 
                      title="Alliances" 
                      description="Highly trusting tribes can form alliances, allowing shared home bases and faster knowledge synthesis."
                      icon={Star}
                      color="text-secondary"
                  />
                </div>
             </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

interface TribeCardProps {
  tribe: Tribe;
  humans: HumanState[];
  allTribes: Tribe[];
}

const TribeCard: React.FC<TribeCardProps> = ({ tribe, humans, allTribes }) => {
  const members = humans.filter(h => tribe.memberIds.includes(h.id));

  return (
    <div className="glass rounded-3xl p-6 border border-primary/10 hover:border-primary/30 transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-all" />
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="text-2xl font-headline font-bold tracking-tighter text-primary">{tribe.name}</h4>
          <div className="text-[8px] font-mono text-dim tracking-[0.2em] uppercase">ID: {tribe.id}</div>
        </div>
        <div className="flex -space-x-2">
          {members.map(m => (
            <div 
              key={m.id} 
              className="w-8 h-8 rounded-full bg-surface border border-white/20 flex items-center justify-center text-[10px] font-bold shadow-lg"
              title={m.name}
            >
              {m.name[0]}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <div className="glass-lighter p-3 rounded-2xl border border-white/5 flex items-center gap-3">
            <Warehouse className="w-4 h-4 text-secondary" />
            <div>
               <div className="text-[8px] font-headline font-bold text-dim uppercase">Storefront</div>
               <div className="text-xs font-mono font-bold text-secondary">{tribe.sharedInventory?.length || 0} ITEMS</div>
            </div>
         </div>
         <div className="glass-lighter p-3 rounded-2xl border border-white/5 flex items-center gap-3">
            <MapPin className="w-4 h-4 text-tertiary" />
            <div>
               <div className="text-[8px] font-headline font-bold text-dim uppercase">Home Base</div>
               <div className="text-xs font-mono font-bold text-tertiary">
                {tribe.homePos ? `(${Math.round(tribe.homePos.x)}, ${Math.round(tribe.homePos.y)})` : 'NOMADIC'}
               </div>
            </div>
         </div>
      </div>

      {/* Collective Knowledge */}
      <div className="mt-6 space-y-2">
         <div className="text-[8px] font-headline font-bold text-dim uppercase tracking-widest pl-1">Collective Knowledge Pool</div>
         <div className="flex flex-wrap gap-2">
            {tribe.collectiveKnowledge.length > 0 ? (
              tribe.collectiveKnowledge.map(k => (
                <span key={k.title} className="px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-[9px] font-mono text-primary uppercase">
                  {k.title}
                </span>
              ))
            ) : (
              <span className="text-[9px] text-dim italic opacity-50 pl-1">Knowledge will accumulate as members learn...</span>
            )}
         </div>
      </div>
      {/* Relational Status */}
      {Object.keys(tribe.relations || {}).length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap gap-4">
          {(Object.values(tribe.relations || {}) as TribeRelation[]).map(rel => {
              const other = allTribes.find(t => t.id === rel.tribeId);
              if (!other) return null;
              return (
                <div key={`rel-mini-${rel.tribeId}`} className="flex items-center gap-2">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]",
                    rel.alliance ? "text-secondary" : rel.hostility > 40 ? "text-error" : "text-primary"
                  )} />
                  <span className="text-[9px] font-mono text-dim uppercase tracking-tighter">{other.name}</span>
                </div>
              );
          })}
        </div>
      )}
    </div>
  );
};

const InsightItem = ({ title, description, icon: Icon, color }: any) => (
  <div className="flex gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all group">
     <div className={cn("w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-primary/20 transition-all", color)}>
        <Icon className="w-5 h-5" />
     </div>
     <div className="space-y-1">
        <h4 className="text-sm font-headline font-bold tracking-tight text-white/90">{title}</h4>
        <p className="text-xs text-dim leading-relaxed">{description}</p>
     </div>
  </div>
);
