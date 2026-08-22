# 🧠 Neural Network Development Roadmap for Pangea
## แนวทางพัฒนา NN สำหรับ Agent-based Ecosystem Simulation

---

## 🎯 Current State Analysis

### Pangea NN ปัจจุบัน (สันนิษฐาน):
```
Architecture: Simple feedforward network
Input: Agent state (health, hunger, energy, position, etc.)
Hidden: 1-2 layers
Output: Action probabilities
Training: Reinforcement learning (reward-based)
```

### จุดแข็ง:
- ✅ Fast inference (real-time decisions)
- ✅ Autonomous behavior
- ✅ Emergent patterns
- ✅ No API costs

### จุดอ่อน:
- ❌ Limited reasoning capability
- ❌ No explicit knowledge representation
- ❌ Hard to interpret decisions
- ❌ Slow to learn complex behaviors
- ❌ No transfer learning

---

## 🚀 Development Phases (Progressive Enhancement)

### Phase 1: Enhanced Feedforward (1-2 weeks)
**Goal**: Improve basic NN without changing architecture drastically

### Phase 2: Modular Architecture (2-3 weeks)
**Goal**: Separate brain into specialized modules

### Phase 3: Memory & Attention (3-4 weeks)
**Goal**: Add working memory and attention mechanisms

### Phase 4: Knowledge-Enhanced NN (4-6 weeks)
**Goal**: Integrate explicit knowledge from database

### Phase 5: Hybrid NN-LLM (6-8 weeks)
**Goal**: Combine NN speed with LLM reasoning

---

## 📐 Phase 1: Enhanced Feedforward Network

### 1.1 Improved Input Encoding

**Current** (assumed):
```typescript
// Simple concatenation
const input = [
  agent.health,
  agent.hunger,
  agent.energy,
  agent.position.x,
  agent.position.y
];
```

**Enhanced** (richer representation):
```typescript
interface EnhancedInput {
  // Physiological (normalized 0-1)
  health: number;
  hunger: number;
  thirst: number;
  energy: number;
  temperature: number;
  
  // Spatial (one-hot encoded terrain)
  terrainType: number[]; // [plains, forest, river, cave]
  
  // Temporal (cyclical encoding)
  timeOfDay: number[];   // [sin(hour), cos(hour)]
  season: number[];      // [sin(month), cos(month)]
  
  // Perceptual (what agent sees)
  nearbyResources: number[];
  nearbyAgents: number[];
  nearbyDanger: number[];
  
  // Internal state
  currentGoal: number[]; // one-hot: [hunt, gather, rest, craft, social]
  inventory: number[];   // item counts
  
  // Personality (constant per agent)
  personalityVector: number[]; // from profile
  
  // Skills (current levels)
  skillVector: number[]; // from profile
}

function encodeInput(agent: Agent, environment: Environment): number[] {
  const encoded: number[] = [];
  
  // Physiological (5 values)
  encoded.push(
    agent.state.health / 100,
    agent.state.hunger / 100,
    agent.state.thirst / 100,
    agent.state.energy / 100,
    (agent.state.temperature - 36) / 4 // normalize around body temp
  );
  
  // Terrain (4 values - one-hot)
  const terrainType = environment.getTerrainType(agent.position);
  const terrainOneHot = [0, 0, 0, 0];
  terrainOneHot[terrainType] = 1;
  encoded.push(...terrainOneHot);
  
  // Temporal (4 values - cyclical)
  const hour = environment.time.getHours();
  const month = environment.time.getMonth();
  encoded.push(
    Math.sin(2 * Math.PI * hour / 24),
    Math.cos(2 * Math.PI * hour / 24),
    Math.sin(2 * Math.PI * month / 12),
    Math.cos(2 * Math.PI * month / 12)
  );
  
  // Perceptual (simplified - 12 values)
  const perception = agent.perceive(environment);
  encoded.push(
    perception.foodNearby ? 1 : 0,
    perception.waterNearby ? 1 : 0,
    perception.dangerNearby ? 1 : 0,
    perception.shelterNearby ? 1 : 0,
    perception.agentsNearby.length / 10, // normalize
    perception.preyNearby.length / 5,
    perception.predatorsNearby.length / 2,
    // ... more perceptual features
  );
  
  // Personality (constant - 5 values from profile)
  encoded.push(
    agent.profile.personality.courage,
    agent.profile.personality.patience,
    agent.profile.personality.empathy,
    agent.profile.personality.discipline,
    agent.profile.personality.emotionalExpression
  );
  
  // Skills (10 values from profile)
  Object.values(agent.profile.skills).forEach(skill => {
    encoded.push(skill);
  });
  
  return encoded; // Total: ~50-60 input neurons
}
```

