import { rng } from './SeededRNG';

export interface LayerWeights {
  matrix: number[][];
  biases: number[];
}

export class NeuralNetwork {
  layerSizes: number[];
  layers: LayerWeights[] = [];
  learningRate: number = 0.1;

  private layerOutputs: number[][] = [];

  constructor(layerSizes: number[]) {
    this.layerSizes = layerSizes;
    
    // Deterministic setup using the centralized RNG
    const localRng = rng; 
    
    for (let i = 1; i < layerSizes.length; i++) {
      const rows = layerSizes[i];
      const cols = layerSizes[i-1];
      this.layers.push({
        matrix: Array(rows).fill(0).map(() => Array(cols).fill(0).map(() => localRng.next() * 2 - 1)),
        biases: Array(rows).fill(0).map(() => localRng.next() * 2 - 1)
      });
      // Pre-allocate layer outputs for reuse
      this.layerOutputs.push(new Array(rows).fill(0));
    }
  }

  // Compatibility getters for legacy code (workers, etc.) - Returns the first and last layer
  get inputs() { return this.layerSizes[0]; }
  get hidden() { return this.layerSizes[1]; } 
  get outputs() { return this.layerSizes[this.layerSizes.length - 1]; }
  get weightsIH() { return this.layers[0].matrix; }
  get weightsHO() { return this.layers[this.layers.length-1].matrix; }
  get biasH() { return this.layers[0].biases; }
  get biasO() { return this.layers[this.layers.length-1].biases; }

  set weightsIH(m: number[][]) { this.layers[0].matrix = m; }
  set weightsHO(m: number[][]) { this.layers[this.layers.length-1].matrix = m; }
  set biasH(b: number[]) { this.layers[0].biases = b; }
  set biasO(b: number[]) { this.layers[this.layers.length-1].biases = b; }

  sigmoid(x: number) {
    return 1 / (1 + Math.exp(-x));
  }

  dsigmoid(y: number) {
    return y * (1 - y);
  }

  /**
   * Optimized predict to avoid new Array allocations in loop
   */
  predict(inputArray: number[] | Float32Array): number[] {
    let current: number[] | Float32Array = inputArray;
    
    for (let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l];
      const next = this.layerOutputs[l];
      
      for (let i = 0; i < layer.matrix.length; i++) {
        let sum = 0;
        const row = layer.matrix[i];
        for (let j = 0; j < row.length; j++) {
          sum += current[j] * row[j];
        }
        next[i] = this.sigmoid(sum + layer.biases[i]);
      }
      current = next;
    }

    return [...current]; // Return a copy for the output
  }

  train(inputArray: number[] | Float32Array, targetArray: number[] | Float32Array) {
    // Feedforward with saving intermediate results
    const layerInputs: number[][] = [Array.from(inputArray)];
    const layerOutputs: number[][] = [];
    
    let current = layerInputs[0];
    for (const layer of this.layers) {
      const next = new Array(layer.matrix.length).fill(0);
      for (let i = 0; i < layer.matrix.length; i++) {
        let sum = 0;
        for (let j = 0; j < layer.matrix[i].length; j++) {
          sum += current[j] * layer.matrix[i][j];
        }
        next[i] = this.sigmoid(sum + layer.biases[i]);
      }
      layerOutputs.push(next);
      layerInputs.push(next);
      current = next;
    }

    // Backpropagation
    let errors = new Array(targetArray.length);
    for (let i = 0; i < targetArray.length; i++) {
      errors[i] = targetArray[i] - layerOutputs[layerOutputs.length - 1][i];
    }

    for (let l = this.layers.length - 1; l >= 0; l--) {
      const layer = this.layers[l];
      const outputs = layerOutputs[l];
      const inputs = layerInputs[l];
      
      const nextErrors = new Array(inputs.length).fill(0);
      
      for (let i = 0; i < layer.matrix.length; i++) {
        const gradient = errors[i] * this.dsigmoid(outputs[i]) * this.learningRate;
        layer.biases[i] += gradient;
        
        for (let j = 0; j < layer.matrix[i].length; j++) {
          nextErrors[j] += errors[i] * layer.matrix[i][j]; 
          layer.matrix[i][j] += gradient * inputs[j];
        }
      }
      
      errors = nextErrors;
    }
  }
}

