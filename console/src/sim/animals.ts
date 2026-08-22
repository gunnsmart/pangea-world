
import { AnimalState, AnimalSpecies, AnimalAction, Point, Biome, AnimalSpeciesInfo } from './types';
import { TerrainMap } from './terrain';
import { SpatialHashGrid } from './spatial';
import { Human } from './entities/humans/Human';
import { FAUNA_DATABASE } from './faunaDatabase';
import { SpikingNeuralNetwork } from './neural';

export enum AnimalDiet {
  HERBIVORE,
  CARNIVORE,
  OMNIVORE
}

const DIET_MAP: Record<string, AnimalDiet> = {
  herbivore: AnimalDiet.HERBIVORE,
  carnivore: AnimalDiet.CARNIVORE,
  omnivore: AnimalDiet.OMNIVORE
};

const INSTINCT_ACTIONS = [
  AnimalAction.WANDER,
  AnimalAction.EAT,
  AnimalAction.DRINK,
  AnimalAction.SLEEP,
  AnimalAction.FLEE,
  AnimalAction.HUNT,
  AnimalAction.MATE,
  AnimalAction.IDLE
];

export class Animal {
  state: AnimalState;
  private path: Point[] = [];
  private homePos: Point;
  private wanderTarget: Point | null = null;
  private wanderTimer: number = 0;
  private lastDecisionTime: number = -999;
  private decisionInterval: number = 2.0; // Decide every 2 sim minutes
  private instinctSNN: SpikingNeuralNetwork;

  get id() { return this.state.id; }
  get pos() { return this.state.pos; }
  get speciesInfo(): AnimalSpeciesInfo | undefined {
    return FAUNA_DATABASE[this.state.species];
  }
  get diet(): AnimalDiet {
    const info = this.speciesInfo;
    return info ? DIET_MAP[info.diet] : AnimalDiet.HERBIVORE;
  }

  constructor(id: string, species: AnimalSpecies, pos: Point) {
    this.homePos = { ...pos };
    const info = FAUNA_DATABASE[species];
    this.state = {
      id,
      species,
      pos,
      health: info ? info.maxHealth : 100,
      energy: 100,
      hunger: 0,
      thirst: 0,
      waste: 0,
      age: 0,
      gender: parseInt(id.split('_').pop() || '0') % 2 === 0 ? 'm' : 'f',
      isPregnant: false,
      gestationProgress: 0,
      stress: 0,
      action: AnimalAction.IDLE,
      isDomesticated: false,
      domesticationProgress: 0
    };
    
    // Initialize Instinct SNN with deeper architecture: Inputs(32) -> Hidden1(64) -> Hidden2(32) -> Outputs(8)
    this.instinctSNN = new SpikingNeuralNetwork([32, 64, 32, 8]);
  }

  update(terrain: TerrainMap, animals: Animal[], day: number, hour: number, deltaMinutes: number, weather: string, disasters: any[], spatialHumans: SpatialHashGrid<Human>, spatialAnimals: SpatialHashGrid<Animal>) {
    // 1. Thinking / Drive update
    this.updateDrives(deltaMinutes, weather, disasters, animals);
    this.wanderTimer -= deltaMinutes;

    // 2. Decision Making
    const simTime = day * 1440 + hour * 60;
    if (simTime - this.lastDecisionTime > this.decisionInterval || this.state.action === AnimalAction.IDLE) {
      this.lastDecisionTime = simTime;
      this.decideWithInstinct(terrain, animals, spatialHumans, spatialAnimals, day, hour);
    }

    // 3. Execute Action
    this.executeAction(terrain, animals, deltaMinutes);

    // 4. Environmental Impact
    this.applyEnvironmentalImpact(terrain, deltaMinutes);
  }

