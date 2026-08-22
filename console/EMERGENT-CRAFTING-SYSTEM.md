# 🔬 Emergent Crafting System Design
## Neural Network-Based Material Discovery for Adam & Eve

---

## 🎯 Core Concept: Property-Based Crafting

**แทนที่จะมีสูตร:** `หิน + ไม้ = ขวาน`  
**ใช้แนวคิด:** `Properties(หิน) + Properties(ไม้) + Action(ผูก) → Properties(วัตถุใหม่)`

---

## 📊 Material Property System

### 1. Universal Property Vector (แทนค่าทุกวัตถุ)

```typescript
interface MaterialProperties {
  // Physical Properties (8 dimensions)
  physical: {
    hardness: number;      // 0-1 (น้ำ=0, เพชร=1)
    sharpness: number;     // 0-1 (ทราย=0, มีดหิน=1)
    weight: number;        // 0-1 (ขนนก=0, หิน=1)
    flexibility: number;   // 0-1 (หิน=0, ไม้=0.6, เชือก=1)
    density: number;       // 0-1
    durability: number;    // 0-1 (ใบไม้=0, กระดูก=0.8)
    porosity: number;      // 0-1 (หิน=0, ฟองน้ำ=1)
    friction: number;      // 0-1 (น้ำมัน=0, ทราย=0.8)
  };
  
  // Chemical Properties (6 dimensions)
  chemical: {
    flammability: number;  // 0-1 (หิน=0, ไม้แห้ง=0.9)
    toxicity: number;      // 0-1 (น้ำ=0, พิษงู=1)
    reactivity: number;    // 0-1 (ทอง=0, โลหะทำปฏิกิริยา=0.8)
    acidity: number;       // 0-1 (0=alkaline, 0.5=neutral, 1=acid)
    waterResistance: number; // 0-1
    oilContent: number;    // 0-1
  };
  
  // Biological Properties (5 dimensions)
  biological: {
    edibility: number;     // 0-1 (หิน=0, ผลไม้=1)
    nutritionValue: number; // 0-1
    medicinalValue: number; // 0-1
    growthPotential: number; // 0-1 (เมล็ดพืช=1)
    decompositionRate: number; // 0-1
  };
  
  // Sensory Properties (4 dimensions)
  sensory: {
    smell: number;         // 0-1 (หิน=0, ดอกไม้=0.8)
    taste: number;         // 0-1 (0=bitter, 0.5=bland, 1=sweet)
    texture: number;       // 0-1 (0=rough, 1=smooth)
    color: number;         // 0-1 (encoded color)
  };
  
  // Meta Properties
  category: string;        // 'organic' | 'mineral' | 'metal' | 'wood' | 'plant' | 'animal'
  state: string;           // 'solid' | 'liquid' | 'powder' | 'fiber'
  origin: string;          // 'natural' | 'crafted' | 'processed'
}

// Total: 23 dimensions per material
```

---

## 🧪 Example Material Encodings

