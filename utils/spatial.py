# utils/spatial.py
import math
from typing import List, Dict, Any, Tuple

class SpatialGrid:
    def __init__(self, width: int, height: int, cell_size: int):
        self.width = width
        self.height = height
        self.cell_size = cell_size
        self.cols = math.ceil(width / cell_size)
        self.rows = math.ceil(height / cell_size)
        self.grid: Dict[Tuple[int, int], List[Any]] = {}

    def _get_cell(self, x: float, y: float) -> Tuple[int, int]:
        return (int(x // self.cell_size), int(y // self.cell_size))

    def clear(self):
        self.grid = {}

    def insert(self, x: float, y: float, obj: Any):
        cell = self._get_cell(x, y)
        if cell not in self.grid:
            self.grid[cell] = []
        self.grid[cell].append(obj)

    def query_range(self, x: float, y: float, radius: float) -> List[Any]:
        """Query objects within radius of (x, y)"""
        results = []
        x_min, y_min = self._get_cell(x - radius, y - radius)
        x_max, y_max = self._get_cell(x + radius, y + radius)

        for r in range(y_min, y_max + 1):
            for c in range(x_min, x_max + 1):
                cell = (c, r)
                if cell in self.grid:
                    for obj in self.grid[cell]:
                        # Check actual distance
                        # Assume obj has .pos or is (x, y)
                        obj_pos = obj.pos if hasattr(obj, 'pos') else obj
                        if isinstance(obj_pos, (list, tuple)):
                            ox, oy = obj_pos[1], obj_pos[0] # Y, X in world?
                        else: # numpy or dict
                            ox, oy = (obj_pos[1], obj_pos[0]) if isinstance(obj_pos, (list, tuple)) else (obj_pos.x, obj_pos.y)
                        
                        dist_sq = (x - ox)**2 + (y - oy)**2
                        if dist_sq <= radius**2:
                            results.append(obj)
        return results