  private updateDrives(deltaMinutes: number, weather: string, disasters: any[], animals: Animal[]) {
    const timeScale = deltaMinutes;
    
    // Metabolic heat production
    let metabolicHeat = 0.08; // Base BMR heat for animals
    if (this.state.action === AnimalAction.WANDER) metabolicHeat = 0.2;
    if (this.state.action === AnimalAction.FLEE || this.state.action === AnimalAction.HUNT) metabolicHeat = 0.4;
    
    // 2. Energy Balance (First Law)
    const energyCost = metabolicHeat * 1.5;
    this.state.energy -= energyCost * timeScale;

    // Hunger and Thirst increase (Realistic animal rates)
    let hungerRate = 0.1; // Hungry in ~16 hours
    let thirstRate = 0.2; // Thirsty in ~8 hours
    
    this.state.hunger += hungerRate * timeScale;
    this.state.thirst += thirstRate * timeScale;
    this.state.age += 0.00000019 * timeScale; // Match human aging

    // Stress calculation
    let stressDelta = -0.05; // Natural recovery
    if (this.state.hunger > 50) stressDelta += 0.1;
    if (this.state.thirst > 50) stressDelta += 0.1;
    if (this.state.action === AnimalAction.FLEE) stressDelta += 0.5;
    if (this.state.action === AnimalAction.HUNT) stressDelta += 0.2;
    
    this.state.stress = Math.max(0, Math.min(100, this.state.stress + stressDelta * timeScale));

    if (this.state.hunger > 100) this.state.health -= 0.1 * timeScale;
    if (this.state.thirst > 100) this.state.health -= 0.2 * timeScale;
    
    if (this.state.energy < 0) {
      this.state.energy = 0;
      this.state.action = AnimalAction.SLEEP;
    }

    // Disaster effects
    for (const d of disasters) {
      const dist = this.dist(this.state.pos, { x: d.x, y: d.y });
      if (dist < 5) {
        this.state.health -= 0.5 * timeScale; 
        if (d.kind === 'fire') {
          this.state.health -= 1.0 * timeScale;
        }
      }
    }

    if (this.state.isPregnant) {
      // Animal gestation (e.g., 60 days for dog/cat)
      this.state.gestationProgress += 0.00115 * timeScale; // 100% in 60 sim days
      this.state.hunger += 0.02 * timeScale;

      if (this.state.gestationProgress >= 100) {
        this.giveBirth(animals);
      }
    }
  }

  private giveBirth(animals: Animal[]) {
    this.state.isPregnant = false;
    this.state.gestationProgress = 0;
    
    // Create a new baby animal - Deterministic ID and position
    const babyIndex = animals.length;
    const babyId = `baby_${this.state.species}_${Date.now()}_${babyIndex}`;
    const baby = new Animal(babyId, this.state.species, { 
      x: this.state.pos.x + (babyIndex % 3 - 1) * 0.5, 
      y: this.state.pos.y + (Math.floor(babyIndex / 3) % 3 - 1) * 0.5 
    });
    baby.state.age = 0.1; // Very young
    baby.state.health = 80;
    baby.state.energy = 60;
    
    animals.push(baby);
  }

