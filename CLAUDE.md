# PrintGate — CLAUDE.md

AI guidance for building PrintGate, the 3D print queue management system for the Big Little Science Centre (BLSC), Kamloops BC.

## Project Summary

A local-network web app that sits between students submitting `.gcode` files and QIDI 3D printers. Two primary UIs: a student upload page (laptop/desktop) and a touchscreen tablet command console next to the printers.

See `REQUIREMENTS.md` for the full specification. When in doubt: **prioritize the student tablet experience**.

---

## Tech Stack

- **Backend:** Node.js + Express (+ TypeScript TBD based on user preference)
- **Frontend:** React + Vite + Tailwind CSS + Framer Motion
- **Database:** SQLite (via `better-sqlite3` or Drizzle ORM)
- **Realtime:** WebSocket (`ws` package on server, native on client)
- **Printer API:** Moonraker HTTP API, abstracted behind a `PrinterAdapter` interface
- **Package manager:** TBD (ask user — npm / pnpm / bun)

---

## Project Structure

```
blsc-3dprinting-gateway/
├── CLAUDE.md                  ← this file
├── README.md
├── REQUIREMENTS.md
├── assets/
│   └── branding/              ← BLSC logo files (add when available)
├── server/
│   ├── index.ts               ← Express entry point
│   ├── routes/                ← API route handlers
│   │   ├── jobs.ts
│   │   ├── printers.ts
│   │   ├── rooms.ts
│   │   └── admin.ts
│   ├── services/              ← Business logic
│   │   ├── queue.ts           ← Print queue state machine
│   │   ├── printerRegistry.ts ← Polling + status tracking
│   │   └── gcodeParser.ts     ← Extract metadata from .gcode files
│   ├── models/                ← SQLite schema + query helpers
│   │   ├── db.ts              ← DB init + migrations
│   │   ├── jobs.ts
│   │   ├── printers.ts
│   │   └── rooms.ts
│   ├── printer-adapters/
│   │   ├── PrinterAdapter.ts  ← Abstract interface
│   │   ├── MoonrakerAdapter.ts← Real QIDI/Moonraker implementation
│   │   └── SimulatedAdapter.ts← Fake printer for development
│   └── websocket.ts           ← WS server + broadcast helpers
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Upload.tsx     ← Student upload page
│   │   │   ├── Tablet.tsx     ← Main tablet dashboard
│   │   │   ├── Confirm.tsx    ← Multi-step print confirmation flow
│   │   │   └── Admin.tsx      ← Admin settings (password-gated)
│   │   ├── components/        ← Shared UI components
│   │   └── hooks/             ← useWebSocket, usePrinters, useQueue
│   └── index.html
├── simulator/                 ← Standalone fake printer server (optional)
├── uploads/                   ← Uploaded .gcode files (gitignored)
├── .env.example
└── package.json
```

---

## Implementation Plan

### Phase 1 — Foundation
1. Initialize monorepo with `server/` and `client/` workspaces
2. SQLite schema: `print_jobs`, `printers`, `rooms` tables
3. REST API skeleton — all route stubs returning 501 placeholders
4. `.env.example` with all config vars

### Phase 2 — Backend Core
5. `.gcode` upload handler (multipart, 200MB limit, basic validation)
6. Gcode metadata parser (estimated print time, filament usage, layer count)
7. Print queue service + state machine (`pending → confirmed → printing → completed/cancelled/failed`)
8. `PrinterAdapter` interface + `SimulatedAdapter` (cycles states, fake temps)
9. `MoonrakerAdapter` for real QIDI printers (abstracted, swappable)
10. Printer registry polling service (every 5–10s)

### Phase 3 — Student Upload Page
11. React + Vite + Tailwind setup in `client/`
12. Drag-and-drop upload UI with name/project fields
13. Submission confirmation screen
14. Sci-fi dark theme, desktop-optimized

### Phase 4 — Tablet UI
15. Queue view: job cards with student name, time estimate, file size, submitted time
16. Multi-step print confirmation flow:
    - Step 1: Select idle printer
    - Step 2: Select filament colour (White / Black)
    - Step 3: Summary + dramatic START PRINT button
