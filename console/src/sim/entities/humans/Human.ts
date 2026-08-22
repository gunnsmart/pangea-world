
import { TerrainMap } from '../../terrain';
import { WeatherSystem } from '../../environment';
import { DomainKnowledge, CharacterProfile, Memory } from '../../../data/knowledge/schema';
import { HumanState, AnimalAction, Point, Biome, PlantStage } from '../../types';
import { Structure } from '../../structures';
import { Animal } from '../../animals';
import { SpatialHashGrid } from '../../spatial';
import { Thermodynamics } from '../../physics';
import { infiniteEngine } from '../../../services/stigmergyService';
import { craftingSystem, materialDB, Material, CraftingAction } from '../../crafting-system';
import { 
  ActionExecutor, 
  ActionPriorityQueue, 
  ActionDecoder, 
  AgentState, 
  Action,
  ActionType,
  PersonalityActionBias
} from '../../action-system';
import { HumanNeeds } from './HumanNeeds';
import { HumanBrain } from './HumanBrain';
import { RelationshipManager } from './HumanRelationships';
import { SignalManager } from '../../SignalManager';
import { ActiveInferenceMiddleware } from '../../middleware/ActiveInference';

export class Human {
  state: HumanState;
  brain: HumanBrain;
  private inputsScratch: Float32Array;
  actionExecutor: ActionExecutor;
  actionDecoder: ActionDecoder = new ActionDecoder();
  protected profile: CharacterProfile | null = null;
  private lastDecisionTime: number = -1;
  private decisionInterval: number = 0.2;
  private currentStructures: Structure[] = [];
  private currentSignalManager: SignalManager | null = null;
  private prevStats: any = null;
  private cumulativeReward: number = 0;
  private lastNeuralInputs: Float32Array | null = null;
  private lastNeuralOutputs: number[] | null = null;
  private lastActivityH: number[] | null = null;
  private lastActivityO: number[] | null = null;
  private currentHumans: Human[] = [];
  private currentTerrain?: TerrainMap;
  private lastSpatialAnimals?: SpatialHashGrid<Animal>;

  get id() { return this.state.id; }
  get pos() { return this.state.pos; }

  constructor(id: string, name: string, pos: Point, gender: 'm' | 'f', profile: any = null, generation: number = 1) {
    this.profile = profile;
    const defaultSkills: Record<string, number> = gender === 'm' 
      ? { 
          construction: 40, strength: 50, hunting: 30, botany: 10, 
          firemaking: 20, crafting: 25, cooking: 15, medicine: 10, navigation: 35, social: 20,
          endurance: 45, agility: 30, swimming: 15, stealth: 20
        }
      : { 
          construction: 10, strength: 20, hunting: 10, botany: 50, social: 60,
          firemaking: 30, crafting: 40, cooking: 45, medicine: 35, navigation: 20,
          endurance: 30, agility: 50, swimming: 25, stealth: 40
        };

    this.state = {
      id,
      name,
      pos,
      health: 100,
      energy: 90,
      hunger: 5,
      thirst: 5,
      stomachContent: 0,
      age: 25,
      gender,
      weight: gender === 'm' ? 82 : 62,
      height: gender === 'm' ? 1.82 : 1.68,
      bodyTemp: 37.0,
      bloodPressure: 120,
      muscleFatigue: 0,
      muscleMass: gender === 'm' ? 45 : 35,
      immuneSystem: 100,
      stress: 0,
      waste: 0,
      neuroStability: 100,
      cognitiveLoad: 10,
      generation,
      hormones: {
        testosterone: gender === 'm' ? 70 : 10,
        estrogen: gender === 'f' ? 60 : 10,
        progesterone: 0,
        cortisol: 10,
        oxytocin: 20
      },
      emotions: {
        awe: 0,
        relationships: {},
        joy: 50,
        grief: 0,
        loneliness: 10
      },
      loneliness: 10,
      socialReputation: 50,
      isPregnant: false,
      gestationProgress: 0,
      genetics: {
        strength: 50,
        speed: 50,
        intelligence: 50,
        metabolism: 50,
        immunity: 50,
        coldResistance: 50,
        heatResistance: 50,
        longevity: gender === 'f' ? 95 : 85
      },
      statusFlags: {
        isParticipatingInRitual: false,
        isAdapting: false,
      },
      vocabulary: gender === 'm' 
        ? ['ล่า', 'สร้าง', 'ปกป้อง', 'เงียบ', 'ร่องรอย', 'วิญญาณ', 'หมี', 'หอก', 'หน้าที่', 'เกียรติยศ'] 
        : ['เก็บ', 'ปลูก', 'ดูแล', 'เยียวยา', 'สายน้ำ', 'เมล็ดพันธุ์', 'พระแม่ธรณี', 'ตะกร้า', 'อารมณ์', 'ชีวิต'],
      culture: {
        symbolsDiscovered: [],
        ritualsPerformed: 0
      },
      subconscious: {
        dreams: [],
        traumas: [],
        archetypes: []
      },
      action: AnimalAction.IDLE,
      currentAction: null,
      actionQueue: new ActionPriorityQueue(),
      thought: gender === 'm' 
        ? "ข้าคือบุรุษแห่งถ้ำผาแดง..." 
        : "ข้าคือสตรีแห่งถ้ำผาแดง...",
      inventory: { items: [], wood: 0, stone: 0, food: 10 },
      skills: profile ? { ...defaultSkills, ...profile.skills } : defaultSkills,
      interactionCount: 0,
      knowledge: {
        spiritAnimal: gender === 'm' ? 'Bear' : 'Wolf',
        moonBloodCycle: 0,
        isMoonBloodActive: false,
        isFertile: false,
        menopause: false,
        totalBirths: 0,
        diseases: []
      },
      domainKnowledge: profile ? [...profile.knowledge] : [],
      learningHistory: profile ? [...profile.learningHistory] : [],
      reasoningTemplates: profile ? [...profile.reasoningTemplates] : [],
      memories: [],
      signalAssociations: {},
      spatialAssociations: [],
      perception: {
        visibleEntities: [],
        heardSounds: [],
        smells: [],
        tastes: [],
        touches: []
      }
    };


    infiniteEngine.registerAgent(id, name);
    this.brain = new HumanBrain(id);
    this.inputsScratch = new Float32Array(this.brain.getInputDim());

    this.actionExecutor = new ActionExecutor(
      (agentState, action, outcome) => {
        const hrlReward = ActiveInferenceMiddleware.calculateHRLReward(this.prevStats, agentState.stats);
        
        let predictionReward = 0;
        if (action.expectedOutcome) {
            const predictionError = ActiveInferenceMiddleware.calculatePredictionError(action.expectedOutcome, outcome);
            // Increase stress based on prediction error (Surprise)
            this.state.stress = Math.min(100, this.state.stress + predictionError * 20);
            predictionReward = -predictionError * 0.5; // Negative reward for high surprise/error
            
            // Collective Active Inference: If error is high, broadcast a warning (Discovery)
            if (predictionError > 0.4) {
              this.currentSignalManager?.addSignal({
                id: `discovery_${Date.now()}`,
                senderId: this.id,
                content: predictionError > 0.7 ? 'S-DANGER' : 'S-WARNING',
                pos: { ...this.state.pos },
                timestamp: (this.currentSimTime.day * 24 + this.currentSimTime.hour + (this.currentSimTime.minute / 60)) || 0,
                duration: 0.5,
                metadata: {
                  predictionError,
                  beliefType: predictionError > 0.7 ? 'danger' : 'resource',
                  intensity: predictionError
                }
              });
            }
        }

        const totalReward = hrlReward + predictionReward;
        this.cumulativeReward += totalReward;

        if (this.lastNeuralInputs && this.lastNeuralOutputs && Math.abs(totalReward) > 0.01) {
            // Metabolic Brain Coupling: Energy and Hunger affect learning speed
            // If starving or exhausted, learning is severely impaired
            const hungerFactor = (100 - this.state.hunger) / 100; // 0 if hungry (100)
            const energyFactor = this.state.energy; // 0 if tired
            const metabolicMultiplier = Math.max(0.1, hungerFactor * energyFactor);
            
            this.brain.recordExperience(this.lastNeuralInputs, this.lastNeuralOutputs, totalReward, metabolicMultiplier);
        }

        this.state.action = AnimalAction.IDLE;
        
        // Final sync of stats
        this.state.health = agentState.stats.health;
        this.state.hunger = agentState.stats.hunger;
        this.state.thirst = agentState.stats.thirst;
        this.state.energy = agentState.stats.energy;
        this.state.emotions.joy = agentState.stats.mood;

        this.handleWorldEffect(outcome.worldEffect, action);
        
        if (action.type === 'communicate' || action.type === 'teach') {
          // Broadcast high-confidence beliefs during social interaction
          const bestKnowledge = this.state.domainKnowledge
            .sort((a, b) => b.confidence - a.confidence)[0];
            
          if (bestKnowledge) {
            this.currentSignalManager?.addSignal({
              id: `belief_${Date.now()}`,
              senderId: this.id,
              content: 'S-BELIEF',
              pos: { ...this.state.pos },
              timestamp: (this.currentSimTime.day * 24 + this.currentSimTime.hour + (this.currentSimTime.minute / 60)) || 0,
              duration: 1.0,
              metadata: {
                beliefType: 'social',
                brainUpdate: { 
                  inputs: this.lastNeuralInputs ? Array.from(this.lastNeuralInputs) : [], 
                  targets: this.lastNeuralOutputs || [] 
                }
              }
            });
            this.state.thought = `ข้ากำลังแบ่งปันความเชื่อเรื่อง '${bestKnowledge.title}'`;
          }
        }

        if (outcome.knowledgeGained) {
            outcome.knowledgeGained.forEach(k => {
                if (k.startsWith('taught_')) {
                    const teacherId = k.replace('taught_', '');
                    const teacher = this.currentHumans.find(h => h.id === teacherId);
                    if (teacher) {
                        const kList = teacher.state.domainKnowledge;
                        if (kList.length > 0) {
                            // Cycle through knowledge instead of random selection
                            const kIndex = this.state.interactionCount % kList.length;
                            const targetK = kList[kIndex];
                            if (!this.state.domainKnowledge.some(dk => dk.title === targetK.title)) {
                                this.state.domainKnowledge.push({ ...targetK, source: 'taught', confidence: 0.5 });
                                this.state.thought = `ข้าได้เรียนรู้เรื่อง '${targetK.title}' จาก ${teacher.state.name}`;
                                this.state.socialReputation += 5;
                            }
                        }
                    }
                } else {
                    agentState.knowledge.addOrUpdate({ content: k });
                }
            });
        }

        if (action.type === 'share' && action.target.agentId) {
            const recipient = this.currentHumans.find(h => h.id === action.target.agentId);
            if (recipient) {
                const food = this.state.inventory.items.find(i => i.id === 'food');
                if (food && food.quantity > 5) {
                    this.removeFromInventory('food', 2);
                    const foodMat = materialDB.get('food');
                    if (foodMat) recipient.addToInventory({ ...foodMat, quantity: 2 });
                    this.state.socialReputation += 10;
                    this.state.thought = `ข้าแบ่งปันอาหารให้ ${recipient.state.name}`;
                }
            }
        }
        
        if (outcome.itemsGained) {
            outcome.itemsGained.forEach(item => {
                if (item) this.addToInventory(item);
            });
        }

        if (outcome.domesticationGain && action.target.entityId && this.lastSpatialAnimals) {
            const animal = this.lastSpatialAnimals.query(this.state.pos, 5).find(a => a.state.id === action.target.entityId);
            if (animal) {
                animal.state.domesticationProgress = Math.min(100, (animal.state.domesticationProgress || 0) + outcome.domesticationGain);
                if (animal.state.domesticationProgress >= 100 && !animal.state.isDomesticated) {
                    animal.state.isDomesticated = true;
                    animal.state.tribeId = (this.state as any).tribeId;
                    this.state.thought = `ข้าขจัดความดุร้ายของ ${animal.state.species} และสัตว์นี้กลายเป็นส่วนหนึ่งของเผ่าแล้ว`;
                } else {
                    this.state.thought = `ข้ากำลังสร้างความคุ้นเคยกับ ${animal.state.species}`;
                }
            }
        }
      },
      (agentState, interrupted, by) => {
        // console.log(`⚡ ${this.state.name}: ${interrupted.type} interrupted by ${by.type}`);
      }
    );
  }

