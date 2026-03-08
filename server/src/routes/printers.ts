import { Router } from 'express';
import * as printerModel from '../models/printers';
import { printerRegistry } from '../services/printerRegistry';
import { requireAdmin } from '../middleware/auth';
import type { MaterialPreset } from '../printer-adapters/PrinterAdapter';

const router = Router();

router.get('/', (_req, res) => {
  res.json(printerModel.listPrinters());
});

router.post('/', requireAdmin, (req, res) => {
  const { name, ip_address, model } = req.body as { name?: string; ip_address?: string; model?: string };
  if (!name?.trim() || !ip_address?.trim()) {
    return res.status(400).json({ error: 'name and ip_address are required' });
  }
  const printer = printerModel.createPrinter({ name: name.trim(), ip_address: ip_address.trim(), model });
  printerRegistry.createAdapter(printer.id, printer.ip_address);
  res.status(201).json(printer);
});

router.put('/:id', requireAdmin, (req, res) => {
  const { name, ip_address, model } = req.body as { name?: string; ip_address?: string; model?: string };
  const updated = printerModel.updatePrinter(req.params.id, { name, ip_address, model });
  if (!updated) return res.status(404).json({ error: 'Printer not found' });
  res.json(updated);
});

router.delete('/:id', requireAdmin, (req, res) => {
  const deleted = printerModel.deletePrinter(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Printer not found' });
  printerRegistry.removeAdapter(req.params.id);
  res.status(204).send();
});

router.post('/:id/preheat', async (req, res) => {
  const { material } = req.body as { material?: string };
  if (!material || !['PLA', 'PETG'].includes(material)) {
    return res.status(400).json({ error: 'material must be "PLA" or "PETG"' });
  }
  const adapter = printerRegistry.getAdapter(req.params.id);
  if (!adapter) return res.status(404).json({ error: 'Printer not found or not connected' });
  try {
    await adapter.preheat(material as MaterialPreset);
    res.json({ message: `Preheating for ${material}` });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/:id/cooldown', async (req, res) => {
  const adapter = printerRegistry.getAdapter(req.params.id);
  if (!adapter) return res.status(404).json({ error: 'Printer not found or not connected' });
  try {
    await adapter.cooldown();
    res.json({ message: 'Cooling down' });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
