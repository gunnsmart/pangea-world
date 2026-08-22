
/**
 * Centralized Seeded RNG Service for Pangea
 * Ensures deterministic simulation paths across all modules.
 */
export class SeededRNG {
  private static instance: SeededRNG;
  private seed: number;

  constructor(seed: number = 1337) {
    this.seed = seed;
  }

  public static getInstance(): SeededRNG {
    if (!SeededRNG.instance) {
      SeededRNG.instance = new SeededRNG();
    }
    return SeededRNG.instance;
  }

  public setSeed(seed: number) {
    this.seed = seed;
  }

  /**
   * Linear Congruential Generator for speed and sufficient randomness
   */
  public next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  public nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextRange(min, max));
  }

  public uniform(min: number, max: number): number {
    return this.nextRange(min, max);
  }

  public randint(min: number, max: number): number {
    // Note: old version was inclusive of max (uniform(min, max + 1))
    return Math.floor(this.uniform(min, max + 1));
  }
}

export const rng = SeededRNG.getInstance();
