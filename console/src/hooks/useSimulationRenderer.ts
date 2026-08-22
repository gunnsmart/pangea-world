import React, { useEffect, useRef } from 'react';
import { WorldSnapshot, SimEvent, Biome } from '../sim/types';
import { SPRITES, TILE_W, TILE_H, PIXEL_SIZE, iso } from '../constants';

interface UseSimulationRendererProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  snapshot: WorldSnapshot | null;
  cameraFocusRef: React.MutableRefObject<string>;
  selectedStructureId: string | null;
}

export function useSimulationRenderer({
  canvasRef,
  snapshot,
  cameraFocusRef,
  selectedStructureId
}: UseSimulationRendererProps) {
  const cameraPos = useRef({ x: 25, y: 25 });
  const cameraTarget = useRef({ x: 25, y: 25 });
  const currentZoom = useRef(0.8);
  const requestRef = useRef<number | null>(null);
  const lastSnapshot = useRef<WorldSnapshot | null>(null);
  const entityRenderPos = useRef<Record<string, {x: number, y: number, facingLeft: boolean}>>({});
  const floatingTexts = useRef<{ id: number, text: string, x: number, y: number, color: string, createdAt: number }[]>([]);

  useEffect(() => {
    if (snapshot) {
      lastSnapshot.current = snapshot;
      if (snapshot.events) {
        snapshot.events.forEach((ev: SimEvent) => {
          floatingTexts.current.push({ ...ev, createdAt: Date.now() });
        });
      }
    }
  }, [snapshot]);

  useEffect(() => {
    const animate = (time: number) => {
      const snap = lastSnapshot.current;
      const canvas = canvasRef.current;
      if (!snap || !canvas) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const gridSize = snap.grid.length;
      
      ctx.imageSmoothingEnabled = false;

      const drawSprite = (x: number, y: number, sprite: number[][], colors: string[], scale: number = 1, flipX: boolean = false) => {
        const sw = sprite[0].length;
        const sh = sprite.length;
        const getRx = (rx: number) => flipX ? sw - 1 - rx : rx;
        
        sprite.forEach((row, ry) => {
          row.forEach((pixel, rx) => {
            if (pixel > 0) {
              ctx.fillStyle = colors[pixel - 1];
              ctx.fillRect(
                Math.floor(x + (getRx(rx) - sw / 2) * scale),
                Math.floor(y + (ry - sh) * scale),
                scale,
                scale
              );
            }
          });
        });
      };

      cameraTarget.current.x = Math.max(0, Math.min(gridSize, cameraTarget.current.x));
      cameraTarget.current.y = Math.max(0, Math.min(gridSize, cameraTarget.current.y));

      let targetZoom = 0.8;
      let targetX = cameraTarget.current.x;
      let targetY = cameraTarget.current.y;

      if (cameraFocusRef.current === 'adam') {
        const adam = snap.humans.find(h => h.id === 'adam');
        if (adam) {
          cameraTarget.current.x = adam.pos.x;
          cameraTarget.current.y = adam.pos.y;
          targetZoom = 4.5;
        }
      } else if (cameraFocusRef.current === 'eve') {
        const eve = snap.humans.find(h => h.id === 'eve');
        if (eve) {
          cameraTarget.current.x = eve.pos.x;
          cameraTarget.current.y = eve.pos.y;
          targetZoom = 4.5;
        }
      }

      cameraPos.current.x += (targetX - cameraPos.current.x) * 0.08;
      cameraPos.current.y += (targetY - cameraPos.current.y) * 0.08;
      currentZoom.current += (targetZoom - currentZoom.current) * 0.08;

      ctx.save();
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.scale(currentZoom.current, currentZoom.current);
      const camIso = iso(cameraPos.current.x, cameraPos.current.y);
      ctx.translate(-camIso.x, -camIso.y);

      interface RenderEntity {
        type: 'structure' | 'animal' | 'human';
        data: any;
        rx: number;
        ry: number;
        facingLeft: boolean;
      }
      const entitiesByCell: Record<string, RenderEntity[]> = {};
      const updateRenderPos = (id: string, targetX: number, targetY: number) => {
        if (!entityRenderPos.current[id]) {
          entityRenderPos.current[id] = { x: targetX, y: targetY, facingLeft: false };
        } else {
          const dx = targetX - entityRenderPos.current[id].x;
          if (dx < -0.01) entityRenderPos.current[id].facingLeft = true;
          else if (dx > 0.01) entityRenderPos.current[id].facingLeft = false;
          entityRenderPos.current[id].x += dx * 0.1;
          entityRenderPos.current[id].y += (targetY - entityRenderPos.current[id].y) * 0.1;
        }
        return entityRenderPos.current[id];
      };

      snap.structures.forEach((s) => {
        const id = `structure_${s.id}`;
        const rPos = updateRenderPos(id, s.pos.x, s.pos.y);
        const key = `${Math.floor(rPos.x)},${Math.floor(rPos.y)}`;
        if (!entitiesByCell[key]) entitiesByCell[key] = [];
        entitiesByCell[key].push({ type: 'structure', data: s, rx: rPos.x, ry: rPos.y, facingLeft: false });
      });

      snap.animals.forEach((a) => {
        const id = `animal_${a.id}`;
        const rPos = updateRenderPos(id, a.pos.x, a.pos.y);
        const key = `${Math.floor(rPos.x)},${Math.floor(rPos.y)}`;
        if (!entitiesByCell[key]) entitiesByCell[key] = [];
        entitiesByCell[key].push({ type: 'animal', data: a, rx: rPos.x, ry: rPos.y, facingLeft: rPos.facingLeft });
      });

      snap.humans.forEach((h) => {
        const id = `human_${h.id}`;
        const rPos = updateRenderPos(id, h.pos.x, h.pos.y);
        const key = `${Math.floor(rPos.x)},${Math.floor(rPos.y)}`;
        if (!entitiesByCell[key]) entitiesByCell[key] = [];
        entitiesByCell[key].push({ type: 'human', data: h, rx: rPos.x, ry: rPos.y, facingLeft: rPos.facingLeft });
      });
      
      const PALETTE_ISO: Record<number, string> = {
        0: '#6495ED', // Water/River (Cornflower Blue)
        1: '#4169E1', // Deep Water (Royal Blue)
        2: '#7B9B5A', // Sand/Path (Light Earthy Green)
        3: '#5E7D42', // Grass (Main Earthy Green)
        4: '#496631', // Forest/Tree base (Darker Earthy Green)
        5: '#556B2F', // Mountain/Rock (Dark Olive)
        6: '#3E4E2D', // Dark Mountain (Darker Olive)
        7: '#8DAA6D', // Snow/Highlight (Light Muted Green)
        8: '#6B8E23', // Desert/Dirt (Olive Drab)
        9: '#3D5528', // Swamp/Shadow (Dark Muted Green)
        10: '#A4C287', // Tundra/Highlight (Light Soft Green)
      };

      const invZoom = 1 / currentZoom.current;
      const viewWidth = canvasWidth * invZoom;
      const viewHeight = canvasHeight * invZoom;
      const margin = TILE_W * 4;
      const screenLeft = camIso.x - viewWidth / 2 - margin;
      const screenRight = camIso.x + viewWidth / 2 + margin;
      const screenTop = camIso.y - viewHeight / 2 - margin;
      const screenBottom = camIso.y + viewHeight / 2 + margin;

      const getGridCoords = (ix: number, iy: number) => {
        const u = ix / (TILE_W / 2);
        const v = iy / (TILE_H / 2);
        return { x: (u + v) / 2, y: (v - u) / 2 };
      };

      const tl = getGridCoords(screenLeft, screenTop);
      const tr = getGridCoords(screenRight, screenTop);
      const bl = getGridCoords(screenLeft, screenBottom);
      const br = getGridCoords(screenRight, screenBottom);

      const minX = Math.max(0, Math.floor(Math.min(tl.x, tr.x, bl.x, br.x)));
      const maxX = Math.min(gridSize - 1, Math.ceil(Math.max(tl.x, tr.x, bl.x, br.x)));
      const minY = Math.max(0, Math.floor(Math.min(tl.y, tr.y, bl.y, br.y)));
      const maxY = Math.min(gridSize - 1, Math.ceil(Math.max(tl.y, tr.y, bl.y, br.y)));

      const MAX_H = 15;
      const WATER_LEVEL = 0.12 * MAX_H;

      const getZ = (h: number, b: number) => {
        if (b === 0 || b === 1) return WATER_LEVEL;
        return h * MAX_H;
      };

      const hour = snap.time + snap.minute / 60;
      let shadowX = 0;
      let shadowAlpha = 0;
      
      if (hour >= 6 && hour <= 18) {
        const sunProgress = (hour - 6) / 12; // 0 to 1
        const sunAngle = sunProgress * Math.PI; // 0 to PI
        shadowX = Math.cos(sunAngle) * 15; // 15 to -15
        shadowAlpha = Math.sin(sunAngle) * 0.4;
      } else {
        shadowX = 5;
        shadowAlpha = 0.1;
      }

      if (snap.weather === 'เมฆครึ้ม' || snap.weather === 'ฝนตก' || snap.weather === 'พายุเข้า' || snap.weather === 'หิมะตก') {
        shadowAlpha *= 0.3;
      }

      const drawShadow = (x: number, y: number, sprite: number[][], scale: number = 1, flipX: boolean = false) => {
        if (shadowAlpha <= 0) return;
        ctx.save();
        ctx.translate(x, y);
        ctx.transform(1, 0, shadowX / 10, -0.5, 0, 0);
        
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        const sw = sprite[0].length;
        const sh = sprite.length;
        const getRx = (rx: number) => flipX ? sw - 1 - rx : rx;
        
        sprite.forEach((row, ry) => {
          row.forEach((pixel, rx) => {
            if (pixel > 0) {
              ctx.fillRect(
                Math.floor((getRx(rx) - sw / 2) * scale),
                Math.floor((ry - sh) * scale),
                scale,
                scale
              );
            }
          });
        });
        ctx.restore();
      };

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const cell = snap.grid[y][x];
          
          const h00 = cell.height;
          const h10 = (x + 1 < gridSize) ? snap.grid[y][x + 1].height : h00;
          const h01 = (y + 1 < gridSize) ? snap.grid[y + 1][x].height : h00;
          const h11 = (x + 1 < gridSize && y + 1 < gridSize) ? snap.grid[y + 1][x + 1].height : h00;

          const z00 = getZ(h00, cell.biome);
          const z10 = getZ(h10, (x + 1 < gridSize) ? snap.grid[y][x + 1].biome : cell.biome);
          const z01 = getZ(h01, (y + 1 < gridSize) ? snap.grid[y + 1][x].biome : cell.biome);
          const z11 = getZ(h11, (x + 1 < gridSize && y + 1 < gridSize) ? snap.grid[y + 1][x + 1].biome : cell.biome);

          const p00 = iso(x, y, z00);
          const p10 = iso(x + 1, y, z10);
          const p01 = iso(x, y + 1, z01);
          const p11 = iso(x + 1, y + 1, z11);

          // Calculate slope for shading
          const slopeX = h10 - h00;
          const slopeY = h01 - h00;
          const slopeFactor = (slopeX + slopeY) * 10; // Simple slope intensity

          // Improved color blending based on height and slope
          const r = parseInt(PALETTE_ISO[cell.biome].slice(1, 3), 16);
          const g = parseInt(PALETTE_ISO[cell.biome].slice(3, 5), 16);
          const b = parseInt(PALETTE_ISO[cell.biome].slice(5, 7), 16);
          
          // Apply height-based color variation (lighter at higher elevation)
          const heightFactor = h00 * 20;
          
          // Apply slope shading
          const shade = slopeFactor;
          
          // Add subtle variation
          const variation = (Math.sin(x * 0.5) * Math.cos(y * 0.5)) * 10;
          
          const finalR = Math.max(0, Math.min(255, r + heightFactor + shade + variation));
          const finalG = Math.max(0, Math.min(255, g + heightFactor + shade + variation));
          const finalB = Math.max(0, Math.min(255, b + heightFactor + shade + variation));
          
          let color = `rgb(${finalR}, ${finalG}, ${finalB})`;

          if (cell.biome === Biome.GRASSLAND || cell.biome === Biome.TROPICAL || cell.biome === Biome.FOREST) {
            if (snap.season.includes("Winter")) color = '#d0e0e0';
            else if (snap.season.includes("Autumn")) color = '#a0522d';
          }

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(p00.x, p00.y);
          ctx.lineTo(p10.x, p10.y);
          ctx.lineTo(p11.x, p11.y);
          ctx.lineTo(p01.x, p01.y);
          ctx.closePath();
          ctx.fill();

          if (cell.damage > 0) {
            const intensity = Math.min(cell.damage / 100, 0.6);
            ctx.fillStyle = `rgba(128, 0, 128, ${intensity})`;
            ctx.fill();
          }

          if (cell.hazard > 0) {
            const centerX = (p00.x + p10.x + p11.x + p01.x) / 4;
            const centerY = (p00.y + p10.y + p11.y + p01.y) / 4;
            ctx.fillStyle = cell.hazard === 1 ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
            for (let i = 0; i < 3; i++) {
              ctx.beginPath();
              ctx.arc(centerX + Math.random() * 10 - 5, centerY + Math.random() * 10 - 5, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          
          if (cell.tree > 0) {
            let treeSprite = SPRITES.tree;
            if (cell.biome === Biome.TROPICAL) treeSprite = SPRITES.tree_palm;
            else if (cell.biome === Biome.FOREST) treeSprite = SPRITES.tree_oak;
            else if (cell.biome === Biome.TUNDRA) treeSprite = SPRITES.tree_pine;

            drawShadow(p00.x, p00.y, treeSprite, PIXEL_SIZE);
            const treeColors = snap.season.includes("Autumn") ? ['#8b4513', '#a0522d', '#5d2906'] : ['#2d5a27', '#40916c', '#1a3316'];
            drawSprite(p00.x, p00.y, treeSprite, treeColors, PIXEL_SIZE);
          }
          if (cell.rock > 0 || cell.biome === Biome.MOUNTAIN || cell.biome === Biome.PEAK) {
            drawShadow(p00.x, p00.y, SPRITES.rock, PIXEL_SIZE * 1.5);
            drawSprite(p00.x, p00.y, SPRITES.rock, ['#7a7a7a', '#9e9e9e'], PIXEL_SIZE * 1.5);
          }
          if (cell.fire > 0) {
            const isAlt = (Date.now() / 100) % 2 > 1;
            const fireColors = isAlt ? ['#ff4500', '#ff8c00', '#ffff00'] : ['#ff8c00', '#ffff00', '#ffffff'];
            drawSprite(p00.x, p00.y, SPRITES.fire, fireColors, PIXEL_SIZE);
          }

          const entities = entitiesByCell[`${x},${y}`];
          if (entities) {
            entities.forEach(ent => {
              const { x: epx, y: epy } = iso(ent.rx, ent.ry, z00);
              let finalEpy = epy;
              if (cell.biome === 0 || cell.biome === 1) {
                finalEpy += Math.sin(Date.now() / 600 + (x + y) * 0.5) * 1.5;
              }

              if (ent.type === 'human') {
                const human = ent.data;
                const scale = 0.5 * PIXEL_SIZE;
                const colors = human.gender === 'm' 
                  ? ['#8d5524', '#ffffff', '#00f2ff', '#555555', '#333333', '#222222'] 
                  : ['#ffdbac', '#ffffff', '#ff69b4', '#555555', '#333333', '#222222'];
                
                drawShadow(epx, finalEpy, SPRITES.human, scale, ent.facingLeft);
                drawSprite(epx, finalEpy, SPRITES.human, colors, scale, ent.facingLeft);

                if (human.thought) {
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                  ctx.font = '6px "JetBrains Mono"';
                  const textWidth = ctx.measureText(human.thought).width;
                  ctx.fillRect(epx - textWidth / 2 - 2, finalEpy - 25, textWidth + 4, 10);
                  ctx.fillStyle = '#00f2ff';
                  ctx.textAlign = 'center';
                  ctx.fillText(human.thought, epx, finalEpy - 18);
                }
              }

              if (ent.type === 'animal') {
                const animal = ent.data;
                const sprite = SPRITES[animal.species as keyof typeof SPRITES] || SPRITES.rabbit;
                
                const speciesConfig: Record<string, { colors: string[], scale: number }> = {
                  rabbit: { colors: ['#ffffff', '#ffcccc'], scale: 0.4 },
                  deer: { colors: ['#8b4513', '#d2b48c'], scale: 0.6 },
                  boar: { colors: ['#4a3728', '#8b4513'], scale: 0.6 },
                  wolf: { colors: ['#a0a0a0', '#ffffff'], scale: 0.6 },
                  tiger: { colors: ['#ff8c00', '#000000'], scale: 0.7 },
                  elephant: { colors: ['#808080', '#a0a0a0'], scale: 1.1 },
                  lion: { colors: ['#daa520', '#8b4513'], scale: 0.8 },
                  fox: { colors: ['#ff4500', '#ffffff'], scale: 0.4 },
                  bear: { colors: ['#5d4037', '#3e2723'], scale: 0.9 },
                  crocodile: { colors: ['#2e7d32', '#1b5e20'], scale: 0.7 },
                  camel: { colors: ['#c2a370', '#8d6e63'], scale: 0.9 },
                };

                const config = speciesConfig[animal.species] || { colors: ['#ffffff', '#000000'], scale: 0.5 };
                const scale = config.scale * PIXEL_SIZE;

                drawShadow(epx, finalEpy, sprite, scale, ent.facingLeft);
                drawSprite(epx, finalEpy, sprite, config.colors, scale, ent.facingLeft);

                if (animal.isPregnant) {
                  ctx.fillStyle = '#ff69b4';
                  ctx.beginPath();
                  ctx.arc(epx + 4 * scale, finalEpy - 8 * scale, 2 * scale, 0, Math.PI * 2);
                  ctx.fill();
                }
              }

              if (ent.type === 'structure') {
                const structure = ent.data;
                
                if (shadowAlpha > 0) {
                  ctx.save();
                  ctx.translate(epx, finalEpy);
                  ctx.transform(1, 0, shadowX / 10, -0.5, 0, 0);
                  ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
                  ctx.fillRect(
                    Math.floor(epx - 4),
                    Math.floor(finalEpy - 5),
                    8,
                    4
                  );
                  ctx.restore();
                }

                ctx.fillStyle = structure.type === 'campfire' ? '#ff4500' : '#8b4513';
                ctx.beginPath();
                ctx.arc(epx, finalEpy - 5, 4, 0, Math.PI * 2);
                ctx.fill();
                
                if (structure.progress < 100) {
                  ctx.fillStyle = '#ffffff';
                  ctx.font = 'bold 4px "JetBrains Mono"';
                  ctx.textAlign = 'center';
                  ctx.fillText(`${Math.floor(structure.progress)}%`, epx, finalEpy - 12);
                }

                if (selectedStructureId === structure.id) {
                  ctx.strokeStyle = '#ff00ff';
                  ctx.lineWidth = 1;
                  const size = 8;
                  
                  ctx.beginPath();
                  ctx.moveTo(epx - size, finalEpy - size - 5 + 3);
                  ctx.lineTo(epx - size, finalEpy - size - 5);
                  ctx.lineTo(epx - size + 3, finalEpy - size - 5);
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.moveTo(epx + size, finalEpy - size - 5 + 3);
                  ctx.lineTo(epx + size, finalEpy - size - 5);
                  ctx.lineTo(epx + size - 3, finalEpy - size - 5);
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.moveTo(epx - size, finalEpy + size - 5 - 3);
                  ctx.lineTo(epx - size, finalEpy + size - 5);
                  ctx.lineTo(epx - size + 3, finalEpy + size - 5);
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.moveTo(epx + size, finalEpy + size - 5 - 3);
                  ctx.lineTo(epx + size, finalEpy + size - 5);
                  ctx.lineTo(epx + size - 3, finalEpy + size - 5);
                  ctx.stroke();

                  ctx.font = 'bold 5px "JetBrains Mono"';
                  ctx.fillStyle = '#ff00ff';
                  ctx.textAlign = 'left';
                  ctx.fillText(`ID:${structure.id}`, epx + size + 2, finalEpy - size - 5 + 4);
                  ctx.fillText(`TYPE:${structure.type.toUpperCase()}`, epx + size + 2, finalEpy - size - 5 + 10);
                }
              }
            });
          }
        }
      }

      ctx.restore();

      let ambientAlpha = 1 - snap.lightLevel;
      let r = 0, g = 10, b = 30;

      if (snap.weather === 'พายุเข้า') {
        ambientAlpha = Math.max(ambientAlpha, 0.6);
        r = 20; g = 20; b = 30;
      } else if (snap.weather === 'ฝนตก') {
        ambientAlpha = Math.max(ambientAlpha, 0.4);
        r = 30; g = 40; b = 50;
      } else if (snap.weather === 'เมฆครึ้ม') {
        ambientAlpha = Math.max(ambientAlpha, 0.2);
        r = 50; g = 50; b = 60;
      }

      if (ambientAlpha > 0) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${ambientAlpha * 0.8})`;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      if (hour >= 5 && hour <= 7) {
        const intensity = 1 - Math.abs(hour - 6);
        ctx.fillStyle = `rgba(255, 100, 0, ${intensity * 0.2})`;
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.globalCompositeOperation = 'source-over';
      } else if (hour >= 17 && hour <= 19) {
        const intensity = 1 - Math.abs(hour - 18);
        ctx.fillStyle = `rgba(255, 50, 0, ${intensity * 0.25})`;
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.save();
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.scale(currentZoom.current, currentZoom.current);
      ctx.translate(-camIso.x, -camIso.y);
      ctx.globalCompositeOperation = 'lighter';

      const drawLight = (x: number, y: number, radius: number, color: string) => {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      };

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const cell = snap.grid[y][x];
          if (cell.fire > 0) {
            const p00 = iso(x, y, getZ(cell.height, cell.biome));
            drawLight(p00.x, p00.y, 40, 'rgba(255, 150, 0, 0.4)');
          }
        }
      }

      snap.structures.forEach(s => {
        if (s.type === 'campfire' && s.health > 0) {
          const h = snap.grid[Math.floor(s.pos.y)][Math.floor(s.pos.x)].height;
          const b = snap.grid[Math.floor(s.pos.y)][Math.floor(s.pos.x)].biome;
          const p = iso(s.pos.x, s.pos.y, getZ(h, b));
          const flicker = Math.random() * 5;
          drawLight(p.x, p.y - 5, 50 + flicker, 'rgba(255, 100, 0, 0.5)');
        }
      });

      ctx.restore();

      const now = Date.now();
      floatingTexts.current = floatingTexts.current.filter(ft => now - ft.createdAt < 2000);
      
      ctx.save();
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.scale(currentZoom.current, currentZoom.current);
      ctx.translate(-camIso.x, -camIso.y);

      floatingTexts.current.forEach(ft => {
        const { x: fpx, y: fpy } = iso(ft.x, ft.y, 10);
        const age = now - ft.createdAt;
        const alpha = 1 - age / 2000;
        const size = (age / 2000) * 40;

        ctx.strokeStyle = `${ft.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(fpx, fpy, size, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = 'bold 6px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text.toUpperCase(), fpx, fpy - size - 5);
      });
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, canvasWidth - 20, canvasHeight - 20);
      
      ctx.beginPath();
      ctx.moveTo(canvasWidth/2 - 10, canvasHeight/2);
      ctx.lineTo(canvasWidth/2 + 10, canvasHeight/2);
      ctx.moveTo(canvasWidth/2, canvasHeight/2 - 10);
      ctx.lineTo(canvasWidth/2, canvasHeight/2 + 10);
      ctx.stroke();
      
      const len = 15;
      ctx.beginPath();
      ctx.moveTo(20, 20 + len); ctx.lineTo(20, 20); ctx.lineTo(20 + len, 20);
      ctx.moveTo(canvasWidth - 20 - len, 20); ctx.lineTo(canvasWidth - 20, 20); ctx.lineTo(canvasWidth - 20, 20 + len);
      ctx.moveTo(20, canvasHeight - 20 - len); ctx.lineTo(20, canvasHeight - 20); ctx.lineTo(20 + len, canvasHeight - 20);
      ctx.moveTo(canvasWidth - 20 - len, canvasHeight - 20); ctx.lineTo(canvasWidth - 20, canvasHeight - 20); ctx.lineTo(canvasWidth - 20, canvasHeight - 20 - len);
      ctx.stroke();
      ctx.restore();

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [selectedStructureId, canvasRef]);

  return {
    cameraPos,
    currentZoom,
    cameraTarget
  };
}
