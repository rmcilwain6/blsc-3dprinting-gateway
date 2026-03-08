import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.PRINTGATE_DB_PATH ?? './printgate.db';

const dbDir = path.dirname(path.resolve(dbPath));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS print_jobs (
    id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    project_name TEXT,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    filesize INTEGER NOT NULL,
    estimated_print_time INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    selected_printer_id TEXT,
    filament_colour TEXT,
    submitted_at TEXT NOT NULL,
    confirmed_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    cancelled_at TEXT
  );

  CREATE TABLE IF NOT EXISTS printers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'QIDI',
    status TEXT NOT NULL DEFAULT 'offline',
    current_job_id TEXT,
    print_progress REAL,
    bed_temp REAL,
    nozzle_temp REAL,
    last_seen TEXT
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS room_printers (
    room_id TEXT NOT NULL,
    printer_id TEXT NOT NULL,
    PRIMARY KEY (room_id, printer_id),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
  );
`);

export default db;