export class SpikingNeuralNetwork extends NeuralNetwork {
  private membranePotentialsSpace: number[][];
  private threshold: number = 1.0;
  private leakFactor: number = 0.85; 
  private refractoryPeriod: number = 2; 
  private refractoryCountersSpace: number[][];
  public lastActivitySpace: number[][];
  
  public recurrentLayers: number[][][] = []; 

  private finalOutputsScratch: number[];
  private prevLayerSpikesScratch: number[][];
  private nextLayerSpikesScratch: number[][];

  constructor(layerSizes: any, hiddenSize?: number, outputSize?: number) {
    super(Array.isArray(layerSizes) ? layerSizes : [layerSizes, hiddenSize!, outputSize!]);
    
    const localRng = rng;
    this.membranePotentialsSpace = this.layerSizes.slice(1).map(size => new Array(size).fill(0));
    this.refractoryCountersSpace = this.layerSizes.slice(1).map(size => new Array(size).fill(0));
    this.lastActivitySpace = this.layerSizes.slice(1).map(size => new Array(size).fill(0));

    // Pre-allocate scratch spaces
    this.finalOutputsScratch = new Array(this.layerSizes[this.layerSizes.length - 1]).fill(0);
    this.prevLayerSpikesScratch = this.layerSizes.slice(1, -1).map(size => new Array(size).fill(0));
    this.nextLayerSpikesScratch = this.layerSizes.slice(1, -1).map(size => new Array(size).fill(0));

    for (let l = 1; l < this.layerSizes.length - 1; l++) {
      const size = this.layerSizes[l];
      this.recurrentLayers.push(
        Array(size).fill(0).map(() => Array(size).fill(0).map(() => localRng.next() * 0.5 - 0.25))
      );
    }
  }

  // Compatibility getters for legacy calls
  get lastActivityH() { return this.lastActivitySpace[0]; }
  get lastActivityO() { return this.lastActivitySpace[this.lastActivitySpace.length - 1]; }

  public predict(inputArray: number[] | Float32Array): number[] {
    return this.predictSpiking(inputArray, 6);
  }

  public predictSpiking(inputArray: number[] | Float32Array, microTicks: number = 6): number[] {
    this.finalOutputsScratch.fill(0);
    for (let l = 0; l < this.prevLayerSpikesScratch.length; l++) {
      this.prevLayerSpikesScratch[l].fill(0);
    }

    for (let l = 0; l < this.lastActivitySpace.length; l++) this.lastActivitySpace[l].fill(0);

    for (let t = 0; t < microTicks; t++) {
      let currentSpikes: number[] | Float32Array = inputArray;
      
      for (let l = 0; l < this.layers.length; l++) {
        const layer = this.layers[l];
        // We use lastActivitySpace temporarily as nextSpikes to avoid allocation
        const nextSpikesScratch = (l < this.layers.length - 1) ? this.nextLayerSpikesScratch[l] : this.finalOutputsScratch;
        
        // Clear next spikes for this micro-tick (if its from scratch space)
        if (l < this.layers.length - 1) nextSpikesScratch.fill(0);

        for (let i = 0; i < layer.matrix.length; i++) {
          this.membranePotentialsSpace[l][i] *= this.leakFactor;
          if (this.refractoryCountersSpace[l][i] > 0) {
            this.refractoryCountersSpace[l][i]--;
            continue;
          }

          let sum = 0;
          const row = layer.matrix[i];
          for (let j = 0; j < row.length; j++) sum += currentSpikes[j] * row[j];
          
          if (l < this.recurrentLayers.length) {
            const recMatrix = this.recurrentLayers[l];
            const prevRow = this.prevLayerSpikesScratch[l];
            for (let j = 0; j < recMatrix[i].length; j++) sum += prevRow[j] * recMatrix[i][j];
          }

          this.membranePotentialsSpace[l][i] += sum;
          if (this.membranePotentialsSpace[l][i] >= this.threshold) {
            if (l < this.layers.length - 1) nextSpikesScratch[i] = 1;
            this.lastActivitySpace[l][i]++;
            this.membranePotentialsSpace[l][i] = 0; 
            this.refractoryCountersSpace[l][i] = this.refractoryPeriod;
            if (l === this.layers.length - 1) this.finalOutputsScratch[i]++;
          }
        }
        
        // After processing layer l, update prevLayerSpikes for next tick recurrent use
        // But only if we are in a layer that has recurrent connections (hidden layers)
        if (l < this.recurrentLayers.length) {
          // currentSpikes here is reference to prevLayerSpikesScratch? No.
        }

        if (l < this.layers.length - 1) currentSpikes = nextSpikesScratch;
      }
      
      // Update prevLayerSpikes for next micro-tick recurrent input
      for (let l = 0; l < this.nextLayerSpikesScratch.length; l++) {
        for (let i = 0; i < this.nextLayerSpikesScratch[l].length; i++) {
          this.prevLayerSpikesScratch[l][i] = this.nextLayerSpikesScratch[l][i];
        }
      }
    }

    for (let l = 0; l < this.lastActivitySpace.length; l++) {
      for (let i = 0; i < this.lastActivitySpace[l].length; i++) this.lastActivitySpace[l][i] /= microTicks;
    }
    return this.finalOutputsScratch.map(count => count / microTicks);
  }

