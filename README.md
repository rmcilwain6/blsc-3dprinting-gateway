# PrintGate 🖨️

3D Print Gateway for the Big Little Science Centre, Kamloops BC.

A futuristic touch-screen print queue management system that sits between students and QIDI 3D printers, providing controlled, intentional print submission and real-time printer monitoring.

## Getting Started

See [REQUIREMENTS.md](./REQUIREMENTS.md) for the full project specification.

## Quick Start

```bash
# TODO: Implementation in progress
npm install
npm run dev
```

## Architecture

PrintGate is a local-network web application with:
- **Upload Page** — Students drag & drop `.gcode` files from their laptops
- **Tablet UI** — Touch-optimized command console for confirming and starting prints
- **Print Gateway** — Backend that queues jobs and communicates with QIDI printers via Moonraker API
- **Simulated Printers** — Development mode for testing without real hardware

## License

Internal BLSC project.
