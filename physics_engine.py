"""
physics_engine.py — กฎจักรวาล: Thermodynamics, Chemistry, Biology, Physics
════════════════════════════════════════════════════════════════════════════════

ลำดับชั้นพลังงาน (Energy Hierarchy):
  ☀️ Solar → 🌱 Photosynthesis → 🍃 Biomass/Glucose
           → 🐾 Herbivore ATP  → 🐯 Carnivore ATP
           → 🧑 Human ATP      → 💡 Work/Heat/Entropy

กฎที่ใช้:
  1. Thermodynamics Law 1: dU = dQ - dW  (พลังงานอนุรักษ์)
  2. Thermodynamics Law 2: dS ≥ 0        (Entropy ไม่ลดลง)
  3. Fick's Law: diffusion ของ CO2/O2
  4. Arrhenius: reaction rate ∝ e^(-Ea/RT)
  5. Allometric scaling: metabolic rate ∝ mass^0.75
  6. ATP yield: Glucose → 36-38 ATP (aerobic), 2 ATP (anaerobic)
"""

import math

# ── ค่าคงที่จักรวาล ───────────────────────────────────────────────────────
R       = 8.314    # J/(mol·K) — gas constant
K_BOLTZ = 1.381e-23
SOLAR_CONSTANT = 1361.0  # W/m² — แสงอาทิตย์นอกชั้นบรรยากาศ

# ── ค่าคงที่ชีวเคมี ──────────────────────────────────────────────────────
ATP_PER_GLUCOSE_AEROBIC  = 36   # mol ATP / mol glucose (aerobic)
ATP_PER_GLUCOSE_ANAEROBIC = 2   # mol ATP / mol glucose (anaerobic)
GLUCOSE_ENERGY_KJ        = 2870.0  # kJ/mol (combustion of glucose)
ATP_ENERGY_KJ            = 30.5    # kJ/mol ATP hydrolysis
PHOTOSYNTHESIS_EFFICIENCY = 0.08   # 8% ประสิทธิภาพการสังเคราะห์แสง

# CO2 + H2O + light → glucose + O2
# 6CO2 + 6H2O → C6H12O6 + 6O2  (ΔG = +2870 kJ/mol, endothermic)
CO2_PER_GLUCOSE   = 6   # mol CO2 ต้องใช้
O2_PER_GLUCOSE    = 6   # mol O2 ผลิตได้
H2O_PER_GLUCOSE   = 6   # mol H2O ต้องใช้

# Respiration: C6H12O6 + 6O2 → 6CO2 + 6H2O + ATP
# (reverse photosynthesis + ATP synthesis)
O2_CONSUMED_PER_GLUCOSE  = 6
CO2_RELEASED_PER_GLUCOSE = 6


# ════════════════════════════════════════════════════════
# ⚡ THERMODYNAMICS
# ════════════════════════════════════════════════════════
class Thermodynamics:
    """
    กฎข้อ 1: dU = dQ - dW
    กฎข้อ 2: ΔS_universe ≥ 0
    """

    @staticmethod
    def internal_energy_change(heat_in: float, work_done: float) -> float:
        """dU = dQ - dW (kJ)"""
        return heat_in - work_done

    @staticmethod
    def work_against_gravity(mass_kg: float, height_m: float, g: float = 9.81) -> float:
        """W = mgh (J) — งานต้านแรงโน้มถ่วง (ปีนเขา)"""
        return mass_kg * g * height_m / 1000  # → kJ

    @staticmethod
    def heat_loss_radiation(temp_body: float, temp_env: float,
                            surface_area: float = 1.8) -> float:
        """Newton's law of cooling: Q = h·A·ΔT (kJ/day)"""
        h = 10.0  # heat transfer coeff W/(m²·K)
        delta_t = temp_body - temp_env
        return h * surface_area * delta_t * 86400 / 1000  # J/day → kJ/day

    @staticmethod
    def entropy_production(heat_transferred: float, temperature_k: float) -> float:
        """ΔS = Q/T (kJ/K) — entropy เพิ่มขึ้นเสมอ"""
        if temperature_k <= 0:
            return 0
        return heat_transferred / temperature_k

    @staticmethod
    def gibbs_free_energy(enthalpy: float, temp_k: float, entropy: float) -> float:
        """ΔG = ΔH - TΔS — ถ้า ΔG < 0 reaction เกิดเอง (spontaneous)"""
        return enthalpy - temp_k * entropy

    @staticmethod
    def carnot_efficiency(t_hot: float, t_cold: float) -> float:
        """η = 1 - T_cold/T_hot — ประสิทธิภาพสูงสุดของ heat engine"""
        if t_hot <= 0:
            return 0
        return max(0, 1 - t_cold / t_hot)