  private decideWithInstinct(terrain: TerrainMap, animals: Animal[], spatialHumans: SpatialHashGrid<Human>, spatialAnimals: SpatialHashGrid<Animal>, day: number, hour: number) {
    if (this.state.action === AnimalAction.SLEEP && this.state.energy < 90) return;
    if (this.state.action === AnimalAction.MATE && this.state.partnerId) return;

    // 1. Generate 32-dimensional input vector
    const input = this.generateInstinctVector(terrain, animals, spatialHumans, spatialAnimals, day, hour);

    // 2. Predict with SNN
    const outputs = this.instinctSNN.predict(input);

    // 3. Choose action with highest activation
    let maxIdx = 0;
    let maxVal = -1;
    for (let i = 0; i < outputs.length; i++) {
        if (outputs[i] > maxVal) {
            maxVal = outputs[i];
            maxIdx = i;
        }
    }

    const nextAction = INSTINCT_ACTIONS[maxIdx];

    // 4. Heuristic Override for critical safety (Reflexes)
    // Flee if predator is near (Hard reflex)
    const diet = this.diet;
    if (diet !== AnimalDiet.CARNIVORE) {
      const nearbyAnimals = spatialAnimals.query(this.state.pos, 8);
      const predator = nearbyAnimals.find(a => 
        a.diet === AnimalDiet.CARNIVORE
      );
      if (predator) {
        this.state.action = AnimalAction.FLEE;
        this.state.targetId = predator.state.id;
        
        // Train SNN to prefer Flee when predator is near
        const targets = new Array(8).fill(0);
        targets[INSTINCT_ACTIONS.indexOf(AnimalAction.FLEE)] = 1;
        this.instinctSNN.train(input, targets);
        return;
      }
    }

    // 5. Apply chosen action
    this.state.action = nextAction;

    // Special handling for targets
    if (nextAction === AnimalAction.WANDER) {
        this.startWander(terrain);
    } else if (nextAction === AnimalAction.HUNT) {
        if (diet === AnimalDiet.CARNIVORE || diet === AnimalDiet.OMNIVORE) {
            const nearbyPrey = spatialAnimals.query(this.state.pos, 15);
            const prey = nearbyPrey.find(a => a.state.id !== this.state.id && a.diet === AnimalDiet.HERBIVORE && !a.isDead());
            if (prey) this.state.targetId = prey.state.id;
            else this.state.action = AnimalAction.WANDER;
        }
    } else if (nextAction === AnimalAction.MATE) {
        const nearbyPartners = spatialAnimals.query(this.state.pos, 10);
        const partner = nearbyPartners.find(a => a.state.species === this.state.species && a.state.gender !== this.state.gender && a.state.age > 1 && !a.state.isPregnant);
        if (partner) {
            this.state.partnerId = partner.state.id;
            this.state.targetPos = { ...partner.state.pos };
        } else {
            this.state.action = AnimalAction.WANDER;
        }
    }

    // Hebbian Plasticity to stabilize learning
    this.instinctSNN.applyPlasticity(input, 0.005);
  }

  private generateInstinctVector(terrain: TerrainMap, animals: Animal[], spatialHumans: SpatialHashGrid<Human>, spatialAnimals: SpatialHashGrid<Animal>, day: number, hour: number): number[] {
    const vector = new Array(32).fill(0);
    const x = Math.floor(this.state.pos.x);
    const y = Math.floor(this.state.pos.y);
    const cell = terrain.isValid(x, y) ? terrain.template[y][x] : Biome.DEEP_WATER;

    // 1-8: Internal Drives
    vector[0] = this.state.health / 100;
    vector[1] = this.state.hunger / 100;
    vector[2] = this.state.thirst / 100;
    vector[3] = this.state.energy / 100;
    vector[4] = this.state.stress / 100;
    vector[5] = Math.min(1.0, this.state.age / 10);
    vector[6] = this.state.waste / 100;
    vector[7] = this.state.gestationProgress / 100;

    // 9-16: Sensory (Local)
    vector[8] = terrain.isValid(x, y) ? terrain.heightmap[y][x] : 0;
    vector[9] = terrain.isValid(x, y) ? terrain.soilMoisture[y][x] : 0;
    vector[10] = terrain.isValid(x, y) ? terrain.soilFertility[y][x] : 0;
    vector[11] = terrain.isValid(x, y) ? terrain.fireLevel[y][x] / 100 : 0;
    vector[12] = (cell === Biome.SHALLOW || cell === Biome.DEEP_WATER || cell === Biome.SWAMP) ? 1.0 : 0.0;
    vector[13] = this.isPreferredBiome(cell) ? 1.0 : 0.5;
    vector[14] = terrain.isValid(x, y) ? Math.min(1.0, terrain.plants[y][x].length / 5) : 0;
    vector[15] = this.state.targetPos ? 1.0 : 0.0;

    // 17-24: Spatial Neighbors
    const nearbyAnimals = spatialAnimals.query(this.state.pos, 15);
    const predator = nearbyAnimals.find(a => a.diet === AnimalDiet.CARNIVORE);
    const prey = nearbyAnimals.find(a => a.diet === AnimalDiet.HERBIVORE && a.state.id !== this.id);
    const mate = nearbyAnimals.find(a => a.state.species === this.state.species && a.state.gender !== this.state.gender);
    const human = spatialHumans.query(this.state.pos, 10)[0];

    vector[16] = predator ? 1.0 - (this.dist(this.state.pos, predator.state.pos) / 15) : 0;
    vector[17] = prey ? 1.0 - (this.dist(this.state.pos, prey.state.pos) / 15) : 0;
    vector[18] = mate ? 1.0 - (this.dist(this.state.pos, mate.state.pos) / 15) : 0;
    vector[19] = human ? 1.0 - (this.dist(this.state.pos, human.pos) / 10) : 0;
    
    // Nearest Water Search (simplified)
    vector[20] = 0.5; // Dist to water heuristic
    vector[21] = 0.5; // Dist to food heuristic

    // 25-32: Temporal/Global
    const totalTime = day * 24 + hour;
    vector[24] = Math.sin((hour / 24) * Math.PI * 2);
    vector[25] = Math.cos((hour / 24) * Math.PI * 2);
    vector[26] = (this.state.age % 1); // Life phase
    vector[27] = 0; // No intent noise
    vector[28] = INSTINCT_ACTIONS.indexOf(this.state.action) / 8;
    vector[29] = (day % 30) / 30; // Seasonal cycle
    vector[30] = 0.5; // Bias
    vector[31] = 1.0; // High signal

    return vector;
  }

