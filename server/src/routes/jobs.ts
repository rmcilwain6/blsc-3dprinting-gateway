import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import * as jobModel from '../models/jobs';
import { parseGcodeMetadata } from '../services/gcodeParser';
import { confirmJob, startJob, cancelJob } from '../services/queue';
import { requireAdmin } from '../middleware/auth';
import type { FilamentColour, PrintJobStatus } from '../types';

const uploadDir = process.env.PRINTGATE_UPLOAD_DIR ?? './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.gcode')) {
      cb(new Error('Only .gcode files are accepted'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

// POST /api/jobs
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { student_name, project_name } = req.body as { student_name?: string; project_name?: string };
    if (!student_name?.trim()) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'student_name is required' });
    }

    const metadata = await parseGcodeMetadata(req.file.path);
    const job = jobModel.createJob({
      student_name: student_name.trim(),
      project_name: project_name?.trim() || undefined,
      filename: req.file.originalname,
      filepath: req.file.path,
      filesize: req.file.size,
      estimated_print_time: metadata.estimated_print_time ?? undefined,
    });

    res.status(201).json(job);
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(500).json({ error: 'Failed to create print job' });
  }
});

// GET /api/jobs
router.get('/', (req, res) => {
  const { status } = req.query;
  res.json(jobModel.listJobs(status as PrintJobStatus | undefined));
});

// GET /api/jobs/:id
router.get('/:id', (req, res) => {
  const job = jobModel.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// PATCH /api/jobs/:id/confirm
router.patch('/:id/confirm', async (req, res) => {
  try {
    const { printer_id, filament_colour } = req.body as { printer_id?: string; filament_colour?: string };
    if (!printer_id || !filament_colour) {
      return res.status(400).json({ error: 'printer_id and filament_colour are required' });
    }
    if (!['white', 'black'].includes(filament_colour)) {
      return res.status(400).json({ error: 'filament_colour must be "white" or "black"' });
    }
    const job = await confirmJob(req.params.id, printer_id, filament_colour as FilamentColour);
    res.json(job);
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// PATCH /api/jobs/:id/start
router.patch('/:id/start', async (req, res) => {
  try {
    const job = await startJob(req.params.id);
    res.json(job);
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// PATCH /api/jobs/:id/cancel
router.patch('/:id/cancel', requireAdmin, async (req, res) => {
  try {
    const job = await cancelJob(req.params.id);
    res.json(job);
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', requireAdmin, (req, res) => {
  const job = jobModel.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (!['completed', 'cancelled', 'failed'].includes(job.status)) {
    return res.status(400).json({ error: 'Can only delete completed, cancelled, or failed jobs' });
  }
  jobModel.deleteJob(req.params.id);
  res.status(204).send();
});

export default router;
