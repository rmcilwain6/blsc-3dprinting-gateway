# PrintGate — BLSC 3D Print Gateway

## Project Overview

**PrintGate** is a web-based 3D print queue management system for the Big Little Science Centre (BLSC) in Kamloops, BC. It acts as a gateway between users on the local network and the centre's fleet of QIDI 3D printers, providing a centralized queue, manual confirmation workflow, and real-time printer monitoring.

The primary interface is a **touchscreen tablet** mounted alongside the 3D printers, but the system is a standard web app accessible from any browser on the network. The design should feel **explicitly futuristic and cool** — this is a science centre used by kids aged 9–14, and the interaction should feel like operating a sci-fi command console.

### Brand Assets

BLSC logos are included in the repo under `/assets/branding/`. The colour palette is:

| Role | Colour | Hex |
|------|--------|-----|
| Primary (navy) | Dark blue | `#1B3764` |
| Accent (red) | BLSC red | `#E63322` |
| Secondary | White | `#FFFFFF` |
| Highlight/glow | Cyan accent | `#00D4FF` (for UI glow effects) |
| Background | Near-black | `#0A0E1A` |
| Surface | Dark card | `#111827` |
| Text primary | White | `#F9FAFB` |
| Text secondary | Muted | `#9CA3AF` |
| Success | Green | `#10B981` |
| Warning | Amber | `#F59E0B` |
| Error | Red | `#EF4444` |

The UI should be dark-themed with subtle glow effects, smooth animations, and a sci-fi aesthetic. Think: control room for a space station, but branded for a children's science centre.

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Local Network                         │
│                                                         │
│  ┌──────────┐    ┌──────────────────┐    ┌───────────┐ │
│  │ Student   │───▶│   PrintGate      │───▶│ QIDI      │ │
│  │ Laptops   │    │   Server         │    │ Printers  │ │
│  └──────────┘    │                  │    │ (Klipper/ │ │
│                  │  - REST API      │    │  Moonraker)│ │
│  ┌──────────┐    │  - Print Queue   │    └───────────┘ │
│  │ Tablet   │───▶│  - Printer Mgmt  │                   │
│  │ (Touch)  │    │  - File Storage  │                   │
│  └──────────┘    └──────────────────┘                   │
│                                                         │
│  ┌──────────┐              ▲                            │
│  │ Admin    │──────────────┘                            │
│  │ (Gord)  │  (whitelisted, direct printer access OR   │
│  └──────────┘   admin-authenticated bypass)             │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack (Recommended)

- **Backend:** Node.js (Express or Fastify) OR Python (FastAPI)
- **Frontend:** React + Tailwind CSS + Framer Motion (animations)
- **Database:** SQLite (simple, no external DB server needed)
- **Printer Communication:** HTTP to QIDI Moonraker API (Klipper-based firmware)
- **File Storage:** Local filesystem for uploaded .gcode files
- **Deployment:** Runs on a single machine on the local network (Linux, Mac, or Windows)

The tech stack is a recommendation. Use whatever produces the best, most maintainable result. The key constraint is that this runs on a single machine on a local network — no cloud services, no external dependencies at runtime.

---

## Core Features (MVP)

### 1. Print Submission (Student-Facing)

Students submit print jobs from their laptops via a **web upload page** hosted by PrintGate.

**Upload Page Requirements:**
- Accessible at a simple, memorable URL on the local network (e.g., `http://print.local` or `http://192.168.x.x`)
- Drag-and-drop OR file picker for `.gcode` files
- Student enters their **name** (free text, no auth for MVP)
- Optional: student enters a **project name** or short description
- On upload, the file enters the **print queue** with status `pending`
- Confirmation screen shows: "Your print has been submitted! Go to the printer station to confirm and start your print."
- The upload page should share the same sci-fi design language as the tablet UI but be optimized for laptop/desktop screens

**Technical Notes:**
- Validate that the uploaded file is a valid `.gcode` file (basic header check)
- Parse gcode metadata to extract: estimated print time, filament usage, layer count if available
- Store uploaded files on the server filesystem
- File size limit: 200MB (most prints will be well under this)

### 2. Tablet Queue Interface (The Main Event)

This is the primary UI — the touchscreen command console that sits next to the printers.

**Queue View:**
- Shows all `pending` print jobs in a list/grid
- Each job card shows: student name, project name, estimated print time, estimated completion time (current time + print time), file size, time submitted
- Touch a job card to select it and enter the **Print Confirmation Flow**

**Print Confirmation Flow (multi-step):**

