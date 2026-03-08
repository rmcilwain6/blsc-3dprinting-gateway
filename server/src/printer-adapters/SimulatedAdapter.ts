import type { PrinterAdapter, PrinterLiveStatus, MaterialPreset } from './PrinterAdapter';

const PRESETS = {
  PLA: { bed: 60, nozzle: 200 },
  PETG: { bed: 80, nozzle: 230 },
};

// Simulated print duration (seconds) — short enough to test completion easily
const SIM_PRINT_DURATION = 120;

export class SimulatedAdapter implements PrinterAdapter {
  private _status: 'idle' | 'printing' | 'error' | 'offline' = 'idle';
  private bedTemp = 22;
  private bedTarget = 0;
  private nozzleTemp = 22;
  private nozzleTarget = 0;
  private printStartTime: number | null = null;
  private currentFilename?: string;
  private tempTimer: ReturnType<typeof setInterval>;

  constructor(_name: string) {
    // Gradually move temps toward targets every second
    this.tempTimer = setInterval(() => {
      this.bedTemp = lerp(this.bedTemp, this.bedTarget, 0.05);
      this.nozzleTemp = lerp(this.nozzleTemp, this.nozzleTarget, 0.08);
    }, 1000);
  }

  async getStatus(): Promise<PrinterLiveStatus> {
    let print_progress: number | undefined;
    let print_time_remaining: number | undefined;

    if (this._status === 'printing' && this.printStartTime !== null) {
      const elapsed = (Date.now() - this.printStartTime) / 1000;
      print_progress = Math.min(100, (elapsed / SIM_PRINT_DURATION) * 100);
      print_time_remaining = Math.max(0, SIM_PRINT_DURATION - elapsed);

      if (print_progress >= 100) {
        this._status = 'idle';
        this.bedTarget = 0;
        this.nozzleTarget = 0;
        this.currentFilename = undefined;
        this.printStartTime = null;
      }
    }

    return {
      status: this._status,
      current_filename: this.currentFilename,
      print_progress,
      print_time_remaining,
      bed_temp: round1(this.bedTemp),
      bed_target: this.bedTarget,
      nozzle_temp: round1(this.nozzleTemp),
      nozzle_target: this.nozzleTarget,
    };
  }

  async uploadAndPrint(filePath: string, filename: string): Promise<void> {
    this._status = 'printing';
    this.currentFilename = filename;
    this.printStartTime = Date.now();
    this.bedTarget = PRESETS.PLA.bed;
    this.nozzleTarget = PRESETS.PLA.nozzle;
  }

  async cancelPrint(): Promise<void> {
    this._status = 'idle';
    this.currentFilename = undefined;
    this.printStartTime = null;
    this.bedTarget = 0;
    this.nozzleTarget = 0;
  }

  async preheat(material: MaterialPreset): Promise<void> {
    this.bedTarget = PRESETS[material].bed;
    this.nozzleTarget = PRESETS[material].nozzle;
  }

  async cooldown(): Promise<void> {
    this.bedTarget = 0;
    this.nozzleTarget = 0;
  }

  destroy(): void {
    clearInterval(this.tempTimer);
  }
}

function lerp(a: number, b: number, rate: number): number {
  const diff = b - a;
  return Math.abs(diff) < 0.5 ? b : a + diff * rate;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
