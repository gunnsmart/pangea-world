
import type { DomainKnowledge, LearningExample, ReasoningTemplate, Memory } from '../data/knowledge/schema';
export type { DomainKnowledge, LearningExample, ReasoningTemplate, Memory };

export enum Biome {
  DEEP_WATER = 0,
  SHALLOW = 1,
  BEACH = 2,
  GRASSLAND = 3,
  TROPICAL = 4,
  FOREST = 5,
  MOUNTAIN = 6,
  PEAK = 7,
  DESERT = 8,
  SWAMP = 9,
  TUNDRA = 10,
}

export enum POIType {
  NONE = 0,
  RUINS = 1,
  ANCIENT_TREE = 2,
  ANOMALY = 3,
}

export enum NamingPolicy {
  ALPHA_BETA = 'alpha_beta',
  ADAM_EVE = 'adam_eve',
  CLASSIC = 'classic',
  PRIMITIVE = 'primitive'
}

export enum AnimalSpecies {
  RABBIT = 'rabbit',
  DEER = 'deer',
  BOAR = 'boar',
  WOLF = 'wolf',
  TIGER = 'tiger',
  ELEPHANT = 'elephant',
  LION = 'lion',
  FOX = 'fox',
  BEAR = 'bear',
  CROCODILE = 'crocodile',
  CAMEL = 'camel',
  MAMMOTH = 'mammoth',
  SABERTOOTH = 'sabertooth',
  EAGLE = 'eagle',
  SNAKE = 'snake',
  HORSE = 'horse',
  CHEETAH = 'cheetah',
  PANDA = 'panda',
  MOOSE = 'moose',
  CLOWNFISH = 'clownfish',
  DRAGONFLY = 'dragonfly',
  HONEY_BEE = 'honey_bee',
  GOLDEN_EAGLE = 'golden_eagle',
  GIANT_SQUID = 'giant_squid',
  BLUE_WHALE = 'blue_whale',
  BISON = 'bison',
  BUMBLEBEE = 'bumblebee',
  CATTLE = 'cattle',
  OWL = 'owl',
  DROMEDARY = 'dromedary',
  GRAY_WOLF = 'gray_wolf',
  GOAT = 'goat',
  SEA_TURTLE = 'sea_turtle',
  PHEASANT = 'pheasant',
  PIGEON = 'pigeon',
  RAVEN = 'raven',
  SALTWATER_CROCODILE = 'saltwater_crocodile',
  MONARCH_BUTTERFLY = 'monarch_butterfly',
  DOLPHIN = 'dolphin',
  FRUIT_FLY = 'fruit_fly',
  ECHIDNA = 'echidna',
  ASIAN_ELEPHANT = 'asian_elephant',
  PEREGRINE_FALCON = 'peregrine_falcon',
  CAT = 'cat',
  CHAFFINCH = 'chaffinch',
  GECKO = 'gecko',
  GIRAFFE = 'giraffe',
  SNAIL = 'snail',
  HUMAN_SPECIES = 'human_species',
  AFRICAN_ELEPHANT = 'african_elephant',
  OTTER = 'otter',
  KANGAROO = 'kangaroo',
  EUROPEAN_RABBIT = 'european_rabbit',
  SWALLOWTAIL = 'swallowtail',
  GREAT_TIT = 'great_tit',
  SPARROW = 'sparrow',
  KOALA = 'koala',
  ORANGUTAN = 'orangutan',
  FROG = 'frog',
  RAT = 'rat',
  PENGUIN = 'penguin',
  OSTRICH = 'ostrich',
  BOTTLENOSE_DOLPHIN = 'bottlenose_dolphin',
  BROWN_BEAR = 'brown_bear',
  KOMODO_DRAGON = 'komodo_dragon',
  RED_FOX = 'red_fox',
  CLAWED_FROG = 'clawed_frog',
  CRAB = 'crab',
  SEAGULL = 'seagull',
}

export interface AnimalSpeciesInfo {
  id: AnimalSpecies;
  name: string;
  scientificName?: string;
  family?: string;
  nativeRange?: string;
  notes?: string;
  diet: 'herbivore' | 'carnivore' | 'omnivore';
  maxHealth: number;
  speed: number;
  strength: number;
  intelligence: number;
  lifespan: number;
  gestationPeriod: number;
  isDomesticated?: boolean;
  uniqueTraits?: string[];
}

