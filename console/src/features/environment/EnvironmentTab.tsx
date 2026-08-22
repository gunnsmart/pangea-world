import React from 'react';
import { WorldSnapshot } from '../../sim/types';
import { SimulationKPIs } from '../../components/SimulationKPIs';
import { MapTab } from '../map/MapTab';

interface EnvironmentTabProps {
  snapshot: WorldSnapshot;
  vitalityHistory: { time: number; value: number }[];
  vitalityIndex: number;
}

export const EnvironmentTab: React.FC<EnvironmentTabProps> = ({ snapshot }) => {
  return (
    <div className="flex flex-col gap-4 p-4 pb-24 overflow-y-auto custom-scrollbar h-full bg-background">
      
      {/* Simulation Performance Dashboard */}
      <SimulationKPIs snapshot={snapshot} />

      {/* Persistence Mapping (WebGL) */}
      <MapTab snapshot={snapshot} />

      {/* Environment Metrics */}
      <div className="hud-panel p-4 bg-surface-dim">
        <span className="text-[9px] font-headline font-bold text-text-dark uppercase tracking-widest block mb-3">🌤 ENVIRONMENT</span>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-bright border border-border rounded p-2 text-center">
            <span className="text-sm font-headline font-bold text-caution leading-none">{snapshot.globalTemp.toFixed(1)}°C</span>
            <span className="text-[8px] font-mono text-text-dark block mt-1">🌡 Temp.</span>
          </div>
          <div className="bg-surface-bright border border-border rounded p-2 text-center">
            <span className="text-sm font-headline font-bold text-info leading-none">{Math.round(snapshot.globalMoisture * 100)}%</span>
            <span className="text-[8px] font-mono text-text-dark block mt-1">💧 Humidity</span>
          </div>
          <div className="bg-surface-bright border border-border rounded p-2 text-center">
            <span className="text-sm font-headline font-bold text-text-dim leading-none uppercase">{snapshot.weather || 'CLEAR'}</span>
            <span className="text-[8px] font-mono text-text-dark block mt-1">☀ Weather</span>
          </div>
        </div>
      </div>

      {/* Biosphere Status */}
      <div className="hud-panel p-4 bg-surface-dim">
        <span className="text-[9px] font-headline font-bold text-text-dark uppercase tracking-widest block mb-3">🌿 BIOSPHERE STATUS</span>
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-surface-bright border border-border rounded p-2 text-center">
             <span className="text-base font-headline font-bold text-text leading-none">{snapshot.animalCount}</span>
             <span className="text-[8px] font-mono text-text-dark block">Fauna</span>
          </div>
          <div className="bg-surface-bright border border-border rounded p-2 text-center">
             <span className="text-base font-headline font-bold text-text leading-none">{Math.round(snapshot.totalBiomass / 1000)}k</span>
             <span className="text-[8px] font-mono text-text-dark block">Flora</span>
          </div>
          <div className="bg-surface-bright border border-border rounded p-2 text-center">
             <span className="text-base font-headline font-bold text-info leading-none">{Math.round(snapshot.globalMoisture * 100)}%</span>
             <span className="text-[8px] font-mono text-text-dark block">Water</span>
          </div>
          <div className="bg-surface-bright border border-border rounded p-2 text-center">
             <span className="text-base font-headline font-bold text-success leading-none">LOW</span>
             <span className="text-[8px] font-mono text-text-dark block">Threat</span>
          </div>
        </div>
      </div>

       {/* Quick Agent Selection */}
       <div className="hud-panel p-4 bg-surface-dim">
          <span className="text-[9px] font-headline font-bold text-text-dark uppercase tracking-widest block mb-3">👥 ACTIVE AGENTS</span>
          <div className="grid grid-cols-2 gap-4">
             {snapshot.humans.map((h) => {
               const highestSkill = Object.entries(h.skills || {}).sort((a,b) => (b[1] as number) - (a[1] as number))[0];
               const role = highestSkill ? highestSkill[0] : 'Survivor';
               const icon = role === 'hunting' ? '🏹' : role === 'botany' ? '🌱' : role === 'crafting' ? '⚒' : role === 'social' ? '🗣' : role === 'navigation' ? '🗺' : '👤';
               
               return (
                 <div 
                   key={h.id} 
                   className="bg-surface-bright border border-border/40 rounded-lg p-3 text-center transition-all hover:border-primary/40 group"
                 >
                   <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{icon}</div>
                   <div className="text-[11px] font-headline font-bold tracking-widest text-text uppercase">{h.name}</div>
                   <div className="text-[8px] font-mono text-text-dark mt-0.5 uppercase tracking-tighter italic">{role.replace('_', ' ')} specialist</div>
                   <div className="mt-2 flex items-center justify-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-success shadow-neon-small animate-pulse" />
                      <span className="text-[9px] font-mono font-bold text-success uppercase">Active</span>
                   </div>
                 </div>
               );
             })}
          </div>
       </div>

    </div>
  );
};