# ════════════════════════════════════════════════════════
# 🌱 PHOTOSYNTHESIS ENGINE
# ════════════════════════════════════════════════════════
class PhotosynthesisEngine:
    """
    6CO2 + 6H2O + light → C6H12O6 + 6O2
    อัตราขึ้นกับ: แสง, CO2, H2O, อุณหภูมิ
    """

    @staticmethod
    def light_available(hour: int, cloud_cover: float = 0.0) -> float:
        """
        W/m² ที่พืชได้รับ ตามชั่วโมงของวัน + เมฆ
        ใช้ sinusoidal daylight model
        """
        if hour < 6 or hour > 18:
            return 0.0
        # peak ตอนเที่ยง
        angle = math.pi * (hour - 6) / 12
        base  = SOLAR_CONSTANT * 0.5 * math.sin(angle)  # atm absorption ~50%
        return base * (1 - cloud_cover)

    @staticmethod
    def rate(light_wm2: float, co2_ppm: float, moisture: float,
             temp_c: float) -> float:
        """
        คืน μmol CO2 fixed / m² / s (gross photosynthesis rate)
        ใช้ Farquhar-von Caemmerer-Berry model (simplified)
        """
        if light_wm2 <= 0:
            return 0.0

        # light response curve (Michaelis-Menten)
        phi    = 0.08   # quantum yield
        I_sat  = 800.0  # W/m² saturation point
        A_max  = 25.0   # μmol CO2/m²/s (max rate)
        a = phi * light_wm2
        light_factor = (a * A_max) / (a + A_max)

        # CO2 factor (Michaelis-Menten, Km ≈ 400 ppm)
        co2_factor = co2_ppm / (co2_ppm + 400)

        # Water stress (0=dry → 1=optimal → ลดถ้าล้น)
        if moisture < 20:
            water_factor = moisture / 20
        elif moisture > 80:
            water_factor = 1 - (moisture - 80) / 40
        else:
            water_factor = 1.0

        # Temperature response (optimum 25°C)
        t_opt = 25.0
        t_factor = math.exp(-0.05 * (temp_c - t_opt) ** 2)

        rate = light_factor * co2_factor * water_factor * t_factor
        return max(0, rate)

    @staticmethod
    def glucose_produced(rate_umol: float, area_m2: float = 1.0,
                         seconds: float = 86400) -> float:
        """แปลง rate → กรัม glucose ต่อวัน"""
        # rate μmol CO2/m²/s → mol glucose/day
        mol_co2   = rate_umol * 1e-6 * area_m2 * seconds
        mol_glucose = mol_co2 / CO2_PER_GLUCOSE
        return mol_glucose * 180.16  # g/mol glucose