1. **Select Printer** — Shows only printers with status `idle` (available). Each printer tile shows: printer name, current status, current bed/nozzle temp. Touch to select.
2. **Select Filament Colour** — Options: White, Black (expandable later). Visual colour swatches, large touch targets.
3. **Confirm & Start** — Summary screen showing: student name, printer selected, filament colour, estimated print time, estimated completion time. Large "START PRINT" button with a satisfying animation on press. Option to "PREHEAT ONLY" (sets bed temp without starting print). Option to go back to any previous step.

**Active Prints View:**
- Dashboard showing all printers and their current state
- For each printer: name, status (idle/printing/error), current job name, progress %, estimated time remaining, bed temp, nozzle temp
- Real-time updates (poll every 5–10 seconds)
- Ability to **cancel** an active print (with confirmation dialog)

**Design Notes for Tablet UI:**
- Optimized for touch: minimum 48px touch targets, generous spacing
- Designed for landscape orientation on a 10–13" tablet
- Smooth page transitions and micro-animations (card reveals, progress bars, button feedback)
- Ambient glow effects on active/printing states
- Sound effects are a nice-to-have (subtle confirmation beeps, start-print whoosh)

### 3. Printer Management

**Printer Registry:**
- Admin can add/remove/edit printers
- Each printer record: name (e.g., "Printer 1 - Left Bench"), IP address, model (QIDI), status
- Status is auto-detected by polling the printer's Moonraker API

**Printer Communication (QIDI/Moonraker):**
- PrintGate communicates with QIDI printers via their Moonraker-compatible HTTP API
- Key API interactions:
  - `GET /printer/info` — printer status
  - `GET /printer/objects/query?heater_bed&extruder` — temperatures
  - `GET /printer/objects/query?print_stats` — print progress
  - `POST /server/files/upload` — upload gcode file to printer
  - `POST /printer/print/start` — start a print
  - `POST /printer/print/cancel` — cancel active print
  - `POST /printer/gcode/script` — send raw gcode (e.g., preheat commands)
- **NOTE:** The exact Moonraker API endpoints for QIDI printers may differ slightly from standard Klipper/Moonraker. The implementation should be flexible and allow endpoint configuration per printer. If the QIDI API is different, abstract the printer communication behind an interface so alternative implementations can be swapped in.

**Temperature Control:**
- Ability to preheat bed and nozzle for any idle printer from the tablet UI
- Preset temperatures: PLA (bed 60°C, nozzle 200°C), PETG (bed 80°C, nozzle 230°C)
- Ability to cool down / turn off heaters

### 4. Room Views (Filtered Printer Groups)

**Concept:** A "room" is a named filter that shows only a subset of printers. This allows a tablet in one physical area to show only the printers nearby.

**Requirements:**
- Default view: all printers (no room filter)
- Admin can create rooms: name + select which printers belong to it
- A room is selected per-browser (stored in a cookie or URL parameter)
- When a room is active, the queue only shows the option to print to printers in that room
- The active print dashboard only shows printers in the current room
- Room selection is accessible from a settings/config menu, not cluttering the main UI

### 5. Access Control

**MVP Access Model:**
- **No authentication** for the student upload page
- **No authentication** for the tablet queue/confirmation interface
- **Admin password** required for:
  - Printer management (add/edit/remove printers)
  - Room management (create/edit/delete rooms)
  - Cancelling active prints
  - Any future administrative functions
- Single admin password stored as an environment variable or config file (not hardcoded)

**IP Whitelisting (Stretch Goal for MVP):**
- Certain IPs can be whitelisted to bypass PrintGate entirely and communicate directly with printers
- This is a network-level concern more than an application concern, but PrintGate could maintain a whitelist config that documents which IPs have direct access

**Future (Post-MVP):**
- Student accounts with access codes
- Print quotas and usage tracking
- Trust/privilege levels (e.g., experienced students can skip confirmation)
- Activity logging and analytics

---

## Non-Functional Requirements

### Performance
- Queue updates should feel near-real-time on the tablet (WebSocket or aggressive polling)
- Printer status should update every 5–10 seconds
- File uploads should support files up to 200MB without timeout
- The UI should maintain 60fps animations on mid-range tablet hardware