```typescript
const MATERIALS: Record<string, MaterialProperties> = {
  stone: {
    physical: {
      hardness: 0.9,
      sharpness: 0.3,    // หินแตกได้แหลม
      weight: 0.8,
      flexibility: 0.0,
      density: 0.9,
      durability: 0.95,
      porosity: 0.1,
      friction: 0.7
    },
    chemical: {
      flammability: 0.0,
      toxicity: 0.0,
      reactivity: 0.1,
      acidity: 0.5,
      waterResistance: 1.0,
      oilContent: 0.0
    },
    biological: {
      edibility: 0.0,
      nutritionValue: 0.0,
      medicinalValue: 0.0,
      growthPotential: 0.0,
      decompositionRate: 0.0
    },
    sensory: {
      smell: 0.0,
      taste: 0.0,
      texture: 0.1,  // rough
      color: 0.3     // gray
    },
    category: 'mineral',
    state: 'solid',
    origin: 'natural'
  },
  
  wood_branch: {
    physical: {
      hardness: 0.4,
      sharpness: 0.1,
      weight: 0.3,
      flexibility: 0.6,   // ดัดได้บ้าง
      density: 0.5,
      durability: 0.6,
      porosity: 0.4,
      friction: 0.6
    },
    chemical: {
      flammability: 0.7,  // ไฟติดง่าย
      toxicity: 0.0,
      reactivity: 0.2,
      acidity: 0.45,
      waterResistance: 0.3,
      oilContent: 0.1
    },
    biological: {
      edibility: 0.1,
      nutritionValue: 0.05,
      medicinalValue: 0.1,
      growthPotential: 0.2,
      decompositionRate: 0.3
    },
    sensory: {
      smell: 0.3,
      taste: 0.2,
      texture: 0.4,
      color: 0.4   // brown
    },
    category: 'wood',
    state: 'solid',
    origin: 'natural'
  },
  
  animal_sinew: {
    physical: {
      hardness: 0.2,
      sharpness: 0.0,
      weight: 0.1,
      flexibility: 0.95,  // ยืดหยุ่นมาก
      density: 0.3,
      durability: 0.7,
      porosity: 0.2,
      friction: 0.3
    },
    chemical: {
      flammability: 0.4,
      toxicity: 0.0,
      reactivity: 0.3,
      acidity: 0.55,
      waterResistance: 0.4,
      oilContent: 0.2
    },
    biological: {
      edibility: 0.3,
      nutritionValue: 0.4,
      medicinalValue: 0.0,
      growthPotential: 0.0,
      decompositionRate: 0.7
    },
    sensory: {
      smell: 0.6,    // เหม็น
      taste: 0.3,
      texture: 0.6,  // เหนียว
      color: 0.5
    },
    category: 'animal',
    state: 'fiber',
    origin: 'natural'
  },
  
  plant_fiber: {
    physical: {
      hardness: 0.15,
      sharpness: 0.0,
      weight: 0.05,
      flexibility: 0.9,
      density: 0.2,
      durability: 0.5,
      porosity: 0.6,
      friction: 0.5
    },
    chemical: {
      flammability: 0.8,
      toxicity: 0.0,
      reactivity: 0.2,
      acidity: 0.5,
      waterResistance: 0.2,
      oilContent: 0.1
    },
    biological: {
      edibility: 0.2,
      nutritionValue: 0.1,
      medicinalValue: 0.3,
      growthPotential: 0.5,
      decompositionRate: 0.6
    },
    sensory: {
      smell: 0.4,
      taste: 0.3,
      texture: 0.7,  // smooth
      color: 0.6     // green-brown
    },
    category: 'plant',
    state: 'fiber',
    origin: 'natural'
  },
  
  sharp_stone: {
    physical: {
      hardness: 0.9,
      sharpness: 0.85,   // แหลมมาก
      weight: 0.6,
      flexibility: 0.0,
      density: 0.9,
      durability: 0.7,   // แตกง่ายกว่าหินปกติ
      porosity: 0.05,
      friction: 0.8
    },
    chemical: {
      flammability: 0.0,
      toxicity: 0.0,
      reactivity: 0.1,
      acidity: 0.5,
      waterResistance: 1.0,
      oilContent: 0.0
    },
    biological: {
      edibility: 0.0,
      nutritionValue: 0.0,
      medicinalValue: 0.0,
      growthPotential: 0.0,
      decompositionRate: 0.0
    },
    sensory: {
      smell: 0.0,
      taste: 0.0,
      texture: 0.0,  // very rough edges
      color: 0.3
    },
    category: 'mineral',
    state: 'solid',
    origin: 'crafted'  // มาจากการทุบหิน
  }
};
```

---

## 🧠 Crafting Neural Network Architecture

### Input Layer (96 neurons)

```typescript
interface CraftingInput {
  // Material A properties (23 dims)
  materialA: MaterialProperties;
  
  // Material B properties (23 dims)
  materialB: MaterialProperties;
  
  // Material C properties (23 dims) - optional, zero if not used
  materialC: MaterialProperties;
  
  // Action encoding (12 dims)
  action: {
    type: number[];        // one-hot [combine, hit, grind, heat, cool, wet, dry, twist, cut, bind, press, ferment]
  };
  
  // Context (15 dims)
  context: {
    temperature: number;   // 0-1 (current environment temp)
    humidity: number;      // 0-1
    timeOfDay: number;     // 0-1 (affects fermentation, drying)
    agentStrength: number; // 0-1 (affects what can be done)
    toolQuality: number;   // 0-1 (if using tool)
    experience: number;    // 0-1 (agent's crafting skill)
    knowledge: number[];   // 9 dims (relevant knowledge confidence)
  };
}

// Total input: 23 + 23 + 23 + 12 + 15 = 96 dimensions
```

