
import { TerrainMap } from './terrain';
import { WeatherSystem, DisasterSystem } from './environment';
import { WorldSnapshot, Biome, TribeRole } from './types';
import { Human } from './entities/humans/Human';
import { HumanBrain } from './entities/humans/HumanBrain';
import { SubjectAlpha } from './entities/humans/Alpha';
import { SubjectBeta } from './entities/humans/Beta';
import { TimeManager } from './managers/TimeManager';
import { LogManager } from './managers/LogManager';
import { EntityManager } from './managers/EntityManager';
import { HistoryManager } from './managers/HistoryManager';
import { TribeManager } from './managers/TribeManager';
import { SignalManager } from './SignalManager';

import { rng } from './SeededRNG';
import { metricsManager } from './SimulationMetricsManager';
import { neuralKnowledgeService } from './NeuralKnowledgeService';

import { PassiveVectorService } from './PassiveVectorService';
import { NamingSystem } from './entities/humans/NamingSystem';

export class World {
  terrain: TerrainMap;
  weather: WeatherSystem;
  disasters: DisasterSystem;
  
  time: TimeManager = new TimeManager();
  entities: EntityManager = new EntityManager();
  logger: LogManager = new LogManager();
  history: HistoryManager = HistoryManager.getInstance();
  signalManager: SignalManager = new SignalManager();
  tribeManager: TribeManager;
  passiveVectors: PassiveVectorService;
  
  // Replay Harness
  seed: number;
  actionLog: { step: number, type: string, payload?: any }[] = [];
  currentStep: number = 0;

  score: number = 0;
  events: any[] = [];
  eventId: number = 0;
  
  private lastSnapshot: any = null;
  private realTimeAccumulator: number = 0;

  constructor(width: number, height: number, seed: number = 1337) {
    console.log('World: Constructor started');
    this.seed = seed;
    // Initialize deterministic seed for the world session
    rng.setSeed(seed + width * 7 + height * 3); 
    
    this.terrain = new TerrainMap(width);
    console.log('World: Terrain created');
    this.weather = new WeatherSystem();
    this.disasters = new DisasterSystem(width);
    this.tribeManager = new TribeManager(this.logger);
    this.passiveVectors = PassiveVectorService.getInstance(width);

    // Spawn alpha and beta on land
    console.log('World: Finding land for spawn...');
    const spawnPos = this.findLand(Math.floor(width / 2), Math.floor(height / 2));
    console.log('World: Spawning humans...');
    this.entities.spawnInitialHumans(spawnPos);
    
    // Form the initial tribe at the spawn location
    this.tribeManager.createTribe('ถ้ำผาแดง', this.entities.humans, spawnPos);
    
    const { alpha, beta } = NamingSystem.getInitialNames();
    this.history.addEvent(this.time.day, 'milestone', `${alpha} and ${beta} have materialized on the island.`);
    this.logger.addWorldLog(`[SYSTEM] NEURAL_LINK established. Subject identification: ${alpha.toUpperCase()}, ${beta.toUpperCase()}.`);
    this.logger.addWorldLog(`[SYSTEM] BIOSPHERE_MONITOR active. Initializing island telemetry...`);

    // Spawn initial animals
    console.log('World: Spawning animals...');
    this.entities.spawnInitialAnimals(width, height, this.terrain);

    // Initialize Knowledge
    console.log('World: Knowledge Service ready.');
    console.log('World: Constructor finished. Humans:', this.entities.humans.length);
  }

  getLightLevel(hour: number): number {
    return this.time.getLightLevel();
  }

  addEvent(type: 'reward' | 'damage' | 'craft' | 'social' | 'gather', text: string, x: number, y: number, color: string) {
    this.events.push({
      id: this.eventId++,
      type,
      text,
      x,
      y,
      color
    });
  }

