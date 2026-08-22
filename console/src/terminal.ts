import './sim/cli-mock';
import { World } from './sim/World';
import { DynamicWorkerPool } from './sim/DynamicWorkerPool';
import { neuralKnowledgeService } from './sim/NeuralKnowledgeService';

async function main() {
  console.log("\n[PANGEA_OS TERMINAL BOOT SEQUENCE iniciado...]");
  
  // 1. Setup Environment
  DynamicWorkerPool.getInstance().setFallbackMode(true);

  // 2. Initialize Services
  console.log("-> Loading Neural Knowledge Base...");
  await neuralKnowledgeService.init();

  // 3. Initialize World
  const world = new World(100, 100);
  console.log("-> Biosphere Initialized.");

  let tick = 0;
  const maxTicks = 5000; // Run for a while
  const simStepMinutes = 10;

  console.log("-> Starting Simulation Loop...\n");

  const runTick = async () => {
    await world.step(simStepMinutes);
    tick++;

    const day = world.time.day;
    const hour = world.time.hour.toString().padStart(2, '0');
    const min = world.time.minute.toString().padStart(2, '0');
    const humans = world.entities.humans.length;
    const animals = world.entities.animals.length;

    // Report status every 6 hours or if milestone happens
    if (tick % 6 === 0) {
      process.stdout.write(`\r[T-LINK] DAY ${day} | ${hour}:${min} | H: ${humans} | A: ${animals} | W: ${world.weather.currentState} (${world.weather.globalTemperature.toFixed(1)}°C)    `);
    }

    // Print logs that are new
    const lastLogs = world.logger.logs.slice(-1);
    if (lastLogs.length > 0) {
        // We could track last printed log, but for now just simple
    }

    if (tick < maxTicks && humans > 0) {
      setTimeout(runTick, 50); // Fast simulation
    } else {
      console.log("\n\nSimulation Terminated.");
      console.log(`Final Day: ${day}`);
      console.log(`Score: ${world.score}`);
      process.exit(0);
    }
  };

  runTick();
}

main().catch(err => {
  console.error("\n[FATAL ERROR]", err);
  process.exit(1);
});