### 1.2 Deeper Architecture

**Current** (assumed):
```
Input (10) → Hidden (20) → Output (5)
```

**Enhanced**:
```typescript
class EnhancedBrain {
  private network: {
    input: number;
    hidden1: number;
    hidden2: number;
    hidden3: number;
    output: number;
  } = {
    input: 60,    // Rich input encoding
    hidden1: 128, // First hidden layer
    hidden2: 64,  // Second hidden layer  
    hidden3: 32,  // Third hidden layer
    output: 20    // More granular actions
  };
  
  private weights: {
    w1: Matrix; // input → hidden1
    w2: Matrix; // hidden1 → hidden2
    w3: Matrix; // hidden2 → hidden3
    w4: Matrix; // hidden3 → output
  };
  
  forward(input: number[]): number[] {
    // Layer 1
    let h1 = this.matmul(input, this.weights.w1);
    h1 = this.relu(h1);
    h1 = this.dropout(h1, 0.1);
    
    // Layer 2
    let h2 = this.matmul(h1, this.weights.w2);
    h2 = this.relu(h2);
    h2 = this.dropout(h2, 0.1);
    
    // Layer 3
    let h3 = this.matmul(h2, this.weights.w3);
    h3 = this.relu(h3);
    
    // Output
    let output = this.matmul(h3, this.weights.w4);
    output = this.softmax(output);
    
    return output;
  }
  
  private relu(x: number[]): number[] {
    return x.map(v => Math.max(0, v));
  }
  
  private dropout(x: number[], rate: number): number[] {
    if (!this.training) return x;
    return x.map(v => Math.random() > rate ? v / (1 - rate) : 0);
  }
  
  private softmax(x: number[]): number[] {
    const exp = x.map(v => Math.exp(v));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(v => v / sum);
  }
}
```

### 1.3 Better Action Space

**Current** (assumed):
```typescript
enum Action {
  Hunt,
  Gather,
  Rest,
  Craft,
  Social
}
```

**Enhanced** (hierarchical + parameterized):
```typescript
interface Action {
  type: 'move' | 'interact' | 'use' | 'communicate' | 'rest';
  subtype: string;
  parameters: {
    target?: Entity;
    direction?: Vector2D;
    intensity?: number; // 0-1
    duration?: number;
  };
}

// Output neurons (20 total):
// - Action type (5): move, interact, use, communicate, rest
// - Action subtype (10): hunt, gather, craft, eat, drink, sleep, etc.
// - Parameters (5): target_x, target_y, intensity, duration, urgency

function decodeAction(output: number[]): Action {
  // First 5: action type (softmax)
  const typeProbs = output.slice(0, 5);
  const type = argmax(typeProbs);
  
  // Next 10: subtype (softmax)
  const subtypeProbs = output.slice(5, 15);
  const subtype = argmax(subtypeProbs);
  
  // Last 5: parameters (sigmoid)
  const params = output.slice(15, 20).map(v => sigmoid(v));
  
  return {
    type: ['move', 'interact', 'use', 'communicate', 'rest'][type],
    subtype: getSubtypeName(type, subtype),
    parameters: {
      intensity: params[0],
      duration: params[1] * 60, // 0-60 seconds
      urgency: params[2]
    }
  };
}
```

---

## 📐 Phase 2: Modular Architecture (Specialist Modules)

### 2.1 Concept: Separate Brain Regions

**Inspired by mammalian brain structure:**

