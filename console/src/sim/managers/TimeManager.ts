
export class TimeManager {
  day: number = 1;
  hour: number = new Date().getHours();
  minute: number = new Date().getMinutes();

  step(deltaMinutes: number): { dayChanged: boolean; hourChanged: boolean } {
    let dayChanged = false;
    let hourChanged = false;
    const oldHour = this.hour;
    const oldDay = this.day;

    this.minute += deltaMinutes;
    
    while (this.minute >= 60) {
      this.minute -= 60;
      this.hour++;
      hourChanged = true;
      
      if (this.hour >= 24) {
        this.hour = 0;
        this.day++;
        dayChanged = true;
      }
    }

    return { dayChanged, hourChanged };
  }

  getLightLevel(): number {
    if (this.hour >= 7 && this.hour <= 16) return 1.0; // Day
    if (this.hour === 6 || this.hour === 17) return 0.7; // Dawn/Dusk
    if (this.hour === 5 || this.hour === 18) return 0.4;
    return 0.1; // Night
  }

  getFormattedTime(): string {
    return `[${this.day}:${this.hour.toString().padStart(2, '0')}:${Math.floor(this.minute).toString().padStart(2, '0')}]`;
  }
}
