
import React from 'react';
import { motion } from 'motion/react';
import { WorldSnapshot } from '../../sim/types';
import { PixiMap } from '../../components/PixiMap';

interface MapTabProps {
  snapshot: WorldSnapshot;
  onIntervention?: (type: string) => void;
}

import { useUIStore } from '../../store/useUIStore';
import { Eye, EyeOff, Brain, ShieldAlert, Radio, Users2, Crosshair, ChevronRight, Thermometer, CloudRain, View, Zap, Sun, Wind, FlaskConical } from 'lucide-react';
import { cn } from '../../lib/utils';

export const MapTab: React.FC<MapTabProps> = ({ snapshot, onIntervention }) => {
  const toggleLayer = useUIStore(state => state.toggleLayer);
  const mapLayers = useUIStore(state => state.mapLayers);
  const selectedAgentId = useUIStore(state => state.selectedAgentId);
  const selectAgent = useUIStore(state => state.selectAgent);
  
  const humans = snapshot.humans || [];
  const selectedHuman = humans.find(h => h.id === selectedAgentId);

  const interventions = [
    { id: 'SOLAR_FLARE', label: 'Solar Flare', icon: Sun, color: 'text-orange-500', desc: 'Temp spike + Fire' },
    { id: 'AERO_BLOOM', label: 'Aero Bloom', icon: Wind, color: 'text-blue-400', desc: 'Moisture + Plant heal' },
    { id: 'STASIS_PROTOCOL', label: 'Stasis Protocol', icon: Zap, color: 'text-yellow-400', desc: 'Neural calm + Heal' },
    { id: 'RESOURCE_INJECTION', label: 'Forge Infusion', icon: FlaskConical, color: 'text-primary', desc: 'Fertility boost' },
  ];

  const handleIntervention = (id: string) => {
    if (onIntervention) {
      onIntervention(id);
    }
  };

  const layersList = [
    { id: 'entities', label: 'Life Signatures', icon: Users2 },
    { id: 'vision', label: 'Vision Scopes', icon: View },
    { id: 'memory', label: 'Spatial Memory', icon: Brain },
    { id: 'heat', label: 'Thermal Pattern', icon: Thermometer },
    { id: 'moisture', label: 'Atmospheric Flux', icon: CloudRain },
    { id: 'trauma', label: 'Danger Zones', icon: ShieldAlert },
    { id: 'stigmergy', label: 'Audio/Visual Signals', icon: Radio },
  ];

  return (
    <motion.div 
      key="map"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 overflow-hidden relative"
    >
      {/* Map Content */}
      <div className="flex-1 flex justify-center items-center p-2 sm:p-4 relative min-h-[300px] sm:min-h-[500px]">
        <PixiMap snapshot={snapshot} className="w-full h-full max-w-4xl aspect-square" />
      </div>

      {/* Layer Sidebar */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 py-2 sm:py-4 pr-0 lg:pr-4">
        <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col gap-6 overflow-hidden">
           <div className="flex flex-col">
             <h3 className="text-sm font-headline font-bold text-white tracking-widest uppercase">Visual_Layers</h3>
             <span className="text-[8px] font-mono text-dim tracking-[0.2em] uppercase">Subsurface_Data_Toggles</span>
           </div>

           <div className="space-y-2 overflow-y-auto no-scrollbar pr-1">
             {layersList.map(layer => (
               <button
                 key={layer.id}
                 onClick={() => toggleLayer(layer.id as any)}
                 className={cn(
                   "w-full flex items-center justify-between p-3 rounded-2xl border transition-all",
                   mapLayers[layer.id as keyof typeof mapLayers]
                    ? "bg-primary/20 border-primary/40 text-white shadow-neon-dim"
                    : "bg-white/5 border-white/5 text-dim hover:text-white/60"
                 )}
               >
                 <div className="flex items-center gap-3">
                    <layer.icon className={cn("w-3.5 h-3.5", mapLayers[layer.id as keyof typeof mapLayers] ? "text-primary" : "text-dim")} />
                    <span className="text-[10px] font-headline font-bold tracking-tight uppercase whitespace-nowrap">{layer.label}</span>
                 </div>
                 {mapLayers[layer.id as keyof typeof mapLayers] ? <Eye className="w-3 h-3 text-primary" /> : <EyeOff className="w-3 h-3 text-dim font-bold" />}
               </button>
             ))}
           </div>
        </div>

        {/* Protocol Alpha: Architect Interventions */}
        <div className="glass rounded-3xl p-6 border border-primary/20 bg-primary/5 flex flex-col gap-4">
           <div className="flex flex-col">
             <h3 className="text-sm font-headline font-bold text-primary tracking-widest uppercase flex items-center gap-2">
               Protocol_Alpha
               <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
             </h3>
             <span className="text-[8px] font-mono text-dim tracking-[0.2em] uppercase">Architect_Intervention_Pad</span>
           </div>

           <div className="grid grid-cols-2 gap-2">
              {interventions.map(action => (
                <button
                  key={action.id}
                  onClick={() => handleIntervention(action.id)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-primary/10 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <action.icon className={cn("w-5 h-5 mb-1 transition-transform group-hover:scale-110", action.color)} />
                  <span className="text-[8px] font-headline font-bold text-white uppercase tracking-tighter">{action.label}</span>
                  <div className="absolute inset-0 flex items-center justify-center bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-center text-wrap overflow-hidden">
                    <span className="text-[7px] font-mono text-primary leading-tight uppercase">{action.desc}</span>
                  </div>
                </button>
              ))}
           </div>
        </div>

        {/* Agent Memory Inspector */}
        <div className="glass rounded-3xl p-6 border border-white/5 flex-1 flex flex-col min-h-0">
           <div className="flex flex-col mb-6">
             <h3 className="text-sm font-headline font-bold text-white tracking-widest uppercase">Amnesia_Core</h3>
             <span className="text-[8px] font-mono text-dim tracking-[0.2em] uppercase">Extracted_Biometric_Memory</span>
           </div>

           {selectedHuman ? (
             <div className="flex-1 flex flex-col min-h-0 space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                   <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                     <span className="text-xl font-headline font-bold text-primary">{selectedHuman.name[0]}</span>
                   </div>
                   <div>
                     <h4 className="text-lg font-headline font-bold text-white leading-none">{selectedHuman.name}</h4>
                     <span className="text-[8px] font-mono text-primary/60 uppercase">{selectedHuman.gender === 'm' ? 'MALE' : 'FEMALE'} _ SUBJECT</span>
                   </div>
                   <button onClick={() => selectAgent(null)} className="ml-auto p-2 text-dim hover:text-white transition-colors">
                     <Crosshair className="w-4 h-4" />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-3">
                   <div className="text-[8px] font-headline font-bold text-dim uppercase tracking-widest px-2">Memory_Nodes</div>
                   {(selectedHuman.spatialAssociations || []).length > 0 ? (
                     selectedHuman.spatialAssociations?.map((sa, i) => (
                       <div key={`sa-${i}`} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                         <div className="flex justify-between items-start mb-1">
                            <span className={cn(
                              "text-[9px] font-mono font-bold uppercase",
                              sa.intensity > 0 ? "text-primary" : "text-error"
                            )}>{sa.type}</span>
                            <span className="text-[8px] font-mono text-dim">CONF: {Math.round(sa.confidence * 100)}%</span>
                         </div>
                         <p className="text-[10px] text-text/80 leading-tight mb-2 line-clamp-2 italic">"{sa.description}"</p>
                         <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                               {Array.from({ length: 5 }).map((_, j) => (
                                 <div key={j} className={cn(
                                   "w-1 h-1 rounded-full",
                                   j < (sa.confidence * 5) ? "bg-primary" : "bg-white/10"
                                 )} />
                               ))}
                            </div>
                            <ChevronRight className="w-3 h-3 text-dim group-hover:text-primary transition-colors" />
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="text-center py-12 text-dim text-[10px] italic opacity-50 px-4">
                       No significant spatial memories recorded for this subject yet.
                     </div>
                   )}
                </div>
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                   <Crosshair className="w-8 h-8 text-dim/20" />
                </div>
                <div className="space-y-2">
                   <p className="text-xs text-dim italic">Select a subject from the NEXUS to inspect their neural spatial maps.</p>
                   <button 
                    onClick={() => useUIStore.getState().setActiveTab('agents')}
                    className="text-[10px] font-headline font-bold text-primary uppercase tracking-widest hover:underline"
                   >
                     Go to Nexus
                   </button>
                </div>
             </div>
           )}
        </div>
      </div>
    </motion.div>
  );
};