```typescript
class ModularBrain {
  // Sensory processing (what do I perceive?)
  private sensoryModule: NeuralModule;
  
  // Survival needs (am I hungry/tired/in danger?)
  private homeostasisModule: NeuralModule;
  
  // Goal selection (what should I do now?)
  private motivationModule: NeuralModule;
  
  // Action planning (how do I do it?)
  private motorModule: NeuralModule;
  
  // Social cognition (what are others doing?)
  private socialModule: NeuralModule;
  
  // Learning & memory (what did I learn?)
  private learningModule: NeuralModule;
  
  async decide(state: AgentState, env: Environment): Promise<Action> {
    // Process sensory input
    const perception = await this.sensoryModule.process(
      this.encodeSensory(state, env)
    );
    
    // Assess homeostatic needs
    const needs = await this.homeostasisModule.process(
      [state.health, state.hunger, state.thirst, state.energy]
    );
    
    // Select goal based on needs + perception
    const motivation = await this.motivationModule.process(
      [...needs, ...perception]
    );
    
    // Check social context
    const socialContext = await this.socialModule.process(
      this.encodeSocialSituation(state, env)
    );
    
    // Plan motor action
    const action = await this.motorModule.process(
      [...motivation, ...socialContext]
    );
    
    return this.decodeAction(action);
  }
}
```

### 2.2 Implementation Example: Homeostasis Module

```typescript
class HomeostasisModule {
  private network: SimpleNN;
  
  // Inputs: current physiological state
  // Outputs: urgency levels for each need
  
  constructor() {
    this.network = new SimpleNN({
      input: 6,   // health, hunger, thirst, energy, temp, pain
      hidden: 16,
      output: 5   // urgency: eat, drink, sleep, warm, flee
    });
  }
  
  process(state: PhysiologicalState): number[] {
    const input = [
      1 - state.health / 100,     // low health = high urgency
      state.hunger / 100,
      state.thirst / 100,
      1 - state.energy / 100,
      Math.abs(state.temperature - 37) / 10,
      state.pain / 100
    ];
    
    return this.network.forward(input);
  }
  
  // Training: reward for maintaining homeostasis
  train(state: PhysiologicalState, action: Action, nextState: PhysiologicalState) {
    const reward = this.calculateHomeostasisReward(state, nextState);
    this.network.backpropagate(reward);
  }
  
  private calculateHomeostasisReward(prev: PhysiologicalState, next: PhysiologicalState): number {
    // Reward for moving toward ideal state
    const idealHealth = 100;
    const idealHunger = 20;
    const idealThirst = 20;
    const idealEnergy = 80;
    const idealTemp = 37;
    
    const prevDeviation = 
      Math.abs(prev.health - idealHealth) +
      Math.abs(prev.hunger - idealHunger) +
      Math.abs(prev.thirst - idealThirst) +
      Math.abs(prev.energy - idealEnergy) +
      Math.abs(prev.temperature - idealTemp);
    
    const nextDeviation = 
      Math.abs(next.health - idealHealth) +
      Math.abs(next.hunger - idealHunger) +
      Math.abs(next.thirst - idealThirst) +
      Math.abs(next.energy - idealEnergy) +
      Math.abs(next.temperature - idealTemp);
    
    return prevDeviation - nextDeviation; // positive if improved
  }
}
```

### 2.3 Motivation Module (Goal Selection)

```typescript
class MotivationModule {
  private network: SimpleNN;
  
  constructor() {
    this.network = new SimpleNN({
      input: 15,  // needs (5) + perception (10)
      hidden: 32,
      output: 10  // goals: hunt, gather, craft, rest, socialize, explore, etc.
    });
  }
  
  process(needs: number[], perception: number[]): number[] {
    const input = [...needs, ...perception];
    const goalActivations = this.network.forward(input);
    
    // Apply personality biases
    const biased = this.applyPersonalityBias(goalActivations);
    
    return biased;
  }
  
  private applyPersonalityBias(goals: number[]): number[] {
    // Adam: boost hunting/combat, reduce social
    // Eve: boost gathering/healing, boost social
    
    const personality = this.agent.profile.personality;
    
    return goals.map((g, i) => {
      if (i === 0 && this.isHuntingGoal(i)) {
        return g * (1 + personality.courage * 0.5);
      }
      if (i === 4 && this.isSocialGoal(i)) {
        return g * (1 + personality.empathy * 0.5);
      }
      return g;
    });
  }
}
```

