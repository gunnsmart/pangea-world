import { metricsManager } from './SimulationMetricsManager';

type WorkerCtor = new () => Worker;
let NeuralWorkerCtor: WorkerCtor | null = null;

async function loadWorkerCtor(): Promise<WorkerCtor | null> {
  if (NeuralWorkerCtor) return NeuralWorkerCtor;
  if (typeof window === 'undefined') {
    // Node/tsx environment: Vite ?worker transforms are unavailable, use fallback executors
    return null;
  }
  try {
    const mod: any = await import('./neural.worker.ts?worker');
    NeuralWorkerCtor = mod.default;
  } catch (e) {
    console.warn('DynamicWorkerPool: worker module unavailable, using fallback mode.', e);
  }
  return NeuralWorkerCtor;
}

export class DynamicWorkerPool {
  private static instance: DynamicWorkerPool;
  private workers: { worker: Worker; activeTasks: number }[] = [];
  private minWorkers = 1;
  private maxWorkers = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
  private taskQueue: { 
    id: string; 
    type: string; 
    payload: any; 
    resolve: (val: any) => void; 
    reject: (err: any) => void;
    startTime: number;
    fallbackExecutor?: () => Promise<any>;
  }[] = [];
  private callbacks: Map<string, { resolve: (val: any) => void; reject: (err: any) => void; startTime: number }> = new Map();
  private taskIdCounter = 0;
  private isFallbackMode = false;

  private constructor() {
    // Lazy initialization
  }

  static getInstance() {
    if (!DynamicWorkerPool.instance) {
      DynamicWorkerPool.instance = new DynamicWorkerPool();
    }
    return DynamicWorkerPool.instance;
  }

  public setFallbackMode(enabled: boolean) {
    this.isFallbackMode = enabled;
    if (enabled) {
      console.warn('DynamicWorkerPool: Manual fallback mode enabled.');
    }
  }

  private scalePool() {
    if (this.isFallbackMode) return;
    
    // Calculate needed workers based on queue size and active tasks
    const totalActiveTasks = this.workers.reduce((sum, w) => sum + w.activeTasks, 0);
    const neededWorkers = Math.min(
      this.maxWorkers,
      Math.max(this.minWorkers, Math.ceil((totalActiveTasks + this.taskQueue.length) / 10))
    );

    while (this.workers.length < neededWorkers) {
      if (typeof Worker === 'undefined') {
        console.warn('DynamicWorkerPool: Worker is not defined. Falling back to synchronous mode.');
        this.isFallbackMode = true;
        break;
      }
      try {
        if (!NeuralWorkerCtor) {
          console.warn('DynamicWorkerPool: no worker constructor available. Falling back to synchronous mode.');
          this.isFallbackMode = true;
          break;
        }
        console.log(`DynamicWorkerPool: Creating worker ${this.workers.length + 1}/${neededWorkers}`);
        const worker = new NeuralWorkerCtor();
        const workerObj = { worker, activeTasks: 0 };
        
        worker.onmessage = (e) => {
          const { taskId, payload, error } = e.data;
          const cb = this.callbacks.get(taskId);
          if (cb) {
            metricsManager.recordLatency(performance.now() - cb.startTime);
            if (payload && payload.metrics) {
              if (payload.metrics.sparsity !== undefined) {
                metricsManager.recordSparsity(payload.metrics.sparsity);
              }
            }
            if (error) cb.reject(new Error(error));
            else cb.resolve(payload);
            this.callbacks.delete(taskId);
          }
          workerObj.activeTasks--;
          this.processQueue();
        };
        
        worker.onerror = (err) => {
          console.error('Worker error:', err);
          this.isFallbackMode = true; // Trigger fallback if workers are crashing
          this.processQueue();
        };

        this.workers.push(workerObj);
      } catch (err) {
        console.warn('Failed to create worker, falling back to synchronous mode.', err);
        this.isFallbackMode = true;
        break;
      }
    }

    // Scale down if too many idle workers
    if (this.workers.length > neededWorkers && this.workers.length > this.minWorkers) {
      const idleIndex = this.workers.findIndex(w => w.activeTasks === 0);
      if (idleIndex !== -1) {
        const w = this.workers.splice(idleIndex, 1)[0];
        w.worker.terminate();
      }
    }
  }

  private async processQueue() {
    metricsManager.recordQueueDepth(this.taskQueue.length);
    if (this.taskQueue.length === 0) return;
    
    if (this.isFallbackMode) {
      while (this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;
        if (task.fallbackExecutor) {
          metricsManager.recordFallback();
          try {
            const start = performance.now();
            const result = await task.fallbackExecutor();
            metricsManager.recordLatency(performance.now() - start);
            task.resolve(result);
          } catch (e) {
            task.reject(e);
          }
        } else {
          task.reject(new Error('Fallback mode active and no executor provided'));
        }
      }
      return;
    }

    this.scalePool();

    // Process as many tasks as possible
    while (this.taskQueue.length > 0) {
      this.workers.sort((a, b) => a.activeTasks - b.activeTasks);
      const workerObj = this.workers[0];

      if (workerObj && workerObj.activeTasks < 5) {
        const task = this.taskQueue.shift()!;
        workerObj.activeTasks++;
        this.callbacks.set(task.id, { resolve: task.resolve, reject: task.reject, startTime: task.startTime });
        workerObj.worker.postMessage({ taskId: task.id, type: task.type, payload: task.payload });
      } else {
        break;
      }
    }
  }

  async executeTask(type: string, payload: any, timeoutMs: number = 2000, fallbackExecutor?: () => Promise<any>): Promise<any> {
    await loadWorkerCtor();
    return new Promise((resolve, reject) => {
      const taskId = `task_${this.taskIdCounter++}`;
      const startTime = performance.now();

      const timeoutId = setTimeout(async () => {
        const cb = this.callbacks.get(taskId);
        if (cb) {
          metricsManager.recordTimeout();
          this.callbacks.delete(taskId);
          
          if (fallbackExecutor) {
            metricsManager.recordFallback();
            try {
              const res = await fallbackExecutor();
              resolve(res);
            } catch (e) {
              reject(new Error(`Task ${taskId} timed out and fallback failed: ${e}`));
            }
          } else {
            reject(new Error(`Task ${taskId} timed out after ${timeoutMs}ms`));
          }
        }
      }, timeoutMs);

      const wrappedResolve = (val: any) => {
        clearTimeout(timeoutId);
        resolve(val);
      };
      const wrappedReject = (err: any) => {
        clearTimeout(timeoutId);
        reject(err);
      };

      this.taskQueue.push({ 
        id: taskId, 
        type, 
        payload, 
        resolve: wrappedResolve, 
        reject: wrappedReject, 
        startTime,
        fallbackExecutor
      });
      this.processQueue();
    });
  }
}