  async step(deltaMinutes: number = 10) {
    // console.log(`World: Step started (deltaMinutes: ${deltaMinutes.toFixed(4)})`);
    this.events = []; // Clear events from last tick
    
    // Track real time for periodic logging (5 seconds)
    const dtReal = deltaMinutes * 30000; // Convert sim minutes back to real ms
    this.realTimeAccumulator += dtReal;
    
    if (this.realTimeAccumulator >= 5000) {
      this.realTimeAccumulator = 0;
      // Cycle through subjects deterministically
      const { alpha, beta } = NamingSystem.getInitialNames();
      const subjects = [alpha.toUpperCase(), beta.toUpperCase()] as const;
      const subjectIndex = Math.floor(this.time.day + this.time.hour) % subjects.length;
      const name = subjects[subjectIndex];
      const items = neuralKnowledgeService.getKnowledgeEntries(name === alpha.toUpperCase() ? 'ADAM' : 'EVE');
      if (items && items.length > 0) {
        const wisdomIndex = (this.time.day * 24 + this.time.hour) % items.length;
        const wisdom = items[wisdomIndex];
        this.logger.addWorldLog(`[SIGNAL] ${name.toUpperCase()}: ${wisdom.content}`);
      }
    }

    const { dayChanged, hourChanged } = this.time.step(deltaMinutes);
    
    metricsManager.update(performance.now(), this.time.day);

    // console.log(`World: Step. Time: ${this.time.getFormattedTime()} delta: ${deltaMinutes.toFixed(4)}`);

    if (dayChanged) {
      this.score += 10;
      this.history.addEvent(this.time.day, 'daily_summary', `Day ${this.time.day} completed. Score: ${this.score}`);
      this.weather.stepDay();
      this.logger.addWorldLog(`[SYSTEM] [${this.time.day}:00] Weather update: ${this.weather.currentState}`);
    }

    if (hourChanged) {
      const { events } = this.disasters.stepDay(this.weather, this.terrain);
      if (events.length > 0) {
        this.logger.addWorldLog(`[SYSTEM] [${this.time.day}:${this.time.hour}] Environmental alert: ${events.join(', ')}`);
      }
    }

    // Update spatial grids
    this.entities.updateSpatialGrids();

    // Update structures
    this.terrain.step(this.weather.currentState, deltaMinutes);
    this.terrain.regrow(this.weather.currentState, deltaMinutes);
    
    this.entities.structures.forEach(s => s.update(this.weather, this.terrain, deltaMinutes));
    this.entities.structures = this.entities.structures.filter(s => !s.isDestroyed());
    
    // Update humans
    const newHumans: Human[] = [];
    for (const h of this.entities.humans) {
      const oldAction = h.state.action;
      const birthSignal = await h.update(
        this.terrain, 
        this.entities.humans, 
        this.entities.structures, 
        this.time.day, 
        this.time.hour, 
        this.time.minute, 
        deltaMinutes, 
        this.weather, 
        this.weather.globalTemperature, 
        this.entities.spatialHumans, 
        this.entities.spatialAnimals,
        this.entities.spatialStructures,
        this.signalManager
      );
      
      if (h.state.action !== oldAction) {
        const logMsg = `[${this.time.day}:${this.time.hour.toString().padStart(2, '0')}] SUBJECT_${h.state.name.toUpperCase()} changed state to ${h.state.action.toUpperCase()}`;
        this.logger.addHumanLog(h.state.id, logMsg);
      }

      if (birthSignal) {
        const bs = birthSignal as { motherId: string, partnerId: string };
        const mother = h;
        const father = this.entities.humans.find(hu => hu.id === bs.partnerId);
        
        if (father) {
          const childId = `child_${this.time.day}_${this.entities.humanIdCounter++}`;
          // Gender alternating based on counter
          const childGender = this.entities.humanIdCounter % 2 === 0 ? 'm' : 'f';
          const childGeneration = (mother.state.generation || 1) + 1;
          const childName = NamingSystem.getChildName(childGender, childGeneration);
          const child = new Human(childId, childName, { ...mother.state.pos }, childGender, null, childGeneration);
          child.state.parents = [
            { id: mother.id, name: mother.state.name },
            { id: father.id, name: father.state.name }
          ];
          
          // Genetic Inheritance (Traits) - Blend parents + mutation
          const mGen = mother.state.genetics;
          const fGen = father.state.genetics;
          const mutation = () => (rng.next() * 10 - 5); // -5 to +5
          
          child.state.genetics = {
            strength: Math.max(10, Math.min(100, (mGen.strength + fGen.strength) / 2 + mutation())),
            speed: Math.max(10, Math.min(100, (mGen.speed + fGen.speed) / 2 + mutation())),
            intelligence: Math.max(10, Math.min(100, (mGen.intelligence + fGen.intelligence) / 2 + mutation())),
            metabolism: Math.max(10, Math.min(100, (mGen.metabolism + fGen.metabolism) / 2 + mutation())),
            immunity: Math.max(10, Math.min(100, (mGen.immunity + fGen.immunity) / 2 + mutation())),
            coldResistance: Math.max(10, Math.min(100, (mGen.coldResistance + fGen.coldResistance) / 2 + mutation())),
            heatResistance: Math.max(10, Math.min(100, (mGen.heatResistance + fGen.heatResistance) / 2 + mutation())),
            longevity: Math.max(40, Math.min(120, (mGen.longevity + fGen.longevity) / 2 + mutation()))
          };

          // Neural Inheritance
          const inheritedWeights = HumanBrain.crossover(mother.brain, father.brain);
          child.brain.setWeights(inheritedWeights);
          
          child.state.age = 0;
          child.state.thought = "I am a new soul in Pangea. My parents' wisdom flows through my mind.";
          
          // Tribe inheritance
          if (mother.state.tribeId) {
            child.state.tribeId = mother.state.tribeId;
            child.state.tribeRole = TribeRole.MEMBER;
            const tribe = this.tribeManager.getTribe(mother.state.tribeId);
            if (tribe) {
              tribe.memberIds.push(child.id);
            }
          }

          newHumans.push(child);
          
          this.history.addEvent(this.time.day, 'birth', `${childName} was born to ${mother.state.name} and ${father.state.name}.`);
          this.logger.addWorldLog(`Biological Event: New human ${childName} born at (${Math.round(child.pos.x)}, ${Math.round(child.pos.y)})`);
        }
      }
    }
    this.entities.humans.push(...newHumans);
    
    // Update animals
    this.entities.animals.forEach(a => {
      a.update(this.terrain, this.entities.animals, this.time.day, this.time.hour, deltaMinutes, this.weather.currentState, this.disasters.activeDisasters, this.entities.spatialHumans, this.entities.spatialAnimals);
    });

    // Respawn logic - Threshold based (Critical survival failure)
    if (this.entities.humans.length < 2 && this.time.hour === 0 && this.time.minute === 0) {
      const missing = this.entities.humans.find(h => h.state.id === 'adam') ? 'eve' : 'adam';
      const spawnPos = this.findLand(Math.floor(this.terrain.width / 2), Math.floor(this.terrain.height / 2));
      const newHuman = missing === 'adam' ? new SubjectAlpha(spawnPos) : new SubjectBeta(spawnPos);
      this.entities.humans.push(newHuman);
      this.history.addEvent(this.time.day, 'milestone', `${newHuman.state.name} has re-materialized.`);
    }

    this.entities.cleanupDead();
    this.signalManager.cleanup(this.time.day * 24 + this.time.hour);

    this.tribeManager.update(deltaMinutes, this.entities.humans);

    // Maintain animal population - Systematic density check
    if (this.entities.animals.length < 15 && this.time.hour % 6 === 0 && this.time.minute === 0) {
      this.entities.spawnInitialAnimals(this.terrain.width, this.terrain.height, this.terrain);
    }

    // Refresh Passive Vectors for the environment
    this.passiveVectors.updateVectors(this);

    this.applyEnvironmentalImpact(deltaMinutes);
    this.currentStep++;
  }

