
import { Human } from '../entities/humans/Human';
import { SubjectAlpha } from '../entities/humans/Alpha';
import { SubjectBeta } from '../entities/humans/Beta';
import { Animal } from '../animals';
import { Structure } from '../structures';
import { SpatialHashGrid } from '../spatial';
import { AnimalSpecies, Biome } from '../types';
import { TerrainMap } from '../terrain';

export class EntityManager {
  humans: Human[] = [];
  animals: Animal[] = [];
  structures: Structure[] = [];
  spatialHumans: SpatialHashGrid<Human> = new SpatialHashGrid<Human>(10);
  spatialAnimals: SpatialHashGrid<Animal> = new SpatialHashGrid<Animal>(10);
  spatialStructures: SpatialHashGrid<Structure> = new SpatialHashGrid<Structure>(10);
  humanIdCounter: number = 0;
  animalIdCounter: number = 0;
  structureIdCounter: number = 0;

  spawnInitialHumans(spawnPos: { x: number, y: number }) {
    this.humans.push(new SubjectAlpha({ x: spawnPos.x - 1, y: spawnPos.y }));
    this.humans.push(new SubjectBeta({ x: spawnPos.x + 1, y: spawnPos.y }));
    this.humanIdCounter = 2;
  }

  spawnInitialAnimals(width: number, height: number, terrain: TerrainMap) {
    const landSpecies = [
      AnimalSpecies.CRAB, AnimalSpecies.CRAB, AnimalSpecies.CRAB,
      AnimalSpecies.SEAGULL, AnimalSpecies.SEAGULL,
      AnimalSpecies.RABBIT,
      AnimalSpecies.SNAKE,
      AnimalSpecies.KOMODO_DRAGON,
      AnimalSpecies.OWL,
      AnimalSpecies.RAT,
      AnimalSpecies.DRAGONFLY, AnimalSpecies.HONEY_BEE, AnimalSpecies.MONARCH_BUTTERFLY,
      AnimalSpecies.FRUIT_FLY, AnimalSpecies.SNAIL, AnimalSpecies.FROG
    ];

    const waterSpecies = [
      AnimalSpecies.CLOWNFISH, AnimalSpecies.SEA_TURTLE, AnimalSpecies.SALTWATER_CROCODILE,
      AnimalSpecies.DOLPHIN, AnimalSpecies.OTTER
    ];

    for (let i = 0; i < 40; i++) {
      // Deterministic position based on index
      const x = (i * 7) % width;
      const y = (i * 13) % height;
      
      if (terrain.isValid(x, y)) {
        const biome = terrain.template[y][x];
        const isWater = biome === Biome.DEEP_WATER || biome === Biome.SHALLOW;
        
        let s;
        if (isWater) {
          s = waterSpecies[i % waterSpecies.length];
        } else {
          s = landSpecies[i % landSpecies.length];
        }
        
        this.animals.push(new Animal(`animal_${this.animalIdCounter++}`, s, { x, y }));
      }
    }
  }

  updateSpatialGrids() {
    this.spatialHumans.clear();
    this.humans.forEach(h => this.spatialHumans.insert(h));
    this.spatialAnimals.clear();
    this.animals.forEach(a => this.spatialAnimals.insert(a));
    this.spatialStructures.clear();
    this.structures.forEach(s => this.spatialStructures.insert(s));
  }

  cleanupDead() {
    this.humans = this.humans.filter(h => !h.isDead());
    this.animals = this.animals.filter(a => !a.isDead());
  }
}
