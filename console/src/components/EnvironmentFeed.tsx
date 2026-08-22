
import React from 'react';
import { motion } from 'motion/react';
import { Eye, Wind, Droplets, Sun, TrendingUp, Info } from 'lucide-react';
import { WorldSnapshot } from '../sim/types';

interface EnvironmentFeedProps {
  snapshot: WorldSnapshot;
}

export const EnvironmentFeed: React.FC<EnvironmentFeedProps> = ({ snapshot }) => {
  return (
    <div className="hud-border hud-border-tl hud-border-tr hud-border-bl hud-border-br overflow-hidden flex flex-col h-full bg-black/40">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-primary/5">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-[10px] font-headline font-bold text-primary uppercase tracking-[0.2em]">LIVE_ENVIRONMENT_FEED</span>
          <div className="flex items-center gap-2 ml-4">
             <div className="w-1 h-1 rounded-full bg-red-500 animate-ping" />
             <span className="text-[8px] font-mono text-red-500 font-bold uppercase tracking-tighter">REC</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[8px] font-mono text-dim">
           <span className="text-primary/60">CAM_NODE: 04-B</span>
           <span>FR_RATE: 60 FPS</span>
        </div>
      </div>

      {/* Cinematic Feed Image - Using a placeholder that looks like an island */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <img 
          src="https://images.unsplash.com/photo-1544735032-6a71fd64446b?auto=format&fit=crop&q=80&w=1200" 
          alt="Island Feed" 
          className="w-full h-full object-cover opacity-60 mix-blend-luminosity grayscale hover:grayscale-0 transition-all duration-1000"
          referrerPolicy="no-referrer"
        />
        
        {/* HUD Elements Over Feed */}
        <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
           <div className="flex justify-between items-start">
              <div className="space-y-4">
                 {[1,2,3].map(i => (
                    <div key={i} className="flex flex-col gap-1">
                       <div className="w-32 h-[1px] bg-primary/20 relative">
                          <motion.div 
                            animate={{ x: ['0%', '100%'], opacity: [0, 1, 0] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                            className="absolute inset-0 bg-primary/60 w-4 h-full"
                          />
                       </div>
                    </div>
                 ))}
              </div>
              <div className="text-right space-y-1">
                 <div className="text-[9px] font-mono text-primary font-bold">LAT: 04.9213</div>
                 <div className="text-[9px] font-mono text-primary font-bold">LON: 105.4412</div>
                 <div className="text-[9px] font-mono text-primary font-bold">ALT: 12M</div>
              </div>
           </div>

           <div className="flex justify-between items-end">
              <div className="bg-black/60 backdrop-blur-sm p-4 hud-border border-primary/20 space-y-3">
                 <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-3 h-3 text-tertiary" />
                    <span className="text-[9px] font-headline font-bold text-tertiary uppercase">Bio-Analytics</span>
                 </div>
                 <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div className="flex flex-col">
                       <span className="text-[7px] font-mono text-dim uppercase">Pop_Density</span>
                       <span className="text-sm font-mono font-bold text-primary">60_UNIT</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[7px] font-mono text-dim uppercase">Success_Rate</span>
                       <span className="text-sm font-mono font-bold text-tertiary">82%</span>
                    </div>
                 </div>
              </div>
              
              <div className="flex flex-col items-end gap-2 text-primary opacity-40">
                 <div className="flex gap-2">
                    <Wind className="w-4 h-4" />
                    <Droplets className="w-4 h-4" />
                    <Sun className="w-4 h-4" />
                 </div>
                 <span className="text-[8px] font-mono uppercase tracking-[0.4em]">Environmental_Sync_Active</span>
              </div>
           </div>
        </div>

        {/* Scanline / Grid overlay on images */}
        <div className="absolute inset-0 scanline opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* Feed Bottom Controls Bar */}
      <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between bg-black/40">
         <div className="flex gap-6">
            <div className="flex items-center gap-2">
               <span className="text-[8px] font-mono text-dim uppercase">Temp</span>
               <span className="text-[10px] font-mono text-primary font-bold">28.4°C</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[8px] font-mono text-dim uppercase">Hum</span>
               <span className="text-[10px] font-mono text-primary font-bold">72%</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[8px] font-mono text-dim uppercase">Wind</span>
               <span className="text-[10px] font-mono text-primary font-bold">12 km/h</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[8px] font-mono text-dim uppercase">UV</span>
               <span className="text-[10px] font-mono text-primary font-bold">UV 6</span>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <Droplets className="w-3 h-3 text-tertiary" />
            <span className="text-[8px] font-headline font-bold text-tertiary uppercase tracking-widest">Water Quality: 92%</span>
            <Info className="w-3 h-3 text-dim hover:text-primary cursor-pointer transition-colors" />
         </div>
      </div>
    </div>
  );
};
