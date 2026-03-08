import fs from 'fs';
import readline from 'readline';
import type { GcodeMetadata } from '../types';

export async function parseGcodeMetadata(filepath: string): Promise<GcodeMetadata> {
  const result: GcodeMetadata = {
    estimated_print_time: null,
    filament_used_mm: null,
    layer_count: null,
  };

  const fileStream = fs.createReadStream(filepath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  const MAX_LINES = 250;

  for await (const line of rl) {
    lineCount++;
    if (lineCount > MAX_LINES) {
      rl.close();
      fileStream.destroy();
      break;
    }

    // Cura: ;TIME:12345
    const curaTime = line.match(/^;TIME:(\d+)/);
    if (curaTime) { result.estimated_print_time = parseInt(curaTime[1], 10); continue; }

    // PrusaSlicer/OrcaSlicer: ; estimated printing seconds = 12345
    const prusaTimeSecs = line.match(/^;\s*estimated printing seconds\s*=\s*(\d+)/i);
    if (prusaTimeSecs) { result.estimated_print_time = parseInt(prusaTimeSecs[1], 10); continue; }

    // PrusaSlicer human: ; estimated printing time (normal mode) = 1h 30m 0s
    if (result.estimated_print_time === null) {
      const prusaTimeHuman = line.match(/^;\s*estimated printing time[^=]*=\s*(.*)/i);
      if (prusaTimeHuman) { result.estimated_print_time = parseHumanTime(prusaTimeHuman[1]); continue; }
    }

    // Cura layer count: ;LAYER_COUNT:150
    const curaLayers = line.match(/^;LAYER_COUNT:(\d+)/);
    if (curaLayers) { result.layer_count = parseInt(curaLayers[1], 10); continue; }

    // PrusaSlicer / OrcaSlicer layer count: ; layer_count = 148  or  ; total_layer_count = 58
    if (result.layer_count === null) {
      const genericLayers = line.match(/^;\s*(?:total_)?layer_count\s*=\s*(\d+)/i);
      if (genericLayers) { result.layer_count = parseInt(genericLayers[1], 10); continue; }
    }

    // Cura filament: ;Filament used: 10.5m
    const curaFilament = line.match(/^;Filament used:\s*([\d.]+)m/);
    if (curaFilament) { result.filament_used_mm = parseFloat(curaFilament[1]) * 1000; continue; }

    // PrusaSlicer filament: ; filament used [mm] = 3500.00
    const prusaFilament = line.match(/^;\s*filament used \[mm\]\s*=\s*([\d.]+)/i);
    if (prusaFilament) { result.filament_used_mm = parseFloat(prusaFilament[1]); continue; }

    // OrcaSlicer filament: ; filament_used_mm = 843.21
    if (result.filament_used_mm === null) {
      const orcaFilament = line.match(/^;\s*filament_used_mm\s*=\s*([\d.]+)/i);
      if (orcaFilament) { result.filament_used_mm = parseFloat(orcaFilament[1]); continue; }
    }
  }

  return result;
}

function parseHumanTime(str: string): number | null {
  let seconds = 0;
  const hours = str.match(/(\d+)h/);
  const minutes = str.match(/(\d+)m/);
  const secs = str.match(/(\d+)s/);
  if (hours) seconds += parseInt(hours[1], 10) * 3600;
  if (minutes) seconds += parseInt(minutes[1], 10) * 60;
  if (secs) seconds += parseInt(secs[1], 10);
  return seconds > 0 ? seconds : null;
}