  private currentSimTime: { day: number, hour: number, minute: number } = { day: 0, hour: 0, minute: 0 };

  private handleWorldEffect(effect?: string, action?: Action) {
    if (!effect) return;
    
    const timeKey = `${this.currentSimTime.day}_${this.currentSimTime.hour}_${this.currentSimTime.minute}`;
    const simTimestamp = this.currentSimTime.day * 24 + this.currentSimTime.hour + (this.currentSimTime.minute / 60);

    if (effect === 'fire_lit') {
      const fire = new Structure(`fire_${this.id}_${timeKey}`, 'campfire', { ...this.state.pos });
      fire.progress = 100; // instant fire for now
      this.currentStructures.push(fire);
      this.currentSignalManager?.addSignal({
        id: `fire_signal_${this.id}_${timeKey}`,
        senderId: this.id,
        content: 'S-HEAT',
        pos: { ...this.state.pos },
        timestamp: simTimestamp,
        duration: 4
      });
    }

    if (effect === 'mating_occurred') {
      const partnerId = action?.target.agentId;
      if (partnerId && this.state.gender === 'f' && this.state.knowledge.isFertile && !this.state.isPregnant) {
        this.state.isPregnant = true;
        this.state.gestationProgress = 0;
        this.state.partnerId = partnerId;
        this.currentSignalManager?.addSignal({
          id: `conception_${this.id}_${timeKey}`,
          senderId: this.id,
          content: 'S-NEWLIFE',
          pos: { ...this.state.pos },
          timestamp: simTimestamp,
          duration: 2
        });
      }
    }

    if (effect === 'crop_planted' && this.currentTerrain) {
      const x = Math.floor(this.state.pos.x);
      const y = Math.floor(this.state.pos.y);
      if (this.currentTerrain.isValid(x, y)) {
        const seedId = action?.target.item?.id || 'allium_sativum'; // default to garlic if no item
        this.currentTerrain.plants[y][x].push({
          speciesId: seedId,
          age: 0,
          health: 100,
          waterLevel: 50,
          stage: PlantStage.SEED
        });
        this.state.thought = `ข้าได้ปลูก ${seedId} ลงในดิน`;
        // Consume seed if it was an item
        if (action?.target.item) {
          this.removeFromInventory(action.target.item.id, 1);
        }
      }
    }

    if (effect === 'crop_harvested' && this.currentTerrain) {
      const x = Math.floor(this.state.pos.x);
      const y = Math.floor(this.state.pos.y);
      if (this.currentTerrain.isValid(x, y)) {
        const cellPlants = this.currentTerrain.plants[y][x];
        const maturePlantIndex = cellPlants.findIndex(p => p.stage === PlantStage.MATURE);
        
        if (maturePlantIndex !== -1) {
          const plant = cellPlants[maturePlantIndex];
          cellPlants.splice(maturePlantIndex, 1);
          
          const foodMat = materialDB.get('food');
          if (foodMat) {
            this.addToInventory({ 
              ...foodMat, 
              name: `Food (${plant.speciesId})`,
              quantity: 5 
            });
          }
          this.state.thought = `ข้าเก็บเกี่ยว ${plant.speciesId} ที่สุกงอมแล้ว`;
          this.improveSkill('botany', 0.1);
        } else {
          this.state.thought = "ไม่มีพืชที่สุกงอมให้เก็บเกี่ยวที่นี่";
        }
      }
    }

    if (effect === 'soil_watered' && this.currentTerrain) {
      const x = Math.floor(this.state.pos.x);
      const y = Math.floor(this.state.pos.y);
      if (this.currentTerrain.isValid(x, y)) {
        this.currentTerrain.soilMoisture[y][x] = Math.min(1.0, this.currentTerrain.soilMoisture[y][x] + 0.3);
        this.state.thought = "ข้ารดน้ำให้ดินชุ่มชื้น";
      }
    }

    if (effect === 'fire_extinguished' && this.currentTerrain) {
      const x = Math.floor(this.state.pos.x);
      const y = Math.floor(this.state.pos.y);
      // Extinguish in a 3x3 area
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const nx = x + i;
          const ny = y + j;
          if (this.currentTerrain.isValid(nx, ny)) {
            this.currentTerrain.fireLevel[ny][nx] = Math.max(0, this.currentTerrain.fireLevel[ny][nx] - 2.0);
          }
        }
      }
      this.state.thought = "ข้าดับไฟเพื่อความปลอดภัย";
    }
  }


  async update(
    terrain: TerrainMap, 
    humans: Human[], 
    structures: Structure[], 
    day: number, 
    hour: number, 
    minute: number, 
    deltaMinutes: number, 
    weather: WeatherSystem, 
    globalTemp: number, 
    spatialHumans: SpatialHashGrid<Human>, 
    spatialAnimals: SpatialHashGrid<Animal>,
    spatialStructures: SpatialHashGrid<Structure>,
    signalManager: SignalManager
  ): Promise<any> {
    this.currentHumans = humans;
    this.currentTerrain = terrain;
    this.lastSpatialAnimals = spatialAnimals;
    this.currentSimTime = { day, hour, minute };
    // console.log(`[${this.state.name}] Update tick. Action: ${this.state.action}`);
    this.updateDrives(deltaMinutes, weather.currentState, terrain, humans, spatialHumans);
    this.updateBiologicalSystems(deltaMinutes, weather.globalTemperature, weather.currentState);
    this.updateKnowledge(day, hour, deltaMinutes);
    this.perceive(humans, structures, terrain, weather.currentState, spatialHumans, spatialAnimals, spatialStructures, signalManager);
    
    this.currentStructures = structures;
    this.currentSignalManager = signalManager;
    
    const simTime = day * 1440 + hour * 60 + minute;
    
    // Safety check for NaN positions
    if (isNaN(this.state.pos.x) || isNaN(this.state.pos.y)) {
      console.warn(`[${this.state.name}] NaN position detected! Resetting to center.`);
      this.state.pos = { x: 25, y: 25 };
    }

    if (simTime - this.lastDecisionTime > this.decisionInterval) {
      this.lastDecisionTime = simTime;
      await this.decideAction(terrain, weather, humans, spatialHumans, spatialAnimals, spatialStructures);
    }

    // Execute Action System Tick
    const agentInterface = this.getAgentInterface(terrain, humans, { hour, weather }, spatialHumans, spatialAnimals, spatialStructures);
    
    // Captured at action completion via onComplete
    this.prevStats = { ...agentInterface.stats };

    // Active Inference: Prediction Error (captured at action completion)
    
    this.actionExecutor.tick(agentInterface, deltaMinutes * 60 * 1000, agentInterface.environment);
    
    // Synchronize Action System state back to Human state
    this.state.health = agentInterface.stats.health;
    this.state.hunger = agentInterface.stats.hunger;
    this.state.thirst = agentInterface.stats.thirst;
    this.state.energy = agentInterface.stats.energy;
    this.state.emotions.joy = agentInterface.stats.mood;
    this.state.currentAction = agentInterface.currentAction;

    // Sync AnimalAction for UI
    if (this.state.currentAction) {
      const prevAction = this.state.action;
      this.state.action = this.mapActionToAnimalAction(this.state.currentAction.type);
      
      // SNN dynamics: Reset membrane potentials after sleep to simulate neural restoration
      if (prevAction === AnimalAction.SLEEP && this.state.action !== AnimalAction.SLEEP) {
        this.brain.network.resetState();
        this.brain.dreamConsolidation(0.8);
      }

      // Movement
      this.updateMovement(this.state.currentAction, deltaMinutes);
    } else {
      this.state.action = AnimalAction.IDLE;
    }

    let birthSignal: any = null;
    if (this.state.isPregnant && this.state.gestationProgress >= 100) {
      birthSignal = { motherId: this.id, partnerId: this.state.partnerId };
      this.state.isPregnant = false;
      this.state.gestationProgress = 0;
      this.state.knowledge.totalBirths = (this.state.knowledge.totalBirths || 0) + 1;
    }
    
    this.progressSkills(terrain, deltaMinutes);
    this.updateSocialDynamics(humans, deltaMinutes);
    this.processMemories(deltaMinutes);

    this.state.brainState = {
      inputs: this.brain.network.inputs,
      hidden: this.brain.network.hidden,
      outputs: this.brain.network.outputs,
      weightsIH: this.brain.network.weightsIH,
      weightsHO: this.brain.network.weightsHO,
      lastOutputs: this.lastNeuralOutputs ? Array.from(this.lastNeuralOutputs) : [],
      lastActivityH: this.lastActivityH ? Array.from(this.lastActivityH) : [],
      lastActivityO: this.lastActivityO ? Array.from(this.lastActivityO) : [],
      lastInputs: this.lastNeuralInputs ? Array.from(this.lastNeuralInputs) : [],
      actionQueue: this.state.actionQueue.getQueue(),
      modules: this.brain.getModules()
    };

    return birthSignal;
  }

  private updateBiologicalSystems(deltaMinutes: number, globalTemp: number, weather: string) {
    const dayProgress = deltaMinutes / 1440;
    const h = this.state.hormones;
    const k = this.state.knowledge;

    const isStressed = this.state.stress > 50 || this.state.hunger > 70 || this.state.thirst > 70;
    const isSocializing = this.state.action === AnimalAction.SOCIALIZE;
    const isBonded = this.state.emotions.relationships && Object.values(this.state.emotions.relationships).some(v => v.affinity > 70);

    h.cortisol = Math.min(100, h.cortisol + (isStressed ? 10 : -5) * dayProgress);
    h.cortisol = Math.max(5, h.cortisol);
    h.oxytocin = Math.min(100, h.oxytocin + (isSocializing ? 15 : isBonded ? 5 : -2) * dayProgress);
    h.oxytocin = Math.max(0, h.oxytocin);

    // Dynamic BPM (expressed as bloodPressure in state)
    // Base heart rate ~70, increases with stress, activity and low energy
    const activityBpmMap: Record<string, number> = {
      [AnimalAction.IDLE]: 0,
      [AnimalAction.SLEEP]: -10,
      [AnimalAction.WANDER]: 15,
      [AnimalAction.HUNT]: 40,
      [AnimalAction.FLEE]: 60,
      [AnimalAction.BUILD]: 30,
      [AnimalAction.GATHER]: 20,
    };
    const activityBonus = activityBpmMap[this.state.action] || 0;
    const stressBonus = (this.state.stress / 100) * 50;
    const hormonalBonus = (h.cortisol / 100) * 20;
    
    const targetBpm = 70 + activityBonus + stressBonus + hormonalBonus;
    // Smooth transition
    this.state.bloodPressure = Math.round(this.state.bloodPressure * 0.9 + targetBpm * 0.1);

    if (this.state.age > 40) {
      if (this.state.gender === 'm') h.testosterone = Math.max(20, h.testosterone - 0.1 * dayProgress);
      if (this.state.gender === 'f') h.estrogen = Math.max(10, h.estrogen - 0.2 * dayProgress);
    }

    if (this.state.gender === 'f' && !this.state.isPregnant && !k.menopause) {
      if (this.state.age >= 14 && this.state.age < 45) {
        k.moonBloodCycle = (k.moonBloodCycle || 0) + dayProgress;
        if (k.moonBloodCycle >= 28) k.moonBloodCycle = 0;
        k.isFertile = Math.abs(k.moonBloodCycle - 14) <= 3;
        k.isMoonBloodActive = k.moonBloodCycle <= 5;
        if (k.isMoonBloodActive) {
          this.state.energy = Math.max(0, this.state.energy - 2 * dayProgress);
          h.estrogen = Math.max(10, h.estrogen - 5 * dayProgress);
        }
        if (Math.abs(k.moonBloodCycle - 14) < 1) {
          h.estrogen = Math.min(100, h.estrogen + 20 * dayProgress);
        }
      } else if (this.state.age >= 45) k.menopause = true;
    } else if (this.state.isPregnant) {
      // Speeds up gestation: ~3.5 days in simulation (1440 * 3.5 = 5040 mins)
      // 100 / 5040 = 0.0198 per min
      // 0.0198 * 1440 = 28.5 per dayProgress
      const progress = 28.5 * (dayProgress || 0);
      this.state.gestationProgress = Math.min(100, (this.state.gestationProgress || 0) + progress); 
      h.progesterone = Math.min(100, (h.progesterone || 0) + 10 * dayProgress);
      h.estrogen = Math.min(100, (h.estrogen || 0) + 5 * dayProgress);
      this.state.hunger = Math.min(100, (this.state.hunger || 0) + 10 * dayProgress);
      this.state.thirst = Math.min(100, (this.state.thirst || 0) + 10 * dayProgress);
      this.state.energy = Math.max(0, (this.state.energy || 0) - 5 * dayProgress);
    }

    const nutritionFactor = (1 - this.state.hunger / 100);
    const stressFactor = (1 - h.cortisol / 100);
    this.state.immuneSystem = Math.min(100, Math.max(0, this.state.immuneSystem + (nutritionFactor + stressFactor - 1) * dayProgress));

    // Disease triggered by thresholds: low health + low energy + harsh weather
    let hasDiseaseCondition = (this.state.health < 40 && this.state.energy < 20);
    if (hasDiseaseCondition && (weather === 'Snowy' || weather === 'Stormy')) {
      const diseases = ['ไข้', 'ติดเชื้อ', 'หวัด', 'ปวดท้อง'];
      // Deterministic disease selection based on age
      const diseaseIndex = Math.floor(this.state.age) % diseases.length;
      const disease = diseases[diseaseIndex];
      if (!k.diseases?.includes(disease)) {
        k.diseases = [...(k.diseases || []), disease];
        this.state.health -= 15;
      }
    }

    // Recovery based on oxytocin and hormonal health
    if (k.diseases?.length && h.oxytocin > 50 && h.cortisol < 20) {
      k.diseases.shift();
      this.state.health = Math.min(100, this.state.health + 20);
    }

    if (this.state.age > 30) {
      const agingRate = (this.state.age - 30) * 0.0001 * dayProgress;
      this.state.skills.strength = Math.max(10, this.state.skills.strength - agingRate);
      this.state.skills.endurance = Math.max(10, this.state.skills.endurance - agingRate * 0.5);
    }

    // Death based on strict Zero health or Extreme age thresholds
    if (this.state.health <= 0 || this.state.age > 100 || this.state.hunger > 99) {
      this.state.health = 0;
    }
  }

  private updateKnowledge(day: number, hour: number, deltaMinutes: number) {
    if (this.state.gender === 'f') {
      const prevCycle = this.state.knowledge.moonBloodCycle || 0;
      const newCycle = (prevCycle + (deltaMinutes / 1440)) % 28;
      this.state.knowledge.moonBloodCycle = newCycle;
      this.state.knowledge.isMoonBloodActive = newCycle < 5;
      const isStarving = this.state.hunger > 60 || this.state.thirst > 60;
      const isHighlyStressed = this.state.stress > 70 || this.state.health < 50;
      this.state.knowledge.isFertile = (newCycle >= 12 && newCycle <= 16) && !isStarving && !isHighlyStressed;
    }
  }

  private perceive(
    humans: Human[], 
    structures: Structure[], 
    terrain: TerrainMap, 
    weather: string, 
    spatialHumans: SpatialHashGrid<Human>, 
    spatialAnimals: SpatialHashGrid<Animal>,
    spatialStructures: SpatialHashGrid<Structure>,
    signalManager: SignalManager
  ) {
    const visionRangeSq = 25 * 25;
    const hearingRangeSq = 15 * 15;
    const smellRangeSq = 10 * 10;
    
    this.state.perception.visibleEntities = [];
    this.state.perception.heardSounds = [];
    this.state.perception.smells = [];
    this.state.perception.touches = [];
    
    if (this.state.perception.tastes.length > 1) this.state.perception.tastes = this.state.perception.tastes.slice(-1);

    const myX = this.state.pos.x;
    const myY = this.state.pos.y;
    const x = Math.floor(myX);
    const y = Math.floor(myY);

    if (terrain.isValid(x, y)) {
      const biome = terrain.template[y][x];
      const height = terrain.heightmap[y][x];
      const fire = terrain.fireLevel[y][x];
      const moisture = terrain.soilMoisture[y][x];

      if (fire > 0.1) this.state.perception.touches.push("ความร้อนผ่าวจากเปลวไฟ");
      if (moisture > 0.8) this.state.perception.touches.push("ดินที่แฉะและลื่น");
      
      if (fire > 1.0) this.state.perception.smells.push("กลิ่นควันไฟและของไหม้");
      
      if (biome === Biome.DEEP_WATER || biome === Biome.SHALLOW) this.state.perception.touches.push("ความเย็นและเปียกชื้นของน้ำ");
      else if (biome === Biome.DESERT) this.state.perception.touches.push("ความร้อนระอุของทราย");
      else if (biome === Biome.FOREST || biome === Biome.TROPICAL) this.state.perception.touches.push("ความนุ่มของใบไม้และดิน");
      if (height > 0.8) this.state.perception.touches.push("อากาศที่เบาบางและลมแรง");
      if (biome === Biome.FOREST || biome === Biome.TROPICAL) this.state.perception.smells.push("กลิ่นดินชื้นและใบไม้เขียว");
      else if (biome === Biome.BEACH) this.state.perception.smells.push("กลิ่นไอเกลือจากทะเล");
    }

    if (weather === 'Rainy' || weather === 'Stormy') this.state.perception.touches.push("หยดน้ำฝนที่กระทบผิว");
    else if (weather === 'Snowy') this.state.perception.touches.push("ความเย็นจัดของเกล็ดหิมะ");

    const nearbyHumans = spatialHumans.query(this.state.pos, 25);
    nearbyHumans.forEach(h => {
      if (h.state.id === this.state.id) return;
      const dx = h.state.pos.x - myX;
      const dy = h.state.pos.y - myY;
      const distSq = dx * dx + dy * dy;
      if (distSq < visionRangeSq) this.state.perception.visibleEntities.push(`Human: ${h.state.name}`);
      if (distSq < hearingRangeSq) {
        if (h.state.action === AnimalAction.SOCIALIZE) this.state.perception.heardSounds.push(`เสียงพูดคุยของ ${h.state.name}`);
        else if (h.state.action === AnimalAction.WANDER) this.state.perception.heardSounds.push(`เสียงฝีเท้าของ ${h.state.name}`);
      }
      if (distSq < smellRangeSq) this.state.perception.smells.push(`กลิ่นกายของ ${h.state.name}`);
    });

    const signals = signalManager.getSignalsInRange(this.state.pos, 10);
    signals.forEach(s => {
      // Don't listen to own signals
      if (s.senderId === this.state.id) return;
      
      this.state.perception.heardSounds.push(`Signal: ${s.content}`);
      
      // Associative learning: if I hear a signal while I have a specific need/context, 
      // I associate that signal with a potential "reward" or significance.
      if (!this.state.signalAssociations[s.content]) {
        this.state.signalAssociations[s.content] = 0;
      }

      // If I'm hungry and hear S-HUNGER or S-FOOD-HERE, positive reinforcement
      if (this.state.hunger > 50 && (s.content === 'S-HUNGER' || s.content === 'S-FOOD-HERE')) {
        this.state.signalAssociations[s.content] += 0.1;
      }
      // If I'm thirsty and hear S-THIRST or S-WATER-HERE, positive reinforcement
      if (this.state.thirst > 50 && (s.content === 'S-THIRST' || s.content === 'S-WATER-HERE')) {
        this.state.signalAssociations[s.content] += 0.1;
      }
      // Danger association
      if (this.state.stress > 50 && s.content === 'S-DANGER') {
        this.state.signalAssociations[s.content] += 0.2;
      }

      // Collective Active Inference: Integrating shared beliefs
      if (s.content === 'S-BELIEF' && s.metadata?.brainUpdate && s.senderId !== this.id) {
        const { inputs, targets } = s.metadata.brainUpdate;
        if (inputs.length > 0 && targets.length > 0) {
          // Indirect learning: The agent learns from the sender's experience
          // Low learning rate for indirect learning to simulate " skepticism"
          const indirectLR = 0.02;
          this.brain.recordExperience(new Float32Array(inputs), targets, 0.5); // Positive social reward for learning
          this.state.thought = "ข้าได้รับความรู้ใหม่จากการสื่อสาร";
        }
      }
    });

    const nearbyAnimals = spatialAnimals.query(this.state.pos, 25);
    nearbyAnimals.forEach(a => {
      const dx = a.state.pos.x - myX;
      const dy = a.state.pos.y - myY;
      const distSq = dx * dx + dy * dy;
      if (distSq < visionRangeSq) this.state.perception.visibleEntities.push(`Animal: ${a.state.species}`);
      if (distSq < hearingRangeSq) this.state.perception.heardSounds.push(`เสียงของ ${a.state.species}`);
    });

    const nearbyStructures = spatialStructures.query(this.state.pos, 25);
    nearbyStructures.forEach(s => {
      const dx = s.pos.x - myX;
      const dy = s.pos.y - myY;
      const distSq = dx * dx + dy * dy;
      if (distSq < visionRangeSq) this.state.perception.visibleEntities.push(`Structure: ${s.type}`);
      if (s.type === 'campfire' && distSq < 100) {
        this.state.perception.smells.push("กลิ่นควันไฟ");
        this.state.perception.touches.push("ความอบอุ่นจากกองไฟ");
      }
    });
  }

  private progressSkills(terrain: TerrainMap, deltaMinutes: number) {
    const rate = 0.001 * deltaMinutes;
    const x = Math.floor(this.state.pos.x);
    const y = Math.floor(this.state.pos.y);
    if (this.state.action !== AnimalAction.IDLE && this.state.action !== AnimalAction.SLEEP) this.improveSkill('endurance', rate);
    if (terrain.isValid(x, y)) {
      const biome = terrain.template[y][x];
      if (biome === Biome.SHALLOW || biome === Biome.DEEP_WATER || biome === Biome.SWAMP) {
        this.improveSkill('swimming', rate * 10);
        this.improveSkill('endurance', rate * 2);
      }
    }
    switch (this.state.action) {
      case AnimalAction.GATHER: this.improveSkill('strength', rate * 2); this.improveSkill('botany', rate * 3); break;
      case AnimalAction.WANDER: this.improveSkill('navigation', rate * 4); this.improveSkill('agility', rate * 2); break;
      case AnimalAction.BUILD: this.improveSkill('construction', rate * 5); this.improveSkill('strength', rate * 3); break;
      case AnimalAction.CRAFT: this.improveSkill('crafting', rate * 6); break;
      case AnimalAction.COOK: this.improveSkill('cooking', rate * 6); break;
      case AnimalAction.HUNT: this.improveSkill('hunting', rate * 5); this.improveSkill('stealth', rate * 4); break;
      case AnimalAction.SOCIALIZE: this.improveSkill('social', rate * 8); break;
      case AnimalAction.FLEE: this.improveSkill('agility', rate * 10); break;
    }
  }

  private mapActionToAnimalAction(type: ActionType): AnimalAction {
    const map: Partial<Record<ActionType, AnimalAction>> = {
      'eat': AnimalAction.EAT,
      'drink': AnimalAction.DRINK,
      'sleep': AnimalAction.SLEEP,
      'rest': AnimalAction.REST,
      'walk': AnimalAction.WANDER,
      'run': AnimalAction.WANDER,
      'gather': AnimalAction.GATHER,
      'hunt': AnimalAction.HUNT,
      'craft': AnimalAction.CRAFT,
      'cook': AnimalAction.COOK,
      'build': AnimalAction.BUILD,
      ['socialize' as any]: AnimalAction.SOCIALIZE,
      'communicate': AnimalAction.SOCIALIZE,
      'mate': AnimalAction.MATE,
      'explore': AnimalAction.EXPLORE,
      'idle': AnimalAction.IDLE
    };
    return map[type] || AnimalAction.IDLE;
  }

  protected improveSkill(skill: string, amount: number) {
    const intelligenceFactor = (this.state.genetics?.intelligence || 50) / 50;
    if (this.state.skills[skill] !== undefined) {
      this.state.skills[skill] = Math.min(100, this.state.skills[skill] + amount * intelligenceFactor);
    }
  }

  private updateSocialDynamics(humans: Human[], deltaMinutes: number) {
    const socialRangeSq = 10 * 10;
    const myPos = this.state.pos;
    
    humans.forEach(other => {
      if (other.id === this.id) return;
      
      const dx = other.pos.x - myPos.x;
      const dy = other.pos.y - myPos.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < socialRangeSq) {
        this.state.interactionCount = (this.state.interactionCount || 0) + 1;
        // Bonding increases when nearby
        if (this.state.action === AnimalAction.SOCIALIZE && other.state.action === AnimalAction.SOCIALIZE) {
          this.state.emotions.relationships[other.id] = RelationshipManager.updateRelationship(
            this.state.emotions.relationships[other.id],
            'SOCIALIZE'
          );
          this.state.emotions.joy = Math.min(100, this.state.emotions.joy + 0.5 * deltaMinutes);
          this.state.emotions.loneliness = Math.max(0, this.state.emotions.loneliness - 1 * deltaMinutes);
        } else if (this.state.action === AnimalAction.MATE && other.state.action === AnimalAction.MATE) {
          this.state.emotions.relationships[other.id] = RelationshipManager.updateRelationship(
            this.state.emotions.relationships[other.id],
            'MATE'
          );
          this.state.emotions.joy = Math.min(100, this.state.emotions.joy + 2 * deltaMinutes);
          this.state.emotions.loneliness = Math.max(0, this.state.emotions.loneliness - 5 * deltaMinutes);
        } else {
          // Passive bonding just by proximity
          this.state.emotions.relationships[other.id] = RelationshipManager.updateRelationship(
            this.state.emotions.relationships[other.id],
            'IGNORE' // Represents passive proximity
          );
        }
      } else {
        // Loneliness increases when alone
        this.state.emotions.loneliness = Math.min(100, this.state.emotions.loneliness + 0.01 * deltaMinutes);
      }
    });

    if (humans.length <= 1) {
      this.state.emotions.loneliness = Math.min(100, this.state.emotions.loneliness + 0.05 * deltaMinutes);
    }
  }

  private processMemories(deltaMinutes: number) {
    // Deterministically form a memory every 6 hours
    if ((this.currentSimTime.day * 1440 + this.currentSimTime.hour * 60 + this.currentSimTime.minute) % 360 === 0) {
      this.addMemory();
    }
  }

  private calculateDrive(state: any): number {
    // Distance from set-points based on Homeostatic Reinforcement Learning (HRL) research
    // Goal: Minimize deviation from internal equilibrium
    
    const weights = {
      health: 15.0,    // Survival prioritized
      thirst: 10.0,    // Critical biological limit
      hunger: 6.0,     // Metabolic need
      energy: 4.0,     // Sustainability
      bodyTemp: 12.0,  // Strict homeostasis (Mifflin-St Jeor connection)
      stress: 2.5,     // Mental load
      loneliness: 3.5, // Social need (Phase 2)
      waste: 0.8       // Discomfort
    };

    const dHealth = Math.pow(100 - (state.health || 0), 2) * weights.health;
    const dThirst = Math.pow(state.thirst || 0, 2) * weights.thirst;
    const dHunger = Math.pow(state.hunger || 0, 2) * weights.hunger;
    const dEnergy = Math.pow(100 - (state.energy || 0), 2) * weights.energy;
    const dTemp = Math.pow(Math.abs(37.0 - (state.bodyTemp || 37.0)) * 10, 2) * weights.bodyTemp;
    const dStress = Math.pow(state.stress || 0, 2) * weights.stress;
    const dLoneliness = Math.pow(state.loneliness || 0, 2) * weights.loneliness;
    const dWaste = Math.pow(state.waste || 0, 2) * weights.waste;

    // Return root of weighted sum of squares (Manhattan or Euclidean distance in Homeostatic space)
    return Math.sqrt(dHealth + dThirst + dHunger + dEnergy + dTemp + dStress + dLoneliness + dWaste);
  }

  private calculateReward(prev: any, curr: any): number {
    // Integration of Active Inference & Homeostatic Reinforcement Learning
    const hrlReward = ActiveInferenceMiddleware.calculateHRLReward(prev, curr);
    
    let r = hrlReward * 0.15; // Scale to manageable reinforcement range

    // --- Cognitive & Evolutionary Bonuses ---
    
    // Skill growth (Curiosity/Progress Reward)
    const skillDiff = (curr.skillTotal || 0) - (prev.skillTotal || 0);
    if (skillDiff > 0) {
      r += skillDiff * 0.8; 
    }

    // Social reward
    const socialDiff = (curr.socialCount || 0) - (prev.socialCount || 0);
    if (socialDiff > 0) {
      r += 0.4;
    }

    // Procreation (The ultimate evolutionary drive)
    if (curr.isPregnant && !prev.isPregnant) {
      r += 25.0; 
      this.state.thought = "ข้ารู้สึกว่าชีวิตข้ามีเป้าหมายยิ่งใหญ่ขึ้น... สายใยพันธุกรรมจะดำรงอยู่";
    }

    // Death/Damage override (Explicit survival penalty)
    const healthDiff = (curr.health || 0) - (prev.health || 0);
    if (healthDiff < 0) {
      r += healthDiff * 2.0; 
    }

    return r;
  }

  private addMemory() {
    const simTimestamp = this.currentSimTime.day * 24 + this.currentSimTime.hour + (this.currentSimTime.minute / 60);
    const memory: Memory = {
      id: `mem_${this.id}_${this.currentSimTime.day}_${this.currentSimTime.hour}_${this.currentSimTime.minute}_${this.state.memories.length}`,
      type: 'event',
      description: `ข้ากำลัง ${this.state.action} ในขณะที่รู้สึก ${this.state.emotions.joy > 70 ? 'เป็นสุข' : this.state.stress > 70 ? 'เครียด' : 'ปกติ'}`,
      importance: (this.state.stress + this.state.emotions.joy + this.state.emotions.awe) / 300,
      timestamp: simTimestamp.toFixed(2),
      location: { ...this.state.pos },
      associatedEmotions: {
        joy: this.state.emotions.joy,
        stress: this.state.stress,
        awe: this.state.emotions.awe
      }
    };
    
    this.state.memories.push(memory);
    if (this.state.memories.length > 50) this.state.memories.shift(); // Keep last 50 memories
  }

  private updateDrives(deltaMinutes: number, weather: string, terrain: TerrainMap, humans: Human[], spatialHumans: SpatialHashGrid<Human>) {
    const timeScale = deltaMinutes;
    const heightCm = this.state.height * 100;
    let bmr = (10 * this.state.weight) + (6.25 * heightCm) - (5 * this.state.age);
    bmr += this.state.gender === 'm' ? 5 : -161;
    if (this.state.gender === 'm') bmr *= 1.1;
    
    let activityMultiplier = 1.0;
    switch (this.state.action) {
      case AnimalAction.WANDER: activityMultiplier = 2.5; break;
      case AnimalAction.SOCIALIZE: activityMultiplier = 1.5; break;
      case AnimalAction.GATHER:
      case AnimalAction.BUILD:
      case AnimalAction.CRAFT:
      case AnimalAction.COOK: activityMultiplier = 4.0; break;
      case AnimalAction.HUNT:
      case AnimalAction.FLEE: activityMultiplier = 8.0; break;
    }

    let ambientTemp = 25;
    const x = Math.floor(this.state.pos.x);
    const y = Math.floor(this.state.pos.y);
    if (terrain.isValid(x, y)) {
      const biome = terrain.template[y][x];
      if (biome === Biome.DESERT) ambientTemp += 15;
      if (biome === Biome.TUNDRA || biome === Biome.PEAK) ambientTemp -= 20;
      if (biome === Biome.MOUNTAIN) ambientTemp -= 10;
      if (this.state.action === AnimalAction.WANDER || this.state.action === AnimalAction.GATHER || this.state.action === AnimalAction.HUNT) {
        // Hazard damage based on biome every 100 minutes
        if (biome === Biome.SWAMP && (this.currentSimTime.day * 1440 + this.currentSimTime.hour * 60 + this.currentSimTime.minute) % 100 === 0) this.takeDamage(5, "Leech bite", terrain);
        else if (biome === Biome.PEAK && (this.currentSimTime.day * 1440 + this.currentSimTime.hour * 60 + this.currentSimTime.minute) % 100 === 0) this.takeDamage(10, "Slipped", terrain);
      }
    }
    if (weather === 'Sunny') ambientTemp += 5;
    if (weather === 'Rainy') ambientTemp -= 5;

    // Drive increase rate is governed by Metabolism (BMR) and Activity Multiplier
    const metabolicDemand = (bmr / 2000) * activityMultiplier;
    
    // Update internal states through HumanNeeds
    const individualFactor = (this.state.genetics?.metabolism || 50) / 50;
    
    // Environmental stress: Adjust based on resistance
    let envStress = 0;
    if (ambientTemp < 15) { // Cold stress
      const coldResistanceFactor = (this.state.genetics?.coldResistance || 50) / 50;
      envStress = Math.max(0, (15 - ambientTemp) * (2.0 - coldResistanceFactor) * 0.01);
    } else if (ambientTemp > 35) { // Heat stress
      const heatResistanceFactor = (this.state.genetics?.heatResistance || 50) / 50;
      envStress = Math.max(0, (ambientTemp - 35) * (2.0 - heatResistanceFactor) * 0.01);
    }

    this.state.hunger = Math.min(100, Math.max(0, this.state.hunger + (0.1 * (metabolicDemand + envStress) * individualFactor * timeScale)));
    this.state.thirst = Math.min(100, Math.max(0, this.state.thirst + (0.15 * (metabolicDemand + envStress * 2) * individualFactor * timeScale)));
    
    // Energy efficiency: Strength reduces energy cost of activities
    const strengthFactor = 1.0 - ((this.state.genetics?.strength || 50) - 50) / 200; // Each 10 pts above 50 is 5% reduction
    this.state.energy = Math.max(0, Math.min(100, this.state.energy + (this.state.action === AnimalAction.SLEEP ? 1.0 : -0.08 * (metabolicDemand + envStress) * strengthFactor) * timeScale));
    this.state.waste = Math.min(100, this.state.waste + (0.04 * metabolicDemand * timeScale));

    const radLoss = Thermodynamics.heatLossRadiation(this.state.bodyTemp, ambientTemp);
    const condLoss = Thermodynamics.heatConduction(this.state.bodyTemp, ambientTemp);
    const totalHeatLossKj = (radLoss + condLoss) * (deltaMinutes / 60);
    this.state.bodyTemp -= (totalHeatLossKj / (this.state.weight * 3.5));

    if (this.state.bodyTemp > 37.2) {
      this.state.bodyTemp -= 0.1 * timeScale;
      this.state.thirst += 0.05 * timeScale;
    } else if (this.state.bodyTemp < 36.5) {
      this.state.bodyTemp += 0.1 * timeScale;
      this.state.energy -= 0.1 * timeScale;
    }
    this.state.bodyTemp = Math.max(34.0, Math.min(41.0, this.state.bodyTemp));

    // Lactic Acid (Muscle Fatigue) and Hypertrophy Logic
    if (activityMultiplier >= 3.0) {
      // Heavy activity builds lactic acid quickly
      this.state.muscleFatigue = Math.min(100, this.state.muscleFatigue + (activityMultiplier * 0.5) * timeScale);
      
      // Micro-tears lead to hypertrophy over time
      if (this.state.hunger < 50 && this.state.energy > 20) {
        this.state.muscleMass = Math.min(100, this.state.muscleMass + 0.005 * timeScale);
      }
    } else if (activityMultiplier <= 1.2) {
      // Resting clears lactic acid
      this.state.muscleFatigue = Math.max(0, this.state.muscleFatigue - (this.state.action === AnimalAction.SLEEP ? 2.0 : 0.5) * timeScale);
    }

    // Muscle loss during starvation
    if (this.state.hunger > 80) {
      this.state.muscleMass = Math.max(10, this.state.muscleMass - 0.01 * timeScale);
    }

    // Force rest if lactic acid is too high
    if (this.state.muscleFatigue > 90 && this.state.action !== AnimalAction.SLEEP && this.state.action !== AnimalAction.IDLE) {
      this.state.action = AnimalAction.IDLE;
      this.state.thought = "My muscles are burning. I must rest.";
      this.state.stress += 5 * timeScale;
    }

    // BMR calculation factoring in muscle mass (Hypertrophy increases BMR)
    const prevHunger = this.state.hunger;
    const prevThirst = this.state.thirst;
    const prevEnergy = this.state.energy;
    
    HumanNeeds.update(this.state, activityMultiplier, timeScale);
    
    const driveDeltas = {
      food: prevHunger - this.state.hunger,
      water: prevThirst - this.state.thirst,
      shelter: this.state.energy - prevEnergy
    };

    const totalReward = Object.values(driveDeltas).reduce((a, b) => a + b, 0);
    this.updateAssociations(timeScale, totalReward, driveDeltas); 
    
    this.state.age += 0.0000019 * timeScale;
    this.state.stress = Math.max(0, Math.min(100, this.state.stress + (this.state.hunger > 60 ? 0.1 : -0.02) * timeScale));
    this.state.cognitiveLoad = Math.max(0, Math.min(100, this.state.cognitiveLoad + (this.state.action === AnimalAction.HUNT ? 0.8 : -0.1) * timeScale));
    
    this.state.socialReputation = Math.max(0, Math.min(100, this.state.socialReputation + (this.state.action === AnimalAction.SOCIALIZE ? 0.05 : -0.01) * timeScale));
    this.state.loneliness = this.state.emotions.loneliness;
    
    this.consolidateMemories();
  }

  private async decideCrafting() {
    const inventoryItems = this.state.inventory.items;

    if (inventoryItems.length < 2) {
      // Manual sync for legacy items if empty
      if (inventoryItems.length === 0 && (this.state.inventory.wood > 0 || this.state.inventory.stone > 0)) {
        if (this.state.inventory.wood > 0) {
          const woodMat = materialDB.get('wood');
          if (woodMat) this.addToInventory({ ...woodMat, quantity: this.state.inventory.wood });
        }
        if (this.state.inventory.stone > 0) {
          const stoneMat = materialDB.get('stone');
          if (stoneMat) this.addToInventory({ ...stoneMat, quantity: this.state.inventory.stone });
        }
      }
      if (this.state.inventory.items.length < 2) return;
    }

    // Advanced selection logic: Pick items that might combine well
    const idxA = 0;
    let idxB = Math.min(1, inventoryItems.length - 1);

    const materialA = inventoryItems[idxA];
    const materialB = inventoryItems[idxB];

    // Pick action based on index
    const possibleActions: CraftingAction['type'][] = ['combine', 'hit', 'bind', 'cut', 'grind'];
    const actionType = possibleActions[this.state.memories.length % possibleActions.length];
    const action: CraftingAction = { 
      type: actionType, 
      description: `พยายาม ${actionType} ${materialA.name} และ ${materialB.name}`, 
      icon: '🔨' 
    };
    
    const result = await craftingSystem.attemptCraft(
      this as any,
      materialA,
      materialB,
      action
    );

    if (result.success && result.recipeDiscovered) {
      if (!this.state.domainKnowledge.some(k => k.title === `สูตร: ${result.result.name}`)) {
        this.state.domainKnowledge.push({
          domain: 'crafting',
          category: 'recipe',
          title: `สูตร: ${result.result.name}`,
          content: `วิธีสร้าง ${result.result.name} โดยใช้ ${materialA.name}${materialB ? ' และ ' + materialB.name : ''} ด้วยนิสัย ${actionType}`,
          tags: ['recipe', result.result.name],
          confidence: 1.0,
          source: 'learned',
          lastUpdated: new Date().toISOString(),
          relatedKnowledge: []
        });
        this.state.thought = `ข้าค้นพบวิธีสร้าง ${result.result.name} แล้ว!`;
      }
    }
  }

  protected async decideAction(
    terrain: TerrainMap, 
    weather: WeatherSystem, 
    humans: Human[],
    spatialHumans?: SpatialHashGrid<Human>,
    spatialAnimals?: SpatialHashGrid<Animal>,
    spatialStructures?: SpatialHashGrid<Structure>
  ) {
    if (this.state.action === AnimalAction.SLEEP && this.state.energy < 95) return;

    // Use ActionDecoder to encode the state for the brain
    const hour = Math.floor((this.lastDecisionTime % 1440) / 60);
    const agentInterface = this.getAgentInterface(terrain, humans, { hour, weather }, spatialHumans, spatialAnimals, spatialStructures);
    const rawInputs = this.actionDecoder.encodeState(agentInterface, agentInterface.environment);
    
    // Embodied Intelligence: Modulate neural signals based on physical constraints (Energy) - Reuse buffer
    for (let j = 0; j < rawInputs.length; j++) {
      this.inputsScratch[j] = ActiveInferenceMiddleware.modulateSignal(rawInputs[j], this.state.energy);
    }

    // Neural Plasticity: Adjust weights based on current co-occurrence of activity
    this.brain.applyPlasticity(this.inputsScratch);

    let outputs: Float32Array;
    try {
      const pred = await this.brain.predict(this.inputsScratch);
      outputs = new Float32Array(pred);
    } catch (e) {
      outputs = new Float32Array(44).fill(0);
    }
    
    this.lastNeuralInputs = new Float32Array(this.inputsScratch); // Copy for history/learning
    this.lastNeuralOutputs = Array.from(outputs);
    
    if ((outputs as any).lastActivityH) {
      this.lastActivityH = (outputs as any).lastActivityH;
      this.lastActivityO = (outputs as any).lastActivityO;
    } else {
      this.lastActivityH = Array.from(this.brain.network.lastActivityH);
      this.lastActivityO = Array.from(this.brain.network.lastActivityO);
    }

    if (!outputs || outputs.length === 0) return;

    // Use ActionDecoder to get a rich Action object
    const decodedAction = this.actionDecoder.decode(outputs, agentInterface, agentInterface.environment);
    
    // Apply personality bias
    const biasedActions = PersonalityActionBias.applyBias(agentInterface, [decodedAction]);
    
    // Queue the biased action
    if (biasedActions.length > 0) {
      const bestAction = biasedActions[0];
      this.state.actionQueue.push(bestAction);
      console.log(`[${this.state.name} Brain] Decided Action: ${bestAction.type} (priority: ${bestAction.priority.toFixed(2)})`);
    }
  }

  private getAgentInterface(
    terrain: TerrainMap, 
    humans: Human[], 
    context: { hour: number, weather: WeatherSystem },
    spatialHumans?: SpatialHashGrid<Human>,
    spatialAnimals?: SpatialHashGrid<Animal>,
    spatialStructures?: SpatialHashGrid<Structure>
  ): AgentState & { environment: any } {
    return {
      id: this.state.id,
      name: this.state.name as 'Adam' | 'Eve',
      position: this.state.pos,
      stats: {
        health: this.state.health,
        hunger: this.state.hunger,
        thirst: this.state.thirst,
        energy: this.state.energy,
        bodyTemp: this.state.bodyTemp,
        stress: this.state.stress,
        waste: this.state.waste,
        mood: this.state.emotions.joy,
        loneliness: this.state.loneliness,
        socialReputation: this.state.socialReputation,
        isPregnant: this.state.isPregnant,
        skillTotal: Object.values(this.state.skills).reduce((a, b) => (Number(a)||0) + (Number(b)||0), 0),
        socialCount: this.state.interactionCount || 0
      },
      inventory: {
        items: this.state.inventory.items,
        hasTool: (id: string) => this.state.inventory.items.some(i => i.id === id)
      },
      skills: this.state.skills,
      knowledge: {
        entries: this.state.domainKnowledge,
        addOrUpdate: (e: any) => {
          this.state.domainKnowledge.push(e);
        }
      },
      personality: this.profile?.personality || { courage: 0.5, patience: 0.5, empathy: 0.5, discipline: 0.5 },
      currentAction: this.state.currentAction,
      actionQueue: this.state.actionQueue,
      environment: {
        getBiome: (pos: Point) => terrain.isValid(Math.floor(pos.x), Math.floor(pos.y)) ? terrain.template[Math.floor(pos.y)][Math.floor(pos.x)] : 'unknown',
        getSoilMoisture: (pos: Point) => terrain.isValid(Math.floor(pos.x), Math.floor(pos.y)) ? terrain.soilMoisture[Math.floor(pos.y)][Math.floor(pos.x)] : 0,
        getFireLevel: (pos: Point) => terrain.isValid(Math.floor(pos.x), Math.floor(pos.y)) ? terrain.fireLevel[Math.floor(pos.y)][Math.floor(pos.x)] : 0,
        getNearestFire: (pos: Point) => {
          const x = Math.floor(pos.x);
          const y = Math.floor(pos.y);
          for (let r = 0; r < 20; r++) {
            for (let i = -r; i <= r; i++) {
              for (let j = -r; j <= r; j++) {
                const nx = x + i;
                const ny = y + j;
                if (terrain.isValid(nx, ny) && terrain.fireLevel[ny][nx] > 0.5) {
                  return { x: nx, y: ny };
                }
              }
            }
          }
          return null;
        },
        getNearestDryingPlant: (pos: Point) => {
          const x = Math.floor(pos.x);
          const y = Math.floor(pos.y);
          for (let r = 0; r < 15; r++) {
            for (let i = -r; i <= r; i++) {
              for (let j = -r; j <= r; j++) {
                const nx = x + i;
                const ny = y + j;
                if (terrain.isValid(nx, ny) && terrain.plants[ny][nx].length > 0 && terrain.soilMoisture[ny][nx] < 0.2) {
                  return { x: nx, y: ny };
                }
              }
            }
          }
          return null;
        },
        getNearestMaturePlant: (pos: Point) => {
          const x = Math.floor(pos.x);
          const y = Math.floor(pos.y);
          for (let r = 0; r < 15; r++) {
            for (let i = -r; i <= r; i++) {
              for (let j = -r; j <= r; j++) {
                const nx = x + i;
                const ny = y + j;
                if (terrain.isValid(nx, ny) && terrain.plants[ny][nx].some(p => p.stage === PlantStage.MATURE)) {
                  return { x: nx, y: ny };
                }
              }
            }
          }
          return null;
        },
        getNearestFood: (pos: Point) => {
          const x = Math.floor(pos.x);
          const y = Math.floor(pos.y);
          let closestDist = Infinity;
          let closest: { position: Point, type: string } | null = null;

          for (let r = 0; r < 15; r++) {
            for (let i = -r; i <= r; i++) {
              for (let j = -r; j <= r; j++) {
                const nx = x + i;
                const ny = y + j;
                if (terrain.isValid(nx, ny)) {
                  // Either has plants or mature harvestable plants
                  if (terrain.plants[ny][nx].length > 0) {
                    const d = (nx - pos.x)**2 + (ny - pos.y)**2;
                    if (d < closestDist) {
                      closestDist = d;
                      closest = { position: { x: nx, y: ny }, type: 'plant' };
                    }
                  }
                }
              }
            }
            if (closest) break;
          }
          return closest; 
        },
        getNearestPrey: (pos: Point) => {
          if (spatialAnimals) {
            const nearby = spatialAnimals.query(pos, 20);
            let closest = null;
            let minDist = Infinity;
            for (const a of nearby) {
              const d = (a.pos.x - pos.x)**2 + (a.pos.y - pos.y)**2;
              if (d < minDist) {
                minDist = d;
                closest = { position: a.pos, type: 'animal' };
              }
            }
            return closest;
          }
          return null;
        },
        getNearestAgent: (pos: Point, excludeId: string) => {
          if (spatialHumans) {
            const nearby = spatialHumans.query(pos, 30);
            let closest = null;
            let minDist = Infinity;
            for (const h of nearby) {
              if (h.id === excludeId) continue;
              const d = (h.pos.x - pos.x)**2 + (h.pos.y - pos.y)**2;
              if (d < minDist) {
                minDist = d;
                closest = h;
              }
            }
            return closest ? { id: closest.id, position: closest.pos, type: 'agent' } : null;
          }
          
          let closest = null;
          let closestDist = Infinity;
          for (const h of humans) {
            if (h.id === excludeId) continue;
            const d = (h.pos.x - pos.x)**2 + (h.pos.y - pos.y)**2;
            if (d < closestDist) {
              closestDist = d;
              closest = h;
            }
          }
          return closest ? { id: closest.id, position: closest.pos, type: 'agent' } : null;
        },
        getAnimalMeat: (id: string) => materialDB.get('meat'),
        getPlantItems: (id: string, yield_: number) => {
            const items = [];
            const fruit = materialDB.get('fruit');
            if (fruit) items.push({ ...fruit, quantity: yield_ });
            return items;
        },
        getObservableKnowledge: (target: any) => [],
        countNearby: (pos: Point, type: string, radius: number) => {
            if (type === 'agent') {
              const rangeSq = radius * radius;
              return humans.filter(h => h.id !== this.state.id && ((h.pos.x - pos.x)**2 + (h.pos.y - pos.y)**2) < rangeSq).length;
            }
            if (type === 'human' && spatialHumans) return spatialHumans.query(pos, radius).length;
            if (type === 'animal' && spatialAnimals) return spatialAnimals.query(pos, radius).length;
            if (type === 'structure' && spatialStructures) return spatialStructures.query(pos, radius).length;
            
            // Fallbacks for categories like 'food' or 'water' if needed, though they aren't fully spatial-hashed yet as categories
            return 0;
        },
        getTimeOfDay: () => context.hour,
        getWeather: () => context.weather.currentState === 'Rainy' ? 1 : context.weather.currentState === 'Stormy' ? 2 : 0,
        getClimateAt: (pos: Point) => {
          // Derive local climate from global weather + biome
          const x = Math.floor(pos.x);
          const y = Math.floor(pos.y);
          const biome = terrain.isValid(x, y) ? terrain.template[y][x] : Biome.DEEP_WATER;
          
          let tempMod = 0;
          let moistMod = 0;
          
          if (biome === Biome.DESERT) tempMod = 5;
          if (biome === Biome.TUNDRA) tempMod = -10;
          if (biome === Biome.TROPICAL) moistMod = 0.3;
          
          return {
            temp: context.weather.globalTemperature + tempMod + (context.weather.currentState === 'Stormy' ? -5 : 0),
            humidity: context.weather.globalMoisture/100 + moistMod + (context.weather.currentState === 'Rainy' ? 0.3 : 0),
            wind: 2 + (context.weather.currentState === 'Stormy' ? 10 : 0),
            light: context.hour > 6 && context.hour < 18 ? 1.0 : 0.1,
            rain: context.weather.currentState === 'Rainy' ? 0.5 : context.weather.currentState === 'Stormy' ? 1.0 : 0,
            windDir: (x + y) % (Math.PI * 2) 
          };
        },
        getAtmosphericHistory: () => context.weather.history,
        atmosphere: context.weather.atmosphere,
        getDanger: (pos: Point) => 0,
        getBiomeIndex: (pos: Point) => {
          const b = terrain.isValid(Math.floor(pos.x), Math.floor(pos.y)) ? terrain.template[Math.floor(pos.y)][Math.floor(pos.x)] : Biome.DEEP_WATER;
          return Object.values(Biome).indexOf(b as any);
        },
        getAssociations: () => this.state.spatialAssociations,
        getBestLocation: (type: string) => {
          const valid = this.state.spatialAssociations
            .filter(a => a.type === type && a.confidence > 0.3)
            .sort((a, b) => (b.intensity * b.confidence) - (a.intensity * a.confidence));
          return valid.length > 0 ? valid[0].pos : null;
        }
      }
    } as any;
  }

  private findPrey(terrain: TerrainMap) {
    // Simplified: just wander towards a random land spot for now
    this.state.targetPos = {
      x: Math.max(0, Math.min(terrain.width - 1, this.state.pos.x + 10)),
      y: Math.max(0, Math.min(terrain.height - 1, this.state.pos.y + 10))
    };
  }

  private findWater(terrain: TerrainMap) {
    const x = Math.floor(this.state.pos.x);
    const y = Math.floor(this.state.pos.y);
    for (let r = 1; r < 20; r++) {
      for (let i = -r; i <= r; i++) {
        for (let j = -r; j <= r; j++) {
          const nx = x + i;
          const ny = y + j;
          if (terrain.isValid(nx, ny)) {
            const b = terrain.template[ny][nx];
            if (b === Biome.SHALLOW || b === Biome.DEEP_WATER) {
              this.state.targetPos = { x: nx, y: ny };
              return;
            }
          }
        }
      }
    }
  }

  private findFood(terrain: TerrainMap) {
    const x = Math.floor(this.state.pos.x);
    const y = Math.floor(this.state.pos.y);
    for (let r = 1; r < 15; r++) {
      for (let i = -r; i <= r; i++) {
        for (let j = -r; j <= r; j++) {
          const nx = x + i;
          const ny = y + j;
          if (terrain.isValid(nx, ny) && terrain.plants[ny][nx].length > 0) {
            this.state.targetPos = { x: nx, y: ny };
            return;
          }
        }
      }
    }
  }

  private executeAction(
    terrain: TerrainMap, 
    humans: Human[], 
    structures: Structure[],
    deltaMinutes: number, 
    spatialHumans: SpatialHashGrid<Human>,
    spatialStructures: SpatialHashGrid<Structure>,
    signalManager: SignalManager
  ): boolean {
    const x = Math.floor(this.state.pos.x);
    const y = Math.floor(this.state.pos.y);

    switch (this.state.action) {
      case AnimalAction.WANDER:
      case AnimalAction.GATHER:
      case AnimalAction.DRINK:
      case AnimalAction.EAT:
      case AnimalAction.SOCIALIZE:
      case AnimalAction.HUNT:
      case AnimalAction.FLEE:
      case AnimalAction.BUILD:
      case AnimalAction.CRAFT:
      case AnimalAction.POOP:
      case AnimalAction.EXPLORE:
      case AnimalAction.DEFEND:
      case AnimalAction.RITUAL:
      case AnimalAction.COOK:
        this.moveToTarget(deltaMinutes);
        break;
      case AnimalAction.REST:
        this.state.energy += 0.3 * deltaMinutes;
        if (this.state.energy >= 100) this.state.action = AnimalAction.IDLE;
        break;
      case AnimalAction.SLEEP:
        this.state.energy += 1.0 * deltaMinutes;
        if (this.state.energy >= 100) {
          this.state.action = AnimalAction.IDLE;
          this.state.targetPos = undefined;
          console.log(`[${this.state.name}] Finished sleeping, now IDLE.`);
        }
        break;
      case AnimalAction.IDLE:
        // Do nothing, wait for next decision
        break;
      case AnimalAction.SIGNAL: {
        // Symbolic communication: chose a symbol based on the most pressing need or context
        let content = 'S-GREET';
        if (this.state.hunger > 60) content = 'S-HUNGER';
        else if (this.state.thirst > 60) content = 'S-THIRST';
        else if (this.state.stress > 60) content = 'S-DANGER';

        const simTimestamp = this.currentSimTime.day * 24 + this.currentSimTime.hour + (this.currentSimTime.minute / 60);
        signalManager.addSignal({
          id: `sig_${this.state.id}_${this.currentSimTime.day}_${this.currentSimTime.hour}_${this.currentSimTime.minute}`,
          senderId: this.state.id,
          content: content,
          pos: { ...this.state.pos },
          timestamp: simTimestamp,
          duration: 30
        });
        this.state.action = AnimalAction.IDLE;
        break;
      }
    }

    if (!terrain.isValid(x, y)) return false;

    if (this.state.action === AnimalAction.DRINK) {
      const biome = terrain.template[y][x];
      if (biome === Biome.SHALLOW || biome === Biome.DEEP_WATER || biome === Biome.SWAMP) {
        this.state.thirst = Math.max(0, this.state.thirst - 20 * deltaMinutes);
        this.state.thought = "ดื่มน้ำจนชื่นใจ";
        if (this.state.thirst === 0) this.state.action = AnimalAction.IDLE;
      }
    }

    if (this.state.action === AnimalAction.EAT && this.state.inventory.food > 0) {
      const amount = 0.5 * deltaMinutes;
      if (this.removeFromInventory('food', amount)) {
        this.receiveFood(amount);
      } else {
        this.state.action = AnimalAction.IDLE;
      }
      if (this.state.hunger === 0) this.state.action = AnimalAction.IDLE;
    }

    if (this.state.action === AnimalAction.GATHER) {
      let gatherEfficiency = 1.0;
      if (this.state.inventory.basket) gatherEfficiency = 1.8;

      if (terrain.plants[y][x].length > 0) {
        terrain.plants[y][x].pop();
        const foodMat = materialDB.get('food');
        if (foodMat) this.addToInventory({ ...foodMat, quantity: 2 * gatherEfficiency });
        this.improveSkill('botany', 0.1);
        this.state.thought = "เก็บพืชผักมาเป็นอาหาร";
      } else if (terrain.trees[y][x] > 0) {
        let chopPower = 0.1;
        if (this.state.inventory.stone_axe) chopPower = 0.5;
        
        terrain.trees[y][x] -= chopPower * deltaMinutes;
        const woodMat = materialDB.get('wood');
        if (woodMat) this.addToInventory({ ...woodMat, quantity: 1 });
        this.improveSkill('construction', 0.05);
      } else if (terrain.rocks[y][x] > 0) {
        terrain.rocks[y][x] -= 0.1 * deltaMinutes;
        const stoneMat = materialDB.get('stone');
        if (stoneMat) this.addToInventory({ ...stoneMat, quantity: 1 });
      }
    }

    if (this.state.action === AnimalAction.BUILD) {
      const nearby = spatialStructures.query(this.state.pos, 5);
      // Priority: 1. Unfinished structures, 2. Damaged structures
      let target = nearby.find(s => s.progress < 100);
      if (!target) target = nearby.find(s => s.health < s.maxHealth);
      
      if (target) {
        if (this.removeFromInventory('wood', 1)) {
          if (target.progress < 100) {
            target.addMaterial('wood', 1);
            this.improveSkill('construction', 0.2);
          } else {
            // Repair logic
            const repairAmount = 50;
            target.health = Math.min(target.maxHealth, target.health + repairAmount);
            this.improveSkill('construction', 0.1);
            this.state.thought = `กำลังซ่อมแซม ${target.type}`;
          }
        }
      } else if (this.state.inventory.wood >= 5) {
        if (this.removeFromInventory('wood', 5)) {
          const id = `struct_${Date.now()}_${this.id}`;
          const newStruct = new Structure(id, 'shelter', { ...this.state.pos });
          structures.push(newStruct);
          this.state.thought = "ข้ากำลังเริ่มสร้างที่พักพิงเพื่อความปลอดภัย";
        }
      }
    }

    if (this.state.action === AnimalAction.RITUAL) {
      this.state.emotions.joy = Math.min(100, this.state.emotions.joy + 5 * deltaMinutes);
      this.state.emotions.awe = Math.min(100, this.state.emotions.awe + 2 * deltaMinutes);
      // Stay idle for a fixed time
      if (this.currentSimTime.minute % 30 === 0) this.state.action = AnimalAction.IDLE;
    }

    if (this.state.action === AnimalAction.COOK && this.state.inventory.food >= 1) {
      const amount = 0.1 * deltaMinutes;
      if (this.removeFromInventory('food', amount)) {
        this.state.hunger = Math.max(0, this.state.hunger - 1 * deltaMinutes);
      } else {
        this.state.action = AnimalAction.IDLE;
      }
      if (this.state.hunger === 0) this.state.action = AnimalAction.IDLE;
    }

    if (this.state.action === AnimalAction.HUNT) {
      let huntSuccessChance = 0.05 * (this.state.skills.hunting / 20) * deltaMinutes;
      if (this.state.inventory.wooden_spear) huntSuccessChance *= 2.5;
      else if (this.state.inventory.stone_axe) huntSuccessChance *= 1.5;

      if (huntSuccessChance > 0.4) {
        const foodMat = materialDB.get('food');
        if (foodMat) this.addToInventory({ ...foodMat, quantity: 10 });
        this.state.thought = "การล่าสำเร็จ! ข้ามีเนื้อกินแล้ว";
        this.improveSkill('hunting', 0.5);
        this.state.action = AnimalAction.IDLE;
        this.state.energy -= 10;
      } else {
        this.state.thought = `ข้ากำลังล่าสัตว์... (ทักษะ: ${Math.floor(this.state.skills.hunting)}%)`;
      }
    }

    if (this.state.action === AnimalAction.SOCIALIZE) {
      // Move towards the nearest human
      const nearest = humans.find(h => h.id !== this.id);
      if (nearest) {
        this.state.targetPos = { ...nearest.pos };
        this.moveToTarget(deltaMinutes);
      }
    }

    if (this.state.isPregnant && this.state.gestationProgress >= 100) {
      this.state.isPregnant = false;
      this.state.gestationProgress = 0;
      return true;
    }

    return false;
  }

  private moveToTarget(deltaMinutes: number) {
    if (!this.state.targetPos) return;
    const dx = this.state.targetPos.x - this.state.pos.x;
    const dy = this.state.targetPos.y - this.state.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.1) {
      this.state.targetPos = undefined;
      return;
    }
    
    const speedFactor = (this.state.genetics?.speed || 50) / 50;
    const speed = 8.0 * deltaMinutes * speedFactor;
    
    if (speed > dist) {
      this.state.pos.x = this.state.targetPos.x;
      this.state.pos.y = this.state.targetPos.y;
    } else {
      this.state.pos.x += (dx / dist) * speed;
      this.state.pos.y += (dy / dist) * speed;
    }
    this.state.energy -= 0.01 * deltaMinutes;
  }

  isDead() { return this.state.health <= 0 || this.state.age > 100; }
  addToInventory(material: Material) {
    // Add to items array
    const existing = this.state.inventory.items.find(i => i.id === material.id);
    if (existing) {
      existing.quantity += material.quantity;
    } else {
      this.state.inventory.items.push({...material});
    }

    // Sync legacy inventory for known basic types
    if (this.state.inventory[material.id] !== undefined) {
      this.state.inventory[material.id] += material.quantity;
    }
  }

  removeFromInventory(materialId: string, quantity: number): boolean {
    const idx = this.state.inventory.items.findIndex(i => i.id === materialId);
    if (idx === -1) return false;
    
    if (this.state.inventory.items[idx].quantity < quantity) return false;
    
    this.state.inventory.items[idx].quantity -= quantity;
    if (this.state.inventory.items[idx].quantity <= 0) {
      this.state.inventory.items.splice(idx, 1);
    }

    // Sync legacy
    if (this.state.inventory[materialId] !== undefined) {
      this.state.inventory[materialId] = Math.max(0, this.state.inventory[materialId] - quantity);
    }
    
    return true;
  }

  receiveFood(amount: number) { 
    this.state.stomachContent += amount * 5; 
    // Legay sync handled by removeFromInventory or manual here for extra safety
    this.state.inventory.food = Math.max(0, this.state.inventory.food - amount);
    // Try to reduce items array food as well
    const foodItem = this.state.inventory.items.find(i => i.id === 'food');
    if (foodItem) {
      foodItem.quantity = Math.max(0, foodItem.quantity - amount);
      if (foodItem.quantity <= 0) {
        this.state.inventory.items = this.state.inventory.items.filter(i => i.id !== 'food');
      }
    }
  }
  private updateMovement(action: Action, deltaMinutes: number) {
    if (!action.target || action.target.type !== 'location' || !action.target.position) return;

    const target = action.target.position;
    const dx = target.x - this.state.pos.x;
    const dy = target.y - this.state.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) return;

    // Movement speed depends on action type
    let speed = 2.0; // tiles per minute
    if (action.type === 'run') speed = 5.0;
    if (action.type === 'walk') speed = 2.0;
    if (action.type === 'sneak') speed = 0.8;
    if (action.type === 'swim') speed = 1.2;

    const moveDist = speed * deltaMinutes;
    const ratio = Math.min(1, moveDist / dist);

    this.state.pos.x += dx * ratio;
    this.state.pos.y += dy * ratio;
  }

  takeDamage(amount: number, source: string, terrain: TerrainMap) {
    this.state.health -= amount;
    this.state.stress += amount * 2;
    this.state.action = AnimalAction.FLEE;
  }

  private updateAssociations(deltaMinutes: number, rewardDelta: number, driveDeltas?: Record<string, number>) {
    if (rewardDelta === 0) return;

    // 1. Social/Signal Associations
    if (this.state.perception.heardSounds.length > 0) {
      this.state.perception.heardSounds.forEach(sound => {
        if (sound.startsWith('Signal: ')) {
          const signalContent = sound.replace('Signal: ', '');
          const currentScore = this.state.signalAssociations[signalContent] || 0;
          this.state.signalAssociations[signalContent] = Math.max(-1, Math.min(1, currentScore + rewardDelta * 0.1));
        }
      });
    }

    // 2. Spatial Associations (Cognitive Mapping)
    if (driveDeltas) {
      const pos = { x: Math.round(this.state.pos.x), y: Math.round(this.state.pos.y) };
      
      for (const [type, delta] of Object.entries(driveDeltas)) {
        if (delta > 0.5) { // Significant drive reduction
          this.addSpatialAssociation(pos, type as any, delta);
        }
      }
    }
  }

  private addSpatialAssociation(pos: Point, type: 'food' | 'water' | 'shelter' | 'danger', intensity: number) {
    const existing = this.state.spatialAssociations.find(a => 
      a.type === type && Math.abs(a.pos.x - pos.x) < 2 && Math.abs(a.pos.y - pos.y) < 2
    );

    if (existing) {
      existing.intensity = Math.min(1, existing.intensity + intensity * 0.05);
      existing.confidence = Math.min(1, existing.confidence + 0.1);
      existing.lastSeen = this.currentSimTime.day * 1440 + this.currentSimTime.hour * 60 + this.currentSimTime.minute;
    } else {
      this.state.spatialAssociations.push({
        pos: { ...pos },
        type,
        intensity: Math.min(1, intensity * 0.1),
        confidence: 0.5,
        lastSeen: this.currentSimTime.day * 1440 + this.currentSimTime.hour * 60 + this.currentSimTime.minute,
        description: `พบแหล่ง${type === 'food' ? 'อาหาร' : type === 'water' ? 'น้ำ' : 'ที่พัก'}ตรงนี้`
      });
    }

    // Prune weak associations if too many
    if (this.state.spatialAssociations.length > 20) {
      this.state.spatialAssociations.sort((a, b) => b.intensity * b.confidence - a.intensity * a.confidence);
      this.state.spatialAssociations.length = 20;
    }
  }

  // Phase 1: Dreaming State & Memory Consolidation
  private consolidateMemories() {
    if (this.state.action !== AnimalAction.SLEEP) return;
    
    // During sleep, we turn short-term memories into knowledge or refine spatial map
    if (this.currentSimTime.hour % 4 === 0) { // occasional consolidation during sleep
      const recentMemories = this.state.memories.slice(-5);
      recentMemories.forEach(mem => {
        if (mem.importance > 0.7) {
          // Convert to domain knowledge
          const knowledge: DomainKnowledge = {
            domain: 'survival',
            category: 'experience',
            title: `บทเรียนจาก: ${mem.description}`,
            content: `ข้าได้เรียนรู้ว่าในขณะที่ ${mem.description} ข้ารู้สึก ${mem.associatedEmotions?.joy && mem.associatedEmotions.joy > 50 ? 'ดี' : 'แย่'}`,
            tags: ['experience', 'memory'],
            confidence: 0.8,
            source: 'learned',
            lastUpdated: new Date().toISOString(),
            relatedKnowledge: []
          };
          this.state.domainKnowledge.push(knowledge);
          this.state.thought = "ข้าฝันถึงเรื่องที่ผ่านมา... และข้าได้เรียนรู้บางอย่าง";
        }
      });
    }

    // Decay confidence of unvisited spatial associations
    this.state.spatialAssociations.forEach(assoc => {
      assoc.confidence *= 0.999; 
    });
  }
}