### Reliability
- PrintGate should start automatically on boot (systemd service or equivalent)
- Queue state should persist across server restarts (SQLite)
- Graceful handling of printer disconnections (show offline status, don't crash)
- Uploaded gcode files should be retained until explicitly cleaned up

### Security
- Admin endpoints must require authentication
- No sensitive data is stored (MVP has no user accounts)
- The system is **local network only** — not exposed to the internet
- Input sanitization on all user inputs (file names, student names, etc.)

### Usability
- The tablet UI must be fully usable via touch only (no keyboard/mouse required)
- All text should be readable from 2–3 feet away (appropriate font sizes for a station display)
- Visual feedback for every touch interaction
- Clear error states with human-readable messages (not technical errors)
- The upload page should work on any modern browser (Chrome, Firefox, Safari, Edge)

---

## UI/UX Design Direction

### Aesthetic: "Science Centre Command Console"

The UI should feel like a futuristic mission control interface that happens to manage 3D printers. Think: sleek dark backgrounds, subtle animated gradients, glowing accent lines, card-based layouts with depth (shadows, glass-morphism), and purposeful animations.

**Key Design Principles:**
- **Dark theme** — dark navy/charcoal background (#0A0E1A), lighter card surfaces (#111827)
- **Glow effects** — cyan (#00D4FF) and BLSC red (#E63322) glows on active elements, hover states, and borders
- **Smooth animations** — cards slide in, progress bars pulse, buttons have satisfying press states, page transitions are fluid
- **Large touch targets** — everything designed for finger interaction, not mouse precision
- **Information hierarchy** — the most important info (queue count, active prints, printer status) is visible at a glance
- **BLSC branding** — logo in the header/corner, navy and red as primary brand colours, "Explore | Discover | Learn" tagline where appropriate

**Specific UI Elements:**
- **Printer status cards** with a subtle animated border glow: green for idle, pulsing blue for printing, red for error
- **Progress rings** or **progress bars** with gradient fills and glow
- **Queue items** that slide in with a staggered animation
- **The "START PRINT" button** should be dramatic — large, with a glow pulse, and a satisfying confirmation animation (particle burst, ripple effect, or similar)
- **Ambient background** — subtle animated gradient or very slow-moving particle effect (performance permitting)
- **Typography** — modern sans-serif (Inter, Space Grotesk, or similar), with monospace for technical data (temps, times, file sizes)

### Page Structure

**Tablet UI (primary):**
```
┌─────────────────────────────────────────────────────────────┐
│ [BLSC Logo] PrintGate          [Room: All] [Active: 3/8] ⚙ │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│     PRINT QUEUE          │      PRINTER STATUS              │
│                          │                                  │
│  ┌────────────────────┐  │  ┌─────────┐ ┌─────────┐       │
│  │ Alex's Robot Arm   │  │  │Printer 1│ │Printer 2│       │
│  │ ~2h 15m  ·  14MB   │  │  │ IDLE    │ │PRINTING │       │
│  │ Submitted 2:30 PM  │  │  │ 22°C    │ │ 67%     │       │
│  └────────────────────┘  │  └─────────┘ └─────────┘       │
│                          │                                  │
│  ┌────────────────────┐  │  ┌─────────┐ ┌─────────┐       │
│  │ Sam's Gear Set     │  │  │Printer 3│ │Printer 4│       │
│  │ ~45m  ·  8MB       │  │  │ IDLE    │ │ OFFLINE │       │
│  │ Submitted 2:45 PM  │  │  └─────────┘ └─────────┘       │
│  └────────────────────┘  │                                  │
│                          │                                  │
│  [+ 3 more in queue]     │                                  │
│                          │                                  │
├──────────────────────────┴──────────────────────────────────┤
│              [Upload prints at: http://print.local]          │
└─────────────────────────────────────────────────────────────┘
```

**Upload Page (student laptops):**
```
┌─────────────────────────────────────────────┐
│         [BLSC Logo] PrintGate               │
│                                             │
│      ┌───────────────────────────┐          │
│      │                           │          │
│      │   Drop your .gcode file   │          │
│      │         here              │          │
│      │                           │          │
│      │    or click to browse     │          │
│      └───────────────────────────┘          │
│                                             │
│      Your Name: [___________________]       │
│      Project:   [___________________]       │
│                                             │
│         [ SUBMIT PRINT ]                    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Data Model

### Print Job
```
{
  id: string (UUID),
  student_name: string,
  project_name: string | null,
  filename: string,
  filepath: string (server path to stored .gcode),
  filesize: number (bytes),
  estimated_print_time: number (seconds, parsed from gcode),
  status: "pending" | "confirmed" | "printing" | "completed" | "cancelled" | "failed",
  selected_printer_id: string | null,
  filament_colour: "white" | "black" | null,
  submitted_at: datetime,
  confirmed_at: datetime | null,
  started_at: datetime | null,
  completed_at: datetime | null,
  cancelled_at: datetime | null
}
```

### Printer
```
{
  id: string (UUID),
  name: string,
  ip_address: string,
  model: string (e.g., "QIDI X-Plus 3"),
  status: "idle" | "printing" | "error" | "offline",
  current_job_id: string | null,
  print_progress: number (0-100) | null,
  bed_temp: number | null,
  nozzle_temp: number | null,
  last_seen: datetime
}
```

### Room
```
{
  id: string (UUID),
  name: string,
  printer_ids: string[]
}
```

---

## API Endpoints (Draft)

### Print Jobs
- `POST /api/jobs` — Submit a new print job (multipart: gcode file + metadata)
- `GET /api/jobs` — List jobs (filterable by status)
- `GET /api/jobs/:id` — Get job details
- `PATCH /api/jobs/:id/confirm` — Confirm job with printer + colour selection
- `PATCH /api/jobs/:id/start` — Send to printer and start
- `PATCH /api/jobs/:id/cancel` — Cancel a job (admin auth required if printing)
- `DELETE /api/jobs/:id` — Remove a completed/cancelled job from queue

### Printers
- `GET /api/printers` — List all printers with current status
- `POST /api/printers` — Add a printer (admin auth)
- `PUT /api/printers/:id` — Edit a printer (admin auth)
- `DELETE /api/printers/:id` — Remove a printer (admin auth)
- `POST /api/printers/:id/preheat` — Preheat a printer (material preset)
- `POST /api/printers/:id/cooldown` — Cool down a printer

### Rooms
- `GET /api/rooms` — List all rooms
- `POST /api/rooms` — Create a room (admin auth)
- `PUT /api/rooms/:id` — Edit a room (admin auth)
- `DELETE /api/rooms/:id` — Delete a room (admin auth)

### Admin
- `POST /api/admin/auth` — Authenticate with admin password (returns session token)

### WebSocket
- `ws://host/ws` — Real-time updates for printer status and queue changes

---

## Implementation Priorities

### Phase 1: Core (Build This First)
1. Backend server with REST API and SQLite database
2. Gcode file upload and metadata parsing
3. Print queue (submit, list, confirm, start, cancel)
4. Printer registry (add, list, status polling via Moonraker API)
5. Tablet UI: queue view + print confirmation flow + active prints dashboard
6. Upload page for students

### Phase 2: Polish
1. Room views (filtered printer groups)
2. Admin authentication
3. Preheat/cooldown controls
4. WebSocket real-time updates
5. UI animations and visual polish
6. Sound effects

### Phase 3: Future
1. Student accounts with access codes
2. Print history and analytics
3. Usage quotas and trust levels
4. 3D model preview (render gcode path visualization)
5. Notification system (your print is done!)
6. IP whitelisting configuration

---

## Development Notes

### Moonraker API Discovery
The QIDI printers use Klipper firmware with a Moonraker-compatible web interface. Before implementing printer communication:

1. Identify the exact Moonraker API variant QIDI uses (may be standard Moonraker, or a QIDI-specific fork)
2. Test basic API calls against a real printer: status, temperature, file upload, print start
3. Document any QIDI-specific quirks or deviations from standard Moonraker

If the Moonraker API doesn't work as expected, the printer communication layer should be abstracted behind an interface so we can swap in a different implementation (e.g., direct QIDI SDK/API calls, OctoPrint proxy, or even a simulated printer for development).

### Simulated Printers (For Development)
Include a **simulated printer mode** so the system can be developed and tested without real printers on the network. Simulated printers should:
- Respond to the same API as real printers
- Cycle through states (idle → printing → complete)
- Report fake but realistic temperature readings
- Allow testing the full print flow end-to-end

### Environment Configuration
```
PRINTGATE_PORT=3000
PRINTGATE_ADMIN_PASSWORD=changeme
PRINTGATE_UPLOAD_DIR=./uploads
PRINTGATE_DB_PATH=./printgate.db
PRINTGATE_PRINTER_POLL_INTERVAL=5000
```

---

## File Structure (Suggested)

```
printgate/
├── README.md
├── REQUIREMENTS.md          ← this document
├── assets/
│   └── branding/
│       ├── BLSC_Logo_Dark.png
│       ├── BLSC_Logo_Light.png
│       └── blsc_Logo_1_Recovered13.png
├── server/
│   ├── index.js             ← entry point
│   ├── routes/              ← API route handlers
│   ├── services/            ← business logic (queue, printer comm)
│   ├── models/              ← database models
│   └── printer-adapters/    ← Moonraker API client (abstracted)
├── client/
│   ├── src/
│   │   ├── pages/           ← tablet UI, upload page, admin
│   │   ├── components/      ← shared UI components
│   │   └── hooks/           ← real-time data hooks
│   └── public/
├── simulator/               ← fake printer for development
├── .env.example
└── package.json
```

---

*This document is the north star for implementation. When in doubt, prioritize the student experience on the tablet — that's the hero interaction. Everything else serves that moment where a kid walks up, finds their print, picks a printer, and hits START.*