export enum AnimalAction {
  IDLE = 'idle',
  WANDER = 'wander',
  EAT = 'eat',
  DRINK = 'drink',
  SLEEP = 'sleep',
  MATE = 'mate',
  POOP = 'poop',
  THINK = 'think',
  FLEE = 'flee',
  HUNT = 'hunt',
  BUILD = 'build',
  GATHER = 'gather',
  SOCIALIZE = 'socialize',
  CRAFT = 'craft',
  COOK = 'cook',
  REST = 'rest',
  EXPLORE = 'explore',
  DEFEND = 'defend',
  TEACH = 'teach',
  RITUAL = 'ritual',
  CLEAN = 'clean',
  MEDITATE = 'meditate',
  PRAY = 'pray',
  SIGNAL = 'signal',
}

export interface Relationship {
  trust: number;     // 0-100
  affinity: number;  // 0-100
  conflict: number;  // 0-100
}

export interface SpatialAssociation {
  pos: Point;
  type: 'food' | 'water' | 'shelter' | 'danger' | 'social' | 'material';
  intensity: number; // Drive reduction potential or threat level (-1 to 1)
  confidence: number; // Decay over time if not revisited
  lastSeen: number; // Sim time
  description: string;
}

export enum TribeRole {
  LEADER = 'leader',
  HUNTER = 'hunter',
  GATHERER = 'gatherer',
  SHAMAN = 'shaman',
  CRAFTER = 'crafter',
  MEMBER = 'member'
}

export interface TribeRelation {
  tribeId: string;
  trust: number;
  hostility: number;
  alliance: boolean;
  tradeHistory: number; // score
}

export interface Tribe {
  id: string;
  name: string;
  memberIds: string[];
  collectiveKnowledge: DomainKnowledge[];
  sharedInventory: Material[];
  customSymbols: Record<string, string>; // symbol -> meaning
  homePos?: Point;
  storagePos?: Point;
  relations: Record<string, TribeRelation>;
}

export interface BrainState {
  inputs: number;
  hidden: number;
  outputs: number;
  weightsIH: number[][];
  weightsHO: number[][];
  lastOutputs?: number[];
  lastActivityH?: number[];
  lastActivityO?: number[];
  lastInputs?: number[];
  actionQueue?: any[];
  
  // Modular Activations
  modules?: {
    sensory?: number[];     // Latent
    homeostasis?: number[]; // Drives
    motivation?: number[];  // Intents
    motor?: number[];       // Output
  };
}

export interface HumanState {
  id: string;
  name: string;
  pos: Point;
  health: number;
  energy: number;
  hunger: number;
  thirst: number;
  stomachContent: number; // 0-100+ (Food waiting to be digested)
  age: number;
  gender: 'm' | 'f';
  weight: number; // kg
  height: number; // meters
  bodyTemp: number; // Celsius
  bloodPressure: number; // 80-120
  muscleFatigue: number; // 0-100 (Lactic Acid buildup)
  muscleMass: number; // 0-100 (Hypertrophy)
  immuneSystem: number; // 0-100
  stress: number; // 0-100
  waste: number; // 0-100
  neuroStability: number; // 0-100 (Neural-Physical coordination)
  cognitiveLoad: number; // 0-100 (Brain activity level)
  
  // Biological Systems
  hormones: {
    testosterone: number; // 0-100
    estrogen: number; // 0-100
    progesterone: number; // 0-100
    cortisol: number; // 0-100 (Stress)
    oxytocin: number; // 0-100 (Bonding)
  };
  
  // Complex Emotions
  emotions: {
    awe: number; // 0-100 (Sense of wonder)
    relationships: Record<string, Relationship>; // ID -> Relationship
    joy: number; // 0-100
    grief: number; // 0-100
    loneliness: number; // 0-100
  };

  // Reproduction & Genetics
  isPregnant: boolean;
  gestationProgress: number; // 0-100
  partnerId?: string;
  genetics: {
    strength: number;     // Base strength score (0-100)
    speed: number;        // Movement speed modifier
    intelligence: number; // Learning rate modifier
    metabolism: number;   // Food/Water consumption rate
    immunity: number;     // Disease resistance
    coldResistance: number; // Resistance to low temperatures
    heatResistance: number; // Resistance to high temperatures
    longevity: number;    // Max age potential
  };

