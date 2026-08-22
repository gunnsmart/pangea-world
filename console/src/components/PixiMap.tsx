
import React, { useRef, useEffect, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { WorldSnapshot, Biome } from '../sim/types';
import { useUIStore } from '../store/useUIStore';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair } from 'lucide-react';
import { cn } from '../lib/utils';

interface PixiMapProps {
  snapshot: WorldSnapshot;
  className?: string;
}

const BIOME_COLORS: Record<number, number> = {
  [Biome.DEEP_WATER]: 0x020617,
  [Biome.SHALLOW]: 0x0ea5e9,
  [Biome.BEACH]: 0xfde047,
  [Biome.GRASSLAND]: 0x22c55e,
  [Biome.TROPICAL]: 0x15803d,
  [Biome.FOREST]: 0x14532d,
  [Biome.MOUNTAIN]: 0x475569,
  [Biome.PEAK]: 0xf8fafc,
  [Biome.DESERT]: 0xf59e0b,
  [Biome.SWAMP]: 0x3f6212,
  [Biome.TUNDRA]: 0x94a3b8,
};

const BIOME_COLOR_STRINGS: Record<number, string> = {
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

export const PixiMap: React.FC<PixiMapProps> = ({ snapshot, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const viewportRef = useRef<Container | null>(null);
  const terrainContainerRef = useRef<Graphics | null>(null);
  const entityContainerRef = useRef<Container | null>(null);
  
  const selectedAgentId = useUIStore(state => state.selectedAgentId);
  const mapLayers = useUIStore(state => state.mapLayers);
  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFollowMode, setIsFollowMode] = useState(true);

  // Initialize Pixi
  useEffect(() => {
    if (!containerRef.current) return;

    const app = new Application({
      width: 800,
      height: 800,
      backgroundColor: 0x000000,
      resolution: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      autoDensity: true,
      antialias: true,
    });

    // Handle view element
    const view = app.view as HTMLCanvasElement;
    view.style.width = '100%';
    view.style.height = '100%';
    containerRef.current.appendChild(view);

    const viewport = new Container();
    app.stage.addChild(viewport);

    const terrain = new Graphics();
    viewport.addChild(terrain);

    const entities = new Container();
    viewport.addChild(entities);

    appRef.current = app;
    viewportRef.current = viewport;
    terrainContainerRef.current = terrain;
    entityContainerRef.current = entities;

    return () => {
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    };
  }, []);

  // Handle Updates
  useEffect(() => {
    const app = appRef.current;
    if (!app || !snapshot.grid) return;

    const viewport = viewportRef.current!;
    const terrain = terrainContainerRef.current!;
    const entityContainer = entityContainerRef.current!;

    // 1. Update Terrain
    terrain.clear();
    const cellSize = 800 / 50;
    
    snapshot.grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        const color = BIOME_COLORS[cell.biome] || 0x000000;
        terrain.beginFill(color);
        terrain.drawRect(x * cellSize, y * cellSize, cellSize, cellSize);
        terrain.endFill();
      });
    });

    // Grid lines
    if (mapLayers.grid && zoom > 1.5) {
        terrain.lineStyle(0.5, 0xffffff, 0.05);
        for (let i = 0; i <= 50; i++) {
            terrain.moveTo(i * cellSize, 0); terrain.lineTo(i * cellSize, 800);
            terrain.moveTo(0, i * cellSize); terrain.lineTo(800, i * cellSize);
        }
        terrain.lineStyle(0);
    }

    // 2. Update Entities
    entityContainer.removeChildren();

    // Structures
    snapshot.structures.forEach(struct => {
       const graphics = new Graphics();
       const color = struct.type === 'shelter' ? 0x92400e : (struct.type === 'campfire' ? 0xf97316 : 0x4b5563);
       graphics.beginFill(color);
       graphics.drawRect(struct.pos.x * cellSize - cellSize/2, struct.pos.y * cellSize - cellSize/2, cellSize, cellSize);
       graphics.endFill();
       entityContainer.addChild(graphics);
    });

    // Animals
    snapshot.animals.forEach(animal => {
        const graphics = new Graphics();
        graphics.beginFill(animal.isDomesticated ? 0x60a5fa : 0x2dd4bf);
        graphics.drawCircle(animal.pos.x * cellSize, animal.pos.y * cellSize, cellSize / 3);
        graphics.endFill();
        entityContainer.addChild(graphics);
    });

    // Humans
    snapshot.humans.forEach(human => {
        const isSelected = human.id === selectedAgentId;
        const color = human.name === 'Adam' ? 0x00f2ff : 0x00ff9d;
        const bodySize = isSelected ? cellSize / 1.2 : cellSize / 1.5;

        // Visual group for human
        const humanGroup = new Container();
        
        const body = new Graphics();
        body.beginFill(color);
        body.drawCircle(human.pos.x * cellSize, human.pos.y * cellSize, bodySize);
        body.endFill();
        
        if (isSelected) {
            body.lineStyle(2, 0xffffff);
            body.drawCircle(human.pos.x * cellSize, human.pos.y * cellSize, bodySize + 2);
        }

        humanGroup.addChild(body);
        
        // Vision
        if (mapLayers.vision && isSelected) {
            const range = 8 * cellSize;
            const vision = new Graphics();
            vision.beginFill(0x00f2ff, 0.1);
            vision.lineStyle(1, 0x00f2ff, 0.3);
            vision.drawCircle(human.pos.x * cellSize, human.pos.y * cellSize, range);
            vision.endFill();
            humanGroup.addChild(vision);
        }

        entityContainer.addChild(humanGroup);
    });

    // Signals
    if (mapLayers.stigmergy && snapshot.signals) {
        snapshot.signals.forEach(sig => {
            const graphics = new Graphics();
            const age = (Date.now() % 1000) / 1000;
            graphics.lineStyle(2 * (1 - age), sig.metadata?.beliefType === 'danger' ? 0xef4444 : 0xfbbf24, 1);
            graphics.drawCircle(sig.pos.x * cellSize, sig.pos.y * cellSize, cellSize * age * 3);
            entityContainer.addChild(graphics);
        });
    }

    // Memory
    if (mapLayers.memory && selectedAgentId) {
        const selectedAgent = snapshot.humans.find(h => h.id === selectedAgentId);
        if (selectedAgent && selectedAgent.spatialAssociations) {
            selectedAgent.spatialAssociations.forEach(sa => {
                const graphics = new Graphics();
                const color = sa.intensity > 0 ? 0x3b82f6 : 0xef4444;
                graphics.beginFill(color, Math.min(0.2, sa.confidence));
                graphics.lineStyle(1, color, sa.confidence);
                graphics.drawCircle(sa.pos.x * cellSize, sa.pos.y * cellSize, cellSize * (1 + sa.confidence * 2));
                graphics.endFill();
                entityContainer.addChild(graphics);
            });
        }
    }

    // Apply viewport transform
    viewport.scale.set(zoom);
    viewport.position.set(400 + offset.x, 400 + offset.y);
    viewport.pivot.set(400, 400);

  }, [snapshot, zoom, offset, selectedAgentId, mapLayers.grid, mapLayers.vision, mapLayers.stigmergy, mapLayers.memory]);

  // Follow logic
  useEffect(() => {
    if (isFollowMode && selectedAgentId && snapshot.humans) {
        const agent = snapshot.humans.find(h => h.id === selectedAgentId);
        if (agent) {
            const targetX = (25 - agent.pos.x) * (800 / 50) * zoom;
            const targetY = (25 - agent.pos.y) * (800 / 50) * zoom;
            setOffset({ x: targetX, y: targetY });
        }
    }
  }, [selectedAgentId, snapshot.humans, zoom, isFollowMode]);

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
        {/* Same HUD as original */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <div className="text-[10px] font-mono tracking-tighter">WEBGL_STRATUM_V1.0</div>
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

        <div 
            ref={containerRef}
            className="w-full aspect-square glass-map rounded-[2.5rem] overflow-hidden border-2 border-primary/20 shadow-2xl relative cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => {
                const start = { x: e.clientX - offset.x, y: e.clientY - offset.y };
                const move = (me: MouseEvent) => {
                    setOffset({ x: me.clientX - start.x, y: me.clientY - start.y });
                };
                const up = () => {
                    window.removeEventListener('mousemove', move);
                    window.removeEventListener('mouseup', up);
                };
                window.addEventListener('mousemove', move);
                window.addEventListener('mouseup', up);
            }}
            onWheel={(e) => {
                const factor = e.deltaY > 0 ? 0.9 : 1.1;
                setZoom(z => Math.min(5, Math.max(0.5, z * factor)));
            }}
        />

        {/* Legend */}
        <div className="mt-6 flex flex-wrap justify-center gap-4 px-4">
            {Object.entries(BIOME_COLOR_STRINGS).map(([key, color]) => (
                <div key={key} className="flex items-center gap-2 px-3 py-1 bg-surface-low/30 rounded-full border border-white/5">
                    <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: color }} />
                    <span className="text-[8px] font-mono text-dim tracking-tighter uppercase">{Biome[Number(key)]}</span>
                </div>
            ))}
        </div>
    </div>
  );
};