  public applyPlasticity(inputs: number[] | Float32Array, learningRateShift: number = 0.01) {
    const microTicks = 5;
    const layerActivities: number[][] = this.layerSizes.slice(1).map(size => new Array(size).fill(0));
    const tempMembrane = this.membranePotentialsSpace.map(arr => [...arr]);
    const tempRefractory = this.refractoryCountersSpace.map(arr => [...arr]);

    for (let t = 0; t < microTicks; t++) {
      let currentSpikes = Array.from(inputs);
      for (let l = 0; l < this.layers.length; l++) {
        const layer = this.layers[l];
        const nextSpikes = new Array(layer.matrix.length).fill(0);
        for (let i = 0; i < layer.matrix.length; i++) {
          tempMembrane[l][i] *= this.leakFactor;
          if (tempRefractory[l][i] > 0) {
            tempRefractory[l][i]--;
            continue;
          }
          let sum = 0;
          for (let j = 0; j < layer.matrix[i].length; j++) sum += currentSpikes[j] * layer.matrix[i][j];
          tempMembrane[l][i] += sum;
          if (tempMembrane[l][i] >= this.threshold) {
            nextSpikes[i] = 1;
            layerActivities[l][i]++;
            tempMembrane[l][i] = 0;
            tempRefractory[l][i] = this.refractoryPeriod;
          }
        }
        currentSpikes = nextSpikes;
      }
    }

    let prevActivities = Array.from(inputs);
    for (let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l];
      const curActs = layerActivities[l].map(a => a / microTicks);
      for (let i = 0; i < layer.matrix.length; i++) {
        const toAct = curActs[i];
        if (toAct <= 0) continue;
        for (let j = 0; j < layer.matrix[i].length; j++) {
          const fromAct = prevActivities[j];
          const delta = (toAct * fromAct - 0.5 * toAct) * learningRateShift;
          layer.matrix[i][j] = Math.max(-2, Math.min(2, layer.matrix[i][j] + delta));
        }
      }
      if (l < this.recurrentLayers.length) {
        const recMatrix = this.recurrentLayers[l];
        for (let i = 0; i < recMatrix.length; i++) {
          const toAct = curActs[i];
          if (toAct <= 0) continue;
          for (let j = 0; j < recMatrix[i].length; j++) {
            const fromAct = curActs[j];
            const delta = (toAct * fromAct - 0.2 * toAct) * learningRateShift * 0.5;
            recMatrix[i][j] = Math.max(-1, Math.min(1, recMatrix[i][j] + delta));
          }
        }
      }
      prevActivities = curActs;
    }
  }

  public resetState() {
    this.membranePotentialsSpace.forEach(arr => arr.fill(0));
    this.refractoryCountersSpace.forEach(arr => arr.fill(0));
  }
}

