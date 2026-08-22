
import { World } from './World';
import { neuralKnowledgeService } from './NeuralKnowledgeService';
import { metricsManager } from './SimulationMetricsManager';
import { DynamicWorkerPool } from './DynamicWorkerPool';
import { 
  WORKER_PROTOCOL_VERSION, 
  WorkerMessage, 
  InitPayload, 
  SnapshotPayload,
  WorkerMessageType 
} from './SimulationWorkerTypes';

let world: World | null = null;
let stepCount = 0;
let simulationSpeed = 50; 
let isPaused = false;
let lastTick = performance.now();
let worldSeed = 1337;
let useLockstep = false;

// Replay recording
const replayLog: { step: number, dt: number, interventions: any[] }[] = [];
let isRecording = false;

function postToMain<T>(type: string, payload: T) {
  const msg: WorkerMessage<T> = {
    version: WORKER_PROTOCOL_VERSION,
    type: type as any,
    payload,
    timestamp: Date.now()
  };
  self.postMessage(msg);
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data as WorkerMessage;
  const { type, payload } = msg;

  switch (type) {
    case WorkerMessageType.INIT:
      try {
        const { width, height, seed } = payload as InitPayload;
        worldSeed = seed || 1337;
        
        neuralKnowledgeService.init().catch(err => {
          console.error('Worker: Knowledge Service init failed:', err);
        });
        
        world = new World(width, height, worldSeed);
        lastTick = performance.now();
        
        const initialSnapshot = world.getSnapshot(true) as SnapshotPayload;
        initialSnapshot.stepCount = 0;
        initialSnapshot.isDelta = false;
        
        postToMain(WorkerMessageType.SNAPSHOT, initialSnapshot);
        startLoop();
      } catch (err) {
        postToMain(WorkerMessageType.ERROR, {
          message: `Initialization ERROR: ${err instanceof Error ? err.message : String(err)}`,
          time: 'INIT'
        });
      }
      break;
    case WorkerMessageType.SET_PAUSED:
      isPaused = payload;
      if (!isPaused) lastTick = performance.now();
      break;
    case WorkerMessageType.RESET:
      world = new World(50, 50, worldSeed);
      stepCount = 0;
      isPaused = true;
      lastTick = performance.now();
      postToMain(WorkerMessageType.SNAPSHOT, world.getSnapshot(true));
      break;
    case WorkerMessageType.INTERVENTION:
      if (world) {
        world.applyIntervention(payload);
        if (isRecording) {
          // Record intervention for the current step
        }
      }
      break;
    case WorkerMessageType.SET_FALLBACK_MODE:
      DynamicWorkerPool.getInstance().setFallbackMode(payload);
      break;
    case WorkerMessageType.SET_LOCKSTEP:
      useLockstep = payload;
      console.log(`Worker: Lockstep mode set to ${useLockstep}`);
      break;
    case WorkerMessageType.REPLAY_RECORD:
      if (world) {
        postToMain(WorkerMessageType.REPLAY_RECORD, {
          seed: world.seed,
          actionLog: world.actionLog
        });
      }
      break;
    case WorkerMessageType.START_REPLAY:
      // Implementation for starting a replay would create a new world with the same seed
      // and re-apply actions at specific steps.
      // This is a placeholder for the more complex replay logic if needed.
      break;
  }
};

async function startLoop() {
  if (!world) return;

  if (!isPaused) {
    try {
      const now = performance.now();
      const dt = now - lastTick;
      lastTick = now;
      
      const deltaMinutes = (dt * 2) / 60000;
      if (isNaN(deltaMinutes) || !isFinite(deltaMinutes)) {
        lastTick = performance.now();
        setTimeout(startLoop, simulationSpeed);
        return;
      }
      
      const stepStartTime = performance.now();
      
      // Lockstep execution: Wait for neural actions before proceeding
      let waitTime = 0;
      if (useLockstep) {
        const pool = DynamicWorkerPool.getInstance();
        // Check for pending neural tasks - Simplified check
        // A more robust way would be World tracking neural state, 
        // but for now we check if there's significant activity in the pool queue
        const waitStart = performance.now();
        // Artificial yield to allow neural tasks to resolve if we are in lockstep
        // In a real Lockstep, we would block until a 'NEURAL_READY' signal
        // For this hybrid SNN, we ensure at least one event loop cycle for callbacks
        await new Promise(resolve => setTimeout(resolve, 0));
        waitTime = performance.now() - waitStart;
        metricsManager.recordLockstepWait(waitTime);
      }

      await world.step(deltaMinutes);
      const stepEndTime = performance.now();
      metricsManager.recordTickDuration(stepEndTime - stepStartTime);

      stepCount++;
      
      const isFullSnapshot = stepCount % 100 === 1;
      const snapshot = world.getSnapshot(isFullSnapshot) as SnapshotPayload;
      const historyEvents = world.history.getNewEvents();
      world.history.clearNewEvents();
      world.clearNewEvents();
      
      const snapString = JSON.stringify(snapshot);
      metricsManager.recordSnapshotSize(snapString.length);
      
      metricsManager.update(Date.now(), world.time.day);

      snapshot.stepCount = stepCount;
      snapshot.isDelta = !isFullSnapshot;
      snapshot.kpis = metricsManager.getKPIs();
      
      postToMain(WorkerMessageType.SNAPSHOT, snapshot);

      if (historyEvents.length > 0) {
        postToMain(WorkerMessageType.HISTORY_EVENTS, historyEvents);
      }
    } catch (err) {
      console.error('Error in simulation loop:', err);
    }
  }

  setTimeout(startLoop, simulationSpeed);
}
