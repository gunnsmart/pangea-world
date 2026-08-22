
import { Plant, PlantStage } from './types';
import { PLANT_SPECIES } from './plants';
import { SeededRNG } from './SeededRNG';

export const BIOME_COLOR: Record<number, [number, number, number]> = {
  [0]: [30, 100, 200],  // DEEP_WATER
  [1]: [80, 160, 220],  // SHALLOW
  [2]: [210, 190, 130], // BEACH
  [3]: [80, 180, 60],   // GRASSLAND
  [4]: [20, 140, 60],   // TROPICAL
  [5]: [34, 100, 34],   // FOREST
  [6]: [100, 100, 100],  // MOUNTAIN
  [7]: [220, 220, 220], // PEAK
  [8]: [230, 210, 150], // DESERT
  [9]: [60, 80, 50],    // SWAMP
  [10]: [200, 220, 220], // TUNDRA
};

export class TerrainMap {
  size: number;
  template: number[][];
  plants: Plant[][][];
  heightmap: number[][];
  trees: number[][];
  rocks: number[][];
  resources: number[][];
  hazards: number[][];
  pois: number[][];
  damage: number[][];
  soilFertility: number[][];
  soilMoisture: number[][];
  fireLevel: number[][];

  constructor(size: number = 50, seed: number = 42) {
    this.size = size;
    const hmap = this.generateHeightmap(size, seed);
    const island = this.islandMask(size);
    this.heightmap = hmap.map((row, r) => row.map((h, c) => h * island[r][c]));
    
    this.template = this.generateTemplateFromMaps(size, seed, this.heightmap);
    this.plants = this.template.map((row, r) => row.map((b, c) => this.initPlants(r, c)));
    this.resources = Array.from({ length: size }, () => Array(size).fill(0));
    this.hazards = Array.from({ length: size }, () => Array(size).fill(0));
    this.pois = Array.from({ length: size }, () => Array(size).fill(0));
    this.damage = Array.from({ length: size }, () => Array(size).fill(0));
    this.soilFertility = Array.from({ length: size }, () => Array(size).fill(1.0));
    this.soilMoisture = Array.from({ length: size }, () => Array(size).fill(0.5));
    this.fireLevel = Array.from({ length: size }, () => Array(size).fill(0));
    
    const rng = new SeededRNG(seed + 555);
    this.trees = this.template.map((row, r) => row.map((b, c) => {
      if (b === 4 || b === 5 || b === 9) return rng.next() > 0.7 ? 1 : 0;
      if (b === 3) return rng.next() > 0.95 ? 1 : 0;
      return 0;
    }));
    this.rocks = this.template.map((row, r) => row.map((b, c) => {
      if (b === 6 || b === 7) return rng.next() > 0.8 ? 1 : 0;
      if (b === 2) return rng.next() > 0.98 ? 1 : 0;
      return 0;
    }));
    this.populateResourcesAndHazards(rng);
    this.populatePOIs(rng);
  }

  get width() { return this.size; }
  get height() { return this.size; }

