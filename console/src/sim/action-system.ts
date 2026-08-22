// ⚡ Action System — Pangea Simulation Engine
// Hierarchical action pipeline: NN output → priority queue → execution → world effect
// Every action is a first-class object with duration, cost, interruption rules, and outcome.

import type { Material, Food } from './types';
import { neuralKnowledgeService } from './NeuralKnowledgeService';

// ============================================================================
// ACTION TAXONOMY (3-level hierarchy)
// ============================================================================

// Level 1: Category (broad intent)
export type ActionCategory =
  | 'survival'    // biological needs
  | 'locomotion'  // movement
  | 'interaction' // world/object manipulation
  | 'social'      // agent-to-agent
  | 'cognitive';  // thinking, observing, learning

// Level 2: Action type
export type ActionType =
  // Survival
  | 'eat' | 'drink' | 'sleep' | 'rest' | 'breathe'
  // Locomotion
  | 'walk' | 'run' | 'sneak' | 'climb' | 'swim' | 'hide'
  // Interaction
  | 'gather' | 'hunt' | 'fish' | 'harvest' | 'craft' | 'cook'
  | 'build' | 'store' | 'light_fire' | 'extinguish_fire' | 'plant' | 'water'
  | 'dig' | 'cut' | 'carry' | 'drop' | 'domesticate'
  // Social
  | 'communicate' | 'teach' | 'share' | 'trade' | 'mate'
  | 'groom' | 'play' | 'comfort' | 'follow' | 'call'
  // Cognitive
  | 'observe' | 'explore' | 'examine' | 'memorize' | 'plan' | 'idle';

// Level 3: Specific parameters (e.g. which food, which direction, which agent)
export interface ActionTarget {
  type: 'entity' | 'location' | 'item' | 'agent' | 'none';
  entityId?: string;
  position?: { x: number; y: number };
  item?: Material | Food;
  agentId?: string;
}

// ============================================================================
// ACTION DEFINITION
// ============================================================================

export interface Action {
  id: string;                   // unique instance id
  type: ActionType;
  category: ActionCategory;
  target: ActionTarget;

  // Timing
  durationMs: number;           // how long it takes (game milliseconds)
  startedAt?: number;           // timestamp when started
  progress: number;             // 0-1

  // Costs (per second of execution)
  cost: {
    energy: number;             // 0-1 per second
    hunger: number;             // rate of hunger increase
    thirst: number;             // rate of thirst increase
  };

  // Priority & interruption
  priority: number;             // 0-10 (10 = life-or-death)
  interruptible: boolean;       // can another action interrupt this?
  interruptedBy: ActionType[];  // which actions can interrupt this specifically

  // Requirements
  requires: {
    minEnergy?: number;         // 0-1
    minHealth?: number;
    nearbyItem?: string;        // item id required
    nearbyAgent?: boolean;
    hasTool?: string;
    biome?: string[];
  };

  // Outcome (resolved when action completes)
  expectedOutcome?: ActionOutcome;
}

export interface ActionOutcome {
  statDelta?: Partial<{
    health: number;
    hunger: number;
    thirst: number;
    energy: number;
    mood: number;
    strength: number;
    stress: number;
  }>;
  skillGain?: { skill: string; amount: number };
  itemsGained?: (Material | Food)[];
  itemsConsumed?: string[];
  knowledgeGained?: string[];
  domesticationGain?: number;
  worldEffect?: 'fire_lit' | 'shelter_built' | 'item_stored' | 'item_dropped' | 'mating_occurred' | 'crop_planted' | 'soil_watered' | 'fire_extinguished' | 'animal_domesticated' | 'crop_harvested';
}

export const ACTION_ORDER: ActionType[] = [
  'eat', 'drink', 'sleep', 'rest',
  'walk', 'run', 'sneak', 'hide',
  'gather', 'hunt', 'fish', 'harvest', 'craft', 'cook', 'build', 'light_fire', 'extinguish_fire',
  'plant', 'water',
  'communicate', 'teach', 'share', 'mate', 'groom', 'play', 'comfort',
  'observe', 'explore', 'examine', 'idle'
];

// ============================================================================
// ACTION TEMPLATES (pre-defined defaults for each action type)
// ============================================================================

