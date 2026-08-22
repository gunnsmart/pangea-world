import { Point } from './types';

export interface SpatialEntity {
  id: string;
  pos: Point;
  [key: string]: any;
}

export class SpatialHashGrid<T extends SpatialEntity> {
  private grid: Map<string, T[]> = new Map();
  private cellSize: number;

  constructor(cellSize: number = 10) {
    this.cellSize = cellSize;
  }

  private getKey(x: number, y: number): string {
    const gx = Math.floor(x / this.cellSize);
    const gy = Math.floor(y / this.cellSize);
    return `${gx},${gy}`;
  }

  clear() {
    this.grid.clear();
  }

  insert(entity: T) {
    const key = this.getKey(entity.pos.x, entity.pos.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(entity);
  }

  query(pos: Point, radius: number): T[] {
    const results: T[] = [];
    const minX = Math.floor((pos.x - radius) / this.cellSize);
    const maxX = Math.floor((pos.x + radius) / this.cellSize);
    const minY = Math.floor((pos.y - radius) / this.cellSize);
    const maxY = Math.floor((pos.y + radius) / this.cellSize);

    const radiusSq = radius * radius;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        const entities = this.grid.get(key);
        if (entities) {
          for (const entity of entities) {
            const dx = entity.pos.x - pos.x;
            const dy = entity.pos.y - pos.y;
            if (dx * dx + dy * dy <= radiusSq) {
              results.push(entity);
            }
          }
        }
      }
    }
    return results;
  }
}