# ════════════════════════════════════════════════════════
# 🧬 ATP / METABOLISM ENGINE
# ════════════════════════════════════════════════════════
class MetabolismEngine:
    """
    Cellular respiration:
    C6H12O6 + 6O2 → 6CO2 + 6H2O + 36 ATP
    (Glycolysis → Krebs Cycle → Electron Transport Chain)
    """

    @staticmethod
    def atp_from_glucose(glucose_g: float, o2_available: float,
                         glucose_needed_aerobic: float) -> dict:
        """
        glucose_g        — กรัม glucose ที่มี
        o2_available     — relative O2 (0–1)
        คืน dict: atp_mol, co2_released_mol, efficiency
        """
        mol_glucose = glucose_g / 180.16

        if o2_available > 0.5:
            # Aerobic respiration (ประสิทธิภาพสูง)
            atp_mol    = mol_glucose * ATP_PER_GLUCOSE_AEROBIC
            co2_mol    = mol_glucose * CO2_RELEASED_PER_GLUCOSE
            efficiency = 0.38  # ~38% ของพลังงาน glucose → ATP
            pathway    = "aerobic"
        else:
            # Anaerobic — lactic acid (ประสิทธิภาพต่ำ, เกิด lactate)
            atp_mol    = mol_glucose * ATP_PER_GLUCOSE_ANAEROBIC
            co2_mol    = mol_glucose * 2
            efficiency = 0.022
            pathway    = "anaerobic"

        energy_kj = atp_mol * ATP_ENERGY_KJ
        return {
            "atp_mol":    atp_mol,
            "energy_kj":  energy_kj,
            "co2_mol":    co2_mol,
            "efficiency": efficiency,
            "pathway":    pathway,
        }

    @staticmethod
    def bmr_allometric(mass_kg: float, temp_c: float = 37.0) -> float:
        """
        Basal Metabolic Rate ใช้ Kleiber's Law:
        BMR = 70 × mass^0.75 (kcal/day) สำหรับสัตว์เลือดอุ่น
        ปรับตามอุณหภูมิ (Q10 rule: rate ×2 ทุก 10°C)
        """
        bmr_base = 70 * (mass_kg ** 0.75)
        # Q10 correction (reference temp 37°C)
        q10_factor = 2 ** ((temp_c - 37) / 10)
        return bmr_base * q10_factor

    @staticmethod
    def calories_burned(mass_kg: float, activity_level: float,
                        duration_hours: float, temp_c: float = 37.0) -> float:
        """
        kcal เผาผลาญ = BMR × activity_factor × (hours/24)
        activity_level: 1=นอน, 1.2=เดิน, 1.8=วิ่ง, 2.5=ล่าสัตว์
        """
        bmr = MetabolismEngine.bmr_allometric(mass_kg, temp_c)
        return bmr * activity_level * (duration_hours / 24)

    @staticmethod
    def protein_synthesis(amino_acids: float, atp_available: float) -> float:
        """
        การสังเคราะห์โปรตีน ต้องใช้ ATP ~4 ATP/peptide bond
        คืน กรัม protein ที่สร้างได้
        """
        bonds_possible = atp_available / 4
        return min(amino_acids * 0.9, bonds_possible * 0.11)  # ~0.11g/bond avg


