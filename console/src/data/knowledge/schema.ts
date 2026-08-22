/**
 * Defines the structure for domain-specific knowledge, learning examples, 
 * reasoning templates, and character profiles in the Pangea simulation.
 */

export interface DomainKnowledge {
  domain: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  confidence: number; // 0-1
  source: 'innate' | 'learned' | 'taught';
  lastUpdated: string; // ISO string for Date
  relatedKnowledge: string[]; // IDs of related knowledge
}

export interface LearningExample {
  id: string;
  situation: string;
  observation: string[];
  reasoning: {
    step: number;
    thought: string;
  }[];
  hypothesis: string;
  test?: {
    method: string;
    result: string;
  };
  outcome: string;
  learning: string[];
  confidence: number;
  timestamp: string; // ISO string for Date
}

export interface ReasoningTemplate {
  type: 'if-then' | 'analogy' | 'causal-chain' | 'pattern';
  pattern: string;
  examples: string[];
  applicableDomains: string[];
}

export interface Memory {
  id: string;
  type: 'event' | 'location' | 'entity' | 'emotion';
  description: string;
  importance: number; // 0-1
  timestamp: string;
  location?: { x: number; y: number };
  associatedEmotions?: Record<string, number>;
}

export interface CharacterProfile {
  name: 'Adam' | 'Eve' | string;
  age: number;
  role: string;
  
  // Skills (0-1)
  skills: Record<string, number>;
  
  // Personality (0-1)
  personality: Record<string, number>;
  
  // Domain knowledge
  knowledge: DomainKnowledge[];
  
  // Learning examples
  learningHistory: LearningExample[];
  
  // Reasoning patterns
  reasoningTemplates: ReasoningTemplate[];
  
  // Memory
  memories: Memory[];
  
  // Current state
  currentGoals: string[];
  currentStruggles: string[];
}
