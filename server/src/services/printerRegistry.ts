import * as printerModel from '../models/printers';
import * as jobModel from '../models/jobs';
import { SimulatedAdapter } from '../printer-adapters/SimulatedAdapter';
import { MoonrakerAdapter } from '../printer-adapters/MoonrakerAdapter';
import type { PrinterAdapter } from '../printer-adapters/PrinterAdapter';
import { broadcast } from '../websocket';
import type { PrinterStatus } from '../types';

class PrinterRegistry {
  private adapters = new Map<string, PrinterAdapter>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  getAdapter(printerId: string): PrinterAdapter | null {
    return this.adapters.get(printerId) ?? null;
  }

  createAdapter(printerId: string, ipAddress: string): PrinterAdapter {
    const isSimulate = process.env.PRINTGATE_SIMULATE === 'true';
    const printer = printerModel.getPrinter(printerId);
    const adapter: PrinterAdapter = isSimulate
      ? new SimulatedAdapter(printer?.name ?? printerId)
      : new MoonrakerAdapter(`http://${ipAddress}`);
    this.adapters.set(printerId, adapter);
    return adapter;
  }

  removeAdapter(printerId: string): void {
    const adapter = this.adapters.get(printerId);
    if (adapter && 'destroy' in adapter && typeof (adapter as { destroy?: () => void }).destroy === 'function') {
      (adapter as { destroy: () => void }).destroy();
    }
    this.adapters.delete(printerId);
  }

  startPolling(): void {
    const printers = printerModel.listPrinters();
    for (const printer of printers) {
      if (!this.adapters.has(printer.id)) {
        this.createAdapter(printer.id, printer.ip_address);
      }
    }

    const interval = parseInt(process.env.PRINTGATE_PRINTER_POLL_INTERVAL ?? '5000', 10);
    this.pollTimer = setInterval(() => { this.pollAll().catch(console.error); }, interval);
    this.pollAll().catch(console.error);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollAll(): Promise<void> {
    const printers = printerModel.listPrinters();
    await Promise.allSettled(printers.map((p) => this.pollPrinter(p.id)));
  }

  private async pollPrinter(printerId: string): Promise<void> {
    const adapter = this.adapters.get(printerId);
    if (!adapter) return;

    try {
      const live = await adapter.getStatus();
      const printer = printerModel.getPrinter(printerId);
      if (!printer) return;

      const status = live.status as PrinterStatus;

      printerModel.updatePrinter(printerId, {
        status,
        print_progress: live.print_progress ?? null,
        bed_temp: live.bed_temp ?? null,
        nozzle_temp: live.nozzle_temp ?? null,
        last_seen: new Date().toISOString(),
      });

      // Detect job completion: was printing, now idle
      if (printer.status === 'printing' && status === 'idle' && printer.current_job_id) {
        const job = jobModel.getJob(printer.current_job_id);
        if (job?.status === 'printing') {
          jobModel.updateJob(printer.current_job_id, {
            status: 'completed',
            completed_at: new Date().toISOString(),
          });
          broadcast({ type: 'job_updated', payload: jobModel.getJob(printer.current_job_id) });
        }
        printerModel.updatePrinter(printerId, { current_job_id: null });
      }

      broadcast({ type: 'printer_updated', payload: printerModel.getPrinter(printerId) });
    } catch (err) {
      console.error(`Poll error for printer ${printerId}:`, err);
      printerModel.updatePrinter(printerId, { status: 'offline' });
    }
  }
}

export const printerRegistry = new PrinterRegistry();