export const ACTION_TEMPLATES: Record<ActionType, Omit<Action, 'id' | 'target' | 'progress' | 'startedAt'>> = {

  // ── SURVIVAL ──────────────────────────────────────────────────────────────

  eat: {
    type: 'eat', category: 'survival',
    durationMs: 8000,
    cost: { energy: -0.002, hunger: -0.08, thirst: 0.002 },
    priority: 8,
    interruptible: true,
    interruptedBy: ['run', 'hide'],
    requires: { minEnergy: 0.05, nearbyItem: 'any_food' },
    expectedOutcome: { statDelta: { hunger: -50, energy: 10, mood: 5 } },
  },

  drink: {
    type: 'drink', category: 'survival',
    durationMs: 5000,
    cost: { energy: -0.001, hunger: 0.001, thirst: -0.12 },
    priority: 9,  // thirst kills faster than hunger
    interruptible: true,
    interruptedBy: ['run', 'hide'],
    requires: { minEnergy: 0.03, nearbyItem: 'water_source' },
    expectedOutcome: { statDelta: { thirst: -60 } },
  },

  sleep: {
    type: 'sleep', category: 'survival',
    durationMs: 28800000, // 8 game hours
    cost: { energy: -0.015, hunger: 0.004, thirst: 0.003 },
    priority: 7,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'communicate'],
    requires: { minHealth: 0.1, biome: ['cave', 'shelter', 'any'] },
    expectedOutcome: { statDelta: { energy: 80, mood: 10 } },
  },

  rest: {
    type: 'rest', category: 'survival',
    durationMs: 3600000, // 1 hour
    cost: { energy: -0.006, hunger: 0.002, thirst: 0.001 },
    priority: 5,
    interruptible: true,
    interruptedBy: ['run', 'eat', 'drink', 'hunt', 'communicate'],
    requires: {},
  },

  breathe: {
    type: 'breathe', category: 'survival',
    durationMs: 3000,
    cost: { energy: 0, hunger: 0, thirst: 0 },
    priority: 10,
    interruptible: false,
    interruptedBy: [],
    requires: {},
  },

  // ── LOCOMOTION ────────────────────────────────────────────────────────────

  walk: {
    type: 'walk', category: 'locomotion',
    durationMs: 1000, // per tile
    cost: { energy: 0.001, hunger: 0.0005, thirst: 0.0005 },
    priority: 4,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink', 'communicate'],
    requires: { minEnergy: 0.05 },
  },

  run: {
    type: 'run', category: 'locomotion',
    durationMs: 400, // per tile (2.5× faster)
    cost: { energy: 0.005, hunger: 0.002, thirst: 0.003 },
    priority: 9,
    interruptible: true,
    interruptedBy: [],
    requires: { minEnergy: 0.15 },
  },

  sneak: {
    type: 'sneak', category: 'locomotion',
    durationMs: 2500, // per tile (slow but silent)
    cost: { energy: 0.002, hunger: 0.001, thirst: 0.001 },
    priority: 4,
    interruptible: true,
    interruptedBy: ['run'],
    requires: { minEnergy: 0.10 },
  },

  climb: {
    type: 'climb', category: 'locomotion',
    durationMs: 3000,
    cost: { energy: 0.008, hunger: 0.003, thirst: 0.003 },
    priority: 6,
    interruptible: true,
    interruptedBy: ['run'],
    requires: { minEnergy: 0.20, biome: ['mountain', 'cliff', 'tree'] },
  },

  swim: {
    type: 'swim', category: 'locomotion',
    durationMs: 2000,
    cost: { energy: 0.006, hunger: 0.002, thirst: -0.001 }, // slightly hydrating
    priority: 6,
    interruptible: true,
    interruptedBy: ['run'],
    requires: { minEnergy: 0.20, biome: ['river', 'lake', 'ocean', 'swamp'] },
  },

  hide: {
    type: 'hide', category: 'locomotion',
    durationMs: 5000,
    cost: { energy: 0.0005, hunger: 0, thirst: 0 },
    priority: 9,
    interruptible: false,
    interruptedBy: [],
    requires: { minEnergy: 0.05 },
  },

  // ── INTERACTION ───────────────────────────────────────────────────────────

  gather: {
    type: 'gather', category: 'interaction',
    durationMs: 12000,
    cost: { energy: 0.002, hunger: 0.001, thirst: 0.001 },
    priority: 5,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink'],
    requires: { minEnergy: 0.10, nearbyItem: 'plant' },
    expectedOutcome: { skillGain: { skill: 'gathering', amount: 0.005 }, mood: 5 } as any,
  },

  hunt: {
    type: 'hunt', category: 'interaction',
    durationMs: 60000, // 1 minute chase + kill
    cost: { energy: 0.008, hunger: 0.004, thirst: 0.005 },
    priority: 6,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'drink'],
    requires: { minEnergy: 0.30, hasTool: 'spear' },
    expectedOutcome: { statDelta: { hunger: -20, mood: 15 }, skillGain: { skill: 'hunting', amount: 0.01 } },
  },

  fish: {
    type: 'fish', category: 'interaction',
    durationMs: 120000, // 2 minutes patience
    cost: { energy: 0.001, hunger: 0.002, thirst: 0.001 },
    priority: 5,
    interruptible: true,
    interruptedBy: ['run', 'eat', 'drink', 'communicate'],
    requires: { minEnergy: 0.10, biome: ['river', 'lake', 'ocean'] },
  },

  harvest: {
    type: 'harvest', category: 'interaction',
    durationMs: 10000,
    cost: { energy: 0.003, hunger: 0.001, thirst: 0.001 },
    priority: 5,
    interruptible: true,
    interruptedBy: ['run', 'hide'],
    requires: { minEnergy: 0.10 },
    expectedOutcome: { skillGain: { skill: 'farming', amount: 0.02 }, worldEffect: 'crop_harvested' as any },
  },

  craft: {
    type: 'craft', category: 'interaction',
    durationMs: 30000,
    cost: { energy: 0.003, hunger: 0.002, thirst: 0.001 },
    priority: 4,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink', 'communicate'],
    requires: { minEnergy: 0.15 },
  },

  cook: {
    type: 'cook', category: 'interaction',
    durationMs: 20000,
    cost: { energy: 0.002, hunger: 0.001, thirst: 0.001 },
    priority: 5,
    interruptible: true,
    interruptedBy: ['run', 'hide'],
    requires: { minEnergy: 0.10, nearbyItem: 'fire' },
  },

  build: {
    type: 'build', category: 'interaction',
    durationMs: 300000, // 5 minutes
    cost: { energy: 0.005, hunger: 0.004, thirst: 0.003 },
    priority: 4,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink'],
    requires: { minEnergy: 0.25 },
  },

  store: {
    type: 'store', category: 'interaction',
    durationMs: 5000,
    cost: { energy: 0.001, hunger: 0, thirst: 0 },
    priority: 3,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink'],
    requires: { minEnergy: 0.05 },
  },

  light_fire: {
    type: 'light_fire', category: 'interaction',
    durationMs: 20000,
    cost: { energy: 0.004, hunger: 0.001, thirst: 0.001 },
    priority: 7,
    interruptible: true,
    interruptedBy: ['run', 'hide'],
    requires: { minEnergy: 0.10, hasTool: 'fire_starter' },
  },

  dig: {
    type: 'dig', category: 'interaction',
    durationMs: 60000,
    cost: { energy: 0.007, hunger: 0.003, thirst: 0.004 },
    priority: 3,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink'],
    requires: { minEnergy: 0.30 },
  },

  cut: {
    type: 'cut', category: 'interaction',
    durationMs: 15000,
    cost: { energy: 0.004, hunger: 0.001, thirst: 0.001 },
    priority: 4,
    interruptible: true,
    interruptedBy: ['run', 'hide'],
    requires: { minEnergy: 0.15, hasTool: 'knife' },
  },

  carry: {
    type: 'carry', category: 'interaction',
    durationMs: 1000, // per tile while carrying
    cost: { energy: 0.003, hunger: 0.001, thirst: 0.001 },
    priority: 3,
    interruptible: true,
    interruptedBy: ['run', 'hide'],
    requires: { minEnergy: 0.15 },
  },

  drop: {
    type: 'drop', category: 'interaction',
    durationMs: 1000,
    cost: { energy: 0, hunger: 0, thirst: 0 },
    priority: 2,
    interruptible: false,
    interruptedBy: [],
    requires: {},
  },

  domesticate: {
    type: 'domesticate', category: 'interaction',
    durationMs: 45000,
    cost: { energy: 0.005, hunger: 0.002, thirst: 0.002 },
    priority: 4,
    interruptible: true,
    interruptedBy: ['run', 'hide'],
    requires: { minEnergy: 0.20, nearbyItem: 'any_food' },
    expectedOutcome: { skillGain: { skill: 'social', amount: 0.05 }, domesticationGain: 10 },
  },

  // ── SOCIAL ────────────────────────────────────────────────────────────────

  communicate: {
    type: 'communicate', category: 'social',
    durationMs: 10000,
    cost: { energy: 0.001, hunger: 0, thirst: 0 },
    priority: 5,
    interruptible: true,
    interruptedBy: ['run', 'hide'],
    requires: { nearbyAgent: true },
  },

  teach: {
    type: 'teach', category: 'social',
    durationMs: 60000,
    cost: { energy: 0.002, hunger: 0.001, thirst: 0 },
    priority: 4,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink'],
    requires: { minEnergy: 0.20, nearbyAgent: true },
  },

  share: {
    type: 'share', category: 'social',
    durationMs: 5000,
    cost: { energy: 0.001, hunger: 0, thirst: 0 },
    priority: 5,
    interruptible: true,
    interruptedBy: ['run', 'hide'],
    requires: { nearbyAgent: true },
  },

  trade: {
    type: 'trade', category: 'social',
    durationMs: 15000,
    cost: { energy: 0.001, hunger: 0, thirst: 0 },
    priority: 3,
    interruptible: true,
    interruptedBy: ['run', 'hide'],
    requires: { nearbyAgent: true },
  },

  mate: {
    type: 'mate', category: 'social',
    durationMs: 30000,
    cost: { energy: 0.01, hunger: 0.005, thirst: 0.005 },
    priority: 6,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink'],
    requires: { minEnergy: 0.40, minHealth: 0.50, nearbyAgent: true },
  },

  groom: {
    type: 'groom', category: 'social',
    durationMs: 20000,
    cost: { energy: 0.001, hunger: 0, thirst: 0 },
    priority: 3,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink', 'hunt'],
    requires: { nearbyAgent: true },
  },

  play: {
    type: 'play', category: 'social',
    durationMs: 30000,
    cost: { energy: 0.004, hunger: 0.002, thirst: 0.002 },
    priority: 2,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink', 'hunt', 'communicate'],
    requires: { minEnergy: 0.40, minHealth: 0.60 },
  },

  comfort: {
    type: 'comfort', category: 'social',
    durationMs: 15000,
    cost: { energy: 0.001, hunger: 0, thirst: 0 },
    priority: 5,
    interruptible: true,
    interruptedBy: ['run', 'hide'],
    requires: { nearbyAgent: true },
  },

  follow: {
    type: 'follow', category: 'social',
    durationMs: 1000,
    cost: { energy: 0.002, hunger: 0.001, thirst: 0.001 },
    priority: 4,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink'],
    requires: { minEnergy: 0.10 },
  },

  call: {
    type: 'call', category: 'social',
    durationMs: 3000,
    cost: { energy: 0.001, hunger: 0, thirst: 0 },
    priority: 7,
    interruptible: false,
    interruptedBy: [],
    requires: {},
  },

  // ── COGNITIVE ─────────────────────────────────────────────────────────────

  observe: {
    type: 'observe', category: 'cognitive',
    durationMs: 5000,
    cost: { energy: 0.0005, hunger: 0, thirst: 0 },
    priority: 4,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink'],
    requires: {},
  },

  explore: {
    type: 'explore', category: 'cognitive',
    durationMs: 1000, // per tile
    cost: { energy: 0.002, hunger: 0.001, thirst: 0.001 },
    priority: 3,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink', 'hunt', 'gather'],
    requires: { minEnergy: 0.15 },
  },

  examine: {
    type: 'examine', category: 'cognitive',
    durationMs: 8000,
    cost: { energy: 0.0005, hunger: 0, thirst: 0 },
    priority: 3,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink'],
    requires: { nearbyItem: 'any' },
  },

  memorize: {
    type: 'memorize', category: 'cognitive',
    durationMs: 3000,
    cost: { energy: 0.001, hunger: 0, thirst: 0 },
    priority: 2,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink'],
    requires: {},
  },

  plan: {
    type: 'plan', category: 'cognitive',
    durationMs: 10000,
    cost: { energy: 0.001, hunger: 0, thirst: 0 },
    priority: 2,
    interruptible: true,
    interruptedBy: ['run', 'hide', 'eat', 'drink', 'communicate'],
    requires: { minEnergy: 0.10 },
  },

  plant: {
    type: 'plant', category: 'interaction',
    durationMs: 15000,
    cost: { energy: 0.02, hunger: 0.005, thirst: 0.005 },
    priority: 2,
    interruptible: true,
    interruptedBy: ['run', 'hide'],
    requires: { minEnergy: 0.15 },
    expectedOutcome: { skillGain: { skill: 'farming', amount: 0.05 }, worldEffect: 'crop_planted' as any },
  },

  water: {
    type: 'water', category: 'interaction',
    durationMs: 8000,
    cost: { energy: 0.01, hunger: 0.002, thirst: 0.002 },
    priority: 2,
    interruptible: true,
    interruptedBy: ['run', 'hide'],
    requires: { minEnergy: 0.1 },
    expectedOutcome: { skillGain: { skill: 'farming', amount: 0.02 }, worldEffect: 'soil_watered' as any },
  },

  extinguish_fire: {
    type: 'extinguish_fire', category: 'interaction',
    durationMs: 8000,
    cost: { energy: 0.01, hunger: 0, thirst: 0.005 },
    priority: 8,
    interruptible: false,
    interruptedBy: [],
    requires: { minEnergy: 0.10 },
  },

  idle: {
    type: 'idle', category: 'cognitive',
    durationMs: 1000,
    cost: { energy: 0.0002, hunger: 0.0002, thirst: 0.0002 },
    priority: 0,
    interruptible: true,
    interruptedBy: Object.keys({} as Record<ActionType, unknown>) as ActionType[],
    requires: {},
  },
};

