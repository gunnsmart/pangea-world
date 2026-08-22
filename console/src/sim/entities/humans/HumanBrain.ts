
import { SpikingNeuralNetwork } from '../../neural';
import { DynamicWorkerPool } from '../../DynamicWorkerPool';
import { rng } from '../../SeededRNG';
import { metricsManager } from '../../SimulationMetricsManager';

export class HumanBrain {
  public sensoryNet: SpikingNeuralNetwork;
  public homeostasisNet: SpikingNeuralNetwork;
  public motivationNet: SpikingNeuralNetwork;
  public motorNet: SpikingNeuralNetwork;
  
  private brainId: string;
  private lastModularActivations: any = null;

  public getModules() { return this.lastModularActivations; }
  public getInputDim() { return this.baseInputDim; }
  
  private baseInputDim = 262; // Updated: 134 base + 128 knowledge
  private driveDim = 16;
  private latentDim = 64;
  private intentDim = 48;
  private outputDim = 44;

  private experienceBuffer: { inputs: number[] | Float32Array, outputs: number[], reward: number }[] = [];
  private maxBufferSize = 50;

  private hpInputsScratch = new Float32Array(15);
  private motivationInputScratch = new Float32Array(this.latentDim + this.driveDim);
  private motorInputScratch = new Float32Array(this.intentDim + 4);

  constructor(id: string) {
    this.brainId = id;
    
    // 1. Sensory: 202 -> Latent(64)
    this.sensoryNet = new SpikingNeuralNetwork([this.baseInputDim, 128, this.latentDim]);
    // 2. Homeostasis: Physio(15) -> Drive(16)
    this.homeostasisNet = new SpikingNeuralNetwork([15, 32, this.driveDim]);
    // 3. Motivation: Latent(64) + Drive(16) -> Intense(48)
    this.motivationNet = new SpikingNeuralNetwork([this.latentDim + this.driveDim, 128, this.intentDim]);
    // 4. Motor: Intense(48) + Personality(4) -> Output(44)
    this.motorNet = new SpikingNeuralNetwork([this.intentDim + 4, 64, this.outputDim]);

    this.initModules();
  }

  private initModules() {
    this.initWorker(this.brainId + '_sensory', this.sensoryNet);
    this.initWorker(this.brainId + '_homeostasis', this.homeostasisNet);
    this.initWorker(this.brainId + '_motivation', this.motivationNet);
    this.initWorker(this.brainId + '_motor', this.motorNet);
  }

  private initWorker(id: string, net: SpikingNeuralNetwork) {
    DynamicWorkerPool.getInstance().executeTask('INIT_BRAIN', {
      id: id,
      layerSizes: net.layerSizes,
      layers: net.layers
    }).catch(() => {});
  }

  public recordExperience(inputs: number[] | Float32Array, outputs: number[], reward: number, multiplier: number = 1.0) {
    this.experienceBuffer.push({ inputs: new Float32Array(inputs), outputs: [...outputs], reward: reward * multiplier });
    if (this.experienceBuffer.length > this.maxBufferSize) {
      this.experienceBuffer.shift();
    }

    if (this.experienceBuffer.length % 20 === 0) {
      const weakIndices = this.experienceBuffer
        .map((e, idx) => ({ e, idx }))
        .filter(item => Math.abs(item.e.reward) < 0.1)
        .map(item => item.idx);
      
      if (weakIndices.length > 0) {
        const randomIndex = weakIndices[rng.nextInt(0, weakIndices.length)];
        this.experienceBuffer.splice(randomIndex, 1);
      }
    }

    const learningJitter = rng.next() < 0.3;
    if (this.experienceBuffer.length >= 10 && (this.experienceBuffer.length % 5 === 0 || learningJitter)) {
      this.learn(multiplier);
    }
  }

  private async learn(learningMultiplier: number = 1.0) {
    if (this.experienceBuffer.length === 0) return;

    // Pre-allocate for learn loop if needed, but learn is less frequent than predict
    // However, consistency is good.
    const motorSamples = this.experienceBuffer
      .filter(e => Math.abs(e.reward) > 0.05)
      .map(e => {
        // Re-run activations to get motor inputs
      const sensoryLatent = this.sensoryNet.predict(e.inputs);
        const physio = (e.inputs as Float32Array).subarray(0, 10);
        const hormones = (e.inputs as Float32Array).subarray(60, 65);
        
        this.hpInputsScratch.set(physio);
        this.hpInputsScratch.set(hormones, 10);
        const drives = this.homeostasisNet.predict(this.hpInputsScratch);

        this.motivationInputScratch.set(sensoryLatent);
        this.motivationInputScratch.set(drives, this.latentDim);
        const intents = this.motivationNet.predict(this.motivationInputScratch);

        const personality = (e.inputs as Float32Array).subarray(70, 74); // Personality is at 70-74 in the 134-base layout
        const motorInput = new Float32Array(this.intentDim + 4); 
        motorInput.set(intents);
        motorInput.set(personality, this.intentDim);

        const targets = [...e.outputs];
        const bestActionIdx = targets.indexOf(Math.max(...targets));
        if (e.reward > 0) {
          targets[bestActionIdx] = Math.min(1, targets[bestActionIdx] + e.reward * 0.1);
        } else {
          targets[bestActionIdx] = Math.max(0, targets[bestActionIdx] + e.reward * 0.1);
        }
        return { inputs: motorInput, targets };
      });

    if (motorSamples.length === 0) return;

    try {
      const res = await DynamicWorkerPool.getInstance().executeTask(
        'TRAIN_BATCH', 
        { id: this.brainId + '_motor', samples: motorSamples, learningRate: 0.1 * learningMultiplier }
      );
      
      if (res && res.layers) {
        this.motorNet.layers = res.layers;
        if (res.recurrentLayers) this.motorNet.recurrentLayers = res.recurrentLayers;
      }
    } catch (e) {
      // Worker training task might fail intermittently or be throttled
    }
  }

