// pangeaBridge.ts
// Adapter: Python (pangea-world FastAPI) snapshot -> PANGEA_OS WorldSnapshot
import type { WorldSnapshot, HumanState, AnimalState, StructureState, Cell } from '../sim/types';
import { Biome, AnimalAction } from '../sim/types';

const HEIGHT_BY_BIOME: Record<number, number> = {
  [Biome.DEEP_WATER]: 0.0,
  [Biome.SHALLOW]: 0.02,
  [Biome.BEACH]: 0.06,
  [Biome.GRASSLAND]: 0.2,
  [Biome.TROPICAL]: 0.25,
  [Biome.FOREST]: 0.3,
  [Biome.MOUNTAIN]: 0.7,
  [Biome.PEAK]: 0.9,
};

const SPECIES_MAP: Record<string, string> = {
  'กระต่ายป่า': 'rabbit',
  'กวางเรนเดียร์': 'deer',
  'หมูป่า': 'boar',
  'หมาป่าสีเทา': 'wolf',
  'เสือเขี้ยวดาบ': 'tiger',
};

const ACTION_MAP: Record<string, AnimalAction> = {
  eat_raw: AnimalAction.EAT,
  eat_cooked: AnimalAction.EAT,
  drink: AnimalAction.DRINK,
  sleep: AnimalAction.SLEEP,
  rest: AnimalAction.REST,
  seek_food: AnimalAction.GATHER,
  seek_water: AnimalAction.DRINK,
  seek_partner: AnimalAction.IDLE,
  seek_fire: AnimalAction.IDLE,
  mate: AnimalAction.MATE,
  start_fire: AnimalAction.COOK,
  cook: AnimalAction.COOK,
  tend_fire: AnimalAction.BUILD,
  gather: AnimalAction.GATHER,
  craft: AnimalAction.CRAFT,
  explore: AnimalAction.EXPLORE,
  flee: AnimalAction.FLEE,
  teach: AnimalAction.TEACH,
  rub: AnimalAction.IDLE,
  share_food: AnimalAction.SOCIALIZE,
  comfort: AnimalAction.SOCIALIZE,
  build_shelter: AnimalAction.BUILD,
  toilet: AnimalAction.CLEAN,
  idle: AnimalAction.IDLE,
};

function mapAction(action: string | undefined): AnimalAction {
  if (!action) return AnimalAction.IDLE;
  return ACTION_MAP[action] ?? AnimalAction.IDLE;
}

function makeCell(biomeId: number, veg: number): Cell {
  const biome = biomeId as Biome;
  const water = biome <= Biome.SHALLOW ? 1 : 0;
  return {
    biome,
    plants: [],
    water,
    fire: 0,
    temperature: 28,
    height: HEIGHT_BY_BIOME[biomeId] ?? 0.2,
    tree: Math.min(1, veg / 8),
    rock: biome >= Biome.MOUNTAIN ? 0.5 : 0,
    fertility: Math.min(1, veg / 50),
    toxicity: 0,
    radiation: 0,
    minerals: biome >= Biome.MOUNTAIN ? 0.4 : 0.1,
    magic: 0,
    resource: 0,
    hazard: 0,
    poi: 0 as any,
    damage: 0,
  };
}

export function brightness(hour: number): number {
  if (6 <= hour && hour < 8) return 0.65;
  if (8 <= hour && hour < 17) return 1.0;
  if (17 <= hour && hour < 19) return 0.65;
  if (19 <= hour && hour < 22) return 0.35;
  return 0.15;
}

const MILESTONE_MARKS = ['👶', '💀', '🌏', '⚠️', '🏠', '🌑', '🗣', '🤰'];