  private startWander(terrain: TerrainMap) {
    this.state.action = AnimalAction.WANDER;
    this.wanderTimer = 30 + (parseInt(this.id.split('_').pop() || '0') % 60);
    const range = 15;
    const idNum = parseInt(this.id.split('_').pop() || '0');
    let bestTarget: Point = {
      x: Math.max(0, Math.min(terrain.width - 1, this.homePos.x + (idNum % 20 - 10))),
      y: Math.max(0, Math.min(terrain.height - 1, this.homePos.y + ((idNum * 3) % 20 - 10)))
    };
    for (let i = 0; i < 5; i++) {
        const tx = Math.floor(Math.max(0, Math.min(terrain.width - 1, this.homePos.x + (((idNum + i) * 7) % (range * 2)) - range)));
        const ty = Math.floor(Math.max(0, Math.min(terrain.height - 1, this.homePos.y + (((idNum + i) * 11) % (range * 2)) - range)));
        if (terrain.isValid(tx, ty) && this.isPreferredBiome(terrain.template[ty][tx])) {
            bestTarget = { x: tx, y: ty };
            break;
        }
    }
    this.state.targetPos = bestTarget;
  }

  private isPreferredBiome(biome: Biome): boolean {
    const s = this.state.species;
    if (s === AnimalSpecies.CAMEL) return biome === Biome.DESERT;
    if (s === AnimalSpecies.MAMMOTH) return biome === Biome.TUNDRA || biome === Biome.MOUNTAIN;
    if (s === AnimalSpecies.SABERTOOTH) return biome === Biome.FOREST || biome === Biome.TROPICAL;
    if (s === AnimalSpecies.HORSE) return biome === Biome.GRASSLAND;
    if (s === AnimalSpecies.CROCODILE) return biome === Biome.SWAMP || biome === Biome.SHALLOW;
    if (s === AnimalSpecies.BEAR) return biome === Biome.FOREST || biome === Biome.MOUNTAIN;
    if (s === AnimalSpecies.LION) return biome === Biome.GRASSLAND;
    if (s === AnimalSpecies.ELEPHANT) return biome === Biome.TROPICAL || biome === Biome.GRASSLAND;
    if (s === AnimalSpecies.RABBIT || s === AnimalSpecies.DEER || s === AnimalSpecies.BOAR) return biome === Biome.GRASSLAND || biome === Biome.FOREST;
    return biome > 2 && biome < 8; // General land
  }

  private executeAction(terrain: TerrainMap, animals: Animal[], deltaMinutes: number) {
    switch (this.state.action) {
      case AnimalAction.WANDER:
        this.moveToTarget(terrain, deltaMinutes);
        break;
      case AnimalAction.SLEEP:
        this.state.energy += 0.2 * deltaMinutes;
        if (this.state.energy >= 100) this.state.action = AnimalAction.IDLE;
        break;
      case AnimalAction.EAT:
        this.findAndEat(terrain, deltaMinutes);
        break;
      case AnimalAction.DRINK:
        this.findAndDrink(terrain, deltaMinutes);
        break;
      case AnimalAction.POOP: {
        this.state.waste = 0;
        const cellX = Math.floor(this.state.pos.x);
        const cellY = Math.floor(this.state.pos.y);
        if (terrain.isValid(cellX, cellY)) {
          terrain.soilFertility[cellY][cellX] += 0.5;
        }
        this.state.action = AnimalAction.IDLE;
        break;
      }
      case AnimalAction.MATE:
        this.mate(terrain, animals, deltaMinutes);
        break;
      case AnimalAction.HUNT:
        this.hunt(terrain, animals, deltaMinutes);
        break;
      case AnimalAction.FLEE:
        this.flee(terrain, animals, deltaMinutes);
        break;
    }
  }

