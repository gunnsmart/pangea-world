// 🔬 Emergent Crafting System - TypeScript Implementation
// Property-based crafting where agents learn combinations through Neural Network

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

import type { Material, MaterialProperties } from './types';

import { rng } from './SeededRNG';

interface CraftingAction {
  type: 'combine' | 'hit' | 'grind' | 'heat' | 'cool' | 'wet' | 'dry' | 'twist' | 'cut' | 'bind' | 'press' | 'ferment';
  description: string;
  icon: string;
}

interface CraftingContext {
  temperature: number;
  humidity: number;
  timeOfDay: number;
  agentStrength: number;
  toolQuality: number;
  experience: number;
  knowledgeVector: number[];
}

interface CraftingOutput {
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

interface CraftingExperience {
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

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

class MaterialDatabase {
  private materials = new Map<string, Material>();
  
  constructor() {
    this.initializeMaterials();
  }
  
  private initializeMaterials() {
    // Christmas Island materials
    this.add({
      id: 'stone',
      name: 'หิน',
      properties: {
        physical: { hardness: 0.9, sharpness: 0.3, weight: 0.8, flexibility: 0.0, density: 0.9, durability: 0.95, porosity: 0.1, friction: 0.7 },
        nutrition: { calories: 0.0, protein: 0.0, fat: 0.0, carb: 0.0, water: 0.0, fiber: 0.0, vitamins: 0.0, minerals: 0.9, sugar: 0.0, sodium: 0.1, calcium: 0.4, omega3: 0.0 },
        chemical: { flammability: 0.0, toxicity: 0.0, reactivity: 0.1, acidity: 0.5, waterResistance: 1.0, decomposition: 0.0, antinutrient: 0.0, medicinal: 0.0 },
        sensory: { smell: 0.0, taste_sweet: 0.0, taste_salty: 0.1, taste_bitter: 0.0, texture_hard: 0.9, texture_chewy: 0.0, appeal: 0.3, freshness: 1.0 }
      },
      category: 'mineral',
      state: 'solid',
      origin: 'natural',
      quantity: 1
    });
    
    this.add({
      id: 'wood',
      name: 'ไม้',
      properties: {
        physical: { hardness: 0.4, sharpness: 0.1, weight: 0.3, flexibility: 0.6, density: 0.5, durability: 0.6, porosity: 0.4, friction: 0.6 },
        nutrition: { calories: 0.05, protein: 0.0, fat: 0.0, carb: 0.1, water: 0.1, fiber: 0.8, vitamins: 0.05, minerals: 0.1, sugar: 0.0, sodium: 0.0, calcium: 0.2, omega3: 0.0 },
        chemical: { flammability: 0.7, toxicity: 0.0, reactivity: 0.2, acidity: 0.45, waterResistance: 0.3, decomposition: 0.2, antinutrient: 0.1, medicinal: 0.1 },
        sensory: { smell: 0.3, taste_sweet: 0.1, taste_salty: 0.0, taste_bitter: 0.4, texture_hard: 0.6, texture_chewy: 0.2, appeal: 0.4, freshness: 0.5 }
      },
      category: 'wood',
      state: 'solid',
      origin: 'natural',
      quantity: 1
    });

    this.add({
      id: 'food',
      name: 'อาหาร',
      properties: {
        physical: { hardness: 0.2, sharpness: 0.0, weight: 0.2, flexibility: 0.8, density: 0.4, durability: 0.1, porosity: 0.6, friction: 0.3 },
        nutrition: { calories: 0.6, protein: 0.9, fat: 0.4, carb: 0.0, water: 0.7, fiber: 0.0, vitamins: 0.4, minerals: 0.5, sugar: 0.0, sodium: 0.3, calcium: 0.1, omega3: 0.2 },
        chemical: { flammability: 0.3, toxicity: 0.3, reactivity: 0.5, acidity: 0.6, waterResistance: 0.1, decomposition: 0.9, antinutrient: 0.1, medicinal: 0.1 },
        sensory: { smell: 0.8, taste_sweet: 0.2, taste_salty: 0.4, taste_bitter: 0.1, texture_hard: 0.3, texture_chewy: 0.7, appeal: 0.8, freshness: 0.9 }
      },
      category: 'organic',
      state: 'solid',
      origin: 'natural',
      quantity: 1
    });

    this.add({
      id: 'herbs',
      name: 'สมุนไพร',
      properties: {
        physical: { hardness: 0.1, sharpness: 0.0, weight: 0.1, flexibility: 0.9, density: 0.3, durability: 0.2, porosity: 0.7, friction: 0.2 },
        nutrition: { calories: 0.4, protein: 0.1, fat: 0.1, carb: 0.5, water: 0.8, fiber: 0.3, vitamins: 0.9, minerals: 0.6, sugar: 0.3, sodium: 0.1, calcium: 0.2, omega3: 0.1 },
        chemical: { flammability: 0.5, toxicity: 0.1, reactivity: 0.6, acidity: 0.5, waterResistance: 0.2, decomposition: 0.8, antinutrient: 0.4, medicinal: 0.9 },
        sensory: { smell: 1.0, taste_sweet: 0.4, taste_salty: 0.1, taste_bitter: 0.3, texture_hard: 0.2, texture_chewy: 0.3, appeal: 0.9, freshness: 0.9 }
      },
      category: 'plant',
      state: 'fiber',
      origin: 'natural',
      quantity: 1
    });
    
    this.add({
      id: 'animal_sinew',
      name: 'เอ็นสัตว์',
      properties: {
        physical: { hardness: 0.2, sharpness: 0.0, weight: 0.1, flexibility: 0.95, density: 0.3, durability: 0.7, porosity: 0.2, friction: 0.3 },
        nutrition: { calories: 0.4, protein: 0.4, fat: 0.2, carb: 0.0, water: 0.4, fiber: 0.0, vitamins: 0.2, minerals: 0.3, sugar: 0.0, sodium: 0.2, calcium: 0.1, omega3: 0.1 },
        chemical: { flammability: 0.4, toxicity: 0.0, reactivity: 0.3, acidity: 0.55, waterResistance: 0.4, decomposition: 0.7, antinutrient: 0.0, medicinal: 0.0 },
        sensory: { smell: 0.6, taste_sweet: 0.3, taste_salty: 0.2, taste_bitter: 0.1, texture_hard: 0.6, texture_chewy: 0.8, appeal: 0.5, freshness: 0.6 }
      },
      category: 'animal',
      state: 'fiber',
      origin: 'natural',
      quantity: 1
    });
    
    this.add({
      id: 'allium_sativum',
      name: 'เมล็ดกระเทียม',
      properties: {
        physical: { hardness: 0.1, sharpness: 0.0, weight: 0.05, flexibility: 0.2, density: 0.3, durability: 0.2, porosity: 0.1, friction: 0.3 },
        nutrition: { calories: 0.1, protein: 0.05, fat: 0.0, carb: 0.2, water: 0.1, fiber: 0.1, vitamins: 0.2, minerals: 0.1, sugar: 0.0, sodium: 0.0, calcium: 0.01, omega3: 0.0 },
        chemical: { flammability: 0.1, toxicity: 0.0, reactivity: 0.2, acidity: 0.5, waterResistance: 0.1, decomposition: 0.4, antinutrient: 0.0, medicinal: 0.5 },
        sensory: { smell: 0.8, taste_sweet: 0.2, taste_salty: 0.0, taste_bitter: 0.6, texture_hard: 0.2, texture_chewy: 0.1, appeal: 0.5, freshness: 1.0 }
      },
      category: 'organic',
      state: 'solid',
      origin: 'natural',
      quantity: 1
    });

    this.add({
      id: 'oryza_sativa',
      name: 'เมล็ดข้าว',
      properties: {
        physical: { hardness: 0.2, sharpness: 0.0, weight: 0.02, flexibility: 0.1, density: 0.4, durability: 0.3, porosity: 0.1, friction: 0.3 },
        nutrition: { calories: 0.4, protein: 0.1, fat: 0.01, carb: 0.8, water: 0.05, fiber: 0.1, vitamins: 0.1, minerals: 0.1, sugar: 0.0, sodium: 0.0, calcium: 0.0, omega3: 0.0 },
        chemical: { flammability: 0.2, toxicity: 0.0, reactivity: 0.1, acidity: 0.5, waterResistance: 0.1, decomposition: 0.2, antinutrient: 0.0, medicinal: 0.0 },
        sensory: { smell: 0.2, taste_sweet: 0.2, taste_salty: 0.0, taste_bitter: 0.1, texture_hard: 0.3, texture_chewy: 0.1, appeal: 0.7, freshness: 1.0 }
      },
      category: 'organic',
      state: 'solid',
      origin: 'natural',
      quantity: 1
    });
    
    // Add more materials...
  }
  