export function adaptPythonSnapshot(p: any): WorldSnapshot {
  const day: number = p.day ?? 0;
  const hour: number = p.hour ?? 12;

  const fireCells = new Set<string>();
  const structures: StructureState[] = [];
  for (const f of p.fires || []) {
    const r = f.pos?.[0] ?? 0;
    const c = f.pos?.[1] ?? 0;
    fireCells.add(`${r},${c}`);
    structures.push({
      id: `fire_${r}_${c}`,
      type: 'campfire',
      pos: { x: c, y: r },
      health: 100,
      maxHealth: 100,
      progress: 100,
      defenseBonus: 0,
      capacity: 0,
      flammability: 100,
      insulation: 0,
    });
  }
  for (const s of p.shelters || []) {
    structures.push({
      id: `shelter_${s.pos?.[0]}_${s.pos?.[1]}`,
      type: 'shelter',
      pos: { x: s.pos?.[1] ?? 0, y: s.pos?.[0] ?? 0 },
      health: s.durability ?? 100,
      maxHealth: 100,
      progress: 100,
      defenseBonus: 10,
      capacity: 2,
      flammability: 20,
      insulation: 40,
    });
  }

  const biomes: number[][] = p.biomes || [];
  const vegGrid: number[][] = p.veg || [];
  const grid: Cell[][] = biomes.map((row, y) =>
    row.map((b, x) => {
      const cell = makeCell(b, vegGrid[y]?.[x] ?? 0);
      cell.fire = fireCells.has(`${y},${x}`) ? 1 : 0;
      return cell;
    })
  );

  const humans: HumanState[] = (p.humans || []).map((h: any, i: number) => ({
    id: h.name || `human_${i}`,
    name: h.name,
    pos: { x: h.pos?.[1] ?? 50, y: h.pos?.[0] ?? 50 },
    health: h.health ?? 100,
    energy: 100 - (h.drives?.tired ?? 0),
    hunger: h.drives?.hunger ?? 0,
    thirst: h.drives?.thirst ?? 0,
    stomachContent: Math.max(0, 100 - (h.drives?.hunger ?? 100)),
    age: h.age ?? 25,
    gender: (h.sex === 'M' ? 'm' : 'f') as 'm' | 'f',
    weight: h.weight ?? 65,
    height: h.height_m ?? 1.7,
    bodyTemp: h.body_temp ?? 36.6,
    bloodPressure: 110,
    muscleFatigue: h.drives?.tired ?? 0,
    muscleMass: h.skills ? (h.skills.hunt ?? 0) : 30,
    immuneSystem: 80,
    stress: h.drives?.fear ?? 0,
    waste: h.drives?.bladder ?? 0,
    neuroStability: 90,
    cognitiveLoad: h.sleeping ? 10 : 45,
    hormones: {
      testosterone: h.hormones?.testosterone ?? 0,
      estrogen: h.hormones?.estrogen ?? 0,
      progesterone: h.hormones?.progesterone ?? 0,
      cortisol: h.hormones?.cortisol ?? 0,
      oxytocin: h.hormones?.oxytocin ?? 0,
    },
    emotions: {
      awe: 0,
      relationships: {},
      joy: h.joy ?? 50,
      grief: 0,
      loneliness: h.drives?.lonely ?? 0,
    },
    isPregnant: !!h.pregnant,
    gestationProgress: h.gestation ?? 0,
    partnerId: undefined,
    genetics: {
      strength: 50,
      speed: 50,
      intelligence: 55,
      metabolism: 50,
      immunity: 70,
      coldResistance: 40,
      heatResistance: 60,
      longevity: 60,
    },
    statusFlags: { isParticipatingInRitual: false, isAdapting: false },
    vocabulary: h.vocabulary ?? [],
    culture: { symbolsDiscovered: h.vocabulary ?? [], ritualsPerformed: 0 },
    subconscious: { dreams: [], traumas: [], archetypes: [] },
    action: h.sleeping ? AnimalAction.SLEEP : mapAction(h.action),
    currentAction: null,
    actionQueue: null,
    thought: h.last_speech || '',
    brainState: h.neural_modules ? ({
      inputs: 262,
      hidden: 128,
      outputs: 44,
      weightsIH: [],
      weightsHO: [],
      modules: h.neural_modules,
    } as any) : undefined,
    inventory: {
      items: [],
      wood: h.inventory_counts?.wood ?? 0,
      stone: h.inventory_counts?.stone ?? 0,
      food: 0,
      leaf: h.inventory_counts?.leaf ?? 0,
      fiber: h.inventory_counts?.fiber ?? 0,
    },
    skills: h.skills ?? {},
    knowledge: {
      totalBirths: h.total_births ?? 0,
      diseases: h.diseases ?? [],
      isFertile: !!h.fertile,
      menopause: !!h.menopause,
    },
    generation: 0,
    domainKnowledge: [],
    learningHistory: [],
    reasoningTemplates: [],
    memories: [],
    signalAssociations: {},
    spatialAssociations: [],
    perception: { visibleEntities: [], heardSounds: [], smells: [], tastes: [], touches: [] },
    loneliness: h.drives?.lonely ?? 0,
    socialReputation: 50,
    interactionCount: 0,
  }));

  const animals: AnimalState[] = (p.animals || []).map((a: any, i: number) => ({
    id: a.id != null ? `animal_${a.id}` : `animal_${i}`,
    species: (SPECIES_MAP[a.species] || 'deer') as any,
    pos: { x: a.pos?.[1] ?? 0, y: a.pos?.[0] ?? 0 },
    health: a.health ?? 100,
    energy: a.energy ?? 500,
    hunger: a.drives?.hunger ?? 0,
    thirst: a.drives?.thirst ?? 0,
    waste: 0,
    age: a.age_years ?? 1,
    gender: (a.sex === 'M' ? 'm' : 'f') as 'm' | 'f',
    isPregnant: !!a.pregnant,
    gestationProgress: a.days_pregnant ? Math.min(100, a.days_pregnant / 2.3) : 0,
    stress: a.drives?.fear ?? 0,
    action: a.sleeping ? AnimalAction.SLEEP : ((a.a_type === 'Carnivore') ? AnimalAction.HUNT : AnimalAction.GATHER),
    isDomesticated: false,
    domesticationProgress: 0,
  }));

  const history: string[] = p.history || [];
  const historyEvents = history.map((text, idx) => ({
    day,
    event_type: (
      MILESTONE_MARKS.some(m => text.includes(m)) ? 'milestone' :
      text.includes('💀') ? 'death' :
      text.includes('👶') ? 'birth' : 'daily_summary'
    ) as any,
    description: text,
    created_at: new Date().toISOString(),
    data: { idx },
  }));

  return {
    grid,
    structures,
    animals,
    humans,
    time: hour,
    minute: p.minute ?? 0,
    day,
    season: p.season || '',
    weather: p.weather || '',
    globalTemp: p.temp ?? 28,
    lightLevel: p.light_level ?? brightness(hour),
    logs: history,
    alphaLogs: p.humans?.[0]?.action_log ?? [],
    betaLogs: p.humans?.[1]?.action_log ?? [],
    score: 0,
    milestones: history.filter(t => MILESTONE_MARKS.some(m => t.includes(m))),
    events: [],
    historyEvents,
    stepCount: day * 24 + hour,
    averageFertility: p.avg_fertility ?? 0.5,
    globalMoisture: p.moisture ?? 50,
    animalCount: (p.animals || []).length,
    humanCount: (p.humans || []).length,
    totalBiomass: p.biomass ?? 0,
    tribes: [],
    signals: [],
    kpis: p.kpis,
  };
}

export async function createRemoteSession(): Promise<string> {
  const res = await fetch('/api/session', { method: 'POST' });
  if (!res.ok) throw new Error(`session create failed: ${res.status}`);
  const data = await res.json();
  return data.session_id as string;
}

export function connectWorldSocket(
  sessionId: string,
  onSnapshot: (raw: any) => void,
  onDown?: () => void
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/ws/${sessionId}`;
  const ws = new WebSocket(url);
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'full' && msg.data) onSnapshot(msg.data);
    } catch (e) {
      console.error('Bridge: bad ws message', e);
    }
  };
  ws.onclose = () => { if (onDown) onDown(); };
  ws.onerror = () => { if (onDown) onDown(); };
  return ws;
}

export async function sendCommand(sessionId: string, cmd: string): Promise<void> {
  await fetch(`/api/command/${sessionId}/${cmd}`, { method: 'POST' }).catch(e =>
    console.error('Bridge: command failed', cmd, e)
  );
}
