import { create } from 'zustand';
import { WorldSnapshot, TimelineEvent } from '../sim/types';
import { AgentDiscovery } from '../services/stigmergyService';

interface SimulationState {
  snapshot: WorldSnapshot | null;
  timeline: TimelineEvent[];
  llmThoughts: Record<string, string>;
  thoughtHistory: Record<string, string[]>;
  discoveries: AgentDiscovery[];
  isPaused: boolean;
  dbStatus: { success: boolean, message: string } | null;

  // Actions
  setSnapshot: (snapshot: WorldSnapshot | null) => void;
  setTimeline: (timeline: TimelineEvent[]) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  setLlmThoughts: (thoughts: Record<string, string>) => void;
  updateLlmThought: (id: string, thought: string) => void;
  setThoughtHistory: (history: Record<string, string[]>) => void;
  addThoughtToHistory: (id: string, thought: string) => void;
  setDiscoveries: (discoveries: AgentDiscovery[]) => void;
  setIsPaused: (isPaused: boolean) => void;
  setDbStatus: (status: { success: boolean, message: string } | null) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  snapshot: null,
  timeline: [],
  llmThoughts: {},
  thoughtHistory: {},
  discoveries: [],
  isPaused: false,
  dbStatus: null,

  setSnapshot: (snapshot) => set((state) => {
    if (!snapshot) return { snapshot: null };
    
    if (snapshot.isDelta && state.snapshot) {
      return {
        snapshot: {
          ...state.snapshot,
          ...snapshot,
          // Explicitly ensure we don't lose the grid if it's not in the delta
          grid: snapshot.grid || state.snapshot.grid
        }
      };
    }
    return { snapshot };
  }),
  setTimeline: (timeline) => set({ timeline }),
  addTimelineEvent: (event) => set((state) => ({ timeline: [event, ...state.timeline].slice(0, 50) })),
  setLlmThoughts: (llmThoughts) => set({ llmThoughts }),
  updateLlmThought: (id, thought) => set((state) => ({
    llmThoughts: { ...state.llmThoughts, [id]: thought }
  })),
  setThoughtHistory: (thoughtHistory) => set({ thoughtHistory }),
  addThoughtToHistory: (id, thought) => set((state) => {
    const history = state.thoughtHistory[id] || [];
    return {
      thoughtHistory: {
        ...state.thoughtHistory,
        [id]: [thought, ...history].slice(0, 10)
      }
    };
  }),
  setDiscoveries: (discoveries) => set({ discoveries }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setDbStatus: (dbStatus) => set({ dbStatus }),
}));