  add(material: Material) {
    this.materials.set(material.id, material);
  }
  
  get(id: string): Material | undefined {
    return this.materials.get(id);
  }
  
  getAll(): Material[] {
    return Array.from(this.materials.values());
  }
}

// ============================================================================
// NEURAL NETWORK (Simplified)
// ============================================================================

class CraftingNeuralNetwork {
  private weights: {
    w1: number[][];
    b1: number[];
    w2: number[][];
    b2: number[];
    w3: number[][];
    b3: number[];
    w4: number[][];
    b4: number[];
  };
  
  private architecture = {
    input: 135, // (36 * 3) + 12 + 15
    hidden1: 256,
    hidden2: 128,
    hidden3: 64,
    output: 65 // 1 + 36 + 10 + lots...
  };

  private activations: {
    input: number[];
    h1: number[];
    h2: number[];
    h3: number[];
    output: number[];
  } | null = null;
  
  constructor() {
    this.initializeWeights();
  }
  
  private initializeWeights() {
    // Xavier initialization
    this.weights = {
      w1: this.randomMatrix(this.architecture.input, this.architecture.hidden1),
      b1: this.zeros(this.architecture.hidden1),
      w2: this.randomMatrix(this.architecture.hidden1, this.architecture.hidden2),
      b2: this.zeros(this.architecture.hidden2),
      w3: this.randomMatrix(this.architecture.hidden2, this.architecture.hidden3),
      b3: this.zeros(this.architecture.hidden3),
      w4: this.randomMatrix(this.architecture.hidden3, this.architecture.output),
      b4: this.zeros(this.architecture.output)
    };
  }
  
