export type PrintJobStatus =
  | 'pending'
  | 'confirmed'
  | 'printing'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type PrinterStatus = 'idle' | 'printing' | 'error' | 'offline';
export type FilamentColour = 'white' | 'black';

export interface PrintJob {
  id: string;
  student_name: string;
  project_name: string | null;
  filename: string;
  filepath: string;
  filesize: number;
  estimated_print_time: number | null;
  status: PrintJobStatus;
  selected_printer_id: string | null;
  filament_colour: FilamentColour | null;
  submitted_at: string;
  confirmed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

export interface Printer {
  id: string;
  name: string;
  ip_address: string;
  model: string;
  status: PrinterStatus;
  current_job_id: string | null;
  print_progress: number | null;
  bed_temp: number | null;
  nozzle_temp: number | null;
  last_seen: string | null;
}

export interface Room {
  id: string;
  name: string;
  printer_ids: string[];
}

export interface GcodeMetadata {
  estimated_print_time: number | null;
  filament_used_mm: number | null;
  layer_count: number | null;
}

export interface WsEvent {
  type: 'printer_updated' | 'job_updated' | 'queue_changed';
  payload: unknown;
}
