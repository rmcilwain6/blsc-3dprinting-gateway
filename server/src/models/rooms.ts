import { v4 as uuidv4 } from 'uuid';
import db from './db';
import type { Room } from '../types';

const row = <T>(val: unknown) => (val ?? null) as T;

export function createRoom(data: { name: string; printer_ids?: string[] }): Room {
  const id = uuidv4();
  db.prepare('INSERT INTO rooms (id, name) VALUES (?, ?)').run(id, data.name);
  for (const printerId of data.printer_ids ?? []) {
    db.prepare('INSERT INTO room_printers (room_id, printer_id) VALUES (?, ?)').run(id, printerId);
  }
  return getRoom(id)!;
}

export function getRoom(id: string): Room | null {
  const r = row<{ id: string; name: string } | null>(
    db.prepare('SELECT * FROM rooms WHERE id = ?').get(id)
  );
  if (!r) return null;
  const printers = db.prepare('SELECT printer_id FROM room_printers WHERE room_id = ?').all(id) as unknown as { printer_id: string }[];
  return { ...r, printer_ids: printers.map((p) => p.printer_id) };
}

export function listRooms(): Room[] {
  const rows = db.prepare('SELECT * FROM rooms ORDER BY name ASC').all() as unknown as { id: string; name: string }[];
  return rows.map((r) => {
    const printers = db.prepare('SELECT printer_id FROM room_printers WHERE room_id = ?').all(r.id) as unknown as { printer_id: string }[];
    return { ...r, printer_ids: printers.map((p) => p.printer_id) };
  });
}

export function updateRoom(id: string, data: { name?: string; printer_ids?: string[] }): Room | null {
  if (!getRoom(id)) return null;
  if (data.name) db.prepare('UPDATE rooms SET name = ? WHERE id = ?').run(data.name, id);
  if (data.printer_ids !== undefined) {
    db.prepare('DELETE FROM room_printers WHERE room_id = ?').run(id);
    for (const printerId of data.printer_ids) {
      db.prepare('INSERT INTO room_printers (room_id, printer_id) VALUES (?, ?)').run(id, printerId);
    }
  }
  return getRoom(id);
}

export function deleteRoom(id: string): boolean {
  return db.prepare('DELETE FROM rooms WHERE id = ?').run(id).changes > 0;
}
