
import { HumanState } from '../../types';
import { MetabolismEngine } from '../../physics';
import { AnimalAction } from '../../types';

import { rng } from '../../SeededRNG';

export class HumanNeeds {
  static update(state: HumanState, activityMultiplier: number, timeScale: number) {
    const beforeHunger = state.hunger;
    // BMR calculation
    const baseBmrKjPerMin = MetabolismEngine.bmrAllometric(state.weight, state.bodyTemp) / 1440;
    const muscleMultiplier = 1 + ((state.muscleMass - 30) * 0.005);
    const bmrKjPerMin = baseBmrKjPerMin * Math.max(0.8, muscleMultiplier);
    
    const totalCaloriesBurned = (bmrKjPerMin * activityMultiplier) * timeScale;
    
    // Digestion
    if (state.stomachContent > 0) {
      const digestedAmount = Math.min(state.stomachContent, 2.0 * timeScale);
      state.stomachContent -= digestedAmount;
      state.hunger -= digestedAmount * 2;
      state.energy += digestedAmount * 0.5;
      state.waste += digestedAmount * 0.5;
    }

    // Need updates with deterministic factors
    const individualFactor = (state.genetics?.metabolism || 50) / 50;
    state.hunger = Math.min(100, Math.max(0, state.hunger + (totalCaloriesBurned / 8400) * 100 * individualFactor));
    state.thirst = Math.min(100, Math.max(0, state.thirst + 0.416 * timeScale * individualFactor));
    
    // Waste logic
    if (state.waste >= 100) {
      state.waste = 0;
      state.stress += rng.nextRange(20, 40); // Jittered stress spike
    }

    // Energy logic
    if (state.action === AnimalAction.SLEEP) state.energy += 1.0 * timeScale;
    else if (state.action === AnimalAction.IDLE || state.action === AnimalAction.SOCIALIZE) state.energy += 0.1 * timeScale;
    else state.energy -= (activityMultiplier * 0.1) * timeScale * individualFactor;

    state.energy = Math.min(100, Math.max(0, state.energy));
    
    return beforeHunger - state.hunger; // Return reward (hunger reduction)
  }
}