  private applyEnvironmentalImpact(deltaMinutes: number) {
    const humanImpact = this.entities.humans.length * 0.001;
    const animalImpact = this.entities.animals.length * 0.0005;
    const totalImpact = (humanImpact + animalImpact) * deltaMinutes;

    // Systematic impact application on a grid section
    const step = 5;
    for (let y = 0; y < this.terrain.height; y += step) {
      for (let x = 0; x < this.terrain.width; x += step) {
        if (this.terrain.isValid(x, y)) {
          // If total impact reaches threshold for this area
          if (totalImpact > 0.05) {
            if (this.terrain.plants[y][x].length > 0) this.terrain.plants[y][x].pop();
            this.terrain.trees[y][x] = Math.max(0, this.terrain.trees[y][x] - 0.01 * totalImpact);
          }
        }
      }
    }
  }

  applyIntervention(type: string, payload?: any) {
    this.logger.addWorldLog(`[SYSTEM] PROTOCOL_ALPHA: Executing ${type}`);
    this.history.addEvent(this.time.day, 'milestone', `The Architect has initiated ${type} protocol.`);
    
    // Log action for replay
    this.actionLog.push({ step: this.currentStep, type, payload });

    switch (type) {
      case 'SOLAR_FLARE':
        this.weather.globalTemperature += 15;
        this.weather.globalMoisture -= 10;
        // Start deterministic fires
        for (let i = 0; i < 5; i++) {
          const x = (this.time.day * 17 + i * 7) % this.terrain.width;
          const y = (this.time.day * 23 + i * 11) % this.terrain.height;
          this.disasters.activeDisasters.push({ kind: 'fire', duration: 3, severity: 0.8, x, y });
        }
        break;
      case 'AERO_BLOOM':
        this.weather.globalMoisture += 25;
        this.weather.globalTemperature -= 5;
        // Heal all plants slightly
        for (let y = 0; y < this.terrain.height; y++) {
          for (let x = 0; x < this.terrain.width; x++) {
            this.terrain.plants[y][x].forEach(p => p.health = Math.min(100, p.health + 20));
            this.terrain.soilMoisture[y][x] = Math.min(100, this.terrain.soilMoisture[y][x] + 20);
          }
        }
        break;
      case 'STASIS_PROTOCOL':
        this.entities.humans.forEach(h => {
          h.state.hormones.cortisol = 0;
          h.state.hormones.oxytocin = 0.8;
          h.state.health = Math.min(100, h.state.health + 10);
          h.state.thought = "A strange calm washes over me. The world feels... governed.";
        });
        break;
      case 'RESOURCE_INJECTION':
        for (let i = 0; i < 20; i++) {
          const x = (this.time.day * 13 + i * 5) % this.terrain.width;
          const y = (this.time.day * 31 + i * 3) % this.terrain.height;
          this.terrain.soilFertility[y][x] = Math.min(1, this.terrain.soilFertility[y][x] + 0.5);
          this.terrain.trees[y][x] = Math.min(1, this.terrain.trees[y][x] + 0.3);
        }
        break;
    }
  }

