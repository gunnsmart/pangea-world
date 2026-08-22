import { SpikingNeuralNetwork } from './neural';

const brains: Map<string, SpikingNeuralNetwork> = new Map();

self.onmessage = (e: MessageEvent) => {
  const { taskId, type, payload } = e.data;

  try {
    switch (type) {
      case 'INIT_BRAIN': {
        const { id, layerSizes, layers, inputs, hidden, outputs, weightsIH, weightsHO, biasH, biasO } = payload;
        const brain = new SpikingNeuralNetwork(layerSizes || [inputs, hidden, outputs]);
        if (layers) {
          brain.layers = layers;
        } else if (weightsIH) {
          // Legacy support
          brain.layers[0].matrix = weightsIH;
          brain.layers[brain.layers.length - 1].matrix = weightsHO;
          brain.layers[0].biases = biasH;
          brain.layers[brain.layers.length - 1].biases = biasO;
        }
        brains.set(id, brain);
        self.postMessage({ taskId, payload: { success: true } });
        break;
      }
      case 'PREDICT': {
        const { id, inputs } = payload;
        const brain = brains.get(id);
        if (brain) {
          const outputs = brain.predict(inputs);
          
          // Calculate sparsity: ratio of active neurons across all layers
          const totalNeurons = brain.layerSizes.slice(1).reduce((a, b) => a + b, 0);
          const activeNeurons = brain.lastActivitySpace.reduce((acc, layer) => acc + layer.filter(a => a > 0).length, 0);
          const sparsity = 1.0 - (activeNeurons / totalNeurons);

          self.postMessage({ taskId, payload: { 
            outputs,
            lastActivityH: Array.from(brain.lastActivityH),
            lastActivityO: Array.from(brain.lastActivityO),
            metrics: { sparsity }
          } });
        } else {
          self.postMessage({ taskId, error: 'Brain not found' });
        }
        break;
      }
      case 'PREDICT_MODULAR': {
        const { id, inputs, personality } = payload;
        const sensory = brains.get(id + '_sensory');
        const homeostasis = brains.get(id + '_homeostasis');
        const motivation = brains.get(id + '_motivation');
        const motor = brains.get(id + '_motor');

        if (sensory && homeostasis && motivation && motor) {
          const latent = sensory.predict(inputs);
          
          const physio = inputs.slice(0, 10);
          const hormones = inputs.slice(60, 65);
          const hpInputs = new Float32Array(15);
          hpInputs.set(physio);
          hpInputs.set(hormones, 10);
          const drives = homeostasis.predict(hpInputs);

          const motivationInput = new Float32Array(64 + 16);
          motivationInput.set(latent);
          motivationInput.set(drives, 64);
          const intents = motivation.predict(motivationInput);

          const motorInput = new Float32Array(48 + 4);
          motorInput.set(intents);
          motorInput.set(personality, 48);
          const outputs = motor.predict(motorInput);

          self.postMessage({ 
            taskId, 
            payload: { 
              outputs,
              modules: {
                sensory: Array.from(latent),
                homeostasis: Array.from(drives),
                motivation: Array.from(intents),
                motor: Array.from(outputs)
              }
            } 
          });
        } else {
          self.postMessage({ taskId, error: 'One or more brain modules not found' });
        }
        break;
      }
      case 'TRAIN': {
        const { id, inputs, targets, learningRate } = payload;
        const brain = brains.get(id);
        if (brain) {
          if (learningRate) brain.learningRate = learningRate;
          brain.train(inputs, targets);
          self.postMessage({ 
            taskId, 
            payload: { 
              layers: brain.layers,
              recurrentLayers: brain.recurrentLayers
            } 
          });
        } else {
          self.postMessage({ taskId, error: 'Brain not found' });
        }
        break;
      }
      case 'TRAIN_BATCH': {
        const { id, samples, learningRate } = payload;
        const brain = brains.get(id);
        if (brain) {
          if (learningRate) brain.learningRate = learningRate;
          for (const sample of samples) {
            brain.train(sample.inputs, sample.targets);
          }
          self.postMessage({ 
            taskId, 
            payload: { 
              layers: brain.layers,
              recurrentLayers: brain.recurrentLayers
            } 
          });
        } else {
          self.postMessage({ taskId, error: 'Brain not found' });
        }
        break;
      }
      default:
        self.postMessage({ taskId, error: 'Unknown task type' });
    }
  } catch (error: any) {
    self.postMessage({ taskId, error: error.message });
  }
};
