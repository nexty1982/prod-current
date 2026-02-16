import { Express, Router } from 'express';
const { requireAuth } = require('../../middleware/auth');
import { requireSuperAdmin } from './superAdminGuard';
import { router as buildRouter } from './router';

function jsonNotFound(_req: any, res: any) {
  res.status(404).json({ error: { code: 'not_found', message: 'Not Found' } });
}

function jsonErrorBoundary(err: any, _req: any, res: any, _next: any) {
  const status = err?.status || err?.statusCode || 500;
  res.status(status).json({ error: { code: err?.code || 'internal_error', message: err?.message || 'Internal Server Error' } });
}

export function registerRouterMenuStudio(app: Express): void {
  const r = Router();
  r.use(requireAuth);          // existing system
  r.use(requireSuperAdmin);    // small guard

  r.use(buildRouter);          // adds /routes, /menus, /menus/tree handlers

  r.use(jsonNotFound);         // JSON only
  r.use(jsonErrorBoundary);    // JSON only
  app.use('/api/studio', r);
}