---

## 📐 Phase 3: Memory & Attention Mechanisms

### 3.1 Working Memory (Short-term)

```typescript
interface MemoryItem {
  timestamp: number;
  type: 'event' | 'observation' | 'goal' | 'reward';
  embedding: number[]; // vector representation
  importance: number;  // 0-1
  decay: number;       // how fast it fades
}

class WorkingMemory {
  private capacity: number = 20; // can hold 20 items
  private items: MemoryItem[] = [];
  
  add(item: MemoryItem) {
    // Add new item
    this.items.push(item);
    
    // Remove least important if over capacity
    if (this.items.length > this.capacity) {
      this.items.sort((a, b) => b.importance - a.importance);
      this.items = this.items.slice(0, this.capacity);
    }
  }
  
  decay(deltaTime: number) {
    // Memories fade over time
    this.items.forEach(item => {
      item.importance *= Math.exp(-item.decay * deltaTime);
    });
    
    // Remove very weak memories
    this.items = this.items.filter(item => item.importance > 0.1);
  }
  
  recall(query: number[], topK: number = 5): MemoryItem[] {
    // Retrieve most relevant memories using cosine similarity
    const scored = this.items.map(item => ({
      item,
      score: this.cosineSimilarity(query, item.embedding) * item.importance
    }));
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(s => s.item);
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

### 3.2 Attention Mechanism

```typescript
class AttentionModule {
  private queryNetwork: SimpleNN;
  private keyNetwork: SimpleNN;
  private valueNetwork: SimpleNN;
  
  constructor(dim: number) {
    this.queryNetwork = new SimpleNN({ input: dim, hidden: dim, output: dim });
    this.keyNetwork = new SimpleNN({ input: dim, hidden: dim, output: dim });
    this.valueNetwork = new SimpleNN({ input: dim, hidden: dim, output: dim });
  }
  
  attend(query: number[], context: number[][]): number[] {
    // Transform inputs
    const Q = this.queryNetwork.forward(query);
    const K = context.map(c => this.keyNetwork.forward(c));
    const V = context.map(c => this.valueNetwork.forward(c));
    
    // Calculate attention scores
    const scores = K.map(k => this.dotProduct(Q, k));
    const weights = this.softmax(scores);
    
    // Weighted sum of values
    const attended = this.weightedSum(V, weights);
    
    return attended;
  }
  
  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }
  
  private softmax(scores: number[]): number[] {
    const exp = scores.map(s => Math.exp(s));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(e => e / sum);
  }
  
  private weightedSum(values: number[][], weights: number[]): number[] {
    const result = new Array(values[0].length).fill(0);
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        result[j] += values[i][j] * weights[i];
      }
    }
    return result;
  }
}
```

### 3.3 Memory-Enhanced Decision Making

```typescript
class MemoryEnhancedBrain {
  private baseNetwork: ModularBrain;
  private workingMemory: WorkingMemory;
  private attention: AttentionModule;
  
  async decide(state: AgentState, env: Environment): Promise<Action> {
    // Get current situation embedding
    const currentEmbedding = this.embed(state, env);
    
    // Recall relevant memories
    const relevantMemories = this.workingMemory.recall(currentEmbedding, 5);
    
    // Use attention to focus on most important memories
    const memoryContext = relevantMemories.map(m => m.embedding);
    const attendedMemory = this.attention.attend(currentEmbedding, memoryContext);
    
    // Combine current state + attended memories
    const enhancedInput = [...currentEmbedding, ...attendedMemory];
    
    // Make decision with enhanced context
    const action = await this.baseNetwork.decide(enhancedInput);
    
    // Store this decision in memory
    this.workingMemory.add({
      timestamp: Date.now(),
      type: 'event',
      embedding: currentEmbedding,
      importance: this.assessImportance(state, action),
      decay: 0.01
    });
    
    return action;
  }
  
