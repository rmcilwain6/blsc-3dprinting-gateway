import { v4 as uuidv4 } from 'uuid';
import type { SQLInputValue } from 'node:sqlite';
import db from './db';
import type { Printer } from '../types';

const bind = (obj: object) => obj as unknown as Record<string, SQLInputValue>;
const row = <T>(val: unknown) => (val ?? null) as T;

export function createPrinter(data: {
  name: string;
  ip_address: string;
  model?: string;
}): Printer {
  const printer: Printer = {
    id: uuidv4(),
    name: data.name,
    ip_address: data.ip_address,
    model: data.model ?? 'QIDI',
    status: 'offline',
    current_job_id: null,
    print_progress: null,
    bed_temp: null,
    nozzle_temp: null,
    last_seen: null,
  };

  db.prepare(`
    INSERT INTO printers (id, name, ip_address, model, status, current_job_id, print_progress, bed_temp, nozzle_temp, last_seen)
    VALUES (@id, @name, @ip_address, @model, @status, @current_job_id, @print_progress, @bed_temp, @nozzle_temp, @last_seen)
  `).run(bind(printer));

  return printer;
}

export function getPrinter(id: string): Printer | null {
  return row<Printer | null>(db.prepare('SELECT * FROM printers WHERE id = ?').get(id));
}

export function listPrinters(): Printer[] {
  return db.prepare('SELECT * FROM printers ORDER BY name ASC').all() as unknown as Printer[];
}

export function updatePrinter(id: string, updates: Partial<Printer>): Printer | null {
  const printer = getPrinter(id);
  if (!printer) return null;
  const updated = { ...printer, ...updates };
  db.prepare(`
    UPDATE printers SET
      name = @name,
      ip_address = @ip_address,
      model = @model,
      status = @status,
      current_job_id = @current_job_id,
      print_progress = @print_progress,
      bed_temp = @bed_temp,
      nozzle_temp = @nozzle_temp,
      last_seen = @last_seen
    WHERE id = @id
  `).run(bind(updated));
  return getPrinter(id);
}

export function deletePrinter(id: string): boolean {
  return db.prepare('DELETE FROM printers WHERE id = ?').run(id).changes > 0;
}