### Network Architecture

```typescript
class CraftingNeuralNetwork {
  private architecture = {
    input: 96,       // Material A + B + C + Action + Context
    hidden1: 256,    // Feature extraction
    hidden2: 128,    // Interaction patterns
    hidden3: 64,     // Result synthesis
    output: 50       // Result properties + metadata
  };
  
  forward(input: CraftingInput): CraftingOutput {
    // Encode input
    const encoded = this.encodeInput(input);
    
    // Layer 1: Feature extraction
    let h1 = this.matmul(encoded, this.weights.w1);
    h1 = this.relu(h1);
    h1 = this.dropout(h1, 0.1);
    
    // Layer 2: Interaction patterns
    let h2 = this.matmul(h1, this.weights.w2);
    h2 = this.relu(h2);
    h2 = this.dropout(h2, 0.1);
    
    // Layer 3: Result synthesis
    let h3 = this.matmul(h2, this.weights.w3);
    h3 = this.relu(h3);
    
    // Output layer
    let output = this.matmul(h3, this.weights.w4);
    
    // Split output
    return this.decodeOutput(output);
  }
}
```

### Output Layer (50 neurons)

```typescript
interface CraftingOutput {
  // Success probability (1 dim)
  successProbability: number; // 0-1
  
  // Result properties (23 dims) - same as MaterialProperties
  resultProperties: MaterialProperties;
  
  // Result metadata (10 dims)
  metadata: {
    durability: number;        // How long result lasts
    qualityScore: number;      // 0-1
    timeRequired: number;      // Minutes needed
    energyCost: number;        // Agent energy consumed
    difficulty: number;        // 0-1
    dangerLevel: number;       // 0-1 (risk of injury)
    noiseLevel: number;        // 0-1 (attracts animals?)
    createsWaste: number;      // 0-1
    requiresFire: number;      // 0-1
    requiresWater: number;     // 0-1
  };
  
  // Alternative results (16 dims)
  alternatives: {
    // Sometimes same materials can create different things
    probability1: number;
    probability2: number;
    probability3: number;
    probability4: number;
    // ... encoded alternative outcomes
  };
}

// Total output: 1 + 23 + 10 + 16 = 50 dimensions
```

---

## 🎯 Learning Process

### 1. Experience-Based Learning

```typescript
class CraftingLearningSystem {
  private memory: CraftingExperience[] = [];
  
  async attemptCraft(
    agent: Agent,
    materialA: Material,
    materialB: Material,
    action: CraftingAction
  ): Promise<CraftingResult> {
    // 1. Predict outcome with current NN
    const prediction = this.craftingNN.forward({
      materialA: materialA.properties,
      materialB: materialB.properties,
      materialC: null,
      action: action,
      context: this.getContext(agent)
    });
    
    // 2. Roll dice based on prediction
    const success = Math.random() < prediction.successProbability;
    
    // 3. Determine actual result
    let actualResult: Material;
    if (success) {
      actualResult = this.createMaterial(prediction.resultProperties);
      
      // Add to world
      agent.inventory.add(actualResult);
      
      // UI feedback
      this.showSuccess(agent, actualResult);
    } else {
      actualResult = this.createWaste();
      this.showFailure(agent, materialA, materialB);
    }
    
    // 4. Record experience
    this.recordExperience({
      input: { materialA, materialB, action, context: this.getContext(agent) },
      output: prediction,
      actualResult: actualResult,
      success: success,
      timestamp: Date.now()
    });
    
    // 5. Learn from experience (incremental training)
    await this.learn();
    
    return { success, result: actualResult };
  }
  
  private async learn() {
    // Train on recent experiences
    const recentExperiences = this.memory.slice(-100);
    
    for (const exp of recentExperiences) {
      // Calculate loss
      const predicted = exp.output;
      const actual = this.encodeMaterial(exp.actualResult);
      
      const loss = this.calculateLoss(predicted, actual, exp.success);
      
      // Backpropagate
      this.craftingNN.backpropagate(loss);
    }
  }
}
```

