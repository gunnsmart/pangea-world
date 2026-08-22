
import { Human } from './Human';
import { Point, AnimalAction } from '../../types';
import { ALPHA_PROFILE } from '../../../data/knowledge/alpha';
import { TerrainMap } from '../../terrain';
import { WeatherSystem } from '../../environment';
import { materialDB } from '../../crafting-system';
import { SpatialHashGrid } from '../../spatial';
import { Animal } from '../../animals';
import { Structure } from '../../structures';

import { NamingSystem } from './NamingSystem';

export class SubjectAlpha extends Human {
  constructor(pos: Point) {
    const { alpha } = NamingSystem.getInitialNames();
    super('adam', alpha, pos, 'm', ALPHA_PROFILE);
    
    // Adam's specific initial thought
    this.state.thought = "SYS_ADAM_INITIALIZED: Scanning environment. Biometric stability nominal.";
    
    // Adam is more focused on hunting and building
    this.state.skills.hunting += 10;
    this.state.skills.construction += 10;

    // Initial seeds for farming
    const seeds = materialDB.get('oryza_sativa');
    if (seeds) this.addToInventory({ ...seeds, quantity: 10 });
  }

  // Adam can have specialized decision logic
  protected async decideAction(
    terrain: TerrainMap, 
    weather: WeatherSystem, 
    humans: Human[],
    spatialHumans?: SpatialHashGrid<Human>,
    spatialAnimals?: SpatialHashGrid<Animal>,
    spatialStructures?: SpatialHashGrid<Structure>
  ) {
    await super.decideAction(terrain, weather, humans, spatialHumans, spatialAnimals, spatialStructures);
    
    // Adam specific override: If hunger is moderate, prefer HUNT over GATHER
    if (this.state.hunger > 30 && this.state.action === AnimalAction.GATHER) {
      if (this.state.skills.hunting > 40) {
        this.state.action = AnimalAction.HUNT;
        this.state.thought = "ADAM_ADAPTATION: Resource density indicates hunting priority.";
        console.log(`[Adam Specialized] Overriding GATHER with HUNT due to hunger and skill.`);
      }
    }
  }
}
