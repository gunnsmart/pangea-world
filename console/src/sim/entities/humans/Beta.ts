
import { Human } from './Human';
import { Point, AnimalAction } from '../../types';
import { BETA_PROFILE } from '../../../data/knowledge/beta';
import { TerrainMap } from '../../terrain';
import { WeatherSystem } from '../../environment';
import { materialDB } from '../../crafting-system';
import { SpatialHashGrid } from '../../spatial';
import { Animal } from '../../animals';
import { Structure } from '../../structures';

import { NamingSystem } from './NamingSystem';

export class SubjectBeta extends Human {
  constructor(pos: Point) {
    const { beta } = NamingSystem.getInitialNames();
    super('eve', beta, pos, 'f', BETA_PROFILE);
    
    // Eve's specific initial thought
    this.state.thought = "SYS_EVE_INITIALIZED: Establishing baseline telemetry. Biological sensors synced.";
    
    // Eve is more focused on botany and social
    this.state.skills.botany += 10;
    this.state.skills.social += 10;

    // Initial seeds
    const seeds = materialDB.get('allium_sativum');
    if (seeds) this.addToInventory({ ...seeds, quantity: 15 });
  }

  // Eve can have specialized decision logic
  protected async decideAction(
    terrain: TerrainMap, 
    weather: WeatherSystem, 
    humans: Human[],
    spatialHumans?: SpatialHashGrid<Human>,
    spatialAnimals?: SpatialHashGrid<Animal>,
    spatialStructures?: SpatialHashGrid<Structure>
  ) {
    await super.decideAction(terrain, weather, humans, spatialHumans, spatialAnimals, spatialStructures);
    
    // Eve specific override: If health is low or someone else is hurt, prefer MEDICINE/GATHER
    if (this.state.health < 80 && this.state.action === AnimalAction.WANDER) {
      this.state.action = AnimalAction.GATHER;
      this.state.thought = "EVE_RECOVERY_PROTOCOL: Seeking organic restoration materials.";
      console.log(`[Eve Specialized] Overriding WANDER with GATHER due to health.`);
    }
  }
}