# ════════════════════════════════════════════════════════
# ⚗️ CHEMISTRY ENGINE
# ════════════════════════════════════════════════════════
class ChemistryEngine:
    """
    Reaction rates, nutrient cycles, fire chemistry
    """

    @staticmethod
    def arrhenius_rate(rate_0: float, ea_kjmol: float, temp_c: float) -> float:
        """
        k = A × e^(-Ea/RT)
        rate_0  — rate ที่ 25°C
        ea_kjmol — activation energy (kJ/mol)
        คืน relative rate
        """
        T_ref = 298.15  # K (25°C)
        T     = temp_c + 273.15
        exponent = -(ea_kjmol * 1000) / R * (1/T - 1/T_ref)
        return rate_0 * math.exp(min(exponent, 50))

    @staticmethod
    def decomposition_rate(biomass: float, temp_c: float,
                           moisture: float) -> float:
        """
        อัตราย่อยสลายของ organic matter → nutrients
        อิง Ea ≈ 50 kJ/mol สำหรับ microbial decomposition
        """
        base_rate = 0.01  # 1%/day ที่ 25°C
        rate = ChemistryEngine.arrhenius_rate(base_rate, 50, temp_c)
        # moisture effect
        m_factor = moisture / 60 if moisture < 60 else 1.0
        return biomass * rate * m_factor

    @staticmethod
    def fire_combustion(fuel_kg: float, o2_fraction: float = 0.21,
                        humidity: float = 0.5) -> dict:
        """
        การเผาไหม้: C6H12O6 + 6O2 → 6CO2 + 6H2O + heat
        fuel_kg      — เชื้อเพลิง (biomass)
        humidity     — ความชื้น (0–1, ≥0.7 = ไม่ติดไฟ)
        คืน heat_kj, co2_kg, ash_kg
        """
        if humidity >= 0.7:
            return {"heat_kj": 0, "co2_kg": 0, "ash_kg": 0, "ignited": False}

        # heat of combustion wood ~17 MJ/kg
        efficiency = (1 - humidity) * o2_fraction / 0.21
        heat_kj    = fuel_kg * 17000 * efficiency
        co2_kg     = fuel_kg * 1.47 * efficiency   # stoichiometry
        ash_kg     = fuel_kg * 0.05                # 5% ash

        return {
            "heat_kj":  heat_kj,
            "co2_kg":   co2_kg,
            "ash_kg":   ash_kg,
            "ignited":  heat_kj > 0,
        }

    @staticmethod
    def nutrient_cycle(dead_biomass: float, temp_c: float,
                       moisture: float) -> dict:
        """
        Nitrogen & Phosphorus cycling
        Dead matter → mineralization → available nutrients
        """
        decomp = ChemistryEngine.decomposition_rate(dead_biomass, temp_c, moisture)
        return {
            "nitrogen_available":    decomp * 0.016,  # C:N ratio ~60:1
            "phosphorus_available":  decomp * 0.001,
            "co2_released":          decomp * 0.44,
            "humus_formed":          decomp * 0.1,
        }


# ════════════════════════════════════════════════════════
# ☢️ PHYSICS ENGINE
# ════════════════════════════════════════════════════════
class PhysicsEngine:
    """
    กลศาสตร์, แรง, การเคลื่อนที่
    """

    @staticmethod
    def kinetic_energy(mass_kg: float, velocity_ms: float) -> float:
        """KE = ½mv² (kJ)"""
        return 0.5 * mass_kg * velocity_ms ** 2 / 1000

    @staticmethod
    def potential_energy(mass_kg: float, height_m: float) -> float:
        """PE = mgh (kJ)"""
        return mass_kg * 9.81 * height_m / 1000

    @staticmethod
    def drag_force(velocity_ms: float, area_m2: float = 0.8,
                   rho_air: float = 1.225) -> float:
        """F_drag = ½ρCdAv² (N) — แรงต้านลม"""
        Cd = 1.0  # drag coefficient (human running)
        return 0.5 * rho_air * Cd * area_m2 * velocity_ms ** 2

    @staticmethod
    def terminal_velocity(mass_kg: float, area_m2: float = 0.8) -> float:
        """v_t = sqrt(2mg / ρCdA)"""
        rho, Cd, g = 1.225, 1.0, 9.81
        return math.sqrt(2 * mass_kg * g / (rho * Cd * area_m2))

    @staticmethod
    def pressure_altitude(elevation_m: float) -> float:
        """P = P0 × (1 - Lh/T0)^(gM/RL) — barometric formula (kPa)"""
        P0, L, T0 = 101.325, 0.0065, 288.15
        g, M, R_gas = 9.81, 0.02897, 8.314
        return P0 * (1 - L * elevation_m / T0) ** (g * M / (R_gas * L))

    @staticmethod
    def oxygen_partial_pressure(elevation_m: float) -> float:
        """pO2 = 0.2095 × total_pressure"""
        return 0.2095 * PhysicsEngine.pressure_altitude(elevation_m)