  forward(input: number[]): CraftingOutput {
    // Layer 1
    let h1 = this.matmul(input, this.weights.w1);
    h1 = this.add(h1, this.weights.b1);
    h1 = this.relu(h1);
    
    // Layer 2
    let h2 = this.matmul(h1, this.weights.w2);
    h2 = this.add(h2, this.weights.b2);
    h2 = this.relu(h2);
    
    // Layer 3
    let h3 = this.matmul(h2, this.weights.w3);
    h3 = this.add(h3, this.weights.b3);
    h3 = this.relu(h3);
    
    // Output
    let output = this.matmul(h3, this.weights.w4);
    output = this.add(output, this.weights.b4);
    
    // Store for backprop
    this.activations = { input, h1, h2, h3, output };
    
    return this.decodeOutput(output);
  }

  // Simplified SGD backprop
  backward(target: number[], learningRate: number = 0.01) {
    if (!this.activations) return;

    // Compute error at output
    const outputDelta = this.activations.output.map((v, i) => (this.sigmoid(v) - target[i]) * this.sigmoidDeriv(v));

    // Gradient for Layer 4 (Output)
    const dw4 = this.outerProduct(this.activations.h3, outputDelta);
    const db4 = outputDelta;

    // Propgate back to Layer 3
    const h3Delta = this.matmulTranspose(outputDelta, this.weights.w4).map((v, i) => v * (this.activations.h3![i] > 0 ? 1 : 0));
    const dw3 = this.outerProduct(this.activations.h2, h3Delta);
    const db3 = h3Delta;

    // Propgate back to Layer 2
    const h2Delta = this.matmulTranspose(h3Delta, this.weights.w3).map((v, i) => v * (this.activations.h2![i] > 0 ? 1 : 0));
    const dw2 = this.outerProduct(this.activations.h1, h2Delta);
    const db2 = h2Delta;

    // Propgate back to Layer 1
    const h1Delta = this.matmulTranspose(h2Delta, this.weights.w2).map((v, i) => v * (this.activations.input![i] > 0 ? 1 : 0));
    const dw1 = this.outerProduct(this.activations.input, h1Delta);
    const db1 = h1Delta;

    // Update weights
    this.updateWeights(this.weights.w4, dw4, learningRate);
    this.updateWeights(this.weights.w3, dw3, learningRate);
    this.updateWeights(this.weights.w2, dw2, learningRate);
    this.updateWeights(this.weights.w1, dw1, learningRate);
    
    this.updateBias(this.weights.b4, db4, learningRate);
    this.updateBias(this.weights.b3, db3, learningRate);
    this.updateBias(this.weights.b2, db2, learningRate);
    this.updateBias(this.weights.b1, db1, learningRate);
  }

  private sigmoidDeriv(x: number): number {
    const s = this.sigmoid(x);
    return s * (1 - s);
  }

  private outerProduct(a: number[], b: number[]): number[][] {
    return a.map(va => b.map(vb => va * vb));
  }

  private matmulTranspose(v: number[], m: number[][]): number[] {
    const result = new Array(m.length).fill(0);
    for (let i = 0; i < m.length; i++) {
      for (let j = 0; j < v.length; j++) {
        result[i] += v[j] * m[i][j];
      }
    }
    return result;
  }

  private updateWeights(m: number[][], grades: number[][], lr: number) {
    for (let i = 0; i < m.length; i++) {
      for (let j = 0; j < m[i].length; j++) {
        m[i][j] -= lr * grades[i][j];
      }
    }
  }

