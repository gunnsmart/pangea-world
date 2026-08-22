
import { World } from './World';
import { Biome } from './types';

/**
 * PassiveVectorService
 * Responsible for mapping 2,500 grid cells into 128-dimensional passive vectors.
 * These vectors represent the environment's state in a format suitable for Neural Network input.
 */
export class PassiveVectorService {
  private static instance: PassiveVectorService;
  private vectors: Float32Array;
  private size: number;
  private dim: number = 128;

  private constructor(size: number = 50) {
    this.size = size;
    this.vectors = new Float32Array(size * size * this.dim);
  }

  static getInstance(size: number = 50): PassiveVectorService {
    if (!PassiveVectorService.instance) {
      PassiveVectorService.instance = new PassiveVectorService(size);
    }
    return PassiveVectorService.instance;
  }

  /**
   * Updates the passive vectors based on the current world state.
   */
  updateVectors(world: World) {
    const { terrain, weather, entities } = world;
    const grid = terrain.template;
    const hmap = terrain.heightmap;
    const moisture = terrain.soilMoisture;
    const fertility = terrain.soilFertility;
    const fire = terrain.fireLevel;
    const trees = terrain.trees;
    const rocks = terrain.rocks;
    const resources = terrain.resources;
    const hazards = terrain.hazards;

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const idx = (y * this.size + x) * this.dim;
        
        // 0 - 30: Physical Physics
        // Focus: Height, Slope, Temp, Moisture
        this.vectors[idx + 0] = hmap[y][x];
        
        // Calculate Slope (approximate gradient)
        let slope = 0;
        if (x > 0 && x < this.size - 1 && y > 0 && y < this.size - 1) {
          const dx = (hmap[y][x + 1] - hmap[y][x - 1]) / 2;
          const dy = (hmap[y + 1][x] - hmap[y - 1][x]) / 2;
          slope = Math.sqrt(dx * dx + dy * dy);
        }
        this.vectors[idx + 1] = Math.min(1.0, slope * 5.0);
        this.vectors[idx + 2] = (weather.globalTemperature + 10) / 60; // -10 to 50 normalized
        this.vectors[idx + 3] = moisture[y][x];
        this.vectors[idx + 4] = grid[y][x] / 10.0; // Biome index
        this.vectors[idx + 5] = fertility[y][x];

        // 31 - 60: Material Properties
        // Focus: Hardness, Flammability, Toxicity, Nutrients
        const isRock = rocks[y][x] > 0;
        const isTree = trees[y][x] > 0;
        const hasPlants = terrain.plants[y][x].length > 0;
        
        this.vectors[idx + 31] = isRock ? 1.0 : (isTree ? 0.6 : 0.2); // Hardness
        this.vectors[idx + 32] = isTree ? 0.8 : (grid[y][x] === Biome.GRASSLAND ? 0.4 : 0.1); // Flammability
        this.vectors[idx + 33] = hazards[y][x] === 1 ? 0.9 : 0.0; // Toxicity
        this.vectors[idx + 34] = resources[y][x] === 2 ? 0.5 : (resources[y][x] === 3 ? 1.0 : 0.0); // Nutritional/Valuable
        
        // Populate additional material stats if possible
        if (hasPlants) {
          const plant = terrain.plants[y][x][0];
          this.vectors[idx + 35] = plant.health / 100.0;
        }

        // 61 - 90: Biological Traces
        // Focus: Scent, Footprints, Resource density
        // For now, we use a simple distance-based density from entities
        let trace = 0;
        entities.animals.forEach(a => {
          const dist = Math.abs(a.pos.x - x) + Math.abs(a.pos.y - y);
          if (dist < 3) trace += (1.0 - dist/3.0) * 0.2;
        });
        this.vectors[idx + 61] = Math.min(1.0, trace); // Scent/Activity

        // 91 - 127: Cognitive Markers
        // Focus: Danger (Trauma), Familiarity, Success stats
        this.vectors[idx + 91] = fire[y][x] > 0 ? 1.0 : (hazards[y][x] > 0 ? 0.5 : 0.0); // Current danger
        this.vectors[idx + 92] = world.score > 0 ? (world.score / 1000) : 0; // Success heuristic (very basic)
      }
    }
  }

  /**
   * Returns the 128D vector for a given grid coordinate.
   * Note: This creates a copy. Use getVectorTo for high-performance reuse.
   */
  getVector(x: number, y: number): Float32Array {
    const idx = (y * this.size + x) * this.dim;
    return this.vectors.slice(idx, idx + this.dim);
  }

  /**
   * Copies the 128D vector into target array to avoid allocation.
   */
  getVectorTo(x: number, y: number, target: Float32Array | number[]): void {
    const idx = (y * this.size + x) * this.dim;
    for (let i = 0; i < this.dim; i++) {
      target[i] = this.vectors[idx + i];
    }
  }

  /**
   * Internal direct access to all vectors (for worker transfer)
   */
  getBuffer(): ArrayBuffer {
    return this.vectors.buffer;
  }
}

export const passiveVectorService = PassiveVectorService.getInstance();
