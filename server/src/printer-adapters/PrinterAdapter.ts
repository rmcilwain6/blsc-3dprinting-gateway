export type AdapterStatus = 'idle' | 'printing' | 'error' | 'offline';
export type MaterialPreset = 'PLA' | 'PETG';

export interface PrinterLiveStatus {
  status: AdapterStatus;
  current_filename?: string;
  print_progress?: number;    // 0-100
  print_time_remaining?: number; // seconds
  bed_temp?: number;
  bed_target?: number;
  nozzle_temp?: number;
  nozzle_target?: number;
}

export interface PrinterAdapter {
  getStatus(): Promise<PrinterLiveStatus>;
  uploadAndPrint(filePath: string, filename: string): Promise<void>;
  cancelPrint(): Promise<void>;
  preheat(material: MaterialPreset): Promise<void>;
  cooldown(): Promise<void>;
}
