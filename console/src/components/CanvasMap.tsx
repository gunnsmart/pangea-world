
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { WorldSnapshot, Biome, Point } from '../sim/types';
import { cn } from '../lib/utils';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair } from 'lucide-react';

interface CanvasMapProps {
  snapshot: WorldSnapshot;
  className?: string;
  layers?: {
    memory?: boolean;
    trauma?: boolean;
    stigmergy?: boolean;
    entities?: boolean;
    grid?: boolean;
    heat?: boolean;
    moisture?: boolean;
    vision?: boolean;
  };
}

const BIOME_COLORS: Record<number, string> = {
  [Biome.DEEP_WATER]: '#020617',
  [Biome.SHALLOW]: '#0ea5e9',
  [Biome.BEACH]: '#fde047',
  [Biome.GRASSLAND]: '#22c55e',
  [Biome.TROPICAL]: '#15803d',
  [Biome.FOREST]: '#14532d',
  [Biome.MOUNTAIN]: '#475569',
  [Biome.PEAK]: '#f8fafc',
  [Biome.DESERT]: '#f59e0b',
  [Biome.SWAMP]: '#3f6212',
  [Biome.TUNDRA]: '#94a3b8',
};

import { useUIStore } from '../store/useUIStore';

export const CanvasMap: React.FC<CanvasMapProps> = React.memo(({ snapshot, className, layers }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { grid, humans = [], animals = [], structures = [] } = snapshot;
  
  const selectedAgentId = useUIStore(state => state.selectedAgentId);
  const mapLayersFromStore = useUIStore(state => state.mapLayers);
  const [isFollowMode, setIsFollowMode] = useState(true);
  
  const activeLayers = { 
    entities: mapLayersFromStore.entities, 
    memory: mapLayersFromStore.memory, 
    trauma: mapLayersFromStore.trauma, 
    stigmergy: mapLayersFromStore.stigmergy,
    heat: mapLayersFromStore.heat || layers?.heat,
    moisture: mapLayersFromStore.moisture || layers?.moisture,
    vision: mapLayersFromStore.vision || layers?.vision,
    grid: true, 
    ...layers 
  };

  // View state
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Point>({ x: 0, y: 0 });

  // Follow Mode Logic
  useEffect(() => {
    if (isFollowMode && selectedAgentId) {
      const selectedAgent = humans.find(h => h.id === selectedAgentId);
      if (selectedAgent) {
        // Calculate the offset to center the agent
        // Map size is 50x50, target coords are 25, 25
        const targetX = (25 - selectedAgent.pos.x) * (800 / 50) * zoom;
        const targetY = (25 - selectedAgent.pos.y) * (800 / 50) * zoom;
        
        // Smoothly interpolate toward target? 
        // For now just quick set to avoid lag during drag override
        if (!isDragging) {
           setOffset({ x: targetX, y: targetY });
        }
      }
    }
  }, [selectedAgentId, humans, zoom, isFollowMode, isDragging]);

  // 1. Offscreen Cache for Terrain (Update only when grid changes or first time)
  useEffect(() => {
    if (!grid || grid.length === 0) return;
    
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = 1000;
      offscreenCanvasRef.current.height = 1000;
    }

    const oCtx = offscreenCanvasRef.current.getContext('2d');
    if (!oCtx) return;

    const cellSize = 1000 / 50;

    oCtx.clearRect(0, 0, 1000, 1000);
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        oCtx.fillStyle = BIOME_COLORS[cell.biome] || '#000';
        oCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      });
    });
  }, [grid]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellSize = (width / 50) * zoom;
    const centerX = width / 2 + offset.x;
    const centerY = height / 2 + offset.y;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(centerX - (25 * cellSize), centerY - (25 * cellSize));

    // 2. Draw Cached Terrain
    if (offscreenCanvasRef.current) {
        ctx.drawImage(offscreenCanvasRef.current, 0, 0, cellSize * 50, cellSize * 50);
    }

    // 3. Dynamic Terrain Effects (Moisture, Fire, Plants)
    if (grid) {
        grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                const px = x * cellSize;
                const py = y * cellSize;

                // Fire Overlay
                if (cell.fire > 0) {
                    const firePulse = 0.6 + Math.sin(Date.now() / 200) * 0.4;
                    ctx.fillStyle = `rgba(234, 88, 12, ${Math.min(0.8, cell.fire / 5) * firePulse})`;
                    ctx.fillRect(px, py, cellSize, cellSize);
                }

                // Heat Overlay
                if (activeLayers.heat && cell.temperature > 0.6) {
                    ctx.fillStyle = `rgba(255, 69, 0, ${(cell.temperature - 0.6) * 0.5})`;
                    ctx.fillRect(px, py, cellSize, cellSize);
                }

                // Moisture / Rain
                if (activeLayers.moisture && cell.moisture > 0.5) {
                    ctx.fillStyle = `rgba(0, 191, 255, ${(cell.moisture - 0.5) * 0.4})`;
                    ctx.fillRect(px, py, cellSize, cellSize);
                }

                // Moisture
                if (cell.water > 0.7) {
                    ctx.fillStyle = `rgba(59, 130, 246, ${Math.min(0.4, (cell.water - 0.7) * 2)})`;
                    ctx.fillRect(px, py, cellSize, cellSize);
                }

                // Plants (Growth stages)
                if (cell.plants && cell.plants.length > 0) {
                    cell.plants.forEach(plant => {
                        let radius = cellSize / 8;
                        let color = '#4ade80'; // Default green

                        switch (plant.stage as any) {
                            case 'seed':
                                radius = cellSize / 12;
                                color = '#a3e635'; // Lime
                                break;
                            case 'sprout':
                                radius = cellSize / 10;
                                color = '#84cc16';
                                break;
                            case 'growing':
                                radius = cellSize / 8;
                                color = '#4ade80';
                                break;
                            case 'mature':
                                radius = cellSize / 6;
                                color = '#22c55e';
                                break;
                            case 'dying':
                                radius = cellSize / 8;
                                color = '#713f12'; // Brown
                                break;
                        }

                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(px + cellSize/2, py + cellSize/2, radius, 0, Math.PI * 2);
                        ctx.fill();

                        // Add a "fruit/seed" dot for mature plants
                        if (plant.stage as any === 'mature') {
                            ctx.fillStyle = '#fde047'; // Yellow
                            ctx.beginPath();
                            ctx.arc(px + cellSize/2, py + cellSize/2, radius/3, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    });
                }
            });
        });
    }

    // 4. Grid Lines (Tactical)
    if (activeLayers.grid && zoom > 1.5) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 50; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, 50 * cellSize);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * cellSize); ctx.lineTo(50 * cellSize, i * cellSize);
            ctx.stroke();
        }
    }

    // 5. Structures
    structures.forEach(struct => {
        const sx = struct.pos.x * cellSize;
        const sy = struct.pos.y * cellSize;
        
        ctx.fillStyle = struct.type === 'shelter' ? '#92400e' : (struct.type === 'campfire' ? '#f97316' : '#4b5563');
        if (struct.type === 'campfire') {
            const firePulse = 0.7 + Math.sin(Date.now() / 150) * 0.3;
            ctx.shadowBlur = 10 * firePulse;
            ctx.shadowColor = '#f97316';
        }

        ctx.fillRect(sx - cellSize/2, sy - cellSize/2, cellSize, cellSize);
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - cellSize/2, sy - cellSize/2, cellSize, cellSize);
    });

    // 6. Animals
    animals.forEach(animal => {
        ctx.fillStyle = animal.isDomesticated ? '#60a5fa' : '#2dd4bf';
        ctx.beginPath();
        ctx.arc(animal.pos.x * cellSize, animal.pos.y * cellSize, cellSize/3, 0, Math.PI * 2);
        ctx.fill();
        if (animal.isDomesticated) {
            ctx.strokeStyle = 'white';
            ctx.stroke();
        }
    });

    // 7. Signals (Communication pulses)
    if (activeLayers.stigmergy && snapshot.signals) {
        snapshot.signals.forEach(sig => {
            const sx = sig.pos.x * cellSize;
            const sy = sig.pos.y * cellSize;
            const age = (Date.now() % 1000) / 1000; // Animation phase
            
            ctx.strokeStyle = sig.metadata?.beliefType === 'danger' ? '#ef4444' : '#fbbf24';
            ctx.lineWidth = 2 * (1 - age);
            ctx.beginPath();
            ctx.arc(sx, sy, cellSize * age * 3, 0, Math.PI * 2);
            ctx.stroke();

            if (zoom > 1.5) {
                ctx.fillStyle = 'white';
                ctx.font = '8px monospace';
                ctx.fillText(sig.content, sx + 4, sy - 4);
            }
        });
    }

    // 8. Humans
    humans.forEach(human => {
        const hx = human.pos.x * cellSize;
        const hy = human.pos.y * cellSize;
        const isSelected = human.id === selectedAgentId;

        // 8a. Vision Scopes / LOS
        if (activeLayers.vision && isSelected) {
            const range = 8 * cellSize; // Base vision range
            const gradient = ctx.createRadialGradient(hx, hy, 0, hx, hy, range);
            gradient.addColorStop(0, 'rgba(0, 242, 255, 0.15)');
            gradient.addColorStop(1, 'rgba(0, 242, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            // Simplified Vision Cone (Circular for now as agents don't have rotation in types)
            ctx.arc(hx, hy, range, 0, Math.PI * 2);
            ctx.fill();
            
            // Outer Ring
            ctx.strokeStyle = 'rgba(0, 242, 255, 0.3)';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Glow
        ctx.shadowBlur = isSelected ? 25 : 15;
        ctx.shadowColor = human.name === 'Adam' ? '#00f2ff' : '#00ff9d';
        
        ctx.fillStyle = human.name === 'Adam' ? '#00f2ff' : '#00ff9d';
        ctx.beginPath();
        const bodySize = isSelected ? cellSize/1.2 : cellSize/1.5;
        ctx.arc(hx, hy, bodySize, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.7)';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // Selection HUD Brackets
        if (isSelected) {
            const bSize = bodySize + 4;
            ctx.strokeStyle = '#00f2ff';
            ctx.lineWidth = 1;
            // Top Left
            ctx.beginPath(); ctx.moveTo(hx - bSize, hy - bSize + 4); ctx.lineTo(hx - bSize, hy - bSize); ctx.lineTo(hx - bSize + 4, hy - bSize); ctx.stroke();
            // Top Right
            ctx.beginPath(); ctx.moveTo(hx + bSize, hy - bSize + 4); ctx.lineTo(hx + bSize, hy - bSize); ctx.lineTo(hx + bSize - 4, hy - bSize); ctx.stroke();
            // Bottom Left
            ctx.beginPath(); ctx.moveTo(hx - bSize, hy + bSize - 4); ctx.lineTo(hx - bSize, hy + bSize); ctx.lineTo(hx - bSize + 4, hy + bSize); ctx.stroke();
            // Bottom Right
            ctx.beginPath(); ctx.moveTo(hx + bSize, hy + bSize - 4); ctx.lineTo(hx + bSize, hy + bSize); ctx.lineTo(hx + bSize - 4, hy + bSize); ctx.stroke();
        }

        // Name Tag
        if (zoom > 1.2) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.font = 'bold 10px Inter';
            const tw = ctx.measureText(human.name).width;
            ctx.fillRect(hx - tw/2 - 4, hy + cellSize, tw + 8, 14);
            ctx.fillStyle = 'white';
            ctx.fillText(human.name, hx - tw/2, hy + cellSize + 11);
        }
    });

    // 9. Memory Overlay (Spatial Associations of Selected Agent)
    if (activeLayers.memory && selectedAgentId) {
        const selectedAgent = humans.find(h => h.id === selectedAgentId);
        if (selectedAgent && selectedAgent.spatialAssociations) {
            selectedAgent.spatialAssociations.forEach(sa => {
                const sax = sa.pos.x * cellSize;
                const say = sa.pos.y * cellSize;
                
                // Draw memory node
                const color = sa.intensity > 0 ? '59, 130, 246' : '239, 68, 68';
                const alpha = Math.min(0.6, sa.confidence);
                
                ctx.fillStyle = `rgba(${color}, ${alpha * 0.3})`;
                ctx.beginPath();
                ctx.arc(sax, say, cellSize * (1 + sa.confidence * 2), 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = `rgba(${color}, ${alpha})`;
                ctx.lineWidth = 1;
                ctx.stroke();

                if (sa.intensity < -0.5 && activeLayers.trauma) {
                    const traumaPulse = 0.5 + Math.sin(Date.now() / 300) * 0.5;
                    ctx.strokeStyle = `rgba(239, 68, 68, ${traumaPulse * 0.5})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(sax, say, cellSize * (2 + traumaPulse), 0, Math.PI * 2);
                    ctx.stroke();
                }

                if (zoom > 2) {
                    ctx.fillStyle = 'white';
                    ctx.font = '8px monospace';
                    ctx.fillText(sa.type.toUpperCase(), sax + 4, say - 4);
                }
            });
        }
    }

    ctx.restore();

  }, [snapshot, zoom, offset, activeLayers, grid, humans, animals, structures]);

  useEffect(() => {
    let anim: number;
    const loop = () => {
      draw();
      anim = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(anim);
  }, [draw]);

  // Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(5, Math.max(0.5, z * factor)));
  };

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* HUD Overlays */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <div className="text-[10px] font-mono tracking-tighter">MAP_STRATUM_V6.0</div>
        </div>
        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-lg flex flex-col">
            <span className="text-[8px] text-dim font-bold uppercase tracking-widest">Coordinations</span>
            <span className="text-[10px] font-mono">X: {Math.round(offset.x)} Y: {Math.round(offset.y)}</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button 
          onClick={() => setIsFollowMode(!isFollowMode)} 
          className={cn(
            "p-2 glass rounded-lg transition-all border",
            isFollowMode && selectedAgentId ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-dim"
          )}
          title="Follow Subject"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="p-2 glass rounded-lg hover:bg-white/10 transition-all border border-white/10"><ZoomIn className="w-4 h-4 text-primary" /></button>
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-2 glass rounded-lg hover:bg-white/10 transition-all border border-white/10"><ZoomOut className="w-4 h-4 text-primary" /></button>
        <button onClick={() => { setOffset({x:0, y:0}); setZoom(1); setIsFollowMode(false); }} className="p-2 glass rounded-lg hover:bg-white/10 transition-all border border-white/10"><RotateCcw className="w-4 h-4 text-dim" /></button>
      </div>

      {/* Canvas Container */}
      <div 
        className="w-full aspect-square glass-map rounded-[2.5rem] overflow-hidden border-2 border-primary/20 shadow-2xl relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={800} 
          className="w-full h-full block"
        />
        
        {/* Decorative Grid Lines over the whole container */}
        <div className="absolute inset-0 pointer-events-none grid-pattern opacity-20" />
      </div>

      {/* Biome Legend */}
      <div className="mt-6 flex flex-wrap justify-center gap-4 px-4">
        {Object.entries(BIOME_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-2 px-3 py-1 bg-surface-low/30 rounded-full border border-white/5">
            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: color }} />
            <span className="text-[8px] font-mono text-dim tracking-tighter uppercase">{Biome[Number(key)]}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
