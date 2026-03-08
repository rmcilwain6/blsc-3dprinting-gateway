import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SubmittedJob {
  id: string;
  student_name: string;
  filename: string;
  estimated_print_time: number | null;
}

function formatTime(seconds: number | null): string {
  if (!seconds) return 'Unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [studentName, setStudentName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (f: File) => {
    if (f.name.toLowerCase().endsWith('.gcode')) {
      setFile(f);
      setError(null);
    } else {
      setError('Please select a .gcode file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) acceptFile(dropped);
  };

  const handleSubmit = async () => {
    if (!file || !studentName.trim()) {
      setError('Please provide your name and a .gcode file');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('student_name', studentName.trim());
    if (projectName.trim()) formData.append('project_name', projectName.trim());
    try {
      const res = await fetch('/api/jobs', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json() as { error: string };
        throw new Error(data.error ?? 'Upload failed');
      }
      setSubmitted(await res.json() as SubmittedJob);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-pg-bg flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-pg-surface border border-pg-cyan/30 rounded-2xl p-10 max-w-md w-full text-center shadow-glow-cyan"
        >
          <div className="text-5xl mb-4 text-pg-success">✓</div>
          <h2 className="text-2xl font-bold text-pg-cyan mb-2">Print Submitted!</h2>
          <p className="text-pg-muted mb-6">Go to the printer station to confirm and start your print.</p>
          <div className="bg-pg-bg rounded-xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-pg-muted">File</span>
              <span className="font-mono text-pg-text truncate max-w-[60%]">{submitted.filename}</span>
            </div>
            {submitted.estimated_print_time && (
              <div className="flex justify-between">
                <span className="text-pg-muted">Est. time</span>
                <span className="font-mono text-pg-text">{formatTime(submitted.estimated_print_time)}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => { setSubmitted(null); setFile(null); setStudentName(''); setProjectName(''); }}
            className="mt-6 text-pg-muted hover:text-pg-text underline text-sm"
          >
            Submit another print
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pg-bg flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-pg-muted text-xs font-mono mb-1 tracking-widest uppercase">Big Little Science Centre</div>
          <h1 className="text-4xl font-bold text-pg-text">Print<span className="text-pg-cyan">Gate</span></h1>
          <p className="text-pg-muted mt-2">3D Print Submission</p>
        </div>

        <div className="bg-pg-surface rounded-2xl border border-white/5 p-8 space-y-6">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              isDragging ? 'border-pg-cyan bg-pg-cyan/5' :
              file ? 'border-pg-success bg-pg-success/5' :
              'border-white/20 hover:border-white/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".gcode"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); }}
            />
            {file ? (
              <>
                <div className="text-pg-success text-3xl mb-2">✓</div>
                <p className="font-mono text-pg-text text-sm">{file.name}</p>
                <p className="text-pg-muted text-xs mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-3 opacity-40">📄</div>
                <p className="text-pg-text font-medium">Drop your .gcode file here</p>
                <p className="text-pg-muted text-sm mt-1">or click to browse</p>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-pg-muted text-sm mb-1.5">Your Name *</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your name"
                className="w-full bg-pg-bg border border-white/10 rounded-lg px-4 py-3 text-pg-text placeholder-pg-muted/50 focus:outline-none focus:border-pg-cyan/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-pg-muted text-sm mb-1.5">Project Name (optional)</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Robot arm, Gear set…"
                className="w-full bg-pg-bg border border-white/10 rounded-lg px-4 py-3 text-pg-text placeholder-pg-muted/50 focus:outline-none focus:border-pg-cyan/50 transition-colors"
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-pg-error text-sm"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleSubmit}
            disabled={isSubmitting || !file || !studentName.trim()}
            whileTap={{ scale: 0.97 }}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              isSubmitting || !file || !studentName.trim()
                ? 'bg-white/5 text-pg-muted cursor-not-allowed'
                : 'bg-pg-cyan text-pg-bg hover:bg-pg-cyan/90 shadow-glow-cyan'
            }`}
          >
            {isSubmitting ? 'Submitting…' : 'Submit Print'}
          </motion.button>
        </div>

        <p className="text-center text-pg-muted text-xs mt-6">
          After submitting, go to the printer station to start your print.
        </p>
      </motion.div>
    </div>
  );
}
