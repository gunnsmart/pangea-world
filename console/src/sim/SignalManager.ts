import { Signal, Point } from './types';

export class SignalManager {
  private signals: Signal[] = [];

  addSignal(signal: Signal) {
    this.signals.push(signal);
  }

  getSignalsInRange(pos: Point, range: number): Signal[] {
    return this.signals.filter(s => {
      const dx = s.pos.x - pos.x;
      const dy = s.pos.y - pos.y;
      return (dx * dx + dy * dy) < range * range;
    });
  }

  getAllSignals(): Signal[] {
    return [...this.signals];
  }

  cleanup(currentSimHour: number) {
    this.signals = this.signals.filter(s => currentSimHour < s.timestamp + s.duration);
  }
}
