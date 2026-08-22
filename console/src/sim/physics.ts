
export class Thermodynamics {
  static internalEnergyChange(heatIn: number, workDone: number): number {
    return heatIn - workDone;
  }

  static workAgainstGravity(massKg: number, heightM: number, g: number = 9.81): number {
    return (massKg * g * heightM) / 1000; // to kJ
  }

  static heatLossRadiation(tempBody: number, tempEnv: number, surfaceArea: number = 1.8): number {
    const sigma = 5.67e-8; // Stefan-Boltzmann constant
    const emissivity = 0.98; // Human skin
    const tempBodyK = tempBody + 273.15;
    const tempEnvK = tempEnv + 273.15;
    return (emissivity * sigma * surfaceArea * (Math.pow(tempBodyK, 4) - Math.pow(tempEnvK, 4)) * 60) / 1000; // kJ/min
  }

  static heatConduction(tempBody: number, tempEnv: number, k: number = 0.024): number {
    // k is thermal conductivity (Air ~0.024 W/mK)
    const surfaceArea = 1.8;
    const thickness = 0.01; // Boundary layer thickness
    return (k * surfaceArea * (tempBody - tempEnv) / thickness * 60) / 1000; // kJ/min
  }

  static entropyProduction(heatTransferred: number, temperatureK: number): number {
    if (temperatureK <= 0) return 0;
    return heatTransferred / temperatureK;
  }
}

export class PhotosynthesisEngine {
  static SOLAR_CONSTANT = 1361.0;

  static lightAvailable(hour: number, cloudCover: number = 0.0): number {
    if (hour < 6 || hour > 18) return 0.0;
    const angle = (Math.PI * (hour - 6)) / 12;
    const base = this.SOLAR_CONSTANT * 0.5 * Math.sin(angle);
    return base * (1 - cloudCover);
  }

  static rate(lightWm2: number, co2Ppm: number, moisture: number, tempC: number): number {
    if (lightWm2 <= 0) return 0.0;
    const phi = 0.08;
    const ISat = 800.0;
    const AMax = 25.0;
    const a = phi * lightWm2;
    const lightFactor = (a * AMax) / (a + AMax);
    const co2Factor = co2Ppm / (co2Ppm + 400);

    let waterFactor = 1.0;
    if (moisture < 20) waterFactor = moisture / 20;
    else if (moisture > 80) waterFactor = 1 - (moisture - 80) / 40;

    const tOpt = 25.0;
    const tFactor = Math.exp(-0.05 * Math.pow(tempC - tOpt, 2));

    return Math.max(0, lightFactor * co2Factor * waterFactor * tFactor);
  }

  static glucoseProduced(rateUmol: number, areaM2: number = 1.0, seconds: number = 3600): number {
    const molCo2 = rateUmol * 1e-6 * areaM2 * seconds;
    const molGlucose = molCo2 / 6;
    return molGlucose * 180.16;
  }
}

export class MetabolismEngine {
  static atpFromGlucose(glucoseG: number, o2Available: number): any {
    const molGlucose = glucoseG / 180.16;
    if (o2Available > 0.5) {
      return {
        atpMol: molGlucose * 36,
        co2Mol: molGlucose * 6,
        efficiency: 0.38,
        pathway: "aerobic"
      };
    } else {
      return {
        atpMol: molGlucose * 2,
        co2Mol: molGlucose * 2,
        efficiency: 0.022,
        pathway: "anaerobic"
      };
    }
  }

  static bmrAllometric(massKg: number, tempC: number = 37.0): number {
    const bmrBase = 70 * Math.pow(massKg, 0.75);
    const q10Factor = Math.pow(2, (tempC - 37) / 10);
    return bmrBase * q10Factor;
  }
}

export class ChemistryEngine {
  static fireCombustion(fuelKg: number, o2Fraction: number = 0.21, humidity: number = 0.5): any {
    if (humidity >= 0.7) return { heatKj: 0, co2Kg: 0, ashKg: 0, ignited: false };
    const efficiency = (1 - humidity) * o2Fraction / 0.21;
    return {
      heatKj: fuelKg * 17000 * efficiency, // Wood ~17MJ/kg
      co2Kg: fuelKg * 1.47 * efficiency,
      ashKg: fuelKg * 0.05,
      ignited: true
    };
  }

  static decomposition(organicMass: number, tempC: number, moisture: number): any {
    // Van't Hoff rule: rate doubles every 10C
    const rateBase = 0.001;
    const tempFactor = Math.pow(2, (tempC - 20) / 10);
    const moistureFactor = moisture / 100;
    const massLost = organicMass * rateBase * tempFactor * moistureFactor;
    return {
      massLost,
      co2Produced: massLost * 0.5,
      nutrientsProduced: massLost * 0.1
    };
  }
}

export class AtmosphereModel {
  co2Ppm = 280.0;
  o2Frac = 0.21;
  ch4Ppb = 700.0;

  step(photoMol: number, respMol: number, decompCo2Mol: number, fireCo2Mol: number, animalCount: number): any {
    const co2Sink = photoMol * 0.0001;
    const co2Source = (respMol + decompCo2Mol + fireCo2Mol) * 0.0001;
    this.co2Ppm = Math.max(150, Math.min(2000, this.co2Ppm + co2Source - co2Sink));
    
    const o2Delta = (photoMol - respMol) * 1e-9;
    this.o2Frac = Math.max(0.15, Math.min(0.30, this.o2Frac + o2Delta));
    this.ch4Ppb = Math.min(5000, this.ch4Ppb + animalCount * 0.001);

    const tempForcing = (this.co2Ppm - 280) * 0.0037 + (this.ch4Ppb - 700) * 0.001;
    return {
      co2Ppm: this.co2Ppm,
      o2Pct: this.o2Frac * 100,
      ch4Ppb: this.ch4Ppb,
      tempForcing
    };
  }
}