  private hunt(terrain: TerrainMap, animals: Animal[], deltaMinutes: number) {
    if (!this.state.targetId) {
      this.state.action = AnimalAction.IDLE;
      return;
    }
    const prey = animals.find(a => a.state.id === this.state.targetId);
    if (!prey || prey.isDead()) {
      this.state.targetId = undefined;
      this.state.action = AnimalAction.IDLE;
      return;
    }

    const dist = this.dist(this.state.pos, prey.state.pos);
    if (dist < 0.25) { // 0.5 units distance (~22 meters)
      // Attack!
      prey.state.health -= 30 * deltaMinutes;
      if (prey.isDead()) {
        this.state.hunger -= 50;
        if (this.state.hunger < 0) this.state.hunger = 0;
        this.state.targetId = undefined;
        this.state.action = AnimalAction.IDLE;
      }
    } else {
      this.state.targetPos = { ...prey.state.pos };
      this.moveToTarget(terrain, deltaMinutes, 3.5); // Faster when hunting
    }
  }

  private flee(terrain: TerrainMap, animals: Animal[], deltaMinutes: number) {
    if (!this.state.targetId) {
      this.state.action = AnimalAction.IDLE;
      return;
    }
    const predator = animals.find(a => a.state.id === this.state.targetId);
    if (!predator || this.dist(this.state.pos, predator.state.pos) > 12) {
      this.state.targetId = undefined;
      this.state.action = AnimalAction.IDLE;
      return;
    }

    // Run away from predator
    const dx = this.state.pos.x - predator.state.pos.x;
    const dy = this.state.pos.y - predator.state.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    this.state.targetPos = {
      x: this.state.pos.x + (dx / dist) * 5,
      y: this.state.pos.y + (dy / dist) * 5
    };
    this.moveToTarget(terrain, deltaMinutes, 1.8); // Run fast!
  }

  private moveToTarget(terrain: TerrainMap, deltaMinutes: number, speedMultiplier: number = 1.0) {
    if (!this.state.targetPos) {
      this.path = [];
      return;
    }

    // If we don't have a path or the target changed significantly, find a new path
    const lastPathPoint = this.path.length > 0 ? this.path[this.path.length - 1] : null;
    if (this.path.length === 0 || 
        !lastPathPoint || 
        Math.abs(lastPathPoint.x - this.state.targetPos.x) > 1 || 
        Math.abs(lastPathPoint.y - this.state.targetPos.y) > 1) {
      // Direct path fallback since Pathfinding is removed
      this.path = [this.state.targetPos];
    }

    const nextPoint = this.path[0];
    const dx = nextPoint.x - this.state.pos.x;
    const dy = nextPoint.y - this.state.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) { // Arrived (within ~4.5 meters)
      this.path.shift();
      if (this.path.length === 0) {
        this.state.targetPos = undefined;
        this.state.action = AnimalAction.IDLE;
      }
      return;
    }
    
    // Base speed: 6.0 cells per minute (~4 km/h)
    const info = this.speciesInfo;
    let baseSpeed = info ? info.speed * 4.0 : 6.0;
    
    // Biome cost impact on speed
    const currentX = Math.floor(this.state.pos.x);
    const currentY = Math.floor(this.state.pos.y);
    let biomeMod = 1.0;
    if (terrain.isValid(currentX, currentY)) {
      const biome = terrain.template[currentY][currentX];
      biomeMod = biome === Biome.MOUNTAIN || biome === Biome.PEAK ? 0.5 : 1.0;
    }

    const speed = baseSpeed * biomeMod * deltaMinutes * speedMultiplier;
    