  private updateBias(b: number[], grades: number[], lr: number) {
    for (let i = 0; i < b.length; i++) {
      b[i] -= lr * grades[i];
    }
  }
  
  private decodeOutput(output: number[]): CraftingOutput {
    return {
      successProbability: this.sigmoid(output[0]),
      resultProperties: this.decodeProperties(output.slice(1, 37)),
      metadata: {
        durability: this.sigmoid(output[37]),
        qualityScore: this.sigmoid(output[38]),
        timeRequired: this.sigmoid(output[39]) * 60,
        energyCost: this.sigmoid(output[40]) * 100,
        difficulty: this.sigmoid(output[41]),
        dangerLevel: this.sigmoid(output[42]),
        noiseLevel: this.sigmoid(output[43]),
        createsWaste: this.sigmoid(output[44]),
        requiresFire: this.sigmoid(output[45]),
        requiresWater: this.sigmoid(output[46])
      }
    };
  }
  
  private decodeProperties(values: number[]): MaterialProperties {
    return {
      physical: {
        hardness: this.sigmoid(values[0]),
        sharpness: this.sigmoid(values[1]),
        weight: this.sigmoid(values[2]),
        flexibility: this.sigmoid(values[3]),
        density: this.sigmoid(values[4]),
        durability: this.sigmoid(values[5]),
        porosity: this.sigmoid(values[6]),
        friction: this.sigmoid(values[7])
      },
      nutrition: {
        calories: this.sigmoid(values[8]),
        protein: this.sigmoid(values[9]),
        fat: this.sigmoid(values[10]),
        carb: this.sigmoid(values[11]),
        water: this.sigmoid(values[12]),
        fiber: this.sigmoid(values[13]),
        vitamins: this.sigmoid(values[14]),
        minerals: this.sigmoid(values[15]),
        sugar: this.sigmoid(values[16]),
        sodium: this.sigmoid(values[17]),
        calcium: this.sigmoid(values[18]),
        omega3: this.sigmoid(values[19])
      },
      chemical: {
        flammability: this.sigmoid(values[20]),
        toxicity: this.sigmoid(values[21]),
        reactivity: this.sigmoid(values[22]),
        acidity: this.sigmoid(values[23]),
        waterResistance: this.sigmoid(values[24]),
        decomposition: this.sigmoid(values[25]),
        antinutrient: this.sigmoid(values[26]),
        medicinal: this.sigmoid(values[27])
      },
      sensory: {
        smell: this.sigmoid(values[28]),
        taste_sweet: this.sigmoid(values[29]),
        taste_salty: this.sigmoid(values[30]),
        taste_bitter: this.sigmoid(values[31]),
        texture_hard: this.sigmoid(values[32]),
        texture_chewy: this.sigmoid(values[33]),
        appeal: this.sigmoid(values[34]),
        freshness: this.sigmoid(values[35])
      }
    };
  }
  
  // Math utilities
  private relu(x: number[]): number[] {
    return x.map(v => Math.max(0, v));
  }
  
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
  
  private matmul(a: number[], b: number[][]): number[] {
    const result = new Array(b[0].length).fill(0);
    for (let i = 0; i < b[0].length; i++) {
      for (let j = 0; j < a.length; j++) {
        result[i] += a[j] * b[j][i];
      }
    }
    return result;
  }
  
  private add(a: number[], b: number[]): number[] {
    return a.map((v, i) => v + b[i]);
  }
  
  private randomMatrix(rows: number, cols: number): number[][] {
    const matrix: number[][] = [];
    const scale = Math.sqrt(2.0 / (rows + cols));
    // Local RNG for reproducible layer init
    const localRng = rng; 
    
    for (let i = 0; i < rows; i++) {
      matrix[i] = [];
      for (let j = 0; j < cols; j++) {
        matrix[i][j] = (rng.next() * 2 - 1) * scale;
      }
    }
    return matrix;
  }
  
  private zeros(size: number): number[] {
    return new Array(size).fill(0);
  }
}

// ============================================================================
// RECIPE SYSTEM
// ============================================================================

export interface Recipe {
  id: string;
  name: string;
  ingredients: { id?: string; category?: Material['category']; quantity: number }[];
  action: CraftingAction['type'];
  outputId: string;
  discoveryChance: number;
}

class RecipeManager {
  private recipes: Recipe[] = [];
  
  constructor() {
    this.initializeRecipes();
  }
  
