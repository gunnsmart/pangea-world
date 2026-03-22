# models/plant.py
from utils.config import MAP_SIZE
from models.terrain import TROPICAL, FOREST, GRASSLAND, SHALLOW, BEACH, MOUNTAIN, PEAK, DEEP_WATER

class PlantEcosystem:
    def __init__(self, terrain):
        self.global_biomass = 60.0
        self.terrain = terrain

    def step_day(self, moisture, temperature):
        growth_rate = 1.0
        if 40.0 <= moisture <= 80.0:
            growth_rate += 3.0
        elif moisture < 30.0:
            growth_rate -= 1.0
        if 22.0 <= temperature <= 32.0:
            growth_rate += 1.5
        self.global_biomass += growth_rate
        self.global_biomass = max(10.0, min(100.0, self.global_biomass))

        if self.terrain is not None:
            biome_rate = {
                TROPICAL: 0.5, FOREST: 0.3, GRASSLAND: 0.2,
                SHALLOW: 0.1, BEACH: 0.05, MOUNTAIN: 0.08,
                PEAK: 0.02, DEEP_WATER: 0,
            }
            weather_mult = growth_rate / 5.5
            SIZE = self.terrain.size
            for r in range(SIZE):
                for c in range(SIZE):
                    biome = self.terrain.template[r][c]
                    rate = biome_rate.get(biome, 0.1) * weather_mult
                    self.terrain.vegetation[r][c] = min(100, self.terrain.vegetation[r][c] + rate)

        return self.global_biomass

    def consume_at(self, r, c, amount):
        if self.terrain is None:
            return amount
        available = self.terrain.vegetation[r][c]
        eaten = min(available, amount)
        self.terrain.vegetation[r][c] = max(0, available - eaten)
        self.global_biomass = max(10, self.global_biomass - eaten * 0.01)
        return eaten