# ════════════════════════════════════════════════════════
# 🌍 ATMOSPHERE MODEL
# ════════════════════════════════════════════════════════
class AtmosphereModel:
    """
    ติดตาม CO2, O2, H2O vapor ในบรรยากาศ sim
    เริ่มต้น: CO2 ≈ 280 ppm (pre-industrial), O2 ≈ 21%
    """

    def __init__(self):
        self.co2_ppm   = 280.0   # ppm
        self.o2_frac   = 0.21    # fraction
        self.ch4_ppb   = 700.0   # methane (ppb) — from animals
        self.humidity  = 0.6     # relative humidity 0–1

    def step_day(self, photosynthesis_mol: float, respiration_mol: float,
                 decomp_co2_mol: float, fire_co2_mol: float,
                 animal_count: int) -> dict:
        """
        อัปเดต atmosphere ทุกวัน
        - photosynthesis: ดูด CO2, ปล่อย O2
        - respiration: ดูด O2, ปล่อย CO2
        - decomposition + fire: ปล่อย CO2
        - animals: ปล่อย CH4 (methane จากการย่อยอาหาร)
        """
        # CO2 budget (ppm เปลี่ยนนิดหน่อยต่อวัน)
        co2_sink   = photosynthesis_mol * 0.0001   # ดูด
        co2_source = (respiration_mol + decomp_co2_mol + fire_co2_mol) * 0.0001

        self.co2_ppm = max(150, min(2000, self.co2_ppm + co2_source - co2_sink))

        # O2 (inverse ของ CO2)
        o2_delta   = (photosynthesis_mol - respiration_mol) * 1e-9
        self.o2_frac = max(0.15, min(0.30, self.o2_frac + o2_delta))

        # CH4 จากสัตว์ (enteric fermentation)
        self.ch4_ppb = min(5000, self.ch4_ppb + animal_count * 0.001)

        # Greenhouse effect: CO2 และ CH4 เพิ่มอุณหภูมิ
        temp_forcing = (self.co2_ppm - 280) * 0.0037 + (self.ch4_ppb - 700) * 0.001

        return {
            "co2_ppm":       round(self.co2_ppm, 1),
            "o2_pct":        round(self.o2_frac * 100, 2),
            "ch4_ppb":       round(self.ch4_ppb, 1),
            "temp_forcing":  round(temp_forcing, 3),
            "greenhouse_c":  round(temp_forcing, 2),
        }

    @property
    def summary(self) -> dict:
        return {
            "CO2 (ppm)": round(self.co2_ppm, 1),
            "O2 (%)":    round(self.o2_frac * 100, 2),
            "CH4 (ppb)": round(self.ch4_ppb, 1),
        }