// ============================================================================
// PRIORITY QUEUE
// ============================================================================

export class ActionPriorityQueue {
  private queue: Action[] = [];

  push(action: Action) {
    this.queue.push(action);
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  peek(): Action | null {
    return this.queue[0] ?? null;
  }

  pop(): Action | null {
    return this.queue.shift() ?? null;
  }

  clear() { this.queue = []; }

  get size() { return this.queue.length; }

  getQueue(): Action[] {
    return [...this.queue];
  }

  // Check if incoming action can interrupt current
  canInterrupt(current: Action, incoming: Action): boolean {
    if (!current.interruptible) return false;
    if (incoming.priority > current.priority + 2) return true;
    if (current.interruptedBy.includes(incoming.type)) return true;
    return false;
  }
}

// ============================================================================
// ACTION BUILDER
// ============================================================================

export class ActionBuilder {
  static create(
    type: ActionType,
    target: ActionTarget = { type: 'none' },
    overrides: Partial<Action> = {}
  ): Action {
    const template = ACTION_TEMPLATES[type];
    // Deterministic ID generation using type and hash of target
    const targetKey = JSON.stringify(target).slice(0, 10);
    const id = `${type}_${Date.now()}_${targetKey}`;
    return {
      expectedOutcome: template.expectedOutcome,
      ...template,
      id,
      target,
      progress: 0,
      ...overrides,
    };
  }

