# models/terrain.py
import random
import math
from utils.config import MAP_SIZE

DEEP_WATER = 0
SHALLOW = 1
BEACH = 2
GRASSLAND = 3
TROPICAL = 4
FOREST = 5
MOUNTAIN = 6
PEAK = 7

BIOME_NAME = {
    DEEP_WATER: "ทะเลสาบ",
    SHALLOW: "ริมน้ำ",
    BEACH: "ชายหาด",
    GRASSLAND: "ทุ่งหญ้า",
    TROPICAL: "เขตร้อนชื้น",
    FOREST: "ป่าทึบ",
    MOUNTAIN: "ภูเขา",
    PEAK: "ยอดเขา/ถ้ำ",
}

BIOME_COLOR = {
    DEEP_WATER: (30, 100, 200),
    SHALLOW: (80, 160, 220),
    BEACH: (210, 190, 130),
    GRASSLAND: (80, 180, 60),
    TROPICAL: (20, 140, 60),
    FOREST: (34, 100, 34),
    MOUNTAIN: (120, 110, 90),
    PEAK: (200, 200, 200),
}

def _noise(r, c, scale, seed):
    random.seed(seed + int(r * 997 + c * 31))
    base = math.sin(r / scale) * math.cos(c / scale)
    return base + random.uniform(-0.3, 0.3)

def _generate_heightmap(size, seed=42):
    hmap = [[0.0]*size for _ in range(size)]
    for r in range(size):
        for c in range(size):
            h = _noise(r, c, 12.0, seed)
            h += _noise(r, c, 5.0, seed+1) * 0.5
            h += _noise(r, c, 2.5, seed+2) * 0.25
            hmap[r][c] = h
    mn = min(hmap[r][c] for r in range(size) for c in range(size))
    mx = max(hmap[r][c] for r in range(size) for c in range(size))
    for r in range(size):
        for c in range(size):
            hmap[r][c] = (hmap[r][c] - mn) / (mx - mn + 1e-9)
    return hmap

def _carve_river(template, size, seed=7):
    random.seed(seed)
    c = random.randint(size//4, size*3//4)
    for r in range(size):
        c = max(1, min(size-2, c + random.randint(-1,1)))
        for dc in range(-1,2):
            template[r][c+dc] = SHALLOW
    return template

def _place_lake(template, size, seed=13):
    random.seed(seed)
    cx = size//2 + random.randint(-4,4)
    cy = size//2 + random.randint(-4,4)
    radius = random.randint(4,6)
    for r in range(size):
        for c in range(size):
            dist = math.sqrt((r-cx)**2 + (c-cy)**2)
            if dist < radius:
                template[r][c] = DEEP_WATER
            elif dist < radius+2:
                template[r][c] = SHALLOW
    return template

def _island_mask(size):
    mask = [[0.0]*size for _ in range(size)]
    cx, cy = size/2, size/2
    rx, ry = size*0.42, size*0.42
    for r in range(size):
        for c in range(size):
            dx = (r-cx)/rx
            dy = (c-cy)/ry
            dist = math.sqrt(dx*dx+dy*dy)
            mask[r][c] = max(0, 1-dist)
    return mask

def _generate_template(size, seed=42):
    hmap = _generate_heightmap(size, seed)
    island = _island_mask(size)
    template = [[DEEP_WATER]*size for _ in range(size)]
    for r in range(size):
        for c in range(size):
            h = hmap[r][c] * island[r][c]
            if h < 0.05: template[r][c] = DEEP_WATER
            elif h < 0.12: template[r][c] = SHALLOW
            elif h < 0.18: template[r][c] = BEACH
            elif h < 0.38: template[r][c] = TROPICAL if abs(r-size/2)/(size/2) < 0.3 else GRASSLAND
            elif h < 0.55: template[r][c] = FOREST
            elif h < 0.70: template[r][c] = MOUNTAIN
            else: template[r][c] = PEAK
    template = _place_lake(template, size, seed+5)
    template = _carve_river(template, size, seed+7)
    return template

class TerrainMap:
    def __init__(self, seed=42):
        self.size = MAP_SIZE
        self.template = _generate_template(MAP_SIZE, seed)
        self.vegetation = [[self._init_veg(r,c) for c in range(MAP_SIZE)] for r in range(MAP_SIZE)]

    def _init_veg(self, r, c):
        b = self.template[r][c]
        bases = {
            DEEP_WATER:0, SHALLOW:20, BEACH:10,
            GRASSLAND: random.randint(50,80),
            TROPICAL: random.randint(70,100),
            FOREST: random.randint(60,100),
            MOUNTAIN: random.randint(20,50),
            PEAK: random.randint(0,20),
        }
        return bases.get(b, 50)

    def regrow(self):
        rates = {TROPICAL:0.4, FOREST:0.2, GRASSLAND:0.15,
                 SHALLOW:0.05, BEACH:0.02, MOUNTAIN:0.05, PEAK:0.01}
        for r in range(self.size):
            for c in range(self.size):
                rate = rates.get(self.template[r][c], 0)
                if rate:
                    self.vegetation[r][c] = min(100, self.vegetation[r][c] + rate)

    def get_info(self, r, c):
        b = self.template[r][c]
        return {
            "type": BIOME_NAME[b],
            "biome_id": b,
            "food_level": self.vegetation[r][c],
            "has_herb": b in (SHALLOW, TROPICAL, FOREST) and random.random() < 0.2,
            "is_water": b in (DEEP_WATER, SHALLOW),
            "color": BIOME_COLOR[b],
        }

    def get_color(self, r, c):
        return BIOME_COLOR.get(self.template[r][c], (100,100,100))

    def get_elevation(self, biome_id: int) -> float:
        el = {DEEP_WATER:0, SHALLOW:0.5, BEACH:1, GRASSLAND:2,
              TROPICAL:2, FOREST:3, MOUNTAIN:5, PEAK:10}
        return el.get(biome_id, 1)