---

### 2. Knowledge-Guided Discovery

```typescript
interface CraftingKnowledge {
  domain: 'crafting';
  observation: string;        // "หินแหลม + ไม้ = ขวาน"
  materials: string[];        // ['sharp_stone', 'wood_branch']
  action: string;             // 'bind'
  confidence: number;         // 0-1
  successRate: number;        // 0-1 (from trials)
  attempts: number;           // How many times tried
}

class KnowledgeGuidedCrafting {
  // Knowledge helps bias NN predictions
  applyKnowledge(
    prediction: CraftingOutput,
    knowledge: CraftingKnowledge[]
  ): CraftingOutput {
    // Find relevant knowledge
    const relevant = knowledge.filter(k => 
      k.materials.includes(materialA.id) && 
      k.materials.includes(materialB.id)
    );
    
    if (relevant.length > 0) {
      // Blend prediction with knowledge
      const knowledgeBonus = relevant.reduce((sum, k) => 
        sum + k.successRate * k.confidence, 0
      ) / relevant.length;
      
      // Increase success probability
      prediction.successProbability = Math.min(
        1.0,
        prediction.successProbability * 0.7 + knowledgeBonus * 0.3
      );
    }
    
    return prediction;
  }
  
  // Agents share crafting discoveries
  shareDiscovery(
    from: Agent,
    to: Agent,
    discovery: CraftingKnowledge
  ) {
    // Add to knowledge base
    to.knowledge.add(discovery);
    
    // Update NN weights slightly (knowledge distillation)
    this.craftingNN.transferKnowledge(discovery);
    
    // Stigmergic board
    stigmergicBoard.addEntry({
      type: 'crafting_discovery',
      from: from.name,
      to: to.name,
      discovery: discovery.observation,
      timestamp: Date.now()
    });
  }
}
```

---

## 🔄 Example Crafting Scenarios

### Scenario 1: Adam Creates Stone Axe (Discovery)

```typescript
// Day 1: Adam tries random combination
const result1 = await craftingSystem.attemptCraft(
  adam,
  materials.stone,           // ไม่แหลม
  materials.wood_branch,
  { type: 'bind' }
);

// NN Prediction:
// successProbability: 0.35 (ไม่แน่ใจ, ไม่เคยเห็น)
// Result: FAILURE - ไม้กับหินไม่ติดกัน

// Adam learns: hardness ต่างกันมาก + no adhesive = fail

// Day 2: Adam tries sharpening stone first
const sharpStone = await craftingSystem.attemptCraft(
  adam,
  materials.stone,
  materials.stone,
  { type: 'hit' }
);

// NN Prediction:
// successProbability: 0.65 (hardness high + hit = sharp)
// Result: SUCCESS → sharp_stone created!

// Day 3: Adam tries sharp stone + wood
const axe = await craftingSystem.attemptCraft(
  adam,
  sharpStone,
  materials.wood_branch,
  { type: 'bind' }
);

// NN Prediction:
// successProbability: 0.42 (still needs binding material)
// Result: FAILURE - falls apart

// Day 4: Adam adds sinew
const axe2 = await craftingSystem.attemptCraft(
  adam,
  sharpStone,
  materials.wood_branch,
  materials.animal_sinew,
  { type: 'bind' }
);

// NN Prediction:
// successProbability: 0.85 (flexibility high + binding)
// Result: SUCCESS → stone_axe created!

// Knowledge extracted:
adam.knowledge.add({
  observation: "หินแหลม + ไม้ + เอ็นสัตว์ = ขวาน",
  materials: ['sharp_stone', 'wood_branch', 'animal_sinew'],
  action: 'bind',
  confidence: 0.9,
  successRate: 1.0,
  attempts: 1
});
```

---

### Scenario 2: Eve Discovers Herbal Medicine

