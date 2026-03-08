import { Router } from 'express';
import * as roomModel from '../models/rooms';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', (_req, res) => {
  res.json(roomModel.listRooms());
});

router.post('/', requireAdmin, (req, res) => {
  const { name, printer_ids } = req.body as { name?: string; printer_ids?: string[] };
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const room = roomModel.createRoom({ name: name.trim(), printer_ids: printer_ids ?? [] });
  res.status(201).json(room);
});

router.put('/:id', requireAdmin, (req, res) => {
  const { name, printer_ids } = req.body as { name?: string; printer_ids?: string[] };
  const updated = roomModel.updateRoom(req.params.id, { name, printer_ids });
  if (!updated) return res.status(404).json({ error: 'Room not found' });
  res.json(updated);
});

router.delete('/:id', requireAdmin, (req, res) => {
  const deleted = roomModel.deleteRoom(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Room not found' });
  res.status(204).send();
});

export default router;
