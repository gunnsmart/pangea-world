import { FLORA_DATABASE } from './floraDatabase';

export interface PlantSpecies {
  id: string;
  name: string;
  scientificName?: string;
  family?: string;
  nativeRange?: string;
  notes?: string;
  growthRate: number;
  waterNeed: number;
  tempTolerance: [number, number]; // [min, max]
  hazardResistance: number; // 0-1
  isPoisonous: boolean;
  isRare: boolean;
  medicinalValue?: number; // 0-1
  nutritionalValue?: number; // 0-1
  woodQuality?: number; // 0-1
}

export const PLANT_SPECIES: Record<string, PlantSpecies> = {
  grass: { id: 'grass', name: 'หญ้าทั่วไป', growthRate: 0.005, waterNeed: 0.3, tempTolerance: [5, 35], hazardResistance: 0.1, isPoisonous: false, isRare: false },
  tree: { id: 'tree', name: 'ต้นไม้ใหญ่', growthRate: 0.000019, waterNeed: 0.5, tempTolerance: [10, 30], hazardResistance: 0.3, isPoisonous: false, isRare: false },
  poison: { id: 'poison', name: 'พืชพิษ', growthRate: 0.002, waterNeed: 0.2, tempTolerance: [15, 35], hazardResistance: 0.8, isPoisonous: true, isRare: false },
  rare: { id: 'rare', name: 'พืชหายาก', growthRate: 0.0001, waterNeed: 0.4, tempTolerance: [15, 25], hazardResistance: 0.5, isPoisonous: false, isRare: true },
  medicinal: { id: 'medicinal', name: 'สมุนไพรรักษาโรค', growthRate: 0.001, waterNeed: 0.4, tempTolerance: [10, 30], hazardResistance: 0.4, isPoisonous: false, isRare: false },
  berry: { id: 'berry', name: 'พุ่มเบอร์รี่', growthRate: 0.003, waterNeed: 0.3, tempTolerance: [10, 35], hazardResistance: 0.2, isPoisonous: false, isRare: false },
  cactus: { id: 'cactus', name: 'กระบองเพชร', growthRate: 0.0005, waterNeed: 0.05, tempTolerance: [15, 50], hazardResistance: 0.9, isPoisonous: false, isRare: false },
  mushroom: { id: 'mushroom', name: 'เห็ดป่า', growthRate: 0.01, waterNeed: 0.8, tempTolerance: [5, 25], hazardResistance: 0.1, isPoisonous: false, isRare: false },
  ...FLORA_DATABASE
};