  private assessImportance(state: AgentState, action: Action): number {
    // Important events:
    // - Low health (survival critical)
    // - Novel situations
    // - Social interactions
    // - Successful hunts
    
    let importance = 0.5; // baseline
    
    if (state.health < 30) importance += 0.3;
    if (action.type === 'hunt' && action.success) importance += 0.2;
    if (action.type === 'social') importance += 0.15;
    
    return Math.min(importance, 1.0);
  }
}
```

---

## 📐 Phase 4: Knowledge-Enhanced NN

### 4.1 Concept: Explicit Knowledge Injection

**Problem**: Pure NN can't use explicit knowledge (e.g., "white sap = poison")  
**Solution**: Encode knowledge as additional neural pathways

```typescript
interface KnowledgeRule {
  condition: (state: AgentState, env: Environment) => boolean;
  action: Action;
  confidence: number;
  source: 'learned' | 'taught' | 'innate';
}

class KnowledgeEnhancedBrain {
  private neuralNetwork: ModularBrain;
  private knowledgeBase: DomainKnowledge[];
  private rules: KnowledgeRule[];
  
  async decide(state: AgentState, env: Environment): Promise<Action> {
    // Check if any knowledge rules apply
    const applicableRules = this.findApplicableRules(state, env);
    
    if (applicableRules.length > 0) {
      // Blend rule-based and neural decisions
      const ruleAction = this.selectBestRule(applicableRules);
      const neuralAction = await this.neuralNetwork.decide(state, env);
      
      return this.blendActions(ruleAction, neuralAction);
    }
    
    // Pure neural decision
    return await this.neuralNetwork.decide(state, env);
  }
  
  private findApplicableRules(state: AgentState, env: Environment): KnowledgeRule[] {
    return this.rules.filter(rule => rule.condition(state, env));
  }
  
  private blendActions(rule: Action, neural: Action): Action {
    // High confidence rule → follow rule
    if (rule.confidence > 0.9) return rule;
    
    // Low confidence → follow neural
    if (rule.confidence < 0.5) return neural;
    
    // Medium → weighted blend
    return this.weightedBlend(rule, neural, rule.confidence);
  }
}
```

### 4.2 Example: Plant Identification Knowledge

```typescript
// From Eve's knowledge base
const plantKnowledge: KnowledgeRule[] = [
  {
    condition: (state, env) => {
      const plant = env.getEntityNear(state.position, 'plant');
      return plant && plant.hasWhiteSap;
    },
    action: {
      type: 'interact',
      subtype: 'avoid',
      parameters: { intensity: 0.9 }
    },
    confidence: 0.95,
    source: 'learned'
  },
  {
    condition: (state, env) => {
      const plant = env.getEntityNear(state.position, 'medicinal_herb');
      return plant && state.tribe.needsMedicine;
    },
    action: {
      type: 'interact',
      subtype: 'gather',
      parameters: { intensity: 1.0 }
    },
    confidence: 0.85,
    source: 'taught'
  }
];
```

### 4.3 Knowledge-to-Neural Compilation

**Concept**: Convert explicit knowledge into neural weights

```typescript
class KnowledgeCompiler {
  // Compile knowledge rules into neural network weights
  compileKnowledge(knowledge: DomainKnowledge[]): Matrix {
    const weights = new Matrix(inputSize, outputSize);
    
    knowledge.forEach(k => {
      // Convert knowledge to feature detector
      const inputPattern = this.extractInputPattern(k);
      const outputPattern = this.extractOutputPattern(k);
      
      // Add connection with strength = confidence
      weights.addConnection(inputPattern, outputPattern, k.confidence);
    });
    
    return weights;
  }
  
  private extractInputPattern(k: DomainKnowledge): number[] {
    // Convert knowledge condition to input pattern
    // e.g., "white sap plant" → [0, 0, 1, 0, ...] (feature vector)
    
    const pattern = new Array(inputSize).fill(0);
    
    k.tags.forEach(tag => {
      const index = this.tagToIndex(tag);
      pattern[index] = 1;
    });
    
    return pattern;
  }
  
