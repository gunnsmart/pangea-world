
import { AgentState } from '../action-system';

/**
 * Active Inference & Homeostatic Control Middleware
 * Connects biological internal states to Neural Network rewards and behavioral bias.
 */
export class ActiveInferenceMiddleware {
  // Ideal set-points for homeostasis
  private static SET_POINTS = {
    health: 100,
    hunger: 0,
    thirst: 0,
    energy: 100,
    mood: 80,
    stress: 0,
    bodyTemp: 37,
  };

  /**
   * Calculates the Homeostatic Drive (Discomfort)
   * Higher value means higher drive to act to return to equilibrium.
   */
  public static calculateHomeostaticDiscomfort(agent: AgentState): number {
    const hungerDrive = Math.pow(agent.stats.hunger / 100, 2);
    const thirstDrive = Math.pow(agent.stats.thirst / 100, 2);
    const energyDrive = Math.pow((100 - agent.stats.energy) / 100, 2);
    const stressDrive = Math.pow(agent.stats.stress / 100, 2);
    
    // Mean Squared Error relative to set-points
    return (hungerDrive + thirstDrive + energyDrive + stressDrive) / 4;
  }

  /**
   * Implementation of Homeostatic Reinforcement Learning (HRL)
   * Reward = Reduction in Discomfort
   */
  public static calculateHRLReward(prevStats: any, currentStats: any): number {
    const prevDiscomfort = this.calculateDiscomfortFromStats(prevStats);
    const currentDiscomfort = this.calculateDiscomfortFromStats(currentStats);
    
    // Reward is positive if discomfort decreased
    return prevDiscomfort - currentDiscomfort;
  }

  private static calculateDiscomfortFromStats(stats: any): number {
    const hunger = Math.pow((stats.hunger || 0) / 100, 2);
    const thirst = Math.pow((stats.thirst || 0) / 100, 2);
    const energy = Math.pow((100 - (stats.energy || 100)) / 100, 2);
    return (hunger + thirst + energy) / 3;
  }

  /**
   * Active Inference: Prediction Error (Surprise)
   * Compares the expected outcome of an action vs the actual outcome.
   * Higher surprise generates stress and forces the model to update.
   */
  public static calculatePredictionError(expected: any, actual: any): number {
    if (!expected) return 0;
    
    let totalError = 0;
    let counts = 0;

    // Compare stat changes
    if (expected.statDelta && actual.statDelta) {
        for (const key of Object.keys(expected.statDelta)) {
            const expVal = (expected.statDelta as any)[key] || 0;
            const actVal = (actual.statDelta as any)[key] || 0;
            totalError += Math.abs(expVal - actVal);
            counts++;
        }
    }

    // Compare world effect success
    if (expected.worldEffect && actual.worldEffect) {
        if (expected.worldEffect !== actual.worldEffect) {
            totalError += 0.5;
            counts++;
        }
    } else if (expected.worldEffect && !actual.worldEffect) {
        totalError += 1.0; // Failed to produce expected effect
        counts++;
    }

    return counts > 0 ? totalError / counts : 0;
  }

  /**
   * Internal Energy Coupling (Embodied Intelligence)
   * Throttles Neural Network performance based on physical constraints.
   * If energy is < 20%, signals are noisier or slower.
   */
  public static modulateSignal(signal: number, energy: number): number {
    if (energy > 30) return signal;
    
    // Add physiological noise when exhausted (deterministically)
    const exhaustion = (30 - energy) / 30;
    const noise = (Math.sin(signal * 100) * 0.5) * exhaustion * 0.2;
    return Math.max(-1, Math.min(1, signal * (1 - exhaustion * 0.3) + noise));
  }
}
