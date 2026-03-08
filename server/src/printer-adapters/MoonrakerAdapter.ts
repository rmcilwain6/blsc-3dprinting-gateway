import type { PrinterAdapter, PrinterLiveStatus, MaterialPreset } from './PrinterAdapter';

// TODO: Test and validate against real QIDI hardware before enabling.
// QIDI printers use a Moonraker-compatible API but may have endpoint differences.
// Set PRINTGATE_SIMULATE=false in .env to use this adapter.

const PRESETS = {
  PLA: { bed: 60, nozzle: 200 },
  PETG: { bed: 80, nozzle: 230 },
};

interface MoonrakerPrinterInfo {
  result: { state: string };
}
interface MoonrakerPrintStats {
  result: { status: { print_stats: { state: string; filename: string; print_duration: number; total_duration: number } } };
}
interface MoonrakerHeaters {
  result: { status: { heater_bed: { temperature: number; target: number }; extruder: { temperature: number; target: number } } };
}

export class MoonrakerAdapter implements PrinterAdapter {
  constructor(private readonly baseUrl: string) {}

  private async apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, options);
    if (!res.ok) throw new Error(`Moonraker ${path} → ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  async getStatus(): Promise<PrinterLiveStatus> {
    try {
      const [printerInfo, printStats, heaters] = await Promise.all([
        this.apiFetch<MoonrakerPrinterInfo>('/printer/info'),
        this.apiFetch<MoonrakerPrintStats>('/printer/objects/query?print_stats'),
        this.apiFetch<MoonrakerHeaters>('/printer/objects/query?heater_bed&extruder'),
      ]);

      const state = printerInfo.result.state;
      const stats = printStats.result.status.print_stats;
      const bed = heaters.result.status.heater_bed;
      const extruder = heaters.result.status.extruder;

      let status: PrinterLiveStatus['status'] = 'idle';
      if (state === 'printing') status = 'printing';
      else if (state === 'error' || state === 'shutdown') status = 'error';

      let print_progress: number | undefined;
      let print_time_remaining: number | undefined;
      if (status === 'printing' && stats.total_duration > 0) {
        print_progress = (stats.print_duration / stats.total_duration) * 100;
        print_time_remaining = stats.total_duration - stats.print_duration;
      }

      return {
        status,
        current_filename: stats.filename || undefined,
        print_progress,
        print_time_remaining,
        bed_temp: bed.temperature,
        bed_target: bed.target,
        nozzle_temp: extruder.temperature,
        nozzle_target: extruder.target,
      };
    } catch {
      return { status: 'offline' };
    }
  }

  async uploadAndPrint(_filePath: string, _filename: string): Promise<void> {
    // TODO: Implement multipart file upload to /server/files/upload with print=true
    // Requires testing against real QIDI hardware to confirm exact behaviour
    throw new Error('MoonrakerAdapter.uploadAndPrint not yet implemented — use PRINTGATE_SIMULATE=true in development');
  }

  async cancelPrint(): Promise<void> {
    await this.apiFetch('/printer/print/cancel', { method: 'POST' });
  }

  async preheat(material: MaterialPreset): Promise<void> {
    const { bed, nozzle } = PRESETS[material];
    await this.apiFetch('/printer/gcode/script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: `SET_HEATER_TEMPERATURE HEATER=heater_bed TARGET=${bed}\nSET_HEATER_TEMPERATURE HEATER=extruder TARGET=${nozzle}`,
      }),
    });
  }

  async cooldown(): Promise<void> {
    await this.apiFetch('/printer/gcode/script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script: 'TURN_OFF_HEATERS' }),
    });
  }
}
