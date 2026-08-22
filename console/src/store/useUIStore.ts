
import { create } from 'zustand';

export type TabId = 'environment' | 'map' | 'agents' | 'neural' | 'crafting' | 'logs';

interface UIStore {
  activeTab: TabId;
  selectedAgentId: string | null;
  mapLayers: { 
    memory: boolean; 
    trauma: boolean; 
    stigmergy: boolean; 
    entities: boolean;
    heat: boolean;
    moisture: boolean;
    vision: boolean;
    grid: boolean;
  };
  lang: 'th' | 'en';
  showLore: boolean;
  selectedLore: string | null;
  
  setActiveTab: (tab: TabId) => void;
  selectAgent: (id: string | null) => void;
  toggleLayer: (layer: keyof UIStore['mapLayers']) => void;
  setLang: (lang: 'th' | 'en') => void;
  setShowLore: (show: boolean) => void;
  setSelectedLore: (id: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeTab: 'environment',
  selectedAgentId: null,
  mapLayers: { 
    memory: true, 
    trauma: true, 
    stigmergy: false, 
    entities: true,
    heat: false,
    moisture: false,
    vision: true,
    grid: true
  },
  lang: 'th',
  showLore: false,
  selectedLore: null,
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectAgent: (id) => set({ selectedAgentId: id }),
  toggleLayer: (layer) => set((s) => ({
    mapLayers: { ...s.mapLayers, [layer]: !s.mapLayers[layer] }
  })),
  setLang: (lang) => set({ lang }),
  setShowLore: (show) => set({ showLore: show }),
  setSelectedLore: (id) => set({ selectedLore: id }),
}));