  private findLand(cx: number, cy: number) {
    for (let r = 0; r < 50; r++) {
      for (let i = -r; i <= r; i++) {
        for (let j = -r; j <= r; j++) {
          const nx = cx + i;
          const ny = cy + j;
          if (this.terrain.isValid(nx, ny)) {
            const b = this.terrain.template[ny][nx];
            if (b !== Biome.SHALLOW && b !== Biome.DEEP_WATER && b !== Biome.SWAMP) {
              return { x: nx, y: ny };
            }
          }
        }
      }
    }
    return { x: cx, y: cy };
  }

  getSnapshot(full: boolean = false): WorldSnapshot {
    const logs = this.logger.getSnapshot();
    
    // Calculate average fertility and biomass
    let totalFertility = 0;
    let totalBiomass = 0;
    let cellCount = 0;
    for (let y = 0; y < this.terrain.size; y++) {
      for (let x = 0; x < this.terrain.size; x++) {
        totalFertility += this.terrain.soilFertility[y][x];
        
        // Sum plant health for biomass
        const cellPlants = this.terrain.plants[y][x];
        for (const p of cellPlants) {
          totalBiomass += p.health;
        }
        
        cellCount++;
      }
    }
    const averageFertility = (totalFertility / cellCount) * 100; // Convert to percentage

    const snapshot: any = {
      day: this.time.day,
      time: this.time.hour,
      minute: this.time.minute,
      weather: this.weather.currentState,
      season: this.weather.getSeasonLabel(),
      globalTemp: this.weather.globalTemperature,
      lightLevel: this.time.getLightLevel(),
      logs: logs.logs,
      alphaLogs: logs.alphaLogs,
      betaLogs: logs.betaLogs,
      historyEvents: this.history.getNewEvents(),
      milestones: this.history.getMilestones(),
      events: [...this.events],
      score: this.score,
      animals: this.entities.animals.map(a => ({ ...a.state })),
      humans: this.entities.humans.map(h => ({ ...h.state })),
      structures: this.entities.structures.map(s => ({
        id: s.id,
        type: s.type,
        pos: { ...s.pos },
        health: s.health,
        maxHealth: s.maxHealth,
        progress: s.progress,
        defenseBonus: s.defenseBonus,
        capacity: s.capacity,
        flammability: s.flammability,
        insulation: s.insulation
      })),
      averageFertility,
      globalMoisture: this.weather.globalMoisture,
      animalCount: this.entities.animals.length,
      humanCount: this.entities.humans.length,
      totalBiomass,
      tribes: this.tribeManager.getTribes(),
      signals: this.signalManager.getAllSignals()
    };

    // Only include grid if full snapshot is requested
    if (full || !this.lastSnapshot) {
      snapshot.grid = this.terrain.template.map((row, y) => 
        row.map((biome, x) => ({
          biome,
          plants: this.terrain.plants[y][x],
          water: this.terrain.soilMoisture[y][x],
          fire: this.terrain.fireLevel[y][x],
          temperature: this.weather.globalTemperature,
          height: this.terrain.heightmap[y][x],
          tree: this.terrain.trees[y][x],
          rock: this.terrain.rocks[y][x],
          fertility: this.terrain.soilFertility[y][x],
          toxicity: 0,
          radiation: 0,
          minerals: 0,
          magic: 0,
          resource: this.terrain.resources[y][x],
          hazard: this.terrain.hazards[y][x],
          poi: this.terrain.pois[y][x],
          damage: this.terrain.damage[y][x]
        }))
      );
    }

    this.lastSnapshot = snapshot;
    return snapshot;
  }

  clearNewEvents() {
    this.history.clearNewEvents();
  }

  clearLogs() {
    this.logger.clear();
    this.history.clearAll();
  }
}
