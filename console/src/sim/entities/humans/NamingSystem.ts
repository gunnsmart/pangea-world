
import { NamingPolicy } from '../../types';
import { rng } from '../../SeededRNG';

export class NamingSystem {
  private static policy: NamingPolicy = NamingPolicy.ADAM_EVE;

  static setPolicy(policy: NamingPolicy) {
    this.policy = policy;
  }

  static getInitialNames(): { alpha: string, beta: string } {
    switch (this.policy) {
      case NamingPolicy.ALPHA_BETA:
        return { alpha: 'ALPHA', beta: 'BETA' };
      case NamingPolicy.ADAM_EVE:
      default:
        return { alpha: 'Adam', beta: 'Eve' };
    }
  }

  static getChildName(gender: 'm' | 'f', generation: number): string {
    const prefixes = gender === 'm' ? ['Kai', 'Ren', 'Leo', 'Max', 'Abe'] : ['Mia', 'Lia', 'Joy', 'Ewa', 'Ada'];
    const suffix = generation > 1 ? `_${generation}` : '';
    const randomIndex = Math.floor(rng.next() * prefixes.length);
    return `${prefixes[randomIndex]}${suffix}`;
  }
}
