# systems/snn.py
# NumPy port of PANGEA_OS src/sim/neural.ts (SpikingNeuralNetwork)
import numpy as np

THRESHOLD = 1.0
LEAK = 0.85
REFRACTORY = 2


class Layer:
    __slots__ = ("W", "b")

    def __init__(self, W: np.ndarray, b: np.ndarray):
        self.W = W
        self.b = b


class SpikingNeuralNetwork:
    """Leaky Integrate-and-Fire network with time-shifted recurrent hidden layers.

    Semantics mirrored from neural.ts:
      - predict_spiking: micro-tick loop; membrane leak -> refractory skip ->
        input dot + prev-spike recurrent dot -> threshold/reset.
        Output layer emits rate codes (spike count / micro_ticks).
      - apply_plasticity: replay on temp state, Oja-style updates
        dW = (post*pre - 0.5*post)*lr (clamp +-2),
        dR = (post_i*post_j - 0.2*post_i)*lr*0.5 (clamp +-1).
      - train: plain sigmoid backprop (matches NeuralNetwork.train).
    """

    def __init__(self, layer_sizes, rng: np.random.Generator = None):
        self.layer_sizes = list(layer_sizes)
        self.rng = rng or np.random.default_rng()
        self.layers: list[Layer] = []
        for i in range(1, len(self.layer_sizes)):
            rows, cols = self.layer_sizes[i], self.layer_sizes[i - 1]
            self.layers.append(Layer(
                self.rng.uniform(-1.0, 1.0, (rows, cols)),
                self.rng.uniform(-1.0, 1.0, rows),
            ))
        n_hidden_slots = len(self.layer_sizes) - 2
        self.membrane = [np.zeros(s) for s in self.layer_sizes[1:]]
        self.refractory = [np.zeros(s, dtype=np.int32) for s in self.layer_sizes[1:]]
        self.last_activity = [np.zeros(s) for s in self.layer_sizes[1:]]
        self.recurrent = [
            self.rng.uniform(-0.25, 0.25, (s, s)) for s in self.layer_sizes[1:-1]
        ]
        self._prev_spikes = [np.zeros(r.shape[0]) for r in self.recurrent]
        self.learning_rate = 0.1

    @property
    def n_inputs(self):
        return self.layer_sizes[0]

    @property
    def n_outputs(self):
        return self.layer_sizes[-1]

    def predict(self, inputs, micro_ticks: int = 6) -> np.ndarray:
        x = np.asarray(inputs, dtype=np.float64)
        final = np.zeros(self.n_outputs)
        for act in self.last_activity:
            act.fill(0)
        for ps in self._prev_spikes:
            ps.fill(0)

        last_idx = len(self.layers) - 1
        for _ in range(micro_ticks):
            current = x
            next_spikes = None
            for l, layer in enumerate(self.layers):
                m = self.membrane[l]
                r = self.refractory[l]
                m *= LEAK
                ready = r <= 0
                sums = current @ layer.W.T
                if l < len(self.recurrent):
                    sums = sums + self._prev_spikes[l] @ self.recurrent[l].T
                integrated = np.where(ready, m + sums, m)
                fire = ready & (integrated >= THRESHOLD)
                self.membrane[l] = np.where(fire, 0.0, integrated)
                self.refractory[l] = np.where(
                    fire, REFRACTORY, np.maximum(0, r - 1)
                ).astype(np.int32)
                self.last_activity[l] += fire.astype(np.float64)

                if l < last_idx:
                    if next_spikes is None:
                        next_spikes = [None] * last_idx
                    spikes_now = fire.astype(np.float64)
                    next_spikes[l] = spikes_now
                    current = spikes_now
                else:
                    final += fire.astype(np.float64)

            for k in range(len(self.recurrent)):
                src = next_spikes[k] if next_spikes is not None and k < len(next_spikes) else None
                if src is not None:
                    self._prev_spikes[k] = src.copy()

        for act in self.last_activity:
            act /= micro_ticks
        return final / micro_ticks

    def apply_plasticity(self, inputs, learning_rate_shift: float = 0.01):
        micro_ticks = 5
        x = np.asarray(inputs, dtype=np.float64)
        activities = [np.zeros(s) for s in self.layer_sizes[1:]]
        temp_membrane = [m.copy() for m in self.membrane]
        temp_refractory = [r.copy() for r in self.refractory]

        for _ in range(micro_ticks):
            current = x
            for l, layer in enumerate(self.layers):
                tm = temp_membrane[l]
                tr = temp_refractory[l]
                tm *= LEAK
                ready = tr <= 0
                sums = current @ layer.W.T
                integrated = np.where(ready, tm + sums, tm)
                fire = ready & (integrated >= THRESHOLD)
                temp_membrane[l] = np.where(fire, 0.0, integrated)
                temp_refractory[l] = np.where(
                    fire, REFRACTORY, np.maximum(0, tr - 1)
                ).astype(np.int32)
                activities[l] += fire.astype(np.float64)
                current = fire.astype(np.float64)

        cur_acts = [a / micro_ticks for a in activities]
        prev_acts = x
        for l, layer in enumerate(self.layers):
            to_act = cur_acts[l]
            mask = to_act > 0
            if mask.any():
                delta_ff = (to_act[:, None] * prev_acts[None, :] - 0.5 * to_act[:, None]) * learning_rate_shift
                delta_ff[~mask, :] = 0.0
                layer.W = np.clip(layer.W + delta_ff, -2.0, 2.0)
            if l < len(self.recurrent):
                R = self.recurrent[l]
                delta_r = (to_act[:, None] * to_act[None, :] - 0.2 * to_act[:, None]) * learning_rate_shift * 0.5
                delta_r[~mask, :] = 0.0
                self.recurrent[l] = np.clip(R + delta_r, -1.0, 1.0)
            prev_acts = cur_acts[l]

    def train(self, inputs, targets):
        x = np.asarray(inputs, dtype=np.float64)
        y = np.asarray(targets, dtype=np.float64)
        acts = [x]
        for layer in self.layers:
            acts.append(1.0 / (1.0 + np.exp(-(acts[-1] @ layer.W.T + layer.b))))
        errors = y - acts[-1]
        lr = self.learning_rate
        for l in range(len(self.layers) - 1, -1, -1):
            layer = self.layers[l]
            outputs = acts[l + 1]
            delta = errors * outputs * (1.0 - outputs)
            layer.b += lr * delta
            prev_errors = errors @ layer.W
            layer.W += lr * np.outer(delta, acts[l])
            errors = prev_errors

    def dream(self, scale: float = 0.98):
        for layer in self.layers:
            layer.W *= scale
            layer.b *= scale
        for i in range(len(self.recurrent)):
            self.recurrent[i] *= scale

    def reinforce_output_rows(self, dims, delta: float):
        """Direct Hebbian-style row scaling on the output layer so reward
        translates into spiking-rate changes (sigmoid backprop alone couples
        weakly to rate codes)."""
        last = self.layers[-1]
        for d_idx in dims:
            if 0 <= d_idx < last.W.shape[0]:
                last.W[d_idx] = np.clip(last.W[d_idx] * (1.0 + delta), -4.0, 4.0)
                last.b[d_idx] = np.clip(last.b[d_idx] + delta * 0.05, -2.0, 2.0)

    def reset_state(self):
        for m in self.membrane:
            m.fill(0)
        for r in self.refractory:
            r.fill(0)

    def get_layers(self):
        return {
            "layer_sizes": self.layer_sizes,
            "layers": [{"W": l.W.tolist(), "b": l.b.tolist()} for l in self.layers],
            "recurrent": [r.tolist() for r in self.recurrent],
        }

    def set_layers(self, data: dict):
        self.layer_sizes = data["layer_sizes"]
        self.layers = [Layer(np.array(l["W"]), np.array(l["b"])) for l in data["layers"]]
        self.recurrent = [np.array(r) for r in data.get("recurrent", [])]
        self.membrane = [np.zeros(s) for s in self.layer_sizes[1:]]
        self.refractory = [np.zeros(s, dtype=np.int32) for s in self.layer_sizes[1:]]
        self.last_activity = [np.zeros(s) for s in self.layer_sizes[1:]]
        self._prev_spikes = [np.zeros(r.shape[0]) for r in self.recurrent]
