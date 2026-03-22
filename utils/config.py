# utils/config.py
# ค่าคงที่ของระบบทั้งหมด

# Simulation timing
SIM_STEP_INTERVAL = 1.0       # วินาทีจริงต่อ 1 ชั่วโมง sim
MAX_CATCHUP = 24              # step ต่อเฟรมสูงสุด (ป้องกัน lag)

# World
MAP_SIZE = 100                # ขนาดแผนที่ 100x100

# Biology constants
LIFESPAN_M = 35 * 365
LIFESPAN_F = 38 * 365
GESTATION_DAYS = 280
RECOVERY_DAYS = 365
MAX_BIRTHS_EVER = 8

# Human body constants (Mifflin-St Jeor)
BMR_CONST_M = 88.362
BMR_CONST_F = 447.593
BMR_COEFF_MASS = 10.0
BMR_COEFF_HEIGHT = 6.25
BMR_COEFF_AGE_M = 5.0
BMR_COEFF_AGE_F = 5.0
BMR_OFFSET_M = 5
BMR_OFFSET_F = -161

# Muscle/Fat ratios
MUSCLE_M = 0.40
MUSCLE_F = 0.32
FAT_M = 0.15
FAT_F = 0.25

# Pain tolerance
PAIN_TOLERANCE_M = 0.5
PAIN_TOLERANCE_F = 0.75

# Energy constants
GLUCOSE_ENERGY_KJ = 2870.0
ATP_ENERGY_KJ = 30.5
ATP_PER_GLUCOSE_AEROBIC = 36
ATP_PER_GLUCOSE_ANAEROBIC = 2

# Photosynthesis
SOLAR_CONSTANT = 1361.0
PHOTOSYNTHESIS_EFFICIENCY = 0.08

CO2_PER_GLUCOSE = 6      # 6 CO2 -> 1 glucose
O2_PER_GLUCOSE = 6       # 6 O2 produced per glucose

# Fire
IGNITION_TEMP_C = 300.0
FIRE_TEMP_C = 600.0
COOKING_TEMP_C = 100.0
MAILLARD_TEMP_C = 140.0
WARMTH_RADIUS = 3
FUEL_BURN_RATE = 0.5          # kg/hour

# Vision
VISION_RADIUS_DAY = 8
VISION_RADIUS_NIGHT = 3
VISION_RADIUS_FIRE = 6

# Sound
SOUND_RADIUS = 12