  private initializeRecipes() {
    this.recipes.push({
      id: 'stone_axe_head',
      name: 'หัวขวานหิน',
      ingredients: [{ id: 'stone', quantity: 2 }],
      action: 'hit',
      outputId: 'stone_axe_head',
      discoveryChance: 0.2
    });
    
    this.recipes.push({
      id: 'wooden_shaft',
      name: 'ด้ามไม้',
      ingredients: [{ id: 'wood', quantity: 1 }],
      action: 'cut',
      outputId: 'wooden_shaft',
      discoveryChance: 0.4
    });

    this.recipes.push({
      id: 'stone_axe',
      name: 'ขวานหิน',
      ingredients: [
        { id: 'stone_axe_head', quantity: 1 },
        { id: 'wooden_shaft', quantity: 1 },
        { id: 'animal_sinew', quantity: 1 }
      ],
      action: 'bind',
      outputId: 'stone_axe',
      discoveryChance: 0.1
    });

    this.recipes.push({
      id: 'wooden_spear',
      name: 'หอกไม้',
      ingredients: [
        { id: 'wood', quantity: 1 },
        { id: 'animal_sinew', quantity: 1 }
      ],
      action: 'cut',
      outputId: 'wooden_spear',
      discoveryChance: 0.3
    });

    this.recipes.push({
      id: 'basket',
      name: 'ตะกร้า',
      ingredients: [{ id: 'herbs', quantity: 5 }],
      action: 'twist',
      outputId: 'basket',
      discoveryChance: 0.5
    });
  }

  findMatchingRecipe(materials: Material[], action: CraftingAction['type']): Recipe | null {
    return this.recipes.find(r => {
      if (r.action !== action) return false;
      if (r.ingredients.length !== materials.length) return false;

      // Simple matching by ID or category
      return r.ingredients.every(ing => {
        return materials.some(m => (ing.id === m.id || ing.category === m.category) && m.quantity >= ing.quantity);
      });
    }) || null;
  }

  getOutput(recipe: Recipe): string {
    return recipe.outputId;
  }
}

const recipeManager = new RecipeManager();

// ============================================================================
// CRAFTING SYSTEM
// ============================================================================

class CraftingSystem {
  private nn: CraftingNeuralNetwork;
  private materialDB: MaterialDatabase;
  private recipeManager: RecipeManager;
  private experienceMemory: CraftingExperience[] = [];
  
  constructor() {
    this.nn = new CraftingNeuralNetwork();
    this.materialDB = new MaterialDatabase();
    this.recipeManager = recipeManager;
    this.initializeMaterialDB();
  }

