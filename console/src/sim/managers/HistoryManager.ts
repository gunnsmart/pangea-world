
import { metricsManager } from '../SimulationMetricsManager';

export class HistoryManager {
  private static instance: HistoryManager;
  private historyEvents: any[] = [];
  private newHistoryEvents: any[] = [];
  milestones: Set<string> = new Set();

  constructor() {}

  static getInstance() {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager();
    }
    return HistoryManager.instance;
  }

  addEvent(day: number, type: 'milestone' | 'time_skip' | 'daily_summary' | 'birth' | 'death' | 'system', description: string, data?: any, importance: number = 0) {
    const event = {
      id: Math.random().toString(36).substring(2, 11),
      day,
      event_type: type,
      description,
      data,
      importance,
      created_at: new Date().toISOString()
    };
    this.historyEvents.push(event);
    
    // Buffer for worker-to-main sync limit
    if (this.newHistoryEvents.length < 50) {
      this.newHistoryEvents.push(event);
    } else {
      metricsManager.recordEventLoss(1);
    }
    
    if (type === 'milestone') {
      this.milestones.add(description);
    }

    // Keep memory in check
    if (this.historyEvents.length > 500) {
      this.historyEvents = this.historyEvents.slice(-500);
    }
  }

  getNewEvents() {
    return [...this.newHistoryEvents];
  }

  clearNewEvents() {
    this.newHistoryEvents = [];
  }

  clearAll() {
    this.historyEvents = [];
    this.newHistoryEvents = [];
    this.milestones.clear();
  }

  getMilestones() {
    return Array.from(this.milestones);
  }
}
