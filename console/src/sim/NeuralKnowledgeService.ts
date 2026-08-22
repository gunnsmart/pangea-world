import { NpyLoader, VectorOps } from '../lib/npyLoader';

export interface NeuralKnowledgeEntry {
  domain: string;
  skill: string;
  content: string;
  type: string;
  confidence: number;
  tags: string[];
  source: string;
  related_knowledge: string[];
}

export interface NeuralKnowledgeBase {
  character: string;
  total_entries: number;
  domains: string[];
  knowledge: NeuralKnowledgeEntry[];
  embeddings?: Float32Array;
  vectorDim: number;
}

class NeuralKnowledgeService {
  private static instance: NeuralKnowledgeService;
  private bases: Record<string, NeuralKnowledgeBase> = {};
  private initialized = false;

  private constructor() {}

  static getInstance(): NeuralKnowledgeService {
    if (!NeuralKnowledgeService.instance) {
      NeuralKnowledgeService.instance = new NeuralKnowledgeService();
    }
    return NeuralKnowledgeService.instance;
  }

  async init(dataBasePath: string = '') {
    if (this.initialized) return;

    const validateEmbeddings = (data: Float32Array, expectedCount: number, dim: number, name: string) => {
      const minLength = expectedCount * dim;
      if (data.length < minLength) {
        throw new Error(`${name} embeddings truncated: expected at least ${minLength}, got ${data.length}`);
      }
    };

    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

    const loadJSON = async (url: string) => {
      if (isNode) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'public', url);
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.parse(content);
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      return res.json();
    };

    const loadNpy = async (url: string) => {
      if (isNode) {
         const fs = await import('fs/promises');
         const path = await import('path');
         const filePath = path.join(process.cwd(), 'public', url);
         const buffer = await fs.readFile(filePath);
         // Efficiently convert Buffer to ArrayBuffer
         const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
         return NpyLoader.parse(ab);
      }
      return NpyLoader.load(url);
    };

