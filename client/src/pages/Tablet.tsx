import { useState, useEffect, useCallback } from 'react';

interface PrintJob {
  id: string;
  student_name: string;
  project_name: string | null;
  filename: string;
  filesize: number;
  estimated_print_time: number | null;
  status: string;
  submitted_at: string;
}

interface Printer {
  id: string;
  name: string;
  status: 'idle' | 'printing' | 'error' | 'offline';
  print_progress: number | null;
  bed_temp: number | null;
  nozzle_temp: number | null;
  current_job_id: string | null;
}

type ConfirmStep = 'select_printer' | 'select_filament' | 'confirm';

function formatTime(seconds: number | null): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const statusColour = {
  idle: 'text-pg-success border-pg-success/30',
  printing: 'text-pg-cyan border-pg-cyan/30',
  error: 'text-pg-error border-pg-error/30',
  offline: 'text-pg-muted border-white/5',
};

export default function Tablet() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);
  const [step, setStep] = useState<ConfirmStep>('select_printer');
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
  const [selectedFilament, setSelectedFilament] = useState<'white' | 'black' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [jobsRes, printersRes] = await Promise.all([
      fetch('/api/jobs?status=pending'),
      fetch('/api/printers'),
    ]);
    if (jobsRes.ok) setJobs(await jobsRes.json() as PrintJob[]);
    if (printersRes.ok) setPrinters(await printersRes.json() as Printer[]);
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => { void fetchData(); }, 5000);

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);
    ws.onmessage = () => { void fetchData(); };
    ws.onerror = () => console.warn('WS unavailable, using polling fallback');

    return () => { clearInterval(interval); ws.close(); };
  }, [fetchData]);

  const openConfirm = (job: PrintJob) => {
    setSelectedJob(job);
    setStep('select_printer');
    setSelectedPrinter(null);
    setSelectedFilament(null);
    setError(null);
  };

  const handleStartPrint = async () => {
    if (!selectedJob || !selectedPrinter || !selectedFilament) return;
    setError(null);
    try {
      const confirmRes = await fetch(`/api/jobs/${selectedJob.id}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printer_id: selectedPrinter.id, filament_colour: selectedFilament }),
      });
      if (!confirmRes.ok) throw new Error(((await confirmRes.json()) as { error: string }).error);

      const startRes = await fetch(`/api/jobs/${selectedJob.id}/start`, { method: 'PATCH' });
      if (!startRes.ok) throw new Error(((await startRes.json()) as { error: string }).error);

      setSelectedJob(null);
      void fetchData();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const idlePrinters = printers.filter((p) => p.status === 'idle');
  const printingCount = printers.filter((p) => p.status === 'printing').length;

  return (
    <div className="min-h-screen bg-pg-bg text-pg-text p-6 select-none">
      <div className="max-w-7xl mx-auto h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Print<span className="text-pg-cyan">Gate</span></h1>
          <div className="text-right font-mono text-sm">
            <div className="text-pg-muted">{jobs.length} in queue · {printingCount} printing</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Queue panel */}
          <div>
            <h2 className="text-pg-muted text-xs font-mono uppercase tracking-widest mb-4">Print Queue</h2>
            <div className="space-y-3">
              {jobs.length === 0 && (
                <div className="bg-pg-surface rounded-xl p-8 text-center text-pg-muted">No pending jobs</div>
              )}
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => openConfirm(job)}
                  className="w-full bg-pg-surface hover:bg-white/5 border border-white/5 hover:border-pg-cyan/30 rounded-xl p-4 text-left transition-all active:scale-[0.99]"
                >
                  <div className="font-semibold text-pg-text">{job.student_name}</div>
                  {job.project_name && <div className="text-pg-cyan text-sm mt-0.5">{job.project_name}</div>}
                  <div className="flex gap-4 mt-2 text-pg-muted text-xs font-mono">
                    <span>{formatTime(job.estimated_print_time)}</span>
                    <span>{(job.filesize / 1024 / 1024).toFixed(1)} MB</span>
                    <span>{new Date(job.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Printers panel */}
          <div>
            <h2 className="text-pg-muted text-xs font-mono uppercase tracking-widest mb-4">Printers</h2>
            <div className="space-y-3">
              {printers.length === 0 && (
                <div className="bg-pg-surface rounded-xl p-8 text-center text-pg-muted">No printers configured</div>
              )}
              {printers.map((printer) => (
                <div
                  key={printer.id}
                  className={`bg-pg-surface border rounded-xl p-4 transition-all ${statusColour[printer.status]}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-pg-text">{printer.name}</span>
                    <span className="text-xs font-mono">{printer.status.toUpperCase()}</span>
                  </div>
                  {printer.status === 'printing' && printer.print_progress !== null && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pg-cyan rounded-full transition-all duration-1000"
                          style={{ width: `${printer.print_progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-pg-muted mt-1 block">{printer.print_progress.toFixed(0)}%</span>
                    </div>
                  )}
                  <div className="flex gap-4 mt-2 text-pg-muted text-xs font-mono">
                    {printer.bed_temp !== null && <span>Bed {printer.bed_temp.toFixed(0)}°C</span>}
                    {printer.nozzle_temp !== null && <span>Nozzle {printer.nozzle_temp.toFixed(0)}°C</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm flow modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-pg-surface border border-pg-cyan/20 rounded-2xl p-8 max-w-lg w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Start Print</h2>
              <button onClick={() => setSelectedJob(null)} className="text-pg-muted hover:text-pg-text text-xl leading-none">✕</button>
            </div>

            {/* Job summary */}
            <div className="mb-5 p-3 bg-pg-bg rounded-lg text-sm">
              <span className="font-semibold">{selectedJob.student_name}</span>
              {selectedJob.project_name && <span className="text-pg-muted"> · {selectedJob.project_name}</span>}
              <div className="text-pg-muted font-mono text-xs mt-1">{formatTime(selectedJob.estimated_print_time)}</div>
            </div>

            {step === 'select_printer' && (
              <div>
                <p className="text-pg-muted text-sm mb-3">Select an available printer:</p>
                {idlePrinters.length === 0 ? (
                  <p className="text-pg-error text-sm">No printers available right now</p>
                ) : (
                  <div className="space-y-2">
                    {idlePrinters.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPrinter(p); setStep('select_filament'); }}
                        className="w-full text-left p-4 rounded-xl border border-white/10 hover:border-pg-cyan/40 hover:bg-white/5 transition-all active:scale-[0.99]"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 'select_filament' && (
              <div>
                <p className="text-pg-muted text-sm mb-3">Select filament colour:</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {(['white', 'black'] as const).map((colour) => (
                    <button
                      key={colour}
                      onClick={() => { setSelectedFilament(colour); setStep('confirm'); }}
                      className="p-5 rounded-xl border border-white/10 hover:border-pg-cyan/40 hover:bg-white/5 flex items-center gap-3 transition-all active:scale-[0.99]"
                    >
                      <div className={`w-6 h-6 rounded-full border border-white/30 ${colour === 'white' ? 'bg-white' : 'bg-zinc-900'}`} />
                      <span className="capitalize font-medium">{colour}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep('select_printer')} className="text-pg-muted text-sm hover:text-pg-text">← Back</button>
              </div>
            )}

            {step === 'confirm' && (
              <div>
                <div className="space-y-3 text-sm mb-6">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-pg-muted">Printer</span>
                    <span className="font-semibold">{selectedPrinter?.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-pg-muted">Filament</span>
                    <span className="capitalize font-semibold">{selectedFilament}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-pg-muted">Est. time</span>
                    <span className="font-mono">{formatTime(selectedJob.estimated_print_time)}</span>
                  </div>
                </div>

                {error && <p className="text-pg-error text-sm mb-4">{error}</p>}

                <button
                  onClick={() => { void handleStartPrint(); }}
                  className="w-full py-5 bg-pg-cyan text-pg-bg font-bold text-xl rounded-xl hover:bg-pg-cyan/90 shadow-glow-cyan transition-all active:scale-[0.98]"
                >
                  START PRINT
                </button>
                <button onClick={() => setStep('select_filament')} className="mt-3 text-pg-muted text-sm hover:text-pg-text block w-full text-center">← Back</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
