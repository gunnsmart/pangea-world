# systems/neural_brain.py
# Modular SNN brain ported from PANGEA_OS HumanBrain (4-network pipeline).
import hashlib

import numpy as np

from systems.snn import SpikingNeuralNetwork

BASE_INPUT_DIM = 262
DRIVE_DIM = 16
LATENT_DIM = 64
INTENT_DIM = 48
OUTPUT_DIM = 44

PERSONALITY_SLICE = slice(70, 74)
HORMONE_SLICE = slice(60, 65)

ALT_ACTION_DIMS = {
    "eat_raw": [0],
    "eat_cooked": [0, 13],
    "drink": [1],
    "sleep": [2],
    "rest": [3],
    "seek_food": [8, 10],
    "seek_water": [1],
    "seek_partner": [19],
    "seek_fire": [15],
    "mate": [22],
    "start_fire": [15],
    "cook": [13],
    "tend_fire": [15, 16],
    "gather": [8],
    "craft": [12],
    "explore": [27],
    "flee": [5, 7],
    "teach": [20],
    "rub": [12, 15],
    "share_food": [21],
    "comfort": [25],
    "build_shelter": [14],
    "toilet": [29],
}


def _stable_seed(text: str) -> int:
    return int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:12], 16)


class NeuralBrain:
    """4 SNN modules mirroring PANGEA_OS HumanBrain:

        sensory      [262 -> 128 -> 64]
        homeostasis  [15  -> 32  -> 16]
        motivation   [80  -> 128 -> 48]
        motor        [52  -> 64  -> 44]

    Input layout (262 dims):
        [0:10]    physio: hunger thirst tired cold fear lonely bored bladder health energy (/100)
        [10:60]   context: env scalars/flags
        [60:65]   hormones: cortisol oxytocin testosterone estrogen progesterone (/100)
        [65:70]   reserved
        [70:74]   personality traits (fixed per individual)
        [74:134]  extended context: skills/emotions/history
        [134:262] knowledge hash buckets (semantic facts)
    """

    def __init__(self, name: str, seed_offset: int = 0):
        self.name = name
        rng = np.random.default_rng(_stable_seed(name) + seed_offset)

        self.sensory = SpikingNeuralNetwork([BASE_INPUT_DIM, 128, LATENT_DIM], rng=rng)
        self.homeostasis = SpikingNeuralNetwork([15, 32, DRIVE_DIM], rng=rng)
        self.motivation = SpikingNeuralNetwork([LATENT_DIM + DRIVE_DIM, 128, INTENT_DIM], rng=rng)
        self.motor = SpikingNeuralNetwork([INTENT_DIM + 4, 64, OUTPUT_DIM], rng=rng)

        self.personality = rng.uniform(0.2, 0.9, 4)
        self.experience_count = 0
        self.last_modules = None
        self.last_output = None
        self.last_input = None

    @staticmethod
    def _knowledge_buckets(facts, n_dims=128):
        vec = np.zeros(n_dims)
        for fact in facts or []:
            h = int(hashlib.md5(str(fact).encode("utf-8")).hexdigest(), 16)
            idx = h % n_dims
            vec[idx] = min(1.0, vec[idx] + 0.4)
        return vec

    def encode(self, perc: dict, pain: dict, skills: dict, knows) -> np.ndarray:
        x = np.zeros(BASE_INPUT_DIM)
        d = lambda k: float(pain.get(k, 0.0))
        x[0:10] = [
            d("hunger"), d("thirst"), d("tired"), d("cold"), d("fear"),
            d("lonely"), d("bored"), d("bladder") * 100.0 / 100.0,
            float(perc.get("health", 100)) / 100.0,
            float(perc.get("energy", 50)) / 100.0,
        ]
        hour = float(perc.get("hour", 12))
        ctx = x[10:60]
        ctx[0] = (float(perc.get("temp_c", 28)) - 10.0) / 32.0
        ctx[1] = float(perc.get("moisture", 50)) / 100.0
        ctx[2] = np.sin(hour / 24 * 2 * np.pi)
        ctx[3] = np.cos(hour / 24 * 2 * np.pi)
        ctx[4] = 1.0 if perc.get("is_night") else 0.0
        ctx[5] = 1.0 if perc.get("danger") else 0.0
        ctx[6] = 1.0 if perc.get("has_food") else 0.0
        ctx[7] = 1.0 if perc.get("has_water") else 0.0
        ctx[8] = 1.0 if perc.get("has_fire") else 0.0
        ctx[9] = 1.0 if perc.get("has_shelter") else 0.0
        ctx[10] = min(1.0, float(perc.get("partner_dist", 99)) / 50.0)
        ctx[11] = min(1.0, float(perc.get("biome_food", 0)) / 100.0)
        ctx[12] = 1.0 if perc.get("sleeping") else 0.0
        inv = perc.get("inventory", [])
        ctx[13] = min(1.0, len(inv) / 20.0)
        ctx[14] = min(1.0, len(perc.get("vocabulary", [])) / 50.0)
        emo = perc.get("emotion_state", {})
        ctx[15] = float(emo.get("valence", 0)) 
        ctx[16] = float(emo.get("arousal", 0.3))
        ctx[17] = float(emo.get("trust", 0.5))
        ctx[18] = float(emo.get("dominance", 0.5))

        hor = perc.get("hormones", {})
        x[HORMONE_SLICE] = [
            float(hor.get("cortisol", 0)) / 100.0,
            float(hor.get("oxytocin", 0)) / 100.0,
            float(hor.get("testosterone", 0)) / 100.0,
            float(hor.get("estrogen", 0)) / 100.0,
            float(hor.get("progesterone", 0)) / 100.0,
        ]

        x[PERSONALITY_SLICE] = self.personality

        ext = x[74:134]
        sk = skills or {}
        for i, key in enumerate(("fire", "cook", "craft", "hunt", "gather")):
            ext[i] = min(1.0, float(sk.get(key, 0)) / 100.0)
        ext[5] = min(1.0, float(perc.get("age_years", 25)) / 80.0)
        ext[6] = 1.0 if perc.get("pregnant") else 0.0
        ext[7] = float(perc.get("gestation", 0)) / 100.0

        x[134:] = self._knowledge_buckets(knows)
        return x

    def forward(self, x: np.ndarray):
        latent = self.sensory.predict(x)
        hp_inputs = np.concatenate([x[0:10], x[HORMONE_SLICE]])
        drives = self.homeostasis.predict(hp_inputs)
        motivation_input = np.concatenate([latent, drives])
        intents = self.motivation.predict(motivation_input)
        motor_input = np.concatenate([intents, self.personality])
        outputs = self.motor.predict(motor_input)

        self.last_input = x
        self.last_output = outputs
        self.last_modules = {
            "sensory": latent.tolist(),
            "homeostasis": drives.tolist(),
            "motivation": intents.tolist(),
            "motor": outputs.tolist(),
        }
        return outputs, self.last_modules

    def map_action_bonus(self, outputs: np.ndarray) -> dict:
        raw = {}
        for action, dims in ALT_ACTION_DIMS.items():
            vals = [outputs[d] for d in dims if d < OUTPUT_DIM]
            raw[action] = sum(vals) / len(vals) if vals else 0.0
        return raw

    def reinforce(self, action: str, reward: float):
        """Train motor toward the chosen action slot scaled by reward."""
        if self.last_input is None:
            return
        target = self.last_output.copy()
        dims = ALT_ACTION_DIMS.get(action, [])
        for d_idx in dims:
            goal = max(0.05, min(1.0, 0.6 + reward * 0.4))
            target[d_idx] = target[d_idx] + (goal - target[d_idx]) * 0.35
        latent = self.sensory.predict(self.last_input)
        hp_inputs = np.concatenate([self.last_input[0:10], self.last_input[HORMONE_SLICE]])
        drives = self.homeostasis.predict(hp_inputs)
        intents = self.motivation.predict(np.concatenate([latent, drives]))
        motor_input = np.concatenate([intents, self.personality])
        self.motor.train(motor_input, target)

        if abs(reward) > 0.05 and dims:
            self.motor.reinforce_output_rows(
                dims, 0.04 * max(-1.0, min(1.0, reward))
            )

        self.experience_count += 1
        if self.experience_count % 5 == 0:
            lr_shift = 0.004 * max(-2.0, min(2.0, reward))
            self.sensory.apply_plasticity(self.last_input, abs(lr_shift) + 0.002)
            self.homeostasis.apply_plasticity(hp_inputs, 0.002)

    def dream(self, quality: float = 1.0):
        scale = max(0.9, 1.0 - 0.02 * quality)
        for net in (self.sensory, self.homeostasis, self.motivation, self.motor):
            net.dream(scale)

    def get_modules(self):
        return self.last_modules