```typescript
// Eve finds unknown plant
const unknownPlant = materials.purple_flower_plant;

// Properties:
// medicinalValue: 0.8 (high!)
// toxicity: 0.3 (moderate)
// edibility: 0.4

// Eve tests: chew raw
const result1 = await craftingSystem.attemptCraft(
  eve,
  unknownPlant,
  null,
  { type: 'eat' }
);

// NN Prediction:
// successProbability: 0.55
// Result: Mild nausea (toxicity triggered)

// Eve learns: needs processing

// Eve tries: grinding + mixing with water
const medicine = await craftingSystem.attemptCraft(
  eve,
  unknownPlant,
  materials.water,
  { type: 'grind_and_mix' }
);

// NN Prediction:
// successProbability: 0.75 (water dilutes toxicity)
// Result: SUCCESS → herbal_medicine created!
// Effect: +20 health when consumed

// Knowledge shared:
eve.shareKnowledge(adam, {
  observation: "ดอกม่วง + น้ำ + บด = ยา",
  materials: ['purple_flower_plant', 'water'],
  action: 'grind_and_mix',
  confidence: 0.85
});
```

---

### Scenario 3: Fire Discovery (Emergent)

```typescript
// Adam accidentally discovers fire
const result = await craftingSystem.attemptCraft(
  adam,
  materials.dry_wood,
  materials.dry_wood,
  { type: 'friction' }  // รูดกัน
);

// NN analyzes:
// flammability: 0.9 + 0.9 = high
// friction: 0.6 + action(friction) → heat
// Result: FIRE created! (emergent property)

// Fire gets its own properties:
const fire = {
  physical: {
    hardness: 0.0,
    temperature: 1.0,  // NEW PROPERTY!
    light: 1.0,        // NEW PROPERTY!
    // ...
  },
  chemical: {
    energy: 0.95,      // NEW PROPERTY!
    // ...
  }
};

// This enables NEW crafting possibilities:
// - Cooking meat (fire + raw_meat)
// - Hardening wood (fire + green_wood)
// - Boiling water (fire + container + water)
```

---

## 📊 Material Database Generator

```typescript
class MaterialDatabaseBuilder {
  // Auto-generate properties from descriptions
  generateFromDescription(description: string): MaterialProperties {
    const properties: Partial<MaterialProperties> = {};
    
    // Parse description
    if (description.includes('hard')) properties.hardness = 0.8;
    if (description.includes('sharp')) properties.sharpness = 0.9;
    if (description.includes('flexible')) properties.flexibility = 0.8;
    if (description.includes('burns easily')) properties.flammability = 0.9;
    if (description.includes('poisonous')) properties.toxicity = 0.9;
    if (description.includes('edible')) properties.edibility = 0.8;
    if (description.includes('medicinal')) properties.medicinalValue = 0.8;
    
    // Fill defaults for missing
    return this.fillDefaults(properties);
  }
  
  // Generate Christmas Island materials
  generateIslandMaterials(): Material[] {
    return [
      // Minerals
      this.create('volcanic_rock', 'Hard black rock from volcano'),
      this.create('limestone', 'White chalky stone'),
      this.create('coral', 'Sharp dead coral from beach'),
      this.create('sand', 'Fine beach sand'),
      this.create('clay', 'Wet moldable clay'),
      
      // Plants
      this.create('palm_frond', 'Large flexible palm leaf'),
      this.create('coconut_husk', 'Fibrous coconut shell'),
      this.create('bamboo', 'Strong hollow bamboo stem'),
      this.create('vine', 'Flexible climbing plant'),
      this.create('seaweed', 'Wet salty seaweed'),
      
      // Animal materials
      this.create('crab_shell', 'Hard red crab carapace'),
      this.create('bird_feather', 'Light waterproof feather'),
      this.create('fish_bone', 'Small sharp fish bone'),
      this.create('lizard_skin', 'Tough scaly skin'),
      
      // Processed
      this.create('fire', 'Hot burning flame'),
      this.create('ash', 'Gray powder from burned wood'),
      this.create('charcoal', 'Black carbon from burned wood'),
      this.create('smoke', 'Gray smoke from fire')
    ];
  }
}
```

---

## 🎮 UI/UX for Crafting

### Crafting Interface