  // Status flags
  statusFlags: {
    isParticipatingInRitual: boolean;
    isAdapting: boolean;
  };

  // Language & Culture
  vocabulary: string[];
  culture: {
    symbolsDiscovered: string[];
    ritualsPerformed: number;
  };

  // Subconscious
  subconscious: {
    dreams: string[];
    traumas: string[];
    archetypes: string[];
  };

  action: AnimalAction;
  currentAction: any | null; 
  actionQueue: any; 
  thought: string;
  brainState?: BrainState;
  inventory: {
    items: Material[];
    wood: number;
    stone: number;
    food: number;
    stone_axe?: number;
    wooden_spear?: number;
    basket?: number;
    waterskin?: number;
    herbs?: number;
    [key: string]: any;
  };
  skills: Record<string, number>;
  knowledge: {
    spiritAnimal?: string;
    moonBloodCycle?: number; // 0-28 days
    isMoonBloodActive?: boolean;
    lastWinterPrepDay?: number;
    isFertile?: boolean;
    menopause?: boolean;
    totalBirths?: number;
    diseases?: string[];
  };
  generation: number;
  
  // Phase 1: Knowledge Base Integration
  domainKnowledge: DomainKnowledge[];
  learningHistory: LearningExample[];
  reasoningTemplates: ReasoningTemplate[];
  memories: Memory[];
  signalAssociations: Record<string, number>; // signal content: rewardScore
  spatialAssociations: SpatialAssociation[];

  perception: {
    visibleEntities: string[]; // IDs of entities currently seen
    heardSounds: string[];    // Descriptions of sounds recently heard
    smells: string[];         // Descriptions of smells detected
    tastes: string[];         // Descriptions of tastes (last thing eaten/drunk)
    touches: string[];        // Descriptions of physical sensations (temperature, texture, pain)
  };
  targetPos?: Point;
  targetId?: string;
  parents?: { id: string; name: string }[];
  loneliness: number; // 0-100
  tribeId?: string;
  tribeRole?: TribeRole;
  socialReputation: number; // 0-100
  interactionCount: number;
}

export interface AnimalState {
  id: string;
  species: AnimalSpecies;
  pos: Point;
  health: number;
  energy: number;
  hunger: number;
  thirst: number;
  waste: number;
  age: number;
  gender: 'm' | 'f';
  isPregnant: boolean;
  gestationProgress: number;
  stress: number; // 0-100
  action: AnimalAction;
  targetPos?: Point;
  targetId?: string;
  partnerId?: string;
  tribeId?: string;
  isDomesticated: boolean;
  domesticationProgress: number; // 0-100
}

export interface Point {
  x: number;
  y: number;
}

export enum PlantStage {
  SEED = 'seed',
  SPROUT = 'sprout',
  GROWING = 'growing',
  MATURE = 'mature',
  DYING = 'dying',
}

export interface Plant {
  speciesId: string;
  age: number; // 0-100
  health: number; // 0-100
  waterLevel: number; // 0-100
  stage: PlantStage;
}

export interface Cell {
  biome: Biome;
  plants: Plant[];
  water: number;
  fire: number;
  temperature: number;
  height: number;
  tree: number;
  rock: number;
  fertility: number;
  toxicity: number;
  radiation: number;
  minerals: number;
  magic: number;
  resource: number; // 0: none, 1: ore, 2: medicinal, 3: rare
  hazard: number;   // 0: none, 1: toxic, 2: radiation, 3: unstable
  poi: POIType;
  damage: number;   // 0: none, 1-100: damage level
}

export interface SimEvent {
  id: number;
  type: 'reward' | 'damage' | 'craft' | 'social';
  text: string;
  x: number;
  y: number;
  color: string;
}

export interface Signal {
  id: string;
  senderId: string;
  content: string; // The "symbol" or "type" of message
  pos: Point;
  timestamp: number; // Sim hour
  duration: number; // How long it lasts
  metadata?: {
    predictionError?: number;
    beliefType?: 'danger' | 'resource' | 'social';
    targetPos?: Point;
    intensity?: number;
    brainUpdate?: { inputs: number[], targets: number[] }; // Direct neural transmission
  };
}

