
import { TerrainMap } from './terrain';
import { AtmosphereModel } from './physics';

export class WeatherSystem {
  currentState: string = "เมฆครึ้ม";
  globalMoisture: number = 60.0;
  globalTemperature: number = 28.0;
  day: number = 0;

  atmosphere: AtmosphereModel = new AtmosphereModel();
  
  // History for 60-neuron expansion
  history: {
    temp: number[];
    moist: number[];
    rain: number[];
    light: number[];
    co2: number[];
    o2: number[];
  } = {
    temp: new Array(10).fill(0),
    moist: new Array(10).fill(0),
    rain: new Array(10).fill(0),
    light: new Array(10).fill(0),
    co2: new Array(10).fill(0),
    o2: new Array(10).fill(0)
  };

  STATES = ["แดดจ้า", "เมฆครึ้ม", "ฝนตก", "พายุเข้า", "หิมะตก", "แห้งแล้ง"];
  TRANSITIONS: Record<string, number[]> = {
    "แดดจ้า":   [0.50, 0.30, 0.05, 0.01, 0.00, 0.14],
    "เมฆครึ้ม": [0.20, 0.50, 0.20, 0.05, 0.05, 0.00],
    "ฝนตก":     [0.10, 0.30, 0.45, 0.15, 0.00, 0.00],
    "พายุเข้า": [0.05, 0.20, 0.50, 0.25, 0.00, 0.00],
    "หิมะตก":   [0.10, 0.30, 0.00, 0.00, 0.60, 0.00],
    "แห้งแล้ง": [0.30, 0.10, 0.00, 0.00, 0.00, 0.60],
  };

  stepDay() {
    this.day++;
    
    // Seasonal adjustments
    const season = this.getSeasonLabel();
    let seasonTempOffset = 25;
    let seasonMoistOffset = 50;
    
    if (season.includes("Spring")) {
      seasonTempOffset = 22;
      seasonMoistOffset = 60;
    } else if (season.includes("Summer")) {
      seasonTempOffset = 34;
      seasonMoistOffset = 30;
    } else if (season.includes("Autumn")) {
      seasonTempOffset = 18;
      seasonMoistOffset = 50;
    } else if (season.includes("Winter")) {
      seasonTempOffset = 2;
      seasonMoistOffset = 70;
    }

    // Modify transition probabilities based on season
    let probs = [...this.TRANSITIONS[this.currentState]];
    if (season.includes("Summer")) {
      probs[0] += 0.3; // More sun
      probs[5] += 0.2; // More drought
      probs[2] -= 0.1; // Less rain
    } else if (season.includes("Winter")) {
      probs[4] += 0.4; // More snow
      probs[0] -= 0.2; // Less sun
    } else if (season.includes("Spring")) {
      probs[2] += 0.2; // More rain
    }

    // Normalize probabilities
    const sum = probs.reduce((a, b) => Math.max(0, a) + Math.max(0, b), 0);
    probs = probs.map(p => Math.max(0, p) / sum);

    // Deterministic state transition based on current day and state
    const daySeed = (this.day * 13) % 100;
    let cumulative = 0;
    for (let i = 0; i < this.STATES.length; i++) {
      cumulative += probs[i] * 100;
      if (daySeed <= cumulative) {
        this.currentState = this.STATES[i];
        break;
      }
    }

    let deltaM = 0, deltaT = 0;
    switch (this.currentState) {
      case "แดดจ้า": deltaM = -2.0; deltaT = 2.0; break;
      case "เมฆครึ้ม": deltaM = 0.5; deltaT = -0.5; break;
      case "ฝนตก": deltaM = 5.0; deltaT = -2.0; break;
      case "พายุเข้า": deltaM = 8.0; deltaT = -4.0; break;
      case "หิมะตก": deltaM = 2.0; deltaT = -5.0; break;
      case "แห้งแล้ง": deltaM = -5.0; deltaT = 4.0; break;
    }

    // Gradually move towards seasonal baseline
    this.globalTemperature += (seasonTempOffset - this.globalTemperature) * 0.1 + deltaT;
    this.globalMoisture += (seasonMoistOffset - this.globalMoisture) * 0.1 + deltaM;

    this.globalMoisture = Math.max(0, Math.min(100, this.globalMoisture));
    this.globalTemperature = Math.max(-15, Math.min(50, this.globalTemperature));
    
    // Update atmosphere model
    const atmoResults = this.atmosphere.step(0, 0, 0, 0, 0); 

    // Update history (shift and push)
    this.updateHistory(atmoResults);

    return [];
  }

