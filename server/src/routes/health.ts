import { Application } from 'express';

export function registerHealthRoute(app: Application) {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
}