    // Prevent overshooting
    if (speed > dist) {
      this.state.pos.x = nextPoint.x;
      this.state.pos.y = nextPoint.y;
    } else {
      this.state.pos.x += (dx / dist) * speed;
      this.state.pos.y += (dy / dist) * speed;
    }
    this.state.energy -= 0.005 * deltaMinutes * speedMultiplier;
  }

  private findAndEat(terrain: TerrainMap, deltaMinutes: number) {
    const x = Math.floor(this.state.pos.x);
    const y = Math.floor(this.state.pos.y);
    
    // Simple eating logic: herbivores eat plants
    if (terrain.plants[y][x].length > 0) {
      terrain.plants[y][x].pop(); // Eat a plant
      this.state.hunger -= 30;
      this.state.waste += 5;
      if (this.state.hunger < 0) this.state.hunger = 0;
      this.state.action = AnimalAction.IDLE;
    } else {
      // Wander to find food
      if (!this.state.targetPos) {
        // Search nearby for plants using spiral search
        for (let r = 1; r <= 10; r++) {
          for (let i = -r; i <= r; i++) {
            for (let j = -r; j <= r; j++) {
              const nx = x + i;
              const ny = y + j;
              if (terrain.isValid(nx, ny) && terrain.plants[ny][nx].length > 0) {
                this.state.targetPos = { x: nx, y: ny };
                break;
              }
            }
            if (this.state.targetPos) break;
          }
          if (this.state.targetPos) break;
        }
      }
      this.moveToTarget(terrain, deltaMinutes);
    }
  }

  private findAndDrink(terrain: TerrainMap, deltaMinutes: number) {
    const x = Math.floor(this.state.pos.x);
    const y = Math.floor(this.state.pos.y);
    const biome = terrain.template[y][x];
    
    if (biome === Biome.SHALLOW || biome === Biome.DEEP_WATER || biome === Biome.SWAMP) {
      this.state.thirst -= 30;
      if (this.state.thirst < 0) this.state.thirst = 0;
      this.state.action = AnimalAction.IDLE;
    } else {
      // Find water
      if (!this.state.targetPos) {
        // Search nearby for water using spiral search
        for (let r = 1; r <= 15; r++) {
          for (let i = -r; i <= r; i++) {
            for (let j = -r; j <= r; j++) {
              const nx = x + i;
              const ny = y + j;
              if (terrain.isValid(nx, ny)) {
                const nb = terrain.template[ny][nx];
                if (nb === Biome.SHALLOW || nb === Biome.DEEP_WATER || nb === Biome.SWAMP) {
                  this.state.targetPos = { x: nx, y: ny };
                  break;
                }
              }
            }
            if (this.state.targetPos) break;
          }
          if (this.state.targetPos) break;
        }
      }
      this.moveToTarget(terrain, deltaMinutes);
    }
  }

  private mate(terrain: TerrainMap, animals: Animal[], deltaMinutes: number) {
    if (!this.state.partnerId) return;
    const partner = animals.find(a => a.state.id === this.state.partnerId);
    if (!partner) {
      this.state.partnerId = undefined;
      this.state.action = AnimalAction.IDLE;
      return;
    }

    const dist = this.dist(this.state.pos, partner.state.pos);
    if (dist < 0.25) { // 0.5 units distance (~22 meters)
      if (this.state.gender === 'f') {
        this.state.isPregnant = true;
        this.state.gestationProgress = 0;
      }
      this.state.action = AnimalAction.IDLE;
      this.state.partnerId = undefined;
      partner.state.action = AnimalAction.IDLE;
      partner.state.partnerId = undefined;
    } else {
      this.state.targetPos = { ...partner.state.pos };
      this.moveToTarget(terrain, deltaMinutes);
    }
  }

  private applyEnvironmentalImpact(terrain: TerrainMap, deltaMinutes: number) {
    const x = Math.floor(this.state.pos.x);
    const y = Math.floor(this.state.pos.y);
    if (!terrain.isValid(x, y)) return;

    // Trampling: animals damage terrain deterministically
    terrain.damage[y][x] = Math.min(100, terrain.damage[y][x] + 0.01 * deltaMinutes);
  }

  private dist(p1: Point, p2: Point) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  isDead() {
    return this.state.health <= 0 || this.state.age > 10;
  }
}
