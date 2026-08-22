
import { HistoryManager } from './managers/HistoryManager';

export interface KPIStats {
  taskLatencyP50: number;
  taskLatencyP95: number;
  timeoutRate: number;
  queueDepth: number;
  spikeSparsity: number;
  plasticityMagnitude: number;
  fallbackCount: number;
  tickDuration: number;
  snapshotSize: number;
  eventLossCount: number;
  lockstepWaitTime: number;
}

export class SimulationMetricsManager {
  private static instance: SimulationMetricsManager;
  
  private latencies: number[] = [];
  private totalTasks = 0;
  private timeouts = 0;
  private fallbacks = 0;
  private queueDepths: number[] = [];
  
  private sparsityValues: number[] = [];
  private plasticityValues: number[] = [];

  private tickDurations: number[] = [];
  private snapshotSizes: number[] = [];
  private lockstepWaitDurations: number[] = [];
  private eventLossTotal = 0;

  private lastLogTime = 0;

  private constructor() {}

  static getInstance() {
    if (!SimulationMetricsManager.instance) {
      SimulationMetricsManager.instance = new SimulationMetricsManager();
    }
    return SimulationMetricsManager.instance;
  }

  recordLatency(ms: number) {
    this.latencies.push(ms);
    if (this.latencies.length > 1000) this.latencies.shift();
    this.totalTasks++;
  }

  recordTimeout() {
    this.timeouts++;
    this.totalTasks++;
  }

  recordFallback() {
    this.fallbacks++;
  }

  recordQueueDepth(depth: number) {
    this.queueDepths.push(depth);
    if (this.queueDepths.length > 100) this.queueDepths.shift();
  }

  recordSparsity(sparsity: number) {
    this.sparsityValues.push(sparsity);
    if (this.sparsityValues.length > 100) this.sparsityValues.shift();
  }

  recordPlasticity(magnitude: number) {
    this.plasticityValues.push(magnitude);
    if (this.plasticityValues.length > 100) this.plasticityValues.shift();
  }

  recordTickDuration(ms: number) {
    this.tickDurations.push(ms);
    if (this.tickDurations.length > 100) this.tickDurations.shift();
  }

  recordSnapshotSize(bytes: number) {
    this.snapshotSizes.push(bytes);
    if (this.snapshotSizes.length > 100) this.snapshotSizes.shift();
  }

  recordLockstepWait(ms: number) {
    this.lockstepWaitDurations.push(ms);
    if (this.lockstepWaitDurations.length > 100) this.lockstepWaitDurations.shift();
  }

  recordEventLoss(count: number) {
    this.eventLossTotal += count;
  }

  getKPIs(): KPIStats {
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const p50 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] : 0;
    const p95 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] : 0;

    const avgQueue = this.queueDepths.length > 0 ? this.queueDepths.reduce((a, b) => a + b, 0) / this.queueDepths.length : 0;
    const avgSparsity = this.sparsityValues.length > 0 ? this.sparsityValues.reduce((a, b) => a + b, 0) / this.sparsityValues.length : 0;
    const avgPlasticity = this.plasticityValues.length > 0 ? this.plasticityValues.reduce((a, b) => a + b, 0) / this.plasticityValues.length : 0;
    const avgTick = this.tickDurations.length > 0 ? this.tickDurations.reduce((a, b) => a + b, 0) / this.tickDurations.length : 0;
    const avgSnap = this.snapshotSizes.length > 0 ? this.snapshotSizes.reduce((a, b) => a + b, 0) / this.snapshotSizes.length : 0;
    const avgWait = this.lockstepWaitDurations.length > 0 ? this.lockstepWaitDurations.reduce((a, b) => a + b, 0) / this.lockstepWaitDurations.length : 0;

    return {
      taskLatencyP50: p50,
      taskLatencyP95: p95,
      timeoutRate: this.totalTasks > 0 ? this.timeouts / this.totalTasks : 0,
      queueDepth: avgQueue,
      spikeSparsity: avgSparsity,
      plasticityMagnitude: avgPlasticity,
      fallbackCount: this.fallbacks,
      tickDuration: avgTick,
      snapshotSize: avgSnap,
      eventLossCount: this.eventLossTotal,
      lockstepWaitTime: avgWait
    };
  }

  update(now: number, simDay: number) {
    // Log KPIs to timeline every 10 seconds (real time)
    if (now - this.lastLogTime > 10000) {
      const kpis = this.getKPIs();
      
      // Threshold check for critical regressions
      if (kpis.tickDuration > 16.6) { // Target < 60fps equivalent for the simulation loop
        HistoryManager.getInstance().addEvent(
          simDay,
          'system',
          `[KPI_ALERT] Critical Tick Duration: ${kpis.tickDuration.toFixed(2)}ms (Target < 16ms)`,
          { kpi: 'tickDuration', value: kpis.tickDuration },
          3
        );
      }

      if (kpis.timeoutRate > 0.05) {
        HistoryManager.getInstance().addEvent(
          simDay,
          'system',
          `[KPI_ALERT] High Timeout Rate: ${(kpis.timeoutRate * 100).toFixed(1)}%`,
          { kpi: 'timeoutRate', value: kpis.timeoutRate },
          3
        );
      }

      if (kpis.lockstepWaitTime > 5) {
        HistoryManager.getInstance().addEvent(
          simDay,
          'system',
          `[KPI_SYNC] World waiting for Neural: ${kpis.lockstepWaitTime.toFixed(2)}ms`,
          { kpi: 'lockstepWait', value: kpis.lockstepWaitTime },
          2
        );
      }

      const message = `[KPI] Tick: ${kpis.tickDuration.toFixed(2)}ms | Snap: ${(kpis.snapshotSize / 1024).toFixed(1)}KB | Latency P95: ${kpis.taskLatencyP95.toFixed(2)}ms | Timeout: ${(kpis.timeoutRate * 100).toFixed(1)}% | Q-Depth: ${kpis.queueDepth.toFixed(1)}`;
      
      HistoryManager.getInstance().addEvent(
        simDay,
        'system',
        message,
        kpis,
        1
      );

      this.lastLogTime = now;
    }
  }

  exportSnapshot() {
    if (typeof window === 'undefined' || typeof Blob === 'undefined') {
      console.warn('SimulationMetricsManager: exportSnapshot is only available in browser environments.');
      return;
    }
    const kpis = this.getKPIs();
    const snapshot = {
      timestamp: Date.now(),
      kpis,
      rawLatencies: this.latencies.slice(-50), // last 50 for sample
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pangea_kpi_snapshot_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const metricsManager = SimulationMetricsManager.getInstance();
