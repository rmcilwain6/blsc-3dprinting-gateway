import * as jobModel from '../models/jobs';
import * as printerModel from '../models/printers';
import { printerRegistry } from './printerRegistry';
import { broadcast } from '../websocket';
import type { FilamentColour, PrintJob } from '../types';

export async function confirmJob(
  jobId: string,
  printerId: string,
  filamentColour: FilamentColour
): Promise<PrintJob> {
  const job = jobModel.getJob(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status !== 'pending') throw new Error(`Job is not pending (current: ${job.status})`);

  const printer = printerModel.getPrinter(printerId);
  if (!printer) throw new Error('Printer not found');
  if (printer.status !== 'idle') throw new Error(`Printer is not idle (current: ${printer.status})`);

  const updated = jobModel.updateJob(jobId, {
    status: 'confirmed',
    selected_printer_id: printerId,
    filament_colour: filamentColour,
    confirmed_at: new Date().toISOString(),
  })!;

  broadcast({ type: 'job_updated', payload: updated });
  return updated;
}

export async function startJob(jobId: string): Promise<PrintJob> {
  const job = jobModel.getJob(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status !== 'confirmed') throw new Error(`Job is not confirmed (current: ${job.status})`);
  if (!job.selected_printer_id) throw new Error('No printer selected');

  const adapter = printerRegistry.getAdapter(job.selected_printer_id);
  if (!adapter) throw new Error('Printer adapter not found — was the printer registered?');

  await adapter.uploadAndPrint(job.filepath, job.filename);

  const updated = jobModel.updateJob(jobId, {
    status: 'printing',
    started_at: new Date().toISOString(),
  })!;

  printerModel.updatePrinter(job.selected_printer_id, {
    current_job_id: jobId,
    status: 'printing',
  });

  broadcast({ type: 'job_updated', payload: updated });
  return updated;
}

export async function cancelJob(jobId: string): Promise<PrintJob> {
  const job = jobModel.getJob(jobId);
  if (!job) throw new Error('Job not found');
  if (['completed', 'cancelled', 'failed'].includes(job.status)) {
    throw new Error(`Job cannot be cancelled (current: ${job.status})`);
  }

  if (job.status === 'printing' && job.selected_printer_id) {
    const adapter = printerRegistry.getAdapter(job.selected_printer_id);
    if (adapter) await adapter.cancelPrint();
    printerModel.updatePrinter(job.selected_printer_id, {
      current_job_id: null,
      status: 'idle',
      print_progress: null,
    });
  }

  const updated = jobModel.updateJob(jobId, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
  })!;

  broadcast({ type: 'job_updated', payload: updated });
  return updated;
}