  private extractOutputPattern(k: DomainKnowledge): number[] {
    // Convert knowledge action to output pattern
    // e.g., "avoid" → [0, 0, 0, 1, 0, ...]
    
    const pattern = new Array(outputSize).fill(0);
    
    if (k.content.includes('avoid')) {
      pattern[this.actionToIndex('avoid')] = 1;
    } else if (k.content.includes('gather')) {
      pattern[this.actionToIndex('gather')] = 1;
    }
    
    return pattern;
  }
}
```

---

## 📐 Phase 5: Hybrid NN-LLM Architecture

### 5.1 When to Use What

```typescript
enum DecisionMode {
  PureNeural,      // Fast, simple, common situations
  NeuralWithKnowledge, // Medium, rule-enhanced
  HybridBlend,     // Complex, requires reasoning
  PureLLM          // Novel, critical, complex reasoning
}

class HybridBrain {
  selectMode(state: AgentState, env: Environment): DecisionMode {
    const complexity = this.assessComplexity(state, env);
    const novelty = this.assessNovelty(state, env);
    const criticality = this.assessCriticality(state);
    
    // Simple common situation → Pure Neural (70% of cases)
    if (complexity < 0.3 && novelty < 0.3) {
      return DecisionMode.PureNeural;
    }
    
    // Has applicable knowledge → Neural + Knowledge (20% of cases)
    if (this.hasApplicableKnowledge(state, env) && criticality < 0.7) {
      return DecisionMode.NeuralWithKnowledge;
    }
    
    // Novel or critical → LLM (5% of cases)
    if (novelty > 0.7 || criticality > 0.8) {
      return DecisionMode.PureLLM;
    }
    
    // Complex but familiar → Hybrid (5% of cases)
    return DecisionMode.HybridBlend;
  }
  
  private assessComplexity(state: AgentState, env: Environment): number {
    let complexity = 0;
    
    // Multiple competing needs
    const needs = [state.hunger, state.thirst, 100 - state.energy];
    const activeNeeds = needs.filter(n => n > 60).length;
    complexity += activeNeeds * 0.2;
    
    // Social complexity
    const nearbyAgents = env.getAgentsNear(state.position, 50);
    complexity += Math.min(nearbyAgents.length * 0.1, 0.3);
    
    // Environmental hazards
    const dangers = env.getDangersNear(state.position, 100);
    complexity += Math.min(dangers.length * 0.15, 0.3);
    
    return Math.min(complexity, 1.0);
  }
  
  private assessNovelty(state: AgentState, env: Environment): number {
    // Check if current situation matches any past experience
    const currentSituation = this.encodeState(state, env);
    const similarExperiences = this.memory.findSimilar(currentSituation, 0.8);
    
    // Novel if no similar experiences
    return 1 - (similarExperiences.length / 10);
  }
  
  private assessCriticality(state: AgentState): number {
    let criticality = 0;
    
    // Low health = critical
    if (state.health < 30) criticality = Math.max(criticality, 0.9);
    
    // Extreme hunger/thirst
    if (state.hunger > 80) criticality = Math.max(criticality, 0.7);
    if (state.thirst > 90) criticality = Math.max(criticality, 0.8);
    
    // Immediate danger
    if (state.threatLevel > 0.7) criticality = Math.max(criticality, 0.9);
    
    return criticality;
  }
}
```

### 5.2 LLM as Teacher (Distillation)

```typescript
class LLMTeacher {
  private llm: LLMClient;
  private student: NeuralNetwork;
  
  async teachFromExperience(
    state: AgentState,
    action: Action,
    outcome: Outcome
  ) {
    // LLM analyzes the experience
    const analysis = await this.llm.generate({
      messages: [{
        role: 'user',
        content: `
          Situation: ${JSON.stringify(state)}
          Action taken: ${JSON.stringify(action)}
          Outcome: ${JSON.stringify(outcome)}
          
          What should be learned from this?
          Provide:
          1. Key insight (one sentence)
          2. Rule to follow (if-then format)
          3. Confidence (0-1)
          
          JSON format:
          {
            "insight": "...",
            "rule": "if X then Y",
            "confidence": 0.0-1.0
          }
        `
      }]
    });
    
    const lesson = JSON.parse(analysis.content);
    
    // Convert lesson to training data for neural network
    const inputPattern = this.encodeState(state);
    const targetOutput = this.encodeAction(action);
    const weight = lesson.confidence;
    
    // Train student network
    this.student.train(inputPattern, targetOutput, weight);
    
    // Store as explicit knowledge
    this.knowledgeBase.add({
      domain: this.inferDomain(state),
      content: lesson.insight,
      confidence: lesson.confidence,
      source: 'learned'
    });
  }
}
```

---

## 🎓 Training Strategies

### Strategy 1: Curriculum Learning

```typescript
class CurriculumTrainer {
  private stages = [
    { difficulty: 'easy', duration: 1000 },
    { difficulty: 'medium', duration: 2000 },
    { difficulty: 'hard', duration: 5000 }
  ];
  