  private initializeMaterialDB() {
    this.materialDB.add({
      id: 'stone_axe_head',
      name: 'หัวขวานหิน',
      properties: {
        physical: { hardness: 0.9, sharpness: 0.8, weight: 0.6, flexibility: 0.0, density: 0.9, durability: 0.8, porosity: 0.1, friction: 0.5 },
        nutrition: { calories: 0, protein: 0, fat: 0, carb: 0, water: 0, fiber: 0, vitamins: 0, minerals: 0, sugar: 0, sodium: 0, calcium: 0, omega3: 0 },
        chemical: { flammability: 0, toxicity: 0, reactivity: 0, acidity: 0.5, waterResistance: 1, decomposition: 0, antinutrient: 0, medicinal: 0 },
        sensory: { smell: 0, taste_sweet: 0, taste_salty: 0, taste_bitter: 0, texture_hard: 0.9, texture_chewy: 0, appeal: 0.4, freshness: 1 }
      },
      category: 'mineral',
      state: 'solid',
      origin: 'crafted',
      quantity: 1
    });

    this.materialDB.add({
      id: 'wooden_shaft',
      name: 'ด้ามไม้',
      properties: {
        physical: { hardness: 0.5, sharpness: 0.0, weight: 0.3, flexibility: 0.4, density: 0.6, durability: 0.7, porosity: 0.3, friction: 0.6 },
        nutrition: { calories: 0, protein: 0, fat: 0, carb: 0, water: 0, fiber: 0, vitamins: 0, minerals: 0, sugar: 0, sodium: 0, calcium: 0, omega3: 0 },
        chemical: { flammability: 0.8, toxicity: 0, reactivity: 0, acidity: 0.5, waterResistance: 0.4, decomposition: 0.1, antinutrient: 0, medicinal: 0 },
        sensory: { smell: 0.3, taste_sweet: 0, taste_salty: 0, taste_bitter: 0, texture_hard: 0.7, texture_chewy: 0, appeal: 0.5, freshness: 1 }
      },
      category: 'wood',
      state: 'solid',
      origin: 'crafted',
      quantity: 1
    });

    this.materialDB.add({
      id: 'stone_axe',
      name: 'ขวานหิน',
      properties: {
        physical: { hardness: 0.8, sharpness: 0.9, weight: 0.8, flexibility: 0.1, density: 0.8, durability: 0.9, porosity: 0.2, friction: 0.7 },
        nutrition: { calories: 0, protein: 0, fat: 0, carb: 0, water: 0, fiber: 0, vitamins: 0, minerals: 0, sugar: 0, sodium: 0, calcium: 0, omega3: 0 },
        chemical: { flammability: 0.4, toxicity: 0, reactivity: 0, acidity: 0.5, waterResistance: 0.8, decomposition: 0.05, antinutrient: 0, medicinal: 0 },
        sensory: { smell: 0.1, taste_sweet: 0, taste_salty: 0, taste_bitter: 0, texture_hard: 0.8, texture_chewy: 0, appeal: 0.7, freshness: 1 }
      },
      category: 'crafted',
      state: 'solid',
      origin: 'crafted',
      quantity: 1
    });

    this.materialDB.add({
      id: 'wooden_spear',
      name: 'หอกไม้',
      properties: {
        physical: { hardness: 0.5, sharpness: 0.95, weight: 0.4, flexibility: 0.3, density: 0.6, durability: 0.7, porosity: 0.3, friction: 0.5 },
        nutrition: { calories: 0, protein: 0, fat: 0, carb: 0, water: 0, fiber: 0, vitamins: 0, minerals: 0, sugar: 0, sodium: 0, calcium: 0, omega3: 0 },
        chemical: { flammability: 0.6, toxicity: 0, reactivity: 0, acidity: 0.5, waterResistance: 0.5, decomposition: 0.1, antinutrient: 0, medicinal: 0 },
        sensory: { smell: 0.2, taste_sweet: 0, taste_salty: 0, taste_bitter: 0, texture_hard: 0.6, texture_chewy: 0, appeal: 0.6, freshness: 1 }
      },
      category: 'crafted',
      state: 'solid',
      origin: 'crafted',
      quantity: 1
    });

    this.materialDB.add({
      id: 'basket',
      name: 'ตะกร้า',
      properties: {
        physical: { hardness: 0.2, sharpness: 0.0, weight: 0.1, flexibility: 0.8, density: 0.2, durability: 0.6, porosity: 0.9, friction: 0.4 },
        nutrition: { calories: 0, protein: 0, fat: 0, carb: 0, water: 0, fiber: 0, vitamins: 0, minerals: 0, sugar: 0, sodium: 0, calcium: 0, omega3: 0 },
        chemical: { flammability: 0.9, toxicity: 0, reactivity: 0, acidity: 0.5, waterResistance: 0.2, decomposition: 0.5, antinutrient: 0, medicinal: 0 },
        sensory: { smell: 0.5, taste_sweet: 0, taste_salty: 0, taste_bitter: 0, texture_hard: 0.2, texture_chewy: 0.4, appeal: 0.8, freshness: 1 }
      },
      category: 'crafted',
      state: 'fiber',
      origin: 'crafted',
      quantity: 1
    });
  }
  
  // Encode materials + action + context into NN input
  private encodeInput(
    materialA: Material,
    materialB: Material | null,
    materialC: Material | null,
    action: CraftingAction,
    context: CraftingContext
  ): number[] {
    const input: number[] = [];
    
    // Material A (36 dims)
    input.push(...this.encodeMaterialProperties(materialA.properties));
    
    // Material B (36 dims)
    if (materialB) {
      input.push(...this.encodeMaterialProperties(materialB.properties));
    } else {
      input.push(...new Array(36).fill(0));
    }
    
    // Material C (36 dims)
    if (materialC) {
      input.push(...this.encodeMaterialProperties(materialC.properties));
    } else {
      input.push(...new Array(36).fill(0));
    }
    
    // Action (12 dims - one-hot)
    const actions: CraftingAction['type'][] = [
      'combine', 'hit', 'grind', 'heat', 'cool', 'wet', 
      'dry', 'twist', 'cut', 'bind', 'press', 'ferment'
    ];
    const actionEncoding = new Array(12).fill(0);
    const actionIndex = actions.indexOf(action.type);
    if (actionIndex >= 0) actionEncoding[actionIndex] = 1;
    input.push(...actionEncoding);
    
    // Context (15 dims)
    input.push(
      context.temperature,
      context.humidity,
      context.timeOfDay,
      context.agentStrength,
      context.toolQuality,
      context.experience,
      ...context.knowledgeVector
    );
    
    return input;
  }
  