  // Shorthand builders
  static eatFood(food: Food): Action {
    return this.create('eat', { type: 'item', item: food }, {
      durationMs: 5000 + food.properties.sensory.texture_hard * 8000,
    });
  }

  static huntAnimal(entityId: string): Action {
    return this.create('hunt', { type: 'entity', entityId });
  }

  static walkTo(x: number, y: number): Action {
    return this.create('walk', { type: 'location', position: { x, y } });
  }

  static runTo(x: number, y: number): Action {
    return this.create('run', { type: 'location', position: { x, y } });
  }

  static teachSkill(agentId: string, skill: string): Action {
    return this.create('teach', { type: 'agent', agentId }, {
      expectedOutcome: { skillGain: { skill, amount: 0.05 } },
    });
  }
}

// ============================================================================
// ACTION EXECUTOR
// ============================================================================

export interface AgentState {
  id: string;
  name: 'Adam' | 'Eve';
  position: { x: number; y: number };
  stats: {
    health: number;
    hunger: number;
    thirst: number;
    energy: number;
    mood: number;
    bodyTemp: number;
    stress: number;
    danger?: number;
    waste: number;
    loneliness: number;
    socialReputation?: number;
  };
  inventory: { items: (Material | Food)[]; hasTool: (id: string) => boolean };
  skills: Record<string, number>;
  knowledge: { entries: any[]; addOrUpdate: (e: any) => void };
  personality: {
    courage: number;
    patience: number;
    empathy: number;
    discipline: number;
  };
  currentAction: Action | null;
  actionQueue: ActionPriorityQueue;
}

export class ActionExecutor {
  private onComplete: (agent: AgentState, action: Action, outcome: ActionOutcome) => void;
  private onInterrupt: (agent: AgentState, interrupted: Action, by: Action) => void;

  constructor(
    onComplete: (a: AgentState, action: Action, outcome: ActionOutcome) => void,
    onInterrupt: (a: AgentState, interrupted: Action, by: Action) => void
  ) {
    this.onComplete  = onComplete;
    this.onInterrupt = onInterrupt;
  }

  tick(agent: AgentState, deltaMs: number, environment: any) {
    // 1. Try to start next action if idle
    if (!agent.currentAction) {
      const next = agent.actionQueue.pop();
      if (next) {
        if (this.canStart(agent, next, environment)) {
          agent.currentAction = { ...next, startedAt: Date.now(), progress: 0 };
        }
      } else {
        // Nothing queued → idle
        agent.currentAction = ActionBuilder.create('idle');
      }
    }

    const current = agent.currentAction;
    if (!current) return;

    // 2. Check for interrupts from queue
    const incoming = agent.actionQueue.peek();
    if (incoming && agent.actionQueue.canInterrupt(current, incoming)) {
      const interrupter = agent.actionQueue.pop()!;
      this.onInterrupt(agent, current, interrupter);
      agent.currentAction = { ...interrupter, startedAt: Date.now(), progress: 0 };
      return;
    }

    // 3. Apply per-tick costs
    const tickSec = deltaMs / 1000;
    agent.stats.energy  = Math.max(0, agent.stats.energy  - current.cost.energy  * tickSec);
    agent.stats.hunger  = Math.min(1, agent.stats.hunger  + current.cost.hunger  * tickSec);
    agent.stats.thirst  = Math.min(1, agent.stats.thirst  + current.cost.thirst  * tickSec);

    // 4. Advance progress
    current.progress = Math.min(1, current.progress + deltaMs / current.durationMs);

    // 5. Complete action
    if (current.progress >= 1) {
      const outcome = this.resolveOutcome(agent, current, environment);
      this.applyOutcome(agent, outcome);
      this.onComplete(agent, current, outcome);
      agent.currentAction = null;
    }
  }