  private populateResourcesAndHazards(rng: SeededRNG) {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const b = this.template[r][c];
        // Resources
        if (b === 6 || b === 7) this.resources[r][c] = rng.next() > 0.9 ? 1 : 0; // Ore
        if (b === 9) this.resources[r][c] = rng.next() > 0.9 ? 2 : 0; // Medicinal
        if (b === 5) this.resources[r][c] = rng.next() > 0.98 ? 3 : 0; // Rare
        
        // Hazards
        if (b === 9) this.hazards[r][c] = rng.next() > 0.9 ? 1 : 0; // Toxic
        if (b === 7) this.hazards[r][c] = rng.next() > 0.95 ? 2 : 0; // Radiation
        if (b === 8) this.hazards[r][c] = rng.next() > 0.98 ? 3 : 0; // Unstable
      }
    }
  }

  private populatePOIs(rng: SeededRNG) {
    const numPOIs = Math.floor(this.size * this.size / 500);
    for (let i = 0; i < numPOIs; i++) {
      const r = rng.randint(0, this.size - 1);
      const c = rng.randint(0, this.size - 1);
      const b = this.template[r][c];
      if (b > 1 && b < 8) {
        this.pois[r][c] = rng.randint(1, 3);
      }
    }
  }

  private generateTemplateFromMaps(size: number, seed: number, hmap: number[][]): number[][] {
    const mmap = this.generateMoistureMap(size, seed);
    const template: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const h = hmap[r][c];
        const m = mmap[r][c];
        const lat = Math.abs(r - size / 2) / (size / 2);

        if (h < 0.05) {
          template[r][c] = 0; // DEEP_WATER
        } else if (h < 0.12) {
          template[r][c] = 1; // SHALLOW
        } else if (h < 0.18) {
          template[r][c] = 2; // BEACH
        } else if (h < 0.40) { // Land
          if (m < -0.2) template[r][c] = 8; // DESERT
          else if (m < 0.2) template[r][c] = 3; // GRASSLAND
          else if (m < 0.6) template[r][c] = 4; // TROPICAL
          else template[r][c] = 9; // SWAMP
        } else if (h < 0.55) {
          template[r][c] = lat > 0.6 ? 10 : 5; // TUNDRA or FOREST
        } else if (h < 0.80) {
          template[r][c] = 6; // MOUNTAIN
        } else {
          template[r][c] = 7; // PEAK
        }
      }
    }

    this.placeLake(template, size, seed + 5);
    this.carveRiver(template, size, seed + 7);
    return this.smoothTemplate(template, size);
  }

  private initPlants(r: number, c: number): Plant[] {
    const b = this.template[r][c];
    const rng = new SeededRNG(r * this.size + c);
    if (b === 0 || b === 1) return [];
    if (rng.next() > 0.3) {
      let species = 'grass';
      if (b === 8) species = rng.next() > 0.9 ? 'cactus' : 'grass';
      else if (b === 4 || b === 5) species = rng.next() > 0.7 ? 'tree' : (rng.next() > 0.5 ? 'berry' : 'grass');
      else if (b === 9) species = rng.next() > 0.6 ? 'mushroom' : (rng.next() > 0.4 ? 'poison' : 'medicinal');
      else if (b === 3) species = rng.next() > 0.9 ? 'medicinal' : (rng.next() > 0.8 ? 'berry' : 'grass');
      
      const age = rng.randint(0, 100);
      let stage = PlantStage.GROWING;
      if (age < 10) stage = PlantStage.SPROUT;
      else if (age > 80) stage = PlantStage.MATURE;
      
      return [{ 
        speciesId: species, 
        age, 
        health: 100, 
        waterLevel: 50 + rng.randint(0, 50),
        stage 
      }];
    }
    return [];
  }

  private noise(r: number, c: number, scale: number, seed: number): number {
    const rng = new SeededRNG(seed + Math.floor(r * 997 + c * 31));
    const base = Math.sin(r / scale) * Math.cos(c / scale);
    return base + rng.uniform(-0.3, 0.3);
  }

  private generateHeightmap(size: number, seed: number = 42): number[][] {
    const hmap: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    let mn = Infinity;
    let mx = -Infinity;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        let h = this.noise(r, c, 32.0, seed);
        h += this.noise(r, c, 16.0, seed + 1) * 0.5;
        h += this.noise(r, c, 8.0, seed + 2) * 0.25;
        h += this.noise(r, c, 4.0, seed + 3) * 0.125;
        h += this.noise(r, c, 2.0, seed + 4) * 0.0625;
        hmap[r][c] = h;
        if (h < mn) mn = h;
        if (h > mx) mx = h;
      }
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        hmap[r][c] = (hmap[r][c] - mn) / (mx - mn + 1e-9);
      }
    }
    return hmap;
  }

  private islandMask(size: number): number[][] {
    const mask: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    const cx = size / 2;
    const cy = size / 2;
    const rx = size * 0.42;
    const ry = size * 0.42;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const dx = (r - cx) / rx;
        const dy = (c - cy) / ry;
        const dist = Math.sqrt(dx * dx + dy * dy);
        mask[r][c] = Math.max(0, 1 - dist);
      }
    }
    return mask;
  }

  private placeLake(template: number[][], size: number, seed: number = 13): number[][] {
    const rng = new SeededRNG(seed);
    const cx = Math.floor(size / 2 + rng.randint(-4, 4));
    const cy = Math.floor(size / 2 + rng.randint(-4, 4));
    const radius = rng.randint(4, 6);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const dist = Math.sqrt(Math.pow(r - cx, 2) + Math.pow(c - cy, 2));
        if (dist < radius) {
          template[r][c] = 0; // DEEP_WATER
        } else if (dist < radius + 2) {
          if (template[r][c] !== 0) {
            template[r][c] = 1; // SHALLOW
          }
        }
      }
    }
    return template;
  }

  private carveRiver(template: number[][], size: number, seed: number = 7): number[][] {
    const rng = new SeededRNG(seed);
    let c = rng.randint(Math.floor(size / 4), Math.floor(size * 3 / 4));
    for (let r = 0; r < size; r++) {
      c = Math.max(1, Math.min(size - 2, c + rng.randint(-1, 1)));
      for (let dc = -1; dc <= 1; dc++) {
        template[r][c + dc] = 1; // SHALLOW
      }
    }
    return template;
  }

  private generateMoistureMap(size: number, seed: number = 42): number[][] {
    const mmap: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        mmap[r][c] = this.noise(r, c, 16.0, seed + 100);
      }
    }
    return mmap;
  }

  private smoothTemplate(template: number[][], size: number): number[][] {
    const newTemplate = template.map(row => [...row]);
    for (let r = 1; r < size - 1; r++) {
      for (let c = 1; c < size - 1; c++) {
        const neighbors = [
          template[r-1][c], template[r+1][c],
          template[r][c-1], template[r][c+1]
        ];
        const counts: Record<number, number> = {};
        for (const n of neighbors) counts[n] = (counts[n] || 0) + 1;
        let best = template[r][c];
        let maxCount = 0;
        for (const n in counts) {
          if (counts[n] > maxCount) {
            maxCount = counts[n];
            best = parseInt(n);
          }
        }
        newTemplate[r][c] = best;
      }
    }
    return newTemplate;
  }

  regrow(weather: string, deltaMinutes: number) {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const plants = this.plants[r][c];
        for (const plant of plants) {
          const species = PLANT_SPECIES[plant.speciesId];
          if (!species) continue;

          let weatherMultiplier = 1.0;
          const moisture = this.soilMoisture[r][c];
          
          if (weather === "ฝนตก") {
            weatherMultiplier = 1.5;
            this.soilMoisture[r][c] = Math.min(1.0, this.soilMoisture[r][c] + 0.1 * deltaMinutes);
          }
          if (weather === "แห้งแล้ง") {
            weatherMultiplier = 0.2;
            this.soilMoisture[r][c] = Math.max(0.0, this.soilMoisture[r][c] - 0.05 * deltaMinutes);
          }
          if (weather === "หิมะตก") weatherMultiplier = 0.5;

          // Moisture check: Plants absorb moisture from soil
          const soilMoisture = this.soilMoisture[r][c];
          if (soilMoisture > 0.05 && plant.waterLevel < 100) {
            const absorption = Math.min(soilMoisture, 0.1) * deltaMinutes;
            plant.waterLevel = Math.min(100, plant.waterLevel + absorption * 50);
            this.soilMoisture[r][c] = Math.max(0, this.soilMoisture[r][c] - absorption);
          }

          if (plant.waterLevel < 20) {
            plant.health -= 15 * deltaMinutes;
            weatherMultiplier *= 0.3;
          } else if (plant.waterLevel < species.waterNeed * 100) {
            plant.health -= 5 * deltaMinutes;
            weatherMultiplier *= 0.7;
          }
          
          const fertility = this.soilFertility[r][c];
          weatherMultiplier *= fertility;

          // Fire damage
          if (this.fireLevel[r][c] > 0) {
            plant.health -= this.fireLevel[r][c] * 50 * deltaMinutes;
          }

          // Check temperature tolerance
          const temp = 25; // Simplified temperature
          if (temp < species.tempTolerance[0] || temp > species.tempTolerance[1]) {
            plant.health -= 8 * deltaMinutes;
          } else {
            // Growth logic
            if (plant.health > 50) {
              plant.age += species.growthRate * weatherMultiplier * deltaMinutes;
              plant.health = Math.min(100, plant.health + 2 * deltaMinutes);
            }
          }

          // Update stages based on age
          if (plant.age < 5) plant.stage = PlantStage.SEED;
          else if (plant.age < 20) plant.stage = PlantStage.SPROUT;
          else if (plant.age < 70) plant.stage = PlantStage.GROWING;
          else if (plant.age < 95) plant.stage = PlantStage.MATURE;
          else plant.stage = PlantStage.DYING;

          // Dying plants lose health
          if (plant.stage === PlantStage.DYING) {
            plant.health -= 2 * deltaMinutes;
          }
        }
        // Remove dead plants
        this.plants[r][c] = plants.filter(p => p.health > 0);

        // Natural fertility decay/recovery
        if (this.soilFertility[r][c] > 1.0) this.soilFertility[r][c] -= 0.01 * deltaMinutes;
        else if (this.soilFertility[r][c] < 1.0) this.soilFertility[r][c] += 0.005 * deltaMinutes;

        // Spawn new plants if cell is empty and fertile
        if (this.plants[r][c].length === 0 && this.template[r][c] > 2 && this.template[r][c] < 10) {
          const spawnChance = 0.001 * this.soilFertility[r][c];
          const cellRng = new SeededRNG(r * this.size + c + Math.floor(deltaMinutes * 100)); // Time-based but deterministic for the tick
          if (cellRng.next() < spawnChance) {
            const b = this.template[r][c];
            let species = 'grass';
            if (b === 8) species = cellRng.next() > 0.9 ? 'cactus' : 'grass';
            else if (b === 4 || b === 5) species = cellRng.next() > 0.7 ? 'tree' : (cellRng.next() > 0.5 ? 'berry' : 'grass');
            else if (b === 9) species = cellRng.next() > 0.6 ? 'mushroom' : (cellRng.next() > 0.4 ? 'poison' : 'medicinal');
            else if (b === 3) species = cellRng.next() > 0.9 ? 'medicinal' : (cellRng.next() > 0.8 ? 'berry' : 'grass');
            
            this.plants[r][c].push({ 
              speciesId: species, 
              age: 0, 
              health: 100, 
              waterLevel: 50, 
              stage: PlantStage.SEED 
            });
          }
        }
      }
    }
  }

  step(weather: string, deltaMinutes: number) {
    // Biome interactions (e.g., desert spreading)
    for (let r = 1; r < this.size - 1; r++) {
      for (let c = 1; c < this.size - 1; c++) {
        // Evaporation
        if (weather !== "ฝนตก") {
          this.soilMoisture[r][c] = Math.max(0, this.soilMoisture[r][c] - 0.001 * deltaMinutes);
        }

        if (this.template[r][c] === 3) {
           const dryRng = new SeededRNG(r * this.size + c + 77);
           if (dryRng.next() < 0.0001 * deltaMinutes) {
             if (this.soilMoisture[r][c] < 0.1) this.template[r][c] = 8;
           }
        }
        
        // Fire Spread
        if (this.fireLevel[r][c] > 20) {
          const neighbors = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];
          const spreadRng = new SeededRNG(r * this.size + c + 88);
          for (const n of neighbors) {
            const b = this.template[n[0]][n[1]];
            if (b >= 3 && b <= 5 && this.fireLevel[n[0]][n[1]] === 0) { // Flammable biomes
              if (spreadRng.next() < 0.1 * deltaMinutes) {
                this.fireLevel[n[0]][n[1]] = 5;
              }
            }
          }
        }

        // Update Fire Intensity
        if (this.fireLevel[r][c] > 0) {
          if (weather === "ฝนตก") {
            this.fireLevel[r][c] = Math.max(0, this.fireLevel[r][c] - 20 * deltaMinutes);
          } else {
             // Burning consumes moisture
             this.soilMoisture[r][c] = Math.max(0, this.soilMoisture[r][c] - 0.2 * deltaMinutes);
             if (this.soilMoisture[r][c] === 0) {
               this.fireLevel[r][c] = Math.min(100, this.fireLevel[r][c] + 10 * deltaMinutes);
             } else {
               this.fireLevel[r][c] = Math.min(100, this.fireLevel[r][c] + 2 * deltaMinutes);
             }
          }

          // Fire eventually dies out if nothing to burn
          if (this.plants[r][c].length === 0 && this.trees[r][c] === 0) {
             this.fireLevel[r][c] = Math.max(0, this.fireLevel[r][c] - 5 * deltaMinutes);
          }
        }
      }
    }
    this.toxinSpread(weather, deltaMinutes);
    this.recover(deltaMinutes);
  }

  toxinSpread(weather: string, deltaMinutes: number) {
    // Toxin spread (hazard === 1)
    // If it's raining, toxins spread faster
    const spreadRate = (weather === "ฝนตก" ? 0.05 : 0.01) * deltaMinutes;
    for (let r = 1; r < this.size - 1; r++) {
      for (let c = 1; c < this.size - 1; c++) {
        if (this.hazards[r][c] === 1) { // Toxic hazard
          const neighbors = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];
          const toxinRng = new SeededRNG(r * this.size + c + 99);
          for (const n of neighbors) {
            if (toxinRng.next() < spreadRate) {
              this.damage[n[0]][n[1]] = Math.min(100, this.damage[n[0]][n[1]] + 5);
            }
          }
        }
      }
    }
  }

  recover(deltaMinutes: number) {
    // Biome recovery: reduce damage over time
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.damage[r][c] > 0) {
          this.damage[r][c] = Math.max(0, this.damage[r][c] - 0.5 * deltaMinutes);
        }
      }
    }
  }

  getInfo(x: number, y: number) {
    const b = this.template[y][x];
    return {
      biomeId: b,
      plants: this.plants[y][x],
      isWater: b === 0 || b === 1,
    };
  }

  isValid(x: number, y: number) {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  getNearbyTrees(pos: { x: number, y: number }, radius: number): { x: number, y: number }[] {
    const results: { x: number, y: number }[] = [];
    const startX = Math.max(0, Math.floor(pos.x - radius));
    const endX = Math.min(this.size - 1, Math.ceil(pos.x + radius));
    const startY = Math.max(0, Math.floor(pos.y - radius));
    const endY = Math.min(this.size - 1, Math.ceil(pos.y + radius));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (this.trees[y][x] > 0) {
          const dx = x - pos.x;
          const dy = y - pos.y;
          if (dx * dx + dy * dy <= radius * radius) {
            results.push({ x, y });
          }
        }
      }
    }
    return results;
  }

  getNearbyRocks(pos: { x: number, y: number }, radius: number): { x: number, y: number }[] {
    const results: { x: number, y: number }[] = [];
    const startX = Math.max(0, Math.floor(pos.x - radius));
    const endX = Math.min(this.size - 1, Math.ceil(pos.x + radius));
    const startY = Math.max(0, Math.floor(pos.y - radius));
    const endY = Math.min(this.size - 1, Math.ceil(pos.y + radius));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (this.rocks[y][x] > 0) {
          const dx = x - pos.x;
          const dy = y - pos.y;
          if (dx * dx + dy * dy <= radius * radius) {
            results.push({ x, y });
          }
        }
      }
    }
    return results;
  }
}