```typescript
function CraftingInterface({ agent }: { agent: Agent }) {
  const [selectedMaterials, setSelectedMaterials] = useState<Material[]>([]);
  const [selectedAction, setSelectedAction] = useState<CraftingAction>(null);
  const [prediction, setPrediction] = useState<CraftingOutput | null>(null);
  
  // Real-time prediction
  useEffect(() => {
    if (selectedMaterials.length >= 2 && selectedAction) {
      const pred = craftingNN.predict({
        materialA: selectedMaterials[0],
        materialB: selectedMaterials[1],
        materialC: selectedMaterials[2],
        action: selectedAction,
        context: getContext(agent)
      });
      
      setPrediction(pred);
    }
  }, [selectedMaterials, selectedAction]);
  
  return (
    <div className="crafting-panel">
      {/* Material Selection */}
      <div className="material-slots">
        <MaterialSlot 
          index={0}
          selected={selectedMaterials[0]}
          onChange={(m) => updateMaterial(0, m)}
        />
        <div className="operator">+</div>
        <MaterialSlot 
          index={1}
          selected={selectedMaterials[1]}
          onChange={(m) => updateMaterial(1, m)}
        />
        <div className="operator">+</div>
        <MaterialSlot 
          index={2}
          selected={selectedMaterials[2]}
          onChange={(m) => updateMaterial(2, m)}
        />
      </div>
      
      {/* Action Selection */}
      <div className="actions">
        {CRAFTING_ACTIONS.map(action => (
          <button
            key={action.id}
            onClick={() => setSelectedAction(action)}
            className={selectedAction?.id === action.id ? 'active' : ''}
          >
            {action.icon} {action.name}
          </button>
        ))}
      </div>
      
      {/* Live Prediction */}
      {prediction && (
        <div className="prediction">
          <div className="success-meter">
            <div 
              className="fill"
              style={{ width: `${prediction.successProbability * 100}%` }}
            />
            <span>{(prediction.successProbability * 100).toFixed(0)}% ความสำเร็จ</span>
          </div>
          
          <div className="result-preview">
            <h4>ผลลัพธ์ที่คาดว่าจะได้:</h4>
            <MaterialCard properties={prediction.resultProperties} />
            
            <div className="metadata">
              <div>⏱️ {prediction.metadata.timeRequired} นาที</div>
              <div>⚡ พลังงาน: {prediction.metadata.energyCost}%</div>
              <div>⚠️ อันตราย: {prediction.metadata.dangerLevel * 100}%</div>
            </div>
          </div>
          
          {/* Knowledge hints */}
          {agent.knowledge.filter(k => k.domain === 'crafting').length > 0 && (
            <div className="knowledge-hints">
              <h5>💡 จากความรู้ที่เคยเรียน:</h5>
              {getRelevantKnowledge(selectedMaterials).map(k => (
                <div key={k.id} className="hint">
                  "{k.observation}" (ความมั่นใจ: {k.confidence * 100}%)
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Craft Button */}
      <button 
        className="btn-craft"
        onClick={() => attemptCraft()}
        disabled={!canCraft()}
      >
        🔨 คราฟท์!
      </button>
    </div>
  );
}
```

---

## 📈 Training Data Generation

### Bootstrap Training