  private canStart(agent: AgentState, action: Action, env: any): boolean {
    const r = action.requires;
    if (r.minEnergy && agent.stats.energy < r.minEnergy) return false;
    if (r.minHealth && agent.stats.health < r.minHealth) return false;
    if (r.hasTool && !agent.inventory.hasTool(r.hasTool))  return false;
    if (r.biome && !r.biome.includes(env.getBiome(agent.position))) return false;
    return true;
  }

  private resolveOutcome(agent: AgentState, action: Action, env: any): ActionOutcome {
    const skill = agent.skills[action.type] ?? 0.5;

    switch (action.type) {
      case 'eat': {
        const food = action.target?.item as Food | undefined;
        if (!food || !food.properties) {
          return {
            statDelta: { hunger: -2, mood: -5 },
            skillGain: { skill: 'foraging', amount: 0.0005 },
          };
        }
        return {
          statDelta: {
            hunger: -(food.properties.nutrition.protein * 40 + food.properties.nutrition.calories * 30),
            health: food.properties.chemical.medicinal * 10 - food.properties.chemical.toxicity * 40,
            energy: food.properties.nutrition.calories * 20,
            mood: food.properties.sensory.appeal * 5,
            thirst: food.properties.nutrition.sodium * 10,
          },
          skillGain: { skill: 'foraging', amount: 0.001 },
        };
      }

      case 'drink':
        return { statDelta: { thirst: -60, health: 2 } };

      case 'sleep':
        return { statDelta: { energy: 80, health: 5, mood: 10 } };

      case 'rest':
        return { statDelta: { energy: 30, mood: 5 } };

      case 'hunt': {
        const hasSpear = agent.inventory.items.some(i => i.id === 'wooden_spear');
        const successBase = skill * 0.5 + 0.2;
        // Deterministic hunt: Succeed if skill + tool reaches threshold
        const success = (hasSpear ? successBase + 0.3 : successBase) > 0.6;
        return success
          ? {
              statDelta: { hunger: -20, mood: 15 },
              skillGain: { skill: 'hunting', amount: 0.01 + skill * 0.005 },
              itemsGained: [env.getAnimalMeat(action.target?.entityId)].filter(Boolean),
            }
          : {
              statDelta: { mood: -5 },
              skillGain: { skill: 'hunting', amount: 0.003 },
            };
      }

      case 'gather': {
        const hasAxe = agent.inventory.items.some(i => i.id === 'stone_axe');
        const hasBasket = agent.inventory.items.some(i => i.id === 'basket');
        let yield_ = 0.3 + skill * 0.7;
        if (hasAxe) yield_ *= 1.4;
        if (hasBasket) yield_ *= 1.3;
        
        return {
          statDelta: { mood: 5 },
          skillGain: { skill: 'gathering', amount: 0.005 },
          itemsGained: (env.getPlantItems(action.target?.entityId, yield_) || []).filter(Boolean),
        };
      }

      case 'craft':
        return {
          statDelta: { mood: 10 },
          skillGain: { skill: 'crafting', amount: 0.01 },
        };

      case 'teach':
        return {
          statDelta: { mood: 8 },
          skillGain: { skill: 'social', amount: 0.005 },
          knowledgeGained: [`taught_${action.target.agentId}`],
        };

      case 'observe':
      case 'examine':
        return {
          statDelta: { mood: 2 },
          skillGain: { skill: 'perception', amount: 0.003 },
          knowledgeGained: env.getObservableKnowledge(action.target),
        };

      case 'domesticate':
        return {
          statDelta: { mood: 5 },
          skillGain: { skill: 'social', amount: 0.01 },
          domesticationGain: 5 + skill * 10,
        };

      case 'communicate':
        return {
          statDelta: { mood: 8 },
          skillGain: { skill: 'social', amount: 0.003 },
        };

      case 'share':
        return {
          statDelta: { mood: 12 },
          skillGain: { skill: 'social', amount: 0.008 },
          knowledgeGained: [`shared_with_${action.target.agentId}`],
        };

      case 'groom':
        return {
          statDelta: { mood: 15, energy: -2 },
          skillGain: { skill: 'social', amount: 0.005 },
        };

      case 'play':
        return {
          statDelta: { mood: 25, energy: -10 },
          skillGain: { skill: 'social', amount: 0.01 },
        };

      case 'comfort':
        return {
          statDelta: { mood: 10 },
          skillGain: { skill: 'social', amount: 0.007 },
        };

      case 'mate':
        return {
          statDelta: { mood: 20, energy: -10 },
          skillGain: { skill: 'social', amount: 0.01 },
          worldEffect: 'mating_occurred' as any
        };

      case 'light_fire':
        return {
          statDelta: { mood: 15 },
          worldEffect: 'fire_lit',
          skillGain: { skill: 'fire_making', amount: 0.02 },
        };

      case 'build':
        return {
          statDelta: { mood: 20 },
          worldEffect: 'shelter_built',
          skillGain: { skill: 'building', amount: 0.015 },
        };

      case 'plant':
        return {
          statDelta: { mood: 10, energy: -5 },
          worldEffect: 'crop_planted',
          skillGain: { skill: 'farming', amount: 0.02 },
        };

      case 'water':
        return {
          statDelta: { mood: 5, energy: -2 },
          worldEffect: 'soil_watered',
          skillGain: { skill: 'farming', amount: 0.01 },
        };

      case 'extinguish_fire':
        return {
          statDelta: { mood: 10, stress: -5 },
          worldEffect: 'fire_extinguished',
          skillGain: { skill: 'survival', amount: 0.015 },
        };

      default:
        return { statDelta: {} };
    }
  }

