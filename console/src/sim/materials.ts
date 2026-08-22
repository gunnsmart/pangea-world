import { MaterialProperties } from './types';

export const MATERIALS: Record<string, MaterialProperties> = {
  WOOD: {
    physical: { hardness: 0.4, sharpness: 0.1, weight: 0.3, flexibility: 0.6, density: 0.5, durability: 0.6, porosity: 0.4, friction: 0.6 },
    nutrition: { calories: 0.05, protein: 0.0, fat: 0.0, carb: 0.1, water: 0.1, fiber: 0.8, vitamins: 0.05, minerals: 0.1, sugar: 0.0, sodium: 0.0, calcium: 0.2, omega3: 0.0 },
    chemical: { flammability: 0.7, toxicity: 0.0, reactivity: 0.2, acidity: 0.45, waterResistance: 0.3, decomposition: 0.2, antinutrient: 0.1, medicinal: 0.1 },
    sensory: { smell: 0.3, taste_sweet: 0.1, taste_salty: 0.0, taste_bitter: 0.4, texture_hard: 0.6, texture_chewy: 0.2, appeal: 0.4, freshness: 0.5 }
  },
  STONE: {
    physical: { hardness: 0.9, sharpness: 0.3, weight: 0.8, flexibility: 0.0, density: 0.9, durability: 0.95, porosity: 0.1, friction: 0.7 },
    nutrition: { calories: 0.0, protein: 0.0, fat: 0.0, carb: 0.0, water: 0.0, fiber: 0.0, vitamins: 0.0, minerals: 0.9, sugar: 0.0, sodium: 0.1, calcium: 0.4, omega3: 0.0 },
    chemical: { flammability: 0.0, toxicity: 0.0, reactivity: 0.1, acidity: 0.5, waterResistance: 1.0, decomposition: 0.0, antinutrient: 0.0, medicinal: 0.0 },
    sensory: { smell: 0.0, taste_sweet: 0.0, taste_salty: 0.1, taste_bitter: 0.0, texture_hard: 0.9, texture_chewy: 0.0, appeal: 0.3, freshness: 1.0 }
  },
  MEAT: {
    physical: { hardness: 0.2, sharpness: 0.0, weight: 0.2, flexibility: 0.8, density: 0.4, durability: 0.1, porosity: 0.6, friction: 0.3 },
    nutrition: { calories: 0.6, protein: 0.9, fat: 0.4, carb: 0.0, water: 0.7, fiber: 0.0, vitamins: 0.4, minerals: 0.5, sugar: 0.0, sodium: 0.3, calcium: 0.1, omega3: 0.2 },
    chemical: { flammability: 0.3, toxicity: 0.3, reactivity: 0.5, acidity: 0.6, waterResistance: 0.1, decomposition: 0.9, antinutrient: 0.1, medicinal: 0.1 },
    sensory: { smell: 0.8, taste_sweet: 0.2, taste_salty: 0.4, taste_bitter: 0.1, texture_hard: 0.3, texture_chewy: 0.7, appeal: 0.8, freshness: 0.9 }
  },
  PLANT: {
    physical: { hardness: 0.1, sharpness: 0.0, weight: 0.1, flexibility: 0.9, density: 0.3, durability: 0.2, porosity: 0.7, friction: 0.2 },
    nutrition: { calories: 0.4, protein: 0.1, fat: 0.1, carb: 0.5, water: 0.8, fiber: 0.3, vitamins: 0.9, minerals: 0.6, sugar: 0.3, sodium: 0.1, calcium: 0.2, omega3: 0.1 },
    chemical: { flammability: 0.5, toxicity: 0.1, reactivity: 0.6, acidity: 0.5, waterResistance: 0.2, decomposition: 0.8, antinutrient: 0.4, medicinal: 0.9 },
    sensory: { smell: 1.0, taste_sweet: 0.4, taste_salty: 0.1, taste_bitter: 0.3, texture_hard: 0.2, texture_chewy: 0.3, appeal: 0.9, freshness: 0.9 }
  },
  BONE: {
    physical: { hardness: 0.6, sharpness: 0.4, weight: 0.4, flexibility: 0.2, density: 0.7, durability: 0.8, porosity: 0.3, friction: 0.4 },
    nutrition: { calories: 0.1, protein: 0.2, fat: 0.2, carb: 0.0, water: 0.2, fiber: 0.0, vitamins: 0.1, minerals: 0.8, sugar: 0.0, sodium: 0.1, calcium: 0.9, omega3: 0.1 },
    chemical: { flammability: 0.2, toxicity: 0.0, reactivity: 0.1, acidity: 0.55, waterResistance: 0.7, decomposition: 0.1, antinutrient: 0.0, medicinal: 0.1 },
    sensory: { smell: 0.2, taste_sweet: 0.0, taste_salty: 0.2, taste_bitter: 0.1, texture_hard: 0.7, texture_chewy: 0.1, appeal: 0.9, freshness: 0.8 }
  }
};