  async train(agent: Agent) {
    for (const stage of this.stages) {
      console.log(`Training stage: ${stage.difficulty}`);
      
      const environment = this.createEnvironment(stage.difficulty);
      
      for (let i = 0; i < stage.duration; i++) {
        const state = agent.getState();
        const action = await agent.decide(state, environment);
        const outcome = environment.step(action);
        const reward = this.calculateReward(outcome);
        
        agent.learn(state, action, reward);
      }
    }
  }
  
  private createEnvironment(difficulty: string): Environment {
    if (difficulty === 'easy') {
      return new Environment({
        food: 'abundant',
        predators: 'none',
        weather: 'mild'
      });
    } else if (difficulty === 'medium') {
      return new Environment({
        food: 'moderate',
        predators: 'few',
        weather: 'variable'
      });
    } else {
      return new Environment({
        food: 'scarce',
        predators: 'many',
        weather: 'harsh'
      });
    }
  }
}
```

### Strategy 2: Imitation Learning (from LLM)

```typescript
class ImitationTrainer {
  async collectDemonstrations(scenarios: Scenario[]): Promise<Dataset> {
    const demonstrations = [];
    
    for (const scenario of scenarios) {
      // Get expert (LLM) decision
      const expertAction = await this.llm.decideExpert(scenario);
      
      demonstrations.push({
        state: scenario.state,
        action: expertAction,
        quality: 1.0 // expert quality
      });
    }
    
    return demonstrations;
  }
  
  async trainFromDemonstrations(
    network: NeuralNetwork,
    demonstrations: Dataset
  ) {
    for (let epoch = 0; epoch < 100; epoch++) {
      let totalLoss = 0;
      
      for (const demo of demonstrations) {
        // Forward pass
        const predicted = network.forward(demo.state);
        
        // Calculate loss (cross-entropy)
        const loss = this.crossEntropy(predicted, demo.action);
        
        // Backward pass
        network.backpropagate(loss);
        
        totalLoss += loss;
      }
      
      console.log(`Epoch ${epoch}, Loss: ${totalLoss / demonstrations.length}`);
    }
  }
}
```

### Strategy 3: Reinforcement Learning (PPO)

```typescript
class PPOTrainer {
  async train(
    agent: Agent,
    environment: Environment,
    episodes: number = 1000
  ) {
    for (let episode = 0; episode < episodes; episode++) {
      const trajectory = [];
      let state = environment.reset();
      
      // Collect trajectory
      while (!environment.isDone()) {
        const action = await agent.act(state);
        const nextState = environment.step(action);
        const reward = this.calculateReward(state, action, nextState);
        
        trajectory.push({ state, action, reward, nextState });
        state = nextState;
      }
      
      // Calculate returns
      const returns = this.calculateReturns(trajectory);
      
      // Update policy
      this.updatePolicy(agent.brain, trajectory, returns);
    }
  }
  
  private calculateReturns(trajectory: Trajectory[], gamma: number = 0.99): number[] {
    const returns = new Array(trajectory.length);
    let G = 0;
    
    // Work backwards
    for (let t = trajectory.length - 1; t >= 0; t--) {
      G = trajectory[t].reward + gamma * G;
      returns[t] = G;
    }
    
    return returns;
  }
}
```

---

## 📊 Performance Optimization

### 1. Quantization (Reduce Model Size)

```typescript
class QuantizedNN {
  // Convert 32-bit floats to 8-bit integers
  quantizeWeights(weights: Float32Array): Int8Array {
    // Find min/max
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const scale = (max - min) / 255;
    
    // Quantize
    const quantized = new Int8Array(weights.length);
    for (let i = 0; i < weights.length; i++) {
      quantized[i] = Math.round((weights[i] - min) / scale);
    }
    
    return quantized;
  }
  