export interface StructureState {
  id: string;
  type: 'shelter' | 'campfire' | 'storage' | 'fence';
  pos: Point;
  health: number;
  maxHealth: number;
  progress: number; // 0-100 for construction
  defenseBonus: number;
  capacity: number;
  flammability: number;
  insulation: number;
}

export interface TimelineEvent {
  day: number;
  event_type: 'milestone' | 'time_skip' | 'daily_summary' | 'birth' | 'death';
  description: string;
  created_at: string;
  data?: any;
}

import { KPIStats } from './SimulationMetricsManager';

export interface WorldSnapshot {
  grid: Cell[][];
  structures: StructureState[];
  animals: AnimalState[];
  humans: HumanState[];
  time: number; // sim hour
  minute: number; // sim minute
  day: number;
  season: string;
  weather: string;
  globalTemp: number;
  lightLevel: number;
  logs: string[];
  alphaLogs: string[];
  betaLogs: string[];
  score: number;
  milestones: string[];
  events: SimEvent[];
  historyEvents: TimelineEvent[];
  stepCount?: number;
  isDelta?: boolean;
  averageFertility: number;
  globalMoisture: number;
  animalCount: number;
  humanCount: number;
  totalBiomass: number;
  tribes: Tribe[];
  signals: Signal[];
  kpis?: KPIStats;
}

export interface MaterialProperties {
  physical: {
    hardness: number;    // 0
    sharpness: number;   // 1
    weight: number;      // 2
    flexibility: number; // 3
    density: number;     // 4
    durability: number;  // 5
    porosity: number;    // 6
    friction: number;    // 7
  };
  nutrition: {
    calories: number;    // 8
    protein: number;     // 9
    fat: number;         // 10
    carb: number;        // 11
    water: number;       // 12
    fiber: number;       // 13
    vitamins: number;    // 14
    minerals: number;    // 15
    sugar: number;       // 16
    sodium: number;      // 17
    calcium: number;     // 18
    omega3: number;      // 19
  };
  chemical: {
    flammability: number;  // 20
    toxicity: number;      // 21
    reactivity: number;    // 22
    acidity: number;       // 23
    waterResistance: number; // 24
    decomposition: number;  // 25
    antinutrient: number;   // 26
    medicinal: number;      // 27
  };
  sensory: {
    smell: number;         // 28
    taste_sweet: number;   // 29
    taste_salty: number;   // 30
    taste_bitter: number;  // 31
    texture_hard: number;  // 32
    texture_chewy: number; // 33
    appeal: number;        // 34
    freshness: number;     // 35
  };
}

export interface FoodProperties extends MaterialProperties {}

export interface Material {
  id: string;
  name: string;
  properties: MaterialProperties;
  category: 'organic' | 'mineral' | 'metal' | 'wood' | 'plant' | 'animal' | 'food' | 'crafted';
  state: 'raw' | 'solid' | 'liquid' | 'powder' | 'fiber' | 'cooked' | 'dried' | 'fermented';
  origin: 'natural' | 'crafted' | 'processed';
  quantity: number;
  harvestedAt?: number;
}

export interface Food extends Material {}

export interface CraftingAction {
  type: 'combine' | 'hit' | 'grind' | 'heat' | 'cool' | 'wet' | 'dry' | 'twist' | 'cut' | 'bind' | 'press' | 'ferment';
  description: string;
  icon: string;
}

export interface CraftingContext {
  temperature: number;
  humidity: number;
  timeOfDay: number;
  agentStrength: number;
  toolQuality: number;
  experience: number;
  knowledgeVector: number[];
}

export interface CraftingOutput {
  successProbability: number;
  resultProperties: MaterialProperties;
  metadata: {
    durability: number;
    qualityScore: number;
    timeRequired: number;
    energyCost: number;
    difficulty: number;
    dangerLevel: number;
    noiseLevel: number;
    createsWaste: number;
    requiresFire: number;
    requiresWater: number;
  };
}

export interface CraftingExperience {
  input: {
    materialA: Material;
    materialB: Material | null;
    materialC: Material | null;
    action: CraftingAction;
    context: CraftingContext;
  };
  output: CraftingOutput;
  actualResult: Material;
  success: boolean;
  timestamp: number;
}