  private encodeMaterialProperties(props: MaterialProperties): number[] {
    return [
      props.physical.hardness,
      props.physical.sharpness,
      props.physical.weight,
      props.physical.flexibility,
      props.physical.density,
      props.physical.durability,
      props.physical.porosity,
      props.physical.friction,
      props.nutrition.calories,
      props.nutrition.protein,
      props.nutrition.fat,
      props.nutrition.carb,
      props.nutrition.water,
      props.nutrition.fiber,
      props.nutrition.vitamins,
      props.nutrition.minerals,
      props.nutrition.sugar,
      props.nutrition.sodium,
      props.nutrition.calcium,
      props.nutrition.omega3,
      props.chemical.flammability,
      props.chemical.toxicity,
      props.chemical.reactivity,
      props.chemical.acidity,
      props.chemical.waterResistance,
      props.chemical.decomposition,
      props.chemical.antinutrient,
      props.chemical.medicinal,
      props.sensory.smell,
      props.sensory.taste_sweet,
      props.sensory.taste_salty,
      props.sensory.taste_bitter,
      props.sensory.texture_hard,
      props.sensory.texture_chewy,
      props.sensory.appeal,
      props.sensory.freshness
    ];
  }
  
  // Predict crafting outcome
  predict(
    materialA: Material,
    materialB: Material | null,
    materialC: Material | null,
    action: CraftingAction,
    context: CraftingContext
  ): CraftingOutput {
    const input = this.encodeInput(materialA, materialB, materialC, action, context);
    return this.nn.forward(input);
  }
  
  // Attempt crafting
  async attemptCraft(
    agent: Agent,
    materialA: Material,
    materialB: Material | null,
    action: CraftingAction
  ): Promise<{ success: boolean; result: Material; recipeDiscovered?: string }> {
    // Get context
    const context = this.getContext(agent);
    
    // Check for explicit recipe
    const materials = materialB ? [materialA, materialB] : [materialA];
    const recipe = this.recipeManager.findMatchingRecipe(materials, action.type);
    
    // Predict via NN
    const prediction = this.predict(materialA, materialB, null, action, context);
    
    // Success probability: Use recipe bonus if applicable
    let successProb = prediction.successProbability;
    if (recipe) {
      successProb = Math.max(successProb, 0.7 + (agent.skills.crafting / 100) * 0.3);
    }
    
    // Roll dice (deterministic threshold)
    const success = 0.5 < successProb;
    
    let result: Material;
    
    if (success) {
      if (recipe) {
        // Known recipe output
        const outputTemplate = this.materialDB.get(recipe.outputId);
        if (outputTemplate) {
          result = {
            ...outputTemplate,
            id: `crafted_${Date.now()}`,
            quantity: 1
          };
        } else {
          result = this.createFromPrediction(prediction, materialA, materialB, action);
        }
      } else {
        // Emergent creation
        result = this.createFromPrediction(prediction, materialA, materialB, action);
      }
      
      // Add to inventory
      agent.inventory.add(result);
      console.log(`✅ ${agent.name} สร้าง ${result.name} สำเร็จ!`);
    } else {
      // Failed - create waste
      result = this.createWaste();
      console.log(`❌ ${agent.name} ล้มเหลว...`);
    }
    
    // Record experience and learn
    this.recordExperience({
      input: { materialA, materialB, materialC: null, action, context },
      output: prediction,
      actualResult: result,
      success,
      timestamp: Date.now()
    });
    
    await this.learn();
    
    return { success, result, recipeDiscovered: success && recipe ? recipe.id : undefined };
  }

  private createFromPrediction(prediction: CraftingOutput, matA: Material, matB: Material | null, action: CraftingAction): Material {
    return {
      id: `crafted_${Date.now()}`,
      name: this.generateName(matA, matB, action),
      properties: prediction.resultProperties,
      category: this.inferCategory(prediction.resultProperties),
      state: this.inferState(prediction.resultProperties),
      origin: 'crafted',
      quantity: 1
    };
  }
  
  private getContext(agent: Agent): CraftingContext {
    return {
      temperature: 0.5,  // TODO: Get from environment
      humidity: 0.5,
      timeOfDay: 0.5,
      agentStrength: agent.stats.strength / 100,
      toolQuality: 0.5,  // TODO: Check tools
      experience: agent.skills.crafting / 100,
      knowledgeVector: new Array(9).fill(0.5)  // TODO: Get from knowledge
    };
  }
  
  private generateName(
    materialA: Material,
    materialB: Material | null,
    action: CraftingAction
  ): string {
    if (materialB) {
      return `${materialA.name}+${materialB.name}`;
    }
    return `${action.type}_${materialA.name}`;
  }
  
  private inferCategory(props: MaterialProperties): Material['category'] {
    if (props.nutrition.calories > 0.5) return 'organic';
    if (props.physical.hardness > 0.8) return 'mineral';
    if (props.chemical.flammability > 0.6) return 'wood';
    return 'organic';
  }
  
  private inferState(props: MaterialProperties): Material['state'] {
    if (props.physical.flexibility > 0.8) return 'fiber';
    if (props.physical.density < 0.3) return 'powder';
    return 'solid';
  }
  