  // 75% size reduction!
  // Slight accuracy loss (~1-2%)
}
```

### 2. Pruning (Remove Unnecessary Connections)

```typescript
class PrunedNN {
  prune(threshold: number = 0.01) {
    // Remove weights below threshold
    this.weights.forEach((w, i) => {
      if (Math.abs(w) < threshold) {
        this.weights[i] = 0;
      }
    });
    
    // Convert to sparse representation
    this.convertToSparse();
  }
  
  // 50-70% faster inference!
}
```

### 3. Batch Processing

```typescript
class BatchProcessor {
  async processBatch(agents: Agent[]): Promise<Action[]> {
    // Encode all states at once
    const states = agents.map(a => this.encodeState(a));
    
    // Batch matrix multiplication (GPU-friendly)
    const outputs = this.neuralNetwork.forwardBatch(states);
    
    // Decode all actions
    const actions = outputs.map(o => this.decodeAction(o));
    
    return actions;
  }
  
  // 3-5x faster than sequential!
}
```

---

## 🎯 Recommended Architecture for Pangea

### Final Recommendation: **Hybrid Modular NN + Selective LLM**

```typescript
class PangeaBrain {
  // Neural components (always active)
  private sensory: SensoryModule;        // Process perception
  private homeostasis: HomeostasisModule; // Manage needs
  private motivation: MotivationModule;   // Select goals
  private motor: MotorModule;             // Execute actions
  private memory: WorkingMemory;          // Remember events
  
  // Knowledge components (selective)
  private knowledgeBase: DomainKnowledge[];
  private rules: KnowledgeRule[];
  
  // LLM component (rare, expensive)
  private llm: LLMClient; // Only for <5% of decisions
  
  async decide(state: AgentState, env: Environment): Promise<Action> {
    // Mode selection
    const mode = this.selectMode(state, env);
    
    switch (mode) {
      case 'neural':
        return this.neuralDecision(state, env);
      
      case 'knowledge':
        return this.knowledgeDecision(state, env);
      
      case 'llm':
        return await this.llmDecision(state, env);
      
      case 'hybrid':
        return await this.hybridDecision(state, env);
    }
  }
}
```

**Why This Works**:
- ✅ Fast (neural for 70% of decisions)
- ✅ Smart (knowledge for 20%)
- ✅ Adaptive (LLM for 5%)
- ✅ Cost-effective (<$50/month for 50 agents)
- ✅ Learns continuously (imitation + RL)

---

## 📋 Development Checklist

### Phase 1 (Week 1-2): Enhanced Feedforward ✅
- [ ] Implement rich input encoding (60 features)
- [ ] Add deeper network (3 hidden layers)
- [ ] Expand action space (20 outputs)
- [ ] Test performance

### Phase 2 (Week 3-4): Modular Architecture ⏳
- [ ] Create sensory module
- [ ] Create homeostasis module
- [ ] Create motivation module
- [ ] Create motor module
- [ ] Test modules individually
- [ ] Integrate modules

### Phase 3 (Week 5-6): Memory & Attention ⏳
- [ ] Implement working memory
- [ ] Implement attention mechanism
- [ ] Test memory recall
- [ ] Integrate with decision-making

### Phase 4 (Week 7-8): Knowledge Enhancement ⏳
- [ ] Load domain knowledge
- [ ] Convert knowledge to rules
- [ ] Implement knowledge compiler
- [ ] Test rule-based decisions

### Phase 5 (Week 9-10): Hybrid NN-LLM ⏳
- [ ] Implement mode selection
- [ ] Integrate LLM client
- [ ] Implement distillation
- [ ] Measure cost/performance

---

**Bottom Line**: 
เริ่มจาก Phase 1 (Enhanced Feedforward) → ใช้ได้ดีขึ้นทันที  
แล้วค่อยๆ เพิ่ม Phase 2-5 ตามความพร้อม  
**ไม่จำเป็นต้องทำทั้งหมด - เลือกที่จำเป็นที่สุด!** 🧠✨