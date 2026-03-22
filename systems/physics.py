# systems/physics.py
import math
from utils.config import SOLAR_CONSTANT, ATP_PER_GLUCOSE_AEROBIC, ATP_PER_GLUCOSE_ANAEROBIC
from utils.config import GLUCOSE_ENERGY_KJ, ATP_ENERGY_KJ, CO2_PER_GLUCOSE

class Thermodynamics:
    @staticmethod
    def work_against_gravity(mass_kg: float, height_m: float) -> float:
        return mass_kg * 9.81 * height_m / 1000

    @staticmethod
    def heat_loss_radiation(temp_body: float, temp_env: float, surface_area: float = 1.8) -> float:
        h = 10.0
        return h * surface_area * (temp_body - temp_env) * 86400 / 1000

    @staticmethod
    def internal_energy_change(heat_in: float, work_done: float) -> float:
        return heat_in - work_done

    @staticmethod
    def entropy_production(heat_transferred: float, temperature_k: float) -> float:
        if temperature_k <= 0: return 0
        return heat_transferred / temperature_k

class PhotosynthesisEngine:
    @staticmethod
    def light_available(hour: int, cloud_cover: float = 0.0) -> float:
        if hour < 6 or hour > 18:
            return 0.0
        angle = math.pi * (hour - 6) / 12
        base = SOLAR_CONSTANT * 0.5 * math.sin(angle)
        return base * (1 - cloud_cover)

    @staticmethod
    def rate(light_wm2: float, co2_ppm: float, moisture: float, temp_c: float) -> float:
        if light_wm2 <= 0:
            return 0.0
        phi = 0.08
        I_sat = 800.0
        A_max = 25.0
        a = phi * light_wm2
        light_factor = (a * A_max) / (a + A_max)
        co2_factor = co2_ppm / (co2_ppm + 400)
        if moisture < 20:
            water_factor = moisture / 20
        elif moisture > 80:
            water_factor = 1 - (moisture - 80) / 40
        else:
            water_factor = 1.0
        t_opt = 25.0
        t_factor = math.exp(-0.05 * (temp_c - t_opt) ** 2)
        return max(0, light_factor * co2_factor * water_factor * t_factor)

    @staticmethod
    def glucose_produced(rate_umol: float, area_m2: float = 1.0, seconds: float = 86400) -> float:
        mol_co2 = rate_umol * 1e-6 * area_m2 * seconds
        mol_glucose = mol_co2 / CO2_PER_GLUCOSE
        return mol_glucose * 180.16

class MetabolismEngine:
    @staticmethod
    def bmr_allometric(mass_kg: float, temp_c: float = 37.0) -> float:
        bmr_base = 70 * (mass_kg ** 0.75)
        q10_factor = 2 ** ((temp_c - 37) / 10)
        return bmr_base * q10_factor

    @staticmethod
    def calories_burned(mass_kg: float, activity_level: float, duration_hours: float, temp_c: float = 37.0) -> float:
        bmr = MetabolismEngine.bmr_allometric(mass_kg, temp_c)
        return bmr * activity_level * (duration_hours / 24)

    @staticmethod
    def atp_from_glucose(glucose_g: float, o2_available: float, glucose_needed: float) -> dict:
        mol_glucose = glucose_g / 180.16
        if o2_available > 0.5:
            atp_mol = mol_glucose * ATP_PER_GLUCOSE_AEROBIC
            co2_mol = mol_glucose * 6
            efficiency = 0.38
            pathway = "aerobic"
        else:
            atp_mol = mol_glucose * ATP_PER_GLUCOSE_ANAEROBIC
            co2_mol = mol_glucose * 2
            efficiency = 0.022
            pathway = "anaerobic"
        energy_kj = atp_mol * ATP_ENERGY_KJ
        return {
            "atp_mol": atp_mol,
            "energy_kj": energy_kj,
            "co2_mol": co2_mol,
            "efficiency": efficiency,
            "pathway": pathway,
        }

class ChemistryEngine:
    @staticmethod
    def arrhenius_rate(rate_0: float, ea_kjmol: float, temp_c: float) -> float:
        T_ref = 298.15
        T = temp_c + 273.15
        R = 8.314
        exponent = -(ea_kjmol * 1000) / R * (1/T - 1/T_ref)
        return rate_0 * math.exp(min(exponent, 50))

    @staticmethod
    def decomposition_rate(biomass: float, temp_c: float, moisture: float) -> float:
        base_rate = 0.01
        rate = ChemistryEngine.arrhenius_rate(base_rate, 50, temp_c)
        m_factor = moisture / 60 if moisture < 60 else 1.0
        return biomass * rate * m_factor

    @staticmethod
    def nutrient_cycle(dead_biomass: float, temp_c: float, moisture: float) -> dict:
        decomp = ChemistryEngine.decomposition_rate(dead_biomass, temp_c, moisture)
        return {
            "nitrogen_available": decomp * 0.016,
            "phosphorus_available": decomp * 0.001,
            "co2_released": decomp * 0.44,
            "humus_formed": decomp * 0.1,
        }

    @staticmethod
    def fire_combustion(fuel_kg: float, o2_fraction: float = 0.21, humidity: float = 0.5) -> dict:
        if humidity >= 0.7:
            return {"heat_kj": 0, "co2_kg": 0, "ash_kg": 0, "ignited": False}
        efficiency = (1 - humidity) * o2_fraction / 0.21
        heat_kj = fuel_kg * 17000 * efficiency
        co2_kg = fuel_kg * 1.47 * efficiency
        ash_kg = fuel_kg * 0.05
        return {"heat_kj": heat_kj, "co2_kg": co2_kg, "ash_kg": ash_kg, "ignited": heat_kj > 0}