  private applyOutcome(agent: AgentState, outcome: ActionOutcome) {
    if (outcome.statDelta) {
      for (const [stat, delta] of Object.entries(outcome.statDelta)) {
        if (delta !== undefined) {
          (agent.stats as any)[stat] = Math.max(0, Math.min(100, (agent.stats as any)[stat] + delta));
        }
      }
    }
    if (outcome.skillGain) {
      const { skill, amount } = outcome.skillGain;
      agent.skills[skill] = Math.min(1, (agent.skills[skill] ?? 0) + amount);
    }
    if (outcome.itemsGained) {
      agent.inventory.items.push(...outcome.itemsGained);
    }
    if (outcome.knowledgeGained) {
      outcome.knowledgeGained.forEach(k => agent.knowledge.addOrUpdate({ content: k }));
    }
  }
}

// ============================================================================
// NEURAL NETWORK → ACTION DECODER
// ============================================================================

// NN output: 44 neurons mapped to action space
// [0-22]  = action type logits (softmax)
// [23-32] = target encoding (which entity/location)
// [33-37] = urgency, patience, social_bias, exploration_bias, risk_tolerance
// [38-43] = reserved for future

export class ActionDecoder {
  private baseInputScratch = new Float32Array(262); 
  private knowledgeScratch = new Float32Array(128);

  // Map NN output to Action
  decode(nnOutput: Float32Array, agent: AgentState, env: any): Action {
    // 1. Action type (softmax over all ActionTypes)
    const typeLogits = Array.from(nnOutput.slice(0, 29));
    const typeProbs  = this.softmax(typeLogits);
    const typeIndex  = this.argmax(typeProbs);

    const actionType = ACTION_ORDER[typeIndex] ?? 'idle';

    // 2. Target encoding
    const targetEncoding = nnOutput.slice(29, 39);
    const target = this.decodeTarget(actionType, targetEncoding, agent, env);

    // 3. Personality biases (scale duration/priority)
    const urgency         = nnOutput[39];
    const patienceBias    = nnOutput[40] * agent.personality.patience;
    const explorationBias = nnOutput[43];

    // 4. Build action
    return ActionBuilder.create(actionType, target, {
      priority: ACTION_TEMPLATES[actionType].priority * (0.7 + urgency * 0.6),
      durationMs: ACTION_TEMPLATES[actionType].durationMs * (1 - patienceBias * 0.3),
    });
  }