  public async predict(inputs: Float32Array): Promise<number[]> {
    const personality = inputs.subarray(70, 74); 
    
    try {
      const res = await DynamicWorkerPool.getInstance().executeTask(
        'PREDICT_MODULAR', 
        { id: this.brainId, inputs, personality },
        500,
        async () => {
          // Local fallback
          const sensoryOutput = this.sensoryNet.predict(inputs);
          const physioInputs = inputs.subarray(0, 10);
          const hormoneInputs = inputs.subarray(115, 120); // Corrected hormone index in the new layout
          
          this.hpInputsScratch.set(physioInputs);
          this.hpInputsScratch.set(hormoneInputs, 10);
          const driveOutput = this.homeostasisNet.predict(this.hpInputsScratch);

          this.motivationInputScratch.set(sensoryOutput);
          this.motivationInputScratch.set(driveOutput, this.latentDim);
          const intenseOutput = this.motivationNet.predict(this.motivationInputScratch);

          this.motorInputScratch.set(intenseOutput);
          this.motorInputScratch.set(personality, this.intentDim);
          const finalOutputs = this.motorNet.predict(this.motorInputScratch);
          
          return { 
            outputs: finalOutputs,
            modules: {
              sensory: Array.from(sensoryOutput),
              homeostasis: Array.from(driveOutput),
              motivation: Array.from(intenseOutput),
              motor: Array.from(finalOutputs)
            }
          };
        }
      );

      if (res && res.outputs) {
        metricsManager.recordSparsity(0.8); 
        this.lastModularActivations = res.modules;
        return res.outputs;
      }
    } catch (e) {
      // Prediction failed, fallback should have handled it if provided
    }

    return new Array(this.outputDim).fill(0);
  }

  public applyPlasticity(inputs: Float32Array) {
    this.sensoryNet.applyPlasticity(inputs, 0.005);
    
    // Apply plasticity to homeostasis as well - Reuse scratch
    const physioInputs = inputs.subarray(0, 10);
    const hormoneInputs = inputs.subarray(115, 120); // Sync with predict logic
    this.hpInputsScratch.set(physioInputs);
    this.hpInputsScratch.set(hormoneInputs, 10);
    this.homeostasisNet.applyPlasticity(this.hpInputsScratch, 0.002);
  }

  public async dreamConsolidation(quality: number) {
    await this.learn(1.5 * quality);
    // Synaptic scaling for all modules
    [this.sensoryNet, this.homeostasisNet, this.motivationNet, this.motorNet].forEach(net => {
      net.layers.forEach(l => l.matrix = l.matrix.map(row => row.map(w => w * 0.98)));
    });
    this.initModules();
  }

  public setWeights(modules: any) {
    if (modules.motor) this.motorNet.layers = modules.motor;
    if (modules.sensory) this.sensoryNet.layers = modules.sensory;
    if (modules.motivation) this.motivationNet.layers = modules.motivation;
    if (modules.homeostasis) this.homeostasisNet.layers = modules.homeostasis;
    this.initModules();
  }

  // Legacy compatibility
  get network() { return this.motorNet; }

  public static crossover(parentA: HumanBrain, parentB: HumanBrain): any {
    const crossoverNet = (netA: SpikingNeuralNetwork, netB: SpikingNeuralNetwork) => {
      const layers = netA.layers.map((layerA, l) => {
        const layerB = netB.layers[l];
        return {
          matrix: layerA.matrix.map((row, i) => 
            row.map((val, j) => rng.next() < 0.5 ? val : layerB.matrix[i][j])
          ),
          biases: layerA.biases.map((val, i) => rng.next() < 0.5 ? val : layerB.biases[i])
        };
      });
      return layers;
    };

    return {
      sensory: crossoverNet(parentA.sensoryNet, parentB.sensoryNet),
      homeostasis: crossoverNet(parentA.homeostasisNet, parentB.homeostasisNet),
      motivation: crossoverNet(parentA.motivationNet, parentB.motivationNet),
      motor: crossoverNet(parentA.motorNet, parentB.motorNet)
    };
  }
}

