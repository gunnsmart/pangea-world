
import React, { useMemo } from 'react';
import { WorldSnapshot, Biome } from '../sim/types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface WorldMapProps {
  snapshot: WorldSnapshot;
  className?: string;
}

const BIOME_COLORS: Record<number, string> = {
  [Biome.DEEP_WATER]: '#001a33',
  [Biome.SHALLOW]: '#004d99',
  [Biome.BEACH]: '#e6cc80',
  [Biome.GRASSLAND]: '#4d9900',
  [Biome.TROPICAL]: '#006600',
  [Biome.FOREST]: '#004d00',
  [Biome.MOUNTAIN]: '#666666',
  [Biome.PEAK]: '#ffffff',
  [Biome.DESERT]: '#e6b800',
  [Biome.SWAMP]: '#333300',
  [Biome.TUNDRA]: '#b3d9ff',
};

export const WorldMap: React.FC<WorldMapProps> = ({ snapshot, className }) => {
  const { grid, humans = [], animals = [] } = snapshot;

  const renderedGrid = useMemo(() => {
    if (!grid || grid.length === 0) return null;
    
    return grid.map((row, y) => (
      <div key={y} className="flex">
        {row.map((cell, x) => (
          <div 
            key={`${x}-${y}`} 
            className="w-2 h-2 relative" 
            style={{ backgroundColor: BIOME_COLORS[cell.biome] || '#000' }}
          >
            {/* Moisture Overlay (darker/bluer when wet) */}
            {cell.water > 0.6 && (
              <div 
                className="absolute inset-0 bg-blue-500/20" 
                style={{ opacity: (cell.water - 0.6) * 2 }}
              />
            )}
            {/* Fire Overlay */}
            {cell.fire > 0 && (
              <div 
                className="absolute inset-0 bg-orange-600 animate-pulse" 
                style={{ opacity: Math.min(1, cell.fire / 5) }}
              />
            )}
            {/* Crop/Plant indicator */}
            {cell.plants && cell.plants.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-1 bg-green-400 rounded-full" />
              </div>
            )}
          </div>
        ))}
      </div>
    ));
  }, [grid]);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-primary/20 bg-black/40 p-2", className)}>
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        <div className="text-[8px] font-headline font-bold tracking-widest text-primary/60 uppercase">Tactical Map</div>
        <div className="text-[10px] font-headline font-bold text-white">GRID_50x50</div>
      </div>

      <div className="relative inline-block border border-white/5">
        {renderedGrid}
        
        {/* Render Structures */}
        {(snapshot.structures || []).map(struct => (
          <div
            key={struct.id}
            className="absolute w-2 h-2 -ml-1 -mt-1 z-15"
            style={{ 
              left: `${(struct.pos.x / 50) * 100}%`, 
              top: `${(struct.pos.y / 50) * 100}%` 
            }}
          >
            <div className={cn(
              "w-full h-full rounded-sm border border-white/40",
              struct.type === 'shelter' ? "bg-amber-800" : 
              struct.type === 'campfire' ? "bg-orange-500 animate-pulse" : 
              "bg-gray-600"
            )} />
            {struct.progress < 100 && (
              <div className="absolute bottom-full left-0 w-full h-0.5 bg-gray-800">
                <div className="h-full bg-green-500" style={{ width: `${struct.progress}%` }} />
              </div>
            )}
          </div>
        ))}

        {/* Render Humans */}
        {humans.map(human => (
          <motion.div
            key={human.id}
            initial={false}
            animate={{ 
              left: `${(human.pos.x / 50) * 100}%`, 
              top: `${(human.pos.y / 50) * 100}%` 
            }}
            className="absolute w-3 h-3 -ml-1.5 -mt-1.5 z-20"
          >
            <div className={cn(
              "w-full h-full rounded-full border-2 border-white shadow-[0_0_10px_rgba(255,255,255,0.5)]",
              human.name === 'Adam' ? "bg-blue-500" : "bg-pink-500"
            )} />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1 bg-black/80 text-[8px] font-bold text-white whitespace-nowrap rounded">
              {human.name}
            </div>
          </motion.div>
        ))}

        {/* Render Animals (simplified) */}
        {animals.slice(0, 20).map(animal => (
          <motion.div
            key={animal.id}
            initial={false}
            animate={{ 
              left: `${(animal.pos.x / 50) * 100}%`, 
              top: `${(animal.pos.y / 50) * 100}%` 
            }}
            className="absolute w-1.5 h-1.5 -ml-0.75 -mt-0.75 bg-tertiary/60 rounded-full z-10"
          />
        ))}
      </div>
      
      <div className="mt-2 flex gap-4 overflow-x-auto pb-1">
        {Object.entries(BIOME_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1 shrink-0">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[8px] font-mono text-dim uppercase">{Biome[Number(key)]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