  // Encode agent state for NN input (262 dimensions: 134 base + 128 knowledge)
  encodeState(agent: AgentState, env: any): Float32Array {
    const memory = env.getAssociations ? env.getAssociations() : [];
    const bestFood = env.getBestLocation ? env.getBestLocation('food') : null;
    const bestWater = env.getBestLocation ? env.getBestLocation('water') : null;

    const distToBestFood = bestFood ? Math.sqrt((bestFood.x - agent.position.x)**2 + (bestFood.y - agent.position.y)**2) / 100 : 1.0;
    const distToBestWater = bestWater ? Math.sqrt((bestWater.x - agent.position.x)**2 + (bestWater.y - agent.position.y)**2) / 100 : 1.0;

    const hour = env.getTimeOfDay() || 0;
    const timeRad = (hour / 24) * Math.PI * 2;
    const hormones = (agent as any).hormones || { testosterone: 0, estrogen: 0, progesterone: 0, cortisol: 0, oxytocin: 0 };
    const climate = env.getClimateAt ? env.getClimateAt(agent.position) : { temp: 25, humidity: 0.5, wind: 2, light: 0.8, rain: 0 };
    const atmo = env.atmosphere || { co2Ppm: 280, o2Pct: 21, ch4Ppb: 700, tempForcing: 0 };
    const atmoHistory = env.getAtmosphericHistory ? env.getAtmosphericHistory() : null;

    const buf = this.baseInputScratch;
    let i = 0;

    // Physiological (10)
    buf[i++] = agent.stats.health / 100;
    buf[i++] = agent.stats.hunger / 100;
    buf[i++] = agent.stats.thirst / 100;
    buf[i++] = agent.stats.energy / 100;
    buf[i++] = agent.stats.mood / 100;
    buf[i++] = agent.stats.bodyTemp ? (agent.stats.bodyTemp - 36) / 2 : 0.5;
    buf[i++] = agent.stats.stress / 100;
    buf[i++] = agent.stats.loneliness / 100;
    buf[i++] = agent.stats.waste / 100;
    buf[i++] = (agent.stats.socialReputation || 50) / 100;

    // Current action (3)
    buf[i++] = agent.currentAction ? this.encodeActionType(agent.currentAction.type) : 0;
    buf[i++] = agent.currentAction?.progress ?? 0;
    buf[i++] = agent.actionQueue.size / 10;

    // Perception (8)
    buf[i++] = env.countNearby(agent.position, 'food', 30) / 10;
    buf[i++] = env.countNearby(agent.position, 'water', 50) / 5;
    buf[i++] = env.countNearby(agent.position, 'predator', 40) / 3;
    buf[i++] = env.countNearby(agent.position, 'prey', 30) / 10;
    buf[i++] = env.countNearby(agent.position, 'agent', 20) / 3;
    buf[i++] = env.countNearby(agent.position, 'plant', 20) / 10;
    buf[i++] = env.countNearby(agent.position, 'fire', 15) / 3;
    buf[i++] = env.countNearby(agent.position, 'shelter', 30) / 2;

    // Environment Context & Climate (72)
    buf[i++] = env.getBiomeIndex(agent.position) / 5;
    buf[i++] = Math.sin(timeRad);
    buf[i++] = Math.cos(timeRad);
    buf[i++] = climate.wind / 20;
    buf[i++] = Math.sin(climate.windDir || 0);
    buf[i++] = Math.cos(climate.windDir || 0);
    buf[i++] = env.getSeason ? env.getSeason() / 4 : 0.5;
    buf[i++] = env.getWeather() / 3;

    // Atmosphere (4)
    buf[i++] = (atmo.co2Ppm - 280) / 1000;
    buf[i++] = (atmo.o2Frac !== undefined ? atmo.o2Frac : atmo.o2Pct / 100 - 0.15) / 0.15;
    buf[i++] = (atmo.ch4Ppb - 700) / 2000;
    buf[i++] = atmo.tempForcing || 0;

    // Atmospheric History (60)
    if (atmoHistory) {
      for (let k = 0; k < 10; k++) buf[i++] = atmoHistory.temp[k];
      for (let k = 0; k < 10; k++) buf[i++] = atmoHistory.moist[k];
      for (let k = 0; k < 10; k++) buf[i++] = atmoHistory.rain[k];
      for (let k = 0; k < 10; k++) buf[i++] = atmoHistory.light[k];
      for (let k = 0; k < 10; k++) buf[i++] = atmoHistory.co2[k];
      for (let k = 0; k < 10; k++) buf[i++] = atmoHistory.o2[k];
    } else {
      for (let k = 0; k < 60; k++) buf[i++] = 0;
    }

    // Personality (4)
    buf[i++] = agent.personality.courage;
    buf[i++] = agent.personality.patience;
    buf[i++] = agent.personality.empathy;
    buf[i++] = agent.personality.discipline;

    // Environment Details (5)
    buf[i++] = env.getSoilMoisture(agent.position);
    buf[i++] = env.getFireLevel(agent.position);
    buf[i++] = env.getNearestFire(agent.position) ? 1.0 : 0.0;
    buf[i++] = env.getNearestDryingPlant(agent.position) ? 1.0 : 0.0;
    buf[i++] = env.getDanger(agent.position);

    // Memory (3)
    buf[i++] = memory.length / 20;
    buf[i++] = distToBestFood;
    buf[i++] = distToBestWater;

    // Skills (14)
    buf[i++] = agent.skills['hunting']      ?? 0;
    buf[i++] = agent.skills['gathering']    ?? 0;
    buf[i++] = agent.skills['crafting']     ?? 0;
    buf[i++] = agent.skills['social']       ?? 0;
    buf[i++] = agent.skills['foraging']     ?? 0;
    buf[i++] = agent.skills['building']     ?? 0;
    buf[i++] = agent.skills['fire_making']  ?? 0;
    buf[i++] = agent.skills['medicine']      ?? 0;
    buf[i++] = agent.skills['cooking']       ?? 0;
    buf[i++] = agent.skills['navigation']    ?? 0;
    buf[i++] = agent.skills['stealth']       ?? 0;
    buf[i++] = agent.skills['endurance']     ?? 0;
    buf[i++] = agent.skills['strength']      ?? 0;
    buf[i++] = agent.skills['agility']       ?? 0;

    // Inventory + Hormones + Bio + Repro + Neural
    buf[i++] = agent.inventory.items.length / 20;
    buf[i++] = hormones.testosterone / 100;
    buf[i++] = hormones.estrogen / 100;
    buf[i++] = hormones.progesterone / 100;
    buf[i++] = hormones.cortisol / 100;
    buf[i++] = hormones.oxytocin / 100;
    buf[i++] = (agent as any).muscleFatigue / 100 || 0;
    buf[i++] = (agent as any).muscleMass / 100 || 0;
    buf[i++] = ((agent as any).bloodPressure - 80) / 40 || 0;
    buf[i++] = (agent as any).immuneSystem / 100 || 0;
    buf[i++] = (agent as any).isPregnant ? 1.0 : 0.0;
    buf[i++] = (agent as any).isFertile ? 1.0 : 0.0;
    buf[i++] = (agent as any).stomachContent / 100 || 0;
    buf[i++] = (agent as any).dopamineLevel / 100 || 0.5;
    buf[i++] = (agent as any).serotoninLevel / 100 || 0.5;

    const baseOffset = i;
    // Knowledge Retrieval (128)
    const charKey = agent.name.toUpperCase();
    let knowledgeIndex = 0;
    if (agent.stats.hunger > 50) knowledgeIndex = 1;
    if (agent.stats.danger > 50) knowledgeIndex = 2;
    if (agent.stats.energy < 30) knowledgeIndex = 3;

    if (neuralKnowledgeService.getVectorTo(charKey, knowledgeIndex, this.knowledgeScratch)) {
      for (let k = 0; k < 128; k++) buf[baseOffset + k] = this.knowledgeScratch[k];
    } else {
      for (let k = 0; k < 128; k++) buf[baseOffset + k] = 0;
    }

    return buf; // NOTE: Shared buffer returned
  }

