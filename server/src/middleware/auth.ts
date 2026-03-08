import type { Request, Response, NextFunction } from 'express';

// In-memory session store — sufficient for single-server local deployment
const sessions = new Set<string>();

export function createSession(): string {
  const token = crypto.randomUUID();
  sessions.add(token);
  return token;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Admin authentication required' });
    return;
  }
  const token = auth.slice(7);
  if (!sessions.has(token)) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }
  next();
}