    try {
      console.log('NeuralKnowledgeService: Loading ADAM metadata...');
      const adamMeta = await loadJSON(`${dataBasePath}/data/adam_knowledge.json`);
      console.log('NeuralKnowledgeService: ADAM metadata loaded');
      
      let adamEmbedData: Float32Array | undefined;
      let adamVectorDim = 128;

      try {
        console.log('NeuralKnowledgeService: Loading ADAM embeddings...');
        const adamEmbed = await loadNpy(`${dataBasePath}/data/adam_knowledge_embeddings_128.npy`);
        validateEmbeddings(adamEmbed.data, adamMeta.total_entries, adamEmbed.shape[1], 'ADAM');
        adamEmbedData = adamEmbed.data;
        adamVectorDim = adamEmbed.shape[1];
      } catch (e) {
        console.warn('Adam embeddings failed to load, trying fallback:', e);
        try {
          const fallbackEmbed = await loadNpy(`${dataBasePath}/data/alpha_embeddings.npy`);
          validateEmbeddings(fallbackEmbed.data, adamMeta.total_entries, fallbackEmbed.shape[1], 'ADAM_FALLBACK');
          adamEmbedData = fallbackEmbed.data;
          adamVectorDim = fallbackEmbed.shape[1];
        } catch (e2) {
          console.error('All Adam embeddings failed to load, using baseline');
          adamEmbedData = new Float32Array((adamMeta.total_entries || 0) * adamVectorDim);
          adamEmbedData.fill(0.1);
        }
      }
      
      this.bases['ADAM'] = {
        ...adamMeta,
        embeddings: adamEmbedData,
        vectorDim: adamVectorDim
      };

      console.log('NeuralKnowledgeService: Loading EVE metadata...');
      const eveMeta = await loadJSON(`${dataBasePath}/data/eve_knowledge.json`);
      console.log('NeuralKnowledgeService: EVE metadata loaded');
      
      let eveEmbedData: Float32Array | undefined;
      let eveVectorDim = 128;

      try {
        console.log('NeuralKnowledgeService: Loading EVE embeddings...');
        const eveEmbed = await loadNpy(`${dataBasePath}/data/eve_knowledge_embeddings_128.npy`);
        validateEmbeddings(eveEmbed.data, eveMeta.total_entries, eveEmbed.shape[1], 'EVE');
        eveEmbedData = eveEmbed.data;
        eveVectorDim = eveEmbed.shape[1];
      } catch (e) {
        console.warn('Eve embeddings failed to load, trying fallback:', e);
        try {
          const fallbackEmbed = await loadNpy(`${dataBasePath}/data/beta_embeddings.npy`);
          validateEmbeddings(fallbackEmbed.data, eveMeta.total_entries, fallbackEmbed.shape[1], 'EVE_FALLBACK');
          eveEmbedData = fallbackEmbed.data;
          eveVectorDim = fallbackEmbed.shape[1];
        } catch (e2) {
          console.error('All Eve embeddings failed to load, using baseline');
          eveEmbedData = new Float32Array((eveMeta.total_entries || 0) * eveVectorDim);
          eveEmbedData.fill(0.1);
        }
      }
      
      this.bases['EVE'] = {
        ...eveMeta,
        embeddings: eveEmbedData,
        vectorDim: eveVectorDim
      };

      this.initialized = true;
      console.log('Neural Knowledge Service initialized (Deterministic Mode)');
    } catch (error) {
      console.error('Failed to initialize Neural Knowledge Service:', error);
    }
  }

  getKnowledgeEntries(character: string): NeuralKnowledgeEntry[] {
    const base = this.bases[character];
    return base ? base.knowledge : [];
  }

  getRandomWisdom(character: string, index?: number): NeuralKnowledgeEntry | null {
    const base = this.bases[character];
    if (!base || base.knowledge.length === 0) return null;
    
    // If index provided, use it (Data Driven). Otherwise, fallback to determinism using time if possible, or 0.
    const i = index !== undefined ? index % base.total_entries : 0;
    return base.knowledge[i];
  }

  searchByTags(character: string, tags: string[], topK: number = 5): NeuralKnowledgeEntry[] {
    const base = this.bases[character];
    if (!base) return [];

    const tagSet = new Set(tags.map(t => t.toLowerCase()));
    
    return base.knowledge
      .filter(entry => entry.tags.some(t => tagSet.has(t.toLowerCase())))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, topK);
  }

  getBase(character: string): NeuralKnowledgeBase | undefined {
    return this.bases[character];
  }

  getVector(character: string, index: number): Float32Array | null {
    const base = this.bases[character];
    if (!base || !base.embeddings) return null;
    
    const start = index * base.vectorDim;
    const end = start + base.vectorDim;
    return base.embeddings.slice(start, end);
  }

  /**
   * High performance: Copy vector into target array without allocation.
   */
  getVectorTo(character: string, index: number, target: Float32Array | number[]): boolean {
    const base = this.bases[character];
    if (!base || !base.embeddings) return false;
    
    const start = index * base.vectorDim;
    for (let i = 0; i < base.vectorDim; i++) {
      target[i] = base.embeddings[start + i];
    }
    return true;
  }

  // Pre-allocated scratch vector for findSimilar loops
  private scratchVector = new Float32Array(128);

  findSimilar(character: string, queryVector: Float32Array | number[], topK: number = 5) {
    const base = this.bases[character];
    if (!base || !base.embeddings) return [];

    const results: { index: number; score: number }[] = [];
    
    // Resize scratch vector if needed (though dim is usually 128)
    if (this.scratchVector.length !== base.vectorDim) {
      this.scratchVector = new Float32Array(base.vectorDim);
    }

    for (let i = 0; i < base.total_entries; i++) {
      if (this.getVectorTo(character, i, this.scratchVector)) {
        const score = VectorOps.cosineSimilarity(queryVector, this.scratchVector);
        // Only push if score is significant to reduce array size
        if (score > 0.3 || results.length < topK) {
          results.push({ index: i, score });
        }
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(r => ({
        ...base.knowledge[r.index],
        score: r.score
      }));
  }

  searchByText(character: string, query: string, topK: number = 10) {
    const base = this.bases[character];
    if (!base) return [];

    const queryLower = query.toLowerCase();
    return base.knowledge
      .map((entry, index) => ({ entry, index }))
      .filter(item => 
        item.entry.content.toLowerCase().includes(queryLower) || 
        item.entry.skill.toLowerCase().includes(queryLower) ||
        item.entry.tags.some(t => t.toLowerCase().includes(queryLower))
      )
      .slice(0, topK);
  }
}

export const neuralKnowledgeService = NeuralKnowledgeService.getInstance();