  private decodeTarget(
    type: ActionType,
    encoding: Float32Array,
    agent: AgentState,
    env: any
  ): ActionTarget {
    const dx = (encoding[0] - 0.5) * 40;
    const dy = (encoding[1] - 0.5) * 40;

    if (['walk', 'run', 'explore'].includes(type)) {
      // Fallback to memory if exploration choice is neutral but hunger/thirst is high
      if (type === 'walk' || type === 'run') {
         if (agent.stats.hunger > 60 && env.getBestLocation) {
            const memFood = env.getBestLocation('food');
            if (memFood) return { type: 'location', position: memFood };
         }
         if (agent.stats.thirst > 60 && env.getBestLocation) {
            const memWater = env.getBestLocation('water');
            if (memWater) return { type: 'location', position: memWater };
         }
      }

      return {
        type: 'location',
        position: {
          x: Math.round(agent.position.x + dx),
          y: Math.round(agent.position.y + dy),
        },
      };
    }
    if (['eat', 'gather', 'harvest'].includes(type)) {
      const item = env.getNearestFood(agent.position);
      if (item) return { type: 'item', item };
      
      // For harvest, if no food item nearby, look for mature plants
      if (type === 'harvest' && env.getNearestMaturePlant) {
        const plantPos = env.getNearestMaturePlant(agent.position);
        if (plantPos) return { type: 'location', position: plantPos };
      }

      // Fallback to memory location
      if (env.getBestLocation) {
        const bestPos = env.getBestLocation('food');
        if (bestPos) return { type: 'location', position: bestPos };
      }
      return { type: 'none' };
    }
    if (['drink'].includes(type)) {
      const item = env.getNearestFood(agent.position); // Logic for water source needs to be consistent
      // But typically drink is at a location
      if (env.getBestLocation) {
        const bestPos = env.getBestLocation('water');
        if (bestPos) return { type: 'location', position: bestPos };
      }
    }
    if (['hunt', 'fish', 'domesticate'].includes(type)) {
      const entity = env.getNearestPrey(agent.position);
      return entity ? { type: 'entity', entityId: entity.id } : { type: 'none' };
    }
    if (type === 'plant') {
      // Plant on current spot if fertile
      return { type: 'location', position: { ...agent.position } };
    }
    if (type === 'water') {
      const drying = env.getNearestDryingPlant(agent.position);
      return drying ? { type: 'location', position: drying } : { type: 'none' };
    }
    if (type === 'extinguish_fire') {
      const fire = env.getNearestFire(agent.position);
      return fire ? { type: 'location', position: fire } : { type: 'none' };
    }
    if (['communicate', 'teach', 'share', 'mate', 'groom', 'play', 'comfort', 'follow'].includes(type)) {
      const other = env.getNearestAgent(agent.position, agent.id);
      return other ? { type: 'agent', agentId: other.id } : { type: 'none' };
    }
    return { type: 'none' };
  }

  private encodeActionType(type: ActionType): number {
    const map: Record<ActionType, number> = {
      eat:.04,drink:.08,sleep:.12,rest:.16,breathe:.20,
      walk:.24,run:.28,sneak:.32,climb:.36,swim:.40,hide:.44,
      gather:.48,hunt:.52,fish:.54,harvest:.56,craft:.60,cook:.64,build:.68,
      store:.70,light_fire:.72,extinguish_fire:.74,plant:.75,water:.76,dig:.77,cut:.78,carry:.80,drop:.82,domesticate:.83,
      communicate:.84,teach:.86,share:.88,trade:.90,mate:.92,groom:.93,play:.94,comfort:.95,
      follow:.96,call:.97,
      observe:.975,explore:.98,examine:.985,memorize:.99,plan:.995,idle:1.0,
    };
    return map[type] ?? 0;
  }

  private softmax(x: number[]): number[] {
    const max = Math.max(...x);
    const exp = x.map(v => Math.exp(v - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(v => v / sum);
  }

  private argmax(x: number[]): number {
    return x.indexOf(Math.max(...x));
  }
}

// ============================================================================
// PERSONALITY × ACTION BIAS
// Adam vs Eve behave differently from identical NN outputs
// ============================================================================

export class PersonalityActionBias {

  // Modifies action priorities based on character personality
  static applyBias(agent: AgentState, candidates: Action[]): Action[] {
    return candidates.map(action => {
      let bias = 1.0;

      // Adam: higher priority for hunting, exploring, combat-adjacent
      if (agent.name === 'Adam') {
        if (['hunt', 'explore', 'build', 'light_fire'].includes(action.type)) {
          bias *= (1 + agent.personality.courage * 0.4);
        }
        if (['communicate', 'groom', 'comfort'].includes(action.type)) {
          bias *= (1 - (1 - agent.personality.empathy) * 0.3);
        }
      }

      // Eve: higher priority for gathering, harvesting, teaching, healing, social
      if (agent.name === 'Eve') {
        if (['gather', 'harvest', 'plant', 'water', 'teach', 'communicate', 'comfort', 'share', 'cook'].includes(action.type)) {
          bias *= (1 + agent.personality.empathy * 0.4);
        }
        if (['hunt', 'build'].includes(action.type)) {
          bias *= (1 - (1 - agent.personality.courage) * 0.2);
        }
      }

      // Discipline: more likely to plan before acting
      if (action.type === 'plan') {
        bias *= (1 + agent.personality.discipline * 0.5);
      }

      // Patience: longer actions more tolerable
      if (action.durationMs > 60000) {
        bias *= (0.5 + agent.personality.patience * 0.5);
      }

      return { ...action, priority: action.priority * bias };
    });
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================
/*
const executor = new ActionExecutor(
  (agent, action, outcome) => {
    console.log(`✅ ${agent.name} completed: ${action.type}`);
    if (outcome.skillGain) {
      console.log(`   📈 ${outcome.skillGain.skill} +${outcome.skillGain.amount.toFixed(3)}`);
    }
  },
  (agent, interrupted, by) => {
    console.log(`⚡ ${agent.name}: ${interrupted.type} → interrupted by ${by.type}`);
  }
);

const decoder = new ActionDecoder();

// Game loop tick (60 FPS → ~16ms per tick)
function gameTick(deltaMs: number) {
  // 1. NN decides action
  const nnOutput = neuralNetwork.forward(decoder.encodeState(adam, environment));
  const action   = decoder.decode(nnOutput, adam, environment);

  // 2. Apply personality bias
  const biased = PersonalityActionBias.applyBias(adam, [action]);

  // 3. Queue action
  biased.forEach(a => adam.actionQueue.push(a));

  // 4. Execute
  executor.tick(adam, deltaMs, environment);
  executor.tick(eve,  deltaMs, environment);
}
*/
