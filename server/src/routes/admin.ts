import { Router } from 'express';
import { createSession } from '../middleware/auth';

const router = Router();

router.post('/auth', (req, res) => {
  const { password } = req.body as { password?: string };
  const adminPassword = process.env.PRINTGATE_ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ error: 'Admin password not configured on server' });
  }
  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  res.json({ token: createSession() });
});

export default router;