class PhysicsEngine:
    @staticmethod
    def oxygen_partial_pressure(elevation_m: float) -> float:
        P0, L, T0 = 101.325, 0.0065, 288.15
        g, M, R_gas = 9.81, 0.02897, 8.314
        P = P0 * (1 - L * elevation_m / T0) ** (g * M / (R_gas * L))
        return 0.2095 * P

class AtmosphereModel:
    def __init__(self):
        self.co2_ppm = 280.0
        self.o2_frac = 0.21
        self.ch4_ppb = 700.0

    def step_day(self, photosynthesis_mol: float, respiration_mol: float,
                 decomp_co2_mol: float, fire_co2_mol: float, animal_count: int) -> dict:
        co2_sink = photosynthesis_mol * 0.0001
        co2_source = (respiration_mol + decomp_co2_mol + fire_co2_mol) * 0.0001
        self.co2_ppm = max(150, min(2000, self.co2_ppm + co2_source - co2_sink))
        o2_delta = (photosynthesis_mol - respiration_mol) * 1e-9
        self.o2_frac = max(0.15, min(0.30, self.o2_frac + o2_delta))
        self.ch4_ppb = min(5000, self.ch4_ppb + animal_count * 0.001)
        temp_forcing = (self.co2_ppm - 280) * 0.0037 + (self.ch4_ppb - 700) * 0.001
        return {
            "co2_ppm": round(self.co2_ppm, 1),
            "o2_pct": round(self.o2_frac * 100, 2),
            "ch4_ppb": round(self.ch4_ppb, 1),
            "temp_forcing": round(temp_forcing, 3),
            "greenhouse_c": round(temp_forcing, 2),
        }

    @property
    def summary(self) -> dict:
        return {
            "CO2 (ppm)": round(self.co2_ppm, 1),
            "O2 (%)": round(self.o2_frac * 100, 2),
            "CH4 (ppb)": round(self.ch4_ppb, 1),
        }

class WorldPhysics:
    def __init__(self):
        self.thermo = Thermodynamics()
        self.photo = PhotosynthesisEngine()
        self.metab = MetabolismEngine()
        self.chem = ChemistryEngine()
        self.phys = PhysicsEngine()
        self.atmo = AtmosphereModel()
        self.entropy_total = 0.0

    def daily_update(self, hour: int, temp_c: float, moisture: float,
                     cloud_cover: float, biomass: float,
                     animal_count: int, fire_active: bool = False) -> dict:
        light = self.photo.light_available(hour, cloud_cover)
        photo_rate = self.photo.rate(light, self.atmo.co2_ppm, moisture, temp_c)
        glucose_g = self.photo.glucose_produced(photo_rate, area_m2=biomass*10)
        photo_mol = glucose_g / 180.16 * CO2_PER_GLUCOSE

        resp_mol = biomass * 0.01 + animal_count * 0.5
        dead = biomass * 0.02
        decomp = self.chem.nutrient_cycle(dead, temp_c, moisture)

        fire_result = {"co2_kg": 0}
        fire_mol = 0.0
        if fire_active:
            fire_result = self.chem.fire_combustion(biomass * 0.1, humidity=moisture/100)
            fire_mol = fire_result["co2_kg"] / 44 * 1000

        atmo_state = self.atmo.step_day(photo_mol, resp_mol, decomp["co2_released"], fire_mol, animal_count)
        temp_delta = atmo_state["greenhouse_c"]

        heat_dissipated = (resp_mol * 2.8 + fire_result.get("heat_kj",0) * 0.001)
        delta_s = self.thermo.entropy_production(heat_dissipated, temp_c+273.15)
        self.entropy_total += delta_s

        n_available = decomp["nitrogen_available"]
        p_available = decomp["phosphorus_available"]
        nutrient_factor = min(1.5, 1 + n_available*0.1 + p_available*0.5)

        return {
            "light_wm2": round(light, 1),
            "glucose_g": round(glucose_g, 2),
            "photo_rate": round(photo_rate, 4),
            "co2_ppm": atmo_state["co2_ppm"],
            "o2_pct": atmo_state["o2_pct"],
            "ch4_ppb": atmo_state["ch4_ppb"],
            "temp_forcing": atmo_state["temp_forcing"],
            "biomass_growth": glucose_g * 0.001 * nutrient_factor,
            "temp_delta": temp_delta,
            "nutrient_factor": round(nutrient_factor, 3),
            "nitrogen": round(n_available, 4),
            "entropy_delta": round(delta_s, 6),
            "entropy_total": round(self.entropy_total, 4),
            "fire_heat_kj": fire_result.get("heat_kj", 0),
        }

    def human_daily_physics(self, mass_kg: float, height_cm: float,
                            sex: str, activity: float, temp_c: float, elevation: int) -> dict:
        bmr = self.metab.bmr_allometric(mass_kg, temp_c)
        work_kj = self.thermo.work_against_gravity(mass_kg, elevation * 0.1)
        heat_loss = self.thermo.heat_loss_radiation(37.0, temp_c)
        du = self.thermo.internal_energy_change(-heat_loss, work_kj)
        po2 = self.phys.oxygen_partial_pressure(elevation)
        glucose_needed = bmr * activity / (GLUCOSE_ENERGY_KJ / 180.16 * 0.38)
        atp = self.metab.atp_from_glucose(glucose_needed, po2/21.0, glucose_needed)
        return {
            "bmr_kcal": round(bmr, 1),
            "work_kj": round(work_kj, 3),
            "heat_loss": round(heat_loss, 1),
            "du_kj": round(du, 2),
            "atp_mol": round(atp["atp_mol"], 4),
            "pathway": atp["pathway"],
            "po2_kpa": round(po2, 2),
            "efficiency": round(atp["efficiency"], 3),
        }