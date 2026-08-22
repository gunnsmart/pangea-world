
export class LogManager {
  logs: string[] = [];
  alphaLogs: string[] = [];
  betaLogs: string[] = [];
  private maxLogs: number = 100;

  addWorldLog(msg: string) {
    this.logs.push(msg);
    if (this.logs.length > this.maxLogs) this.logs.shift();
  }

  clear() {
    this.logs = [];
    this.alphaLogs = [];
    this.betaLogs = [];
  }

  addHumanLog(id: string, msg: string) {
    if (id === 'alpha') {
      this.alphaLogs.push(msg);
      if (this.alphaLogs.length > this.maxLogs) this.alphaLogs.shift();
    } else if (id === 'beta') {
      this.betaLogs.push(msg);
      if (this.betaLogs.length > this.maxLogs) this.betaLogs.shift();
    } else {
      this.addWorldLog(msg);
    }
  }

  getSnapshot() {
    return {
      logs: [...this.logs],
      alphaLogs: [...this.alphaLogs],
      betaLogs: [...this.betaLogs]
    };
  }
}
