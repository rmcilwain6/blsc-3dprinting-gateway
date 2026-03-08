import { v4 as uuidv4 } from 'uuid';
import type { SQLInputValue } from 'node:sqlite';
import db from './db';
import type { PrintJob, PrintJobStatus } from '../types';

// node:sqlite's run() requires Record<string, SQLInputValue> — cast our typed objects through unknown
const bind = (obj: object) => obj as unknown as Record<string, SQLInputValue>;
const row = <T>(val: unknown) => (val ?? null) as T;

export function createJob(data: {
  student_name: string;
  project_name?: string;
  filename: string;
  filepath: string;
  filesize: number;
  estimated_print_time?: number;
}): PrintJob {
  const job: PrintJob = {
    id: uuidv4(),
    student_name: data.student_name,
    project_name: data.project_name ?? null,
    filename: data.filename,
    filepath: data.filepath,
    filesize: data.filesize,
    estimated_print_time: data.estimated_print_time ?? null,
    status: 'pending',
    selected_printer_id: null,
    filament_colour: null,
    submitted_at: new Date().toISOString(),
    confirmed_at: null,
    started_at: null,
    completed_at: null,
    cancelled_at: null,
  };

  db.prepare(`
    INSERT INTO print_jobs (
      id, student_name, project_name, filename, filepath, filesize,
      estimated_print_time, status, selected_printer_id, filament_colour,
      submitted_at, confirmed_at, started_at, completed_at, cancelled_at
    ) VALUES (
      @id, @student_name, @project_name, @filename, @filepath, @filesize,
      @estimated_print_time, @status, @selected_printer_id, @filament_colour,
      @submitted_at, @confirmed_at, @started_at, @completed_at, @cancelled_at
    )
  `).run(bind(job));

  return job;
}

export function getJob(id: string): PrintJob | null {
  return row<PrintJob | null>(db.prepare('SELECT * FROM print_jobs WHERE id = ?').get(id));
}

export function listJobs(status?: PrintJobStatus): PrintJob[] {
  if (status) {
    return db.prepare(
      'SELECT * FROM print_jobs WHERE status = ? ORDER BY submitted_at ASC'
    ).all(status) as unknown as PrintJob[];
  }
  return db.prepare('SELECT * FROM print_jobs ORDER BY submitted_at ASC').all() as unknown as PrintJob[];
}

export function updateJob(id: string, updates: Partial<PrintJob>): PrintJob | null {
  const job = getJob(id);
  if (!job) return null;
  const updated = { ...job, ...updates };
  db.prepare(`
    UPDATE print_jobs SET
      status = @status,
      selected_printer_id = @selected_printer_id,
      filament_colour = @filament_colour,
      confirmed_at = @confirmed_at,
      started_at = @started_at,
      completed_at = @completed_at,
      cancelled_at = @cancelled_at
    WHERE id = @id
  `).run(bind(updated));
  return getJob(id);
}

export function deleteJob(id: string): boolean {
  return db.prepare('DELETE FROM print_jobs WHERE id = ?').run(id).changes > 0;
}