  private createWaste(): Material {
    return {
      id: 'waste',
      name: 'เศษวัสดุ',
      properties: this.getDefaultProperties(),
      category: 'organic',
      state: 'solid',
      origin: 'crafted',
      quantity: 1
    };
  }
  
  private getDefaultProperties(): MaterialProperties {
    return {
      physical: {
        hardness: 0.1,
        sharpness: 0.0,
        weight: 0.1,
        flexibility: 0.1,
        density: 0.1,
        durability: 0.1,
        porosity: 0.5,
        friction: 0.3
      },
    nutrition: { calories: 0.1, protein: 0.0, fat: 0.0, carb: 0.0, water: 0.0, fiber: 0.0, vitamins: 0.0, minerals: 0.0, sugar: 0.0, sodium: 0.0, calcium: 0.0, omega3: 0.0 },
    chemical: {
      flammability: 0.5,
      toxicity: 0.0,
      reactivity: 0.1,
      acidity: 0.5,
      waterResistance: 0.3,
      decomposition: 0.5,
      antinutrient: 0.0,
      medicinal: 0.0
    },
    sensory: {
      smell: 0.2,
      taste_sweet: 0.0,
      taste_salty: 0.0,
      taste_bitter: 0.0,
      texture_hard: 0.3,
      texture_chewy: 0.1,
      appeal: 0.1,
      freshness: 0.5
    }
    };
  }
  
  private recordExperience(exp: CraftingExperience) {
    this.experienceMemory.push(exp);
    
    // Keep last 1000 experiences
    if (this.experienceMemory.length > 1000) {
      this.experienceMemory.shift();
    }
  }
  
  private async learn() {
    if (this.experienceMemory.length < 5) return;

    // Mini-batch learning: Pick 5 random recent experiences
    const recentBatch = this.experienceMemory.slice(-20);
    // Deterministic shuffle
    const shuffled = recentBatch.sort((a, b) => (a.timestamp % 10) - (b.timestamp % 10));
    const batch = shuffled.slice(0, 5);

    for (const exp of batch) {
      // Re-encode input for this experience
      const input = this.encodeInput(
        exp.input.materialA,
        exp.input.materialB,
        exp.input.materialC,
        exp.input.action,
        exp.input.context
      );

      // Current prediction (re-run to get activations)
      this.nn.forward(input);

      // Define target vector based on actual result
      const target = this.encodeOutputTarget(exp);

      // Backpropagate
      this.nn.backward(target, 0.01);
    }

    const recentExperiences = this.experienceMemory.slice(-10);
    const successRate = recentExperiences.filter(e => e.success).length / recentExperiences.length;
    console.log(`📊 Success rate (last 10): ${(successRate * 100).toFixed(1)}% | Learning from ${this.experienceMemory.length} exp`);
  }

  private encodeOutputTarget(exp: CraftingExperience): number[] {
    const target = new Array(65).fill(0);
    
    // index 0: success (1 or 0)
    target[0] = exp.success ? 1 : 0;
    
    // index 1-36: actual result properties
    const props = exp.actualResult.properties;
    const propValues = this.encodeMaterialProperties(props);
    for (let i = 0; i < 36; i++) {
      target[i + 1] = propValues[i];
    }
    
    // index 37-46: metadata
    target[37] = exp.output.metadata.durability;
    target[38] = exp.output.metadata.qualityScore;
    target[39] = exp.output.metadata.timeRequired / 60;
    target[40] = exp.output.metadata.energyCost / 100;
    target[41] = exp.output.metadata.difficulty;
    target[42] = exp.output.metadata.dangerLevel;
    target[43] = exp.output.metadata.noiseLevel;
    target[44] = exp.output.metadata.createsWaste;
    target[45] = exp.output.metadata.requiresFire;
    target[46] = exp.output.metadata.requiresWater;
    
    return target;
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

// Mock Agent
interface Agent {
  name: string;
  inventory: {
    items: Material[];
    add: (item: Material) => void;
  };
  stats: {
    strength: number;
  };
  skills: {
    crafting: number;
  };
}

const adam: Agent = {
  name: 'Adam',
  inventory: {
    items: [],
    add: (item) => console.log(`Added ${item.name} to inventory`)
  },
  stats: { strength: 80 },
  skills: { crafting: 50 }
};

// Initialize system
const craftingSystem = new CraftingSystem();
const materialDB = new MaterialDatabase();

export {
  craftingSystem,
  materialDB,
  CraftingSystem,
  MaterialDatabase,
  CraftingNeuralNetwork,
  type Material,
  type MaterialProperties,
  type CraftingAction,
  type CraftingOutput
};