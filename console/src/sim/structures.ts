import { Point, StructureState } from './types';
import { MATERIALS } from './materials';

export class Structure implements StructureState {
  id: string;
  type: 'shelter' | 'campfire' | 'storage' | 'fence';
  pos: Point;
  health: number;
  maxHealth: number;
  progress: number;
  defenseBonus: number;
  capacity: number;
  flammability: number;
  insulation: number;
  materials: Record<string, number>; // Material name -> amount

  constructor(id: string, type: 'shelter' | 'campfire' | 'storage' | 'fence', pos: Point) {
    this.id = id;
    this.type = type;
    this.pos = pos;
    this.progress = 0;
    this.materials = {};

    switch (type) {
      case 'shelter':
        this.maxHealth = 500;
        this.defenseBonus = 10;
        this.capacity = 5;
        this.flammability = 0.6;
        this.insulation = 20;
        break;
      case 'campfire':
        this.maxHealth = 100;
        this.defenseBonus = 0;
        this.capacity = 0;
        this.flammability = 1.0;
        this.insulation = 0;
        break;
      case 'storage':
        this.maxHealth = 300;
        this.defenseBonus = 2;
        this.capacity = 100;
        this.flammability = MATERIALS.WOOD.chemical.flammability;
        this.insulation = 5;
        break;
      case 'fence':
        this.maxHealth = 200;
        this.defenseBonus = 5;
        this.capacity = 0;
        this.flammability = MATERIALS.WOOD.chemical.flammability;
        this.insulation = 0;
        break;
    }
    this.health = this.maxHealth;
  }

  addMaterial(material: string, amount: number) {
    if (!this.materials[material]) {
      this.materials[material] = 0;
    }
    this.materials[material] += amount;
    
    // Simple progress calculation based on total materials added
    // In a real game, each structure would have a specific recipe
    const totalMaterials = Object.values(this.materials).reduce((a, b) => a + b, 0);
    const requiredMaterials = this.type === 'storage' ? 30 : 15;
    
    this.progress = Math.min(100, (totalMaterials / requiredMaterials) * 100);
  }

  update(weather: any, terrain: any, deltaMinutes: number) {
    if (this.progress < 100) return; // Not built yet

    // Decay logic
    if (weather.currentState === 'พายุเข้า' || weather.currentState === 'ฝนตก') {
      // Rain/Storm damages structures over time, especially wood
      if (this.flammability > 0.5) { // Assuming high flammability means wood/thatch
        this.health -= 0.05 * deltaMinutes;
      }
    }

    // Campfire specific decay (burn out)
    if (this.type === 'campfire') {
      this.health -= 0.1 * deltaMinutes;
    }
  }

  isDestroyed(): boolean {
    return this.health <= 0;
  }
}