17. Active prints dashboard: all printers, progress %, temps, cancel option
18. Touch-optimized layout (48px+ targets, landscape, 10–13" tablet)

### Phase 5 — Real-time + Polish
19. WebSocket for live queue + printer status updates
20. Admin authentication (env var password, session token)
21. Room views (per-browser filter, stored in cookie)
22. Preheat/cooldown controls (PLA / PETG presets)
23. UI polish: Framer Motion animations, glow effects, ambient background
24. Dramatic START PRINT button animation (ripple / particle burst)

---

## Key Design Rules

### Colours (from REQUIREMENTS.md)
| Role | Hex |
|------|-----|
| Background | `#0A0E1A` |
| Surface (cards) | `#111827` |
| Primary (navy) | `#1B3764` |
| Accent (red) | `#E63322` |
| Highlight/glow | `#00D4FF` |
| Text primary | `#F9FAFB` |
| Text secondary | `#9CA3AF` |
| Success | `#10B981` |
| Warning | `#F59E0B` |
| Error | `#EF4444` |

### Printer Status Glow
- Idle → green border glow
- Printing → pulsing blue/cyan glow
- Error → red glow
- Offline → no glow, muted

### Touch Targets
- Minimum 48px on all interactive elements
- Generous spacing for finger use
- Landscape orientation primary

---

## Data Model (quick ref)

**PrintJob:** `id, student_name, project_name, filename, filepath, filesize, estimated_print_time, status, selected_printer_id, filament_colour, submitted_at, confirmed_at, started_at, completed_at, cancelled_at`

**Printer:** `id, name, ip_address, model, status, current_job_id, print_progress, bed_temp, nozzle_temp, last_seen`

**Room:** `id, name, printer_ids[]`

---

## Environment Variables

```
PRINTGATE_PORT=3000
PRINTGATE_ADMIN_PASSWORD=changeme
PRINTGATE_UPLOAD_DIR=./uploads
PRINTGATE_DB_PATH=./printgate.db
PRINTGATE_PRINTER_POLL_INTERVAL=5000
PRINTGATE_SIMULATE=true     # set false to use real Moonraker printers
```

---

## API Endpoints (quick ref)

```
POST   /api/jobs                  Upload new print job
GET    /api/jobs                  List jobs (filter by status)
GET    /api/jobs/:id              Get job details
PATCH  /api/jobs/:id/confirm      Confirm with printer + colour
PATCH  /api/jobs/:id/start        Send to printer + start
PATCH  /api/jobs/:id/cancel       Cancel (admin auth if printing)

GET    /api/printers              List all printers + status
POST   /api/printers              Add printer (admin)
PUT    /api/printers/:id          Edit printer (admin)
DELETE /api/printers/:id          Remove printer (admin)
POST   /api/printers/:id/preheat  Preheat (material preset)
POST   /api/printers/:id/cooldown Turn off heaters

GET    /api/rooms                 List rooms
POST   /api/rooms                 Create room (admin)
PUT    /api/rooms/:id             Edit room (admin)
DELETE /api/rooms/:id             Delete room (admin)

POST   /api/admin/auth            Authenticate (returns session token)

ws://host/ws                      Real-time updates
```

---

## Development Notes

- **Start with `PRINTGATE_SIMULATE=true`** — build and test the full flow without real printers
- **Moonraker adapter is abstracted** — if QIDI's API deviates from standard Moonraker, only `MoonrakerAdapter.ts` needs to change
- **Admin password is env-only** — never hardcode it; default to `changeme` in `.env.example` with a clear warning
- **Gcode parsing** — scan for comments like `;TIME:`, `;Filament used:`, `;Layer count:` which most slicers (PrusaSlicer, Cura, OrcaSlicer) emit
- **File retention** — uploaded `.gcode` files stay on disk until explicitly deleted; `uploads/` is gitignored

---

## Confirmed Decisions

- **Language:** TypeScript throughout (server + client)
- **Package manager:** pnpm (workspace monorepo)
- **Branding:** Placeholder file in `/assets/branding/` — user will add logos
- **Printer integration:** Simulator-first (`PRINTGATE_SIMULATE=true`); real QIDI hardware tested later
- **Dev OS:** Windows; production cross-platform (avoid OS-specific scripts)
- **Node.js:** 18+ required (uses built-in `fetch`, `crypto.randomUUID`)

## Running the Project

```bash
# Install all workspace deps from repo root
pnpm install

# Copy env and configure
cp .env.example .env

# Run server + client together
pnpm dev

# Server only: http://localhost:3000
# Client only (Vite): http://localhost:5173
# Tablet UI: http://localhost:5173/tablet
```