  private updateHistory(atmo: any) {
    const shiftPush = (arr: number[], val: number) => {
      arr.shift();
      arr.push(val);
    };

    shiftPush(this.history.temp, this.globalTemperature / 50);
    shiftPush(this.history.moist, this.globalMoisture / 100);
    shiftPush(this.history.rain, this.getRainAmount());
    shiftPush(this.history.light, this.getLightAmount());
    shiftPush(this.history.co2, (atmo.co2Ppm - 280) / 1000);
    shiftPush(this.history.o2, (atmo.o2Pct - 15) / 15);
  }

  getRainAmount(): number {
    if (this.currentState === "ฝนตก") return 0.5;
    if (this.currentState === "พายุเข้า") return 1.0;
    return 0;
  }

  getLightAmount(): number {
    if (this.currentState === "แดดจ้า") return 1.0;
    if (this.currentState === "เมฆครึ้ม") return 0.5;
    if (this.currentState === "ฝนตก" || this.currentState === "พายุเข้า") return 0.3;
    return 0.8;
  }

  getSeasonLabel() {
    const doy = this.day % 365;
    if (doy < 90) return "🌸 Spring";
    if (doy < 180) return "☀️ Summer";
    if (doy < 270) return "🍂 Autumn";
    return "❄️ Winter";
  }
}

export class DisasterSystem {
  activeDisasters: any[] = [];
  mapSize: number;

  constructor(mapSize: number) {
    this.mapSize = mapSize;
  }

  stepDay(weather: WeatherSystem, terrain: TerrainMap) {
    const events: string[] = [];
    const effects = {
      biomassMod: 0,
      animalDeaths: 0,
      humanInjury: 0,
      moistureMod: 0,
      tempMod: 0
    };

    // Deterministically start disasters at specific intervals
    if (weather.day % 45 === 10) {
      events.push("🔥 Fire started!");
      const x = (weather.day * 17) % this.mapSize;
      const y = (weather.day * 23) % this.mapSize;
      this.activeDisasters.push({ kind: 'fire', duration: 3, severity: 0.5, x, y });
    }
    if (weather.day % 60 === 25) {
      events.push("⚠️ Flood started!");
      const x = (weather.day * 13) % this.mapSize;
      const y = (weather.day * 31) % this.mapSize;
      this.activeDisasters.push({ kind: 'flood', duration: 5, severity: 0.5, x, y });
    }

    this.activeDisasters = this.activeDisasters.filter(d => {
      d.duration--;
      if (d.kind === 'fire') {
        const r = d.y;
        const c = d.x;
        if (r >= 0 && r < this.mapSize && c >= 0 && c < this.mapSize) {
          for (const plant of terrain.plants[r][c]) {
            plant.health -= 30;
          }
          
          // Spread fire deterministically
          const neighbors = [
            [r-1, c], [r+1, c], [r, c-1], [r, c+1]
          ];
          
          const targetIndex = (weather.day + r + c) % neighbors.length;
          const target = neighbors[targetIndex];
          const nr = target[0];
          const nc = target[1];
          
          if (terrain.isValid(nc, nr)) {
            const nBiome = terrain.template[nr][nc];
            // Fire spreads if biomass is high
            if ((nBiome === 3 || nBiome === 4 || nBiome === 5 || nBiome === 9) && terrain.plants[nr][nc].length > 5) {
              this.activeDisasters.push({ kind: 'fire', duration: 1, severity: 0.3, x: nc, y: nr });
            }
          }
        }
        effects.biomassMod -= 0.1;
      } else if (d.kind === 'flood') {
        effects.moistureMod += 5;
        effects.biomassMod -= 0.05;
      }
      return d.duration > 0;
    });

    return { events, effects };
  }
}