# ════════════════════════════════════════════════════════
# 🔗 UNIFIED WORLD PHYSICS — interface เดียวสำหรับ app.py
# ════════════════════════════════════════════════════════
class WorldPhysics:
    """
    รวมทุก engine ไว้ที่เดียว
    app.py สร้าง WorldPhysics() object เดียว แล้วเรียกผ่านนี้
    """

    def __init__(self):
        self.thermo  = Thermodynamics()
        self.photo   = PhotosynthesisEngine()
        self.metab   = MetabolismEngine()
        self.chem    = ChemistryEngine()
        self.phys    = PhysicsEngine()
        self.atmo    = AtmosphereModel()
        self.entropy_total = 0.0   # entropy สะสมของโลก (กฎข้อ 2)

    def daily_update(self, hour: int, temp_c: float, moisture: float,
                     cloud_cover: float, biomass: float,
                     animal_count: int, fire_active: bool = False) -> dict:
        """
        คำนวณทุก physics ใน 1 วัน
        คืน dict ผลลัพธ์สำหรับ update_world()
        """
        temp_k = temp_c + 273.15

        # ── แสงอาทิตย์ ───────────────────────────────────────────
        light = self.photo.light_available(hour, cloud_cover)

        # ── Photosynthesis ────────────────────────────────────────
        photo_rate = self.photo.rate(light, self.atmo.co2_ppm, moisture, temp_c)
        glucose_g  = self.photo.glucose_produced(photo_rate, area_m2=biomass * 10)
        photo_mol  = glucose_g / 180.16 * CO2_PER_GLUCOSE

        # ── Respiration (biomass + animals) ───────────────────────
        resp_mol = biomass * 0.01 + animal_count * 0.5

        # ── Decomposition ────────────────────────────────────────
        dead     = biomass * 0.02
        decomp   = self.chem.nutrient_cycle(dead, temp_c, moisture)

        # ── Fire ─────────────────────────────────────────────────
        fire_result = {"heat_kj": 0, "co2_kg": 0}
        fire_mol    = 0.0
        if fire_active:
            fire_result = self.chem.fire_combustion(
                biomass * 0.1, humidity=moisture / 100
            )
            fire_mol = fire_result["co2_kg"] / 44 * 1000

        # ── Atmosphere update ────────────────────────────────────
        atmo_state = self.atmo.step_day(
            photo_mol, resp_mol, decomp["co2_released"], fire_mol, animal_count
        )

        # ── Greenhouse warming ───────────────────────────────────
        temp_delta = atmo_state["greenhouse_c"]

        # ── Entropy (กฎข้อ 2) ────────────────────────────────────
        heat_dissipated = (resp_mol * 2.8 + fire_result["heat_kj"] * 0.001)
        delta_s = self.thermo.entropy_production(heat_dissipated, temp_k)
        self.entropy_total += delta_s

        # ── Nutrient availability → biomass growth modifier ───────
        n_available = decomp["nitrogen_available"]
        p_available = decomp["phosphorus_available"]
        nutrient_factor = min(1.5, 1 + n_available * 0.1 + p_available * 0.5)

        return {
            # พลังงาน
            "light_wm2":        round(light, 1),
            "glucose_g":        round(glucose_g, 2),
            "photo_rate":       round(photo_rate, 4),
            # atmosphere
            "co2_ppm":          atmo_state["co2_ppm"],
            "o2_pct":           atmo_state["o2_pct"],
            "ch4_ppb":          atmo_state["ch4_ppb"],
            "temp_forcing":     atmo_state["temp_forcing"],
            # ผลต่อ ecosystem
            "biomass_growth":   glucose_g * 0.001 * nutrient_factor,
            "temp_delta":       temp_delta,
            "nutrient_factor":  round(nutrient_factor, 3),
            "nitrogen":         round(n_available, 4),
            # Entropy
            "entropy_delta":    round(delta_s, 6),
            "entropy_total":    round(self.entropy_total, 4),
            # fire
            "fire_heat_kj":     fire_result["heat_kj"],
        }

    def human_daily_physics(self, mass_kg: float, height_cm: float,
                            sex: str, activity: float,
                            temp_c: float, elevation: int) -> dict:
        """
        คำนวณ physics ของมนุษย์ 1 คน ต่อวัน
        activity: 1.0=นอน, 1.2=เดิน, 1.8=วิ่ง
        """
        # BMR (allometric)
        bmr = self.metab.bmr_allometric(mass_kg, temp_c)

        # Work done (เดิน/ปีนเขา)
        elev_m   = elevation  # elevation is already in meters
        work_kj  = self.thermo.work_against_gravity(mass_kg, elev_m * 0.1)

        # Heat loss (radiation)
        heat_loss = self.thermo.heat_loss_radiation(37.0, temp_c)

        # dU = dQ - dW
        du = self.thermo.internal_energy_change(-heat_loss, work_kj)

        # pO2 ที่ elevation
        po2 = self.phys.oxygen_partial_pressure(elev_m)

        # ATP yield
        glucose_needed = bmr * activity / (GLUCOSE_ENERGY_KJ / 180.16 * 0.38)
        atp = self.metab.atp_from_glucose(
            glucose_needed, po2 / 21.0, glucose_needed
        )

        return {
            "bmr_kcal":   round(bmr, 1),
            "work_kj":    round(work_kj, 3),
            "heat_loss":  round(heat_loss, 1),
            "du_kj":      round(du, 2),
            "atp_mol":    round(atp["atp_mol"], 4),
            "pathway":    atp["pathway"],
            "po2_kpa":    round(po2, 2),
            "efficiency": round(atp["efficiency"], 3),
        }