```typescript
class CraftingTrainingDataGenerator {
  // Generate initial training data from known recipes
  generateBootstrapData(): CraftingExperience[] {
    const data: CraftingExperience[] = [];
    
    // Basic combinations
    data.push(...this.generateStoneToolData());
    data.push(...this.generateFireData());
    data.push(...this.generateShelterData());
    data.push(...this.generateFoodData());
    
    // Failures (important!)
    data.push(...this.generateFailureData());
    
    return data;
  }
  
  private generateStoneToolData(): CraftingExperience[] {
    return [
      {
        input: {
          materialA: MATERIALS.stone,
          materialB: MATERIALS.stone,
          action: { type: 'hit' },
          context: DEFAULT_CONTEXT
        },
        output: {
          successProbability: 0.8,
          resultProperties: MATERIALS.sharp_stone,
          // ...
        },
        actualResult: MATERIALS.sharp_stone,
        success: true
      },
      {
        input: {
          materialA: MATERIALS.sharp_stone,
          materialB: MATERIALS.wood_branch,
          materialC: MATERIALS.animal_sinew,
          action: { type: 'bind' },
          context: DEFAULT_CONTEXT
        },
        output: {
          successProbability: 0.85,
          resultProperties: MATERIALS.stone_axe,
          // ...
        },
        actualResult: MATERIALS.stone_axe,
        success: true
      }
    ];
  }
  
  private generateFailureData(): CraftingExperience[] {
    // Important: NN must learn what DOESN'T work
    return [
      {
        input: {
          materialA: MATERIALS.water,
          materialB: MATERIALS.stone,
          action: { type: 'bind' },
          context: DEFAULT_CONTEXT
        },
        output: {
          successProbability: 0.05,
          // ...
        },
        actualResult: MATERIALS.waste,
        success: false
      },
      {
        input: {
          materialA: MATERIALS.feather,
          materialB: MATERIALS.feather,
          action: { type: 'hit' },
          context: DEFAULT_CONTEXT
        },
        output: {
          successProbability: 0.1,
          // ...
        },
        actualResult: MATERIALS.broken_feather,
        success: false
      }
    ];
  }
}
```

---

## 🎯 Summary: Benefits of This System

### ✅ Emergent Discovery
- No hardcoded recipes
- Players discover through experimentation
- NN learns patterns, not specific combinations
- New materials → new possibilities automatically

### ✅ Realistic Learning Curve
- Early attempts fail more often
- Success rate improves with experience
- Knowledge sharing accelerates learning
- Failures teach what doesn't work

### ✅ Infinite Combinations
- 50 materials × 50 materials × 12 actions = 30,000 possibilities
- NN can generalize to unseen combinations
- Property-based = makes sense (hard+sharp+bind = tool)

### ✅ Integration with Knowledge System
- Crafting discoveries → knowledge entries
- Knowledge guides future attempts
- Stigmergic sharing of recipes
- Cultural evolution of technology

### ✅ Behavioral Differentiation
- Adam: better at tools, weapons (from hunting knowledge)
- Eve: better at medicine, textiles (from plant knowledge)
- Each agent's NN weights differ based on experience

---

## 🚀 Implementation Roadmap

### Week 1: Foundation
- [ ] Define MaterialProperties interface
- [ ] Create material database (50+ materials)
- [ ] Build CraftingNN architecture
- [ ] Generate bootstrap training data

### Week 2: Core System
- [ ] Implement attemptCraft() logic
- [ ] Add experience recording
- [ ] Build incremental learning
- [ ] Test basic crafting

### Week 3: Knowledge Integration
- [ ] Connect to knowledge system
- [ ] Implement knowledge-guided crafting
- [ ] Add discovery extraction
- [ ] Test knowledge sharing

### Week 4: UI & Polish
- [ ] Build crafting interface
- [ ] Add live prediction display
- [ ] Implement visual feedback
- [ ] Add sound effects

---

## 💡 Advanced Features (Future)

### Multi-Step Crafting
```typescript
// Complex recipes require sequence
const result = await craftingSystem.attemptSequence([
  { materials: [wood, fire], action: 'heat' },  // → charcoal
  { materials: [charcoal, ore], action: 'heat' }, // → metal
  { materials: [metal, water], action: 'cool' }   // → hardened_metal
]);
```

### Environmental Effects
```typescript
// Rain affects drying
// Temperature affects fermentation
// Humidity affects fire-starting
const context = {
  weather: 'rain',
  temperature: 0.3,
  humidity: 0.9
};

// Drying fails in rain!
const result = await craftingSystem.attemptCraft(
  agent,
  wet_plant,
  null,
  { type: 'dry' },
  context
); // successProbability: 0.1 (rain penalty)
```

### Tool Quality Affects Results
```typescript
// Better tools → better results
const axe1 = craftStoneAxe(); // quality: 0.6
const axe2 = craftSteelAxe(); // quality: 0.95

// Same recipe, different quality
const wood1 = chopTree(axe1); // quality: 0.6
const wood2 = chopTree(axe2); // quality: 0.95
```

---

**ระบบนี้ทำให้ Eve และ Adam "ค้นพบ" เทคโนโลยีได้เอง ไม่ใช่แค่ทำตาม blueprint!** 🔬✨