import { Router } from 'express';
import { validate, RoutesListSchema, MenusListSchema, CreateRouteSchema, UpdateRouteSchema, CreateMenuSchema, UpdateMenuSchema, ReorderMenusSchema } from './validators.js';
import { RoutesService, MenusService } from './service.js';
import { ah } from './asyncHandler.js';

const router = Router();

const routesService = new RoutesService();
const menusService = new MenusService();

// Routes endpoints
router.get('/routes', ah(async (req: any, res: any, next: any) => {
  // GET /routes doesn't need validation - just use query parameters as-is
  const routes = await routesService.list(req.query || {});
  res.json({ ok: true, routes });
}));

router.post('/routes', ah(async (req: any, res: any, next: any) => {
  const success = req.validationResult?.success;
  if (!success) {
    return res.status(400).json({
      ok: false,
      reason: 'validation_failed',
      errors: req.validationResult?.errors
    });
  }

  const updated_by = req.user?.email ?? 'system';
  const route = await routesService.create({
    ...req.validationResult?.data,
    updated_by
  });
  res.status(201).json({ ok: true, route });
}));

router.put('/routes/:id([0-9]+)', ah(async (req: any, res: any, next: any) => {
  const id = parseInt(req.params.id);
  const success = req.validationResult?.success;
  if (!success) {
    return res.status(400).json({
      ok: false,
      reason: 'validation_failed',
      errors: req.validationResult?.errors
    });
  }

  const updated_by = req.user?.email ?? 'system';
  const route = await routesService.update(id, {
    ...req.validationResult?.data,
    updated_by
  });

  if (!route) {
    return res.status(404).json({
      ok: false,
      reason: 'not_found'
    });
  }

  res.json({ ok: true, route });
}));

router.delete('/routes/:id([0-9]+)', ah(async (req: any, res: any, next: any) => {
  const id = parseInt(req.params.id);
  const hard = req.query.hard === '1';

  const deleted = await routesService.delete(id, hard);
  if (!deleted) {
    return res.status(404).json({
      ok: false,
      reason: 'not_found'
    });
  }

  res.json({ ok: true });
}));

// Menus endpoints
router.get('/menus/tree', ah(async (_req: any, res: any, next: any) => {
  const tree = await menusService.tree();
  res.json({ ok: true, tree });
}));

router.get('/menus', ah(async (req: any, res: any, next: any) => {
  // GET /menus doesn't need validation - just use query parameters as-is
  const menus = await menusService.list(req.query || {});
  res.json({ ok: true, menus });
}));

router.post('/menus', ah(async (req: any, res: any, next: any) => {
  const success = req.validationResult?.success;
  if (!success) {
    return res.status(400).json({
      ok: false,
      reason: 'validation_failed',
      errors: req.validationResult?.errors
    });
  }

  const updated_by = req.user?.email ?? 'system';
  const menu = await menusService.create({
    ...req.validationResult?.data,
    updated_by
  });

  res.status(201).json({ ok: true, menu });
}));

router.put('/menus/:id([0-9]+)', ah(async (req: any, res: any, next: any) => {
  const id = parseInt(req.params.id);
  const success = req.validationResult?.success;
  if (!success) {
    return res.status(400).json({
      ok: false,
      reason: 'validation_failed',
      errors: req.validationResult?.errors
    });
  }

  const updated_by = req.user?.email ?? 'system';
  const menu = await menusService.update(id, {
    ...req.validationResult?.data,
    updated_by
  });

  if (!menu) {
    return res.status(404).json({
      ok: false,
      reason: 'not_found'
    });
  }

  res.json({ ok: true, menu });
}));

router.delete('/menus/:id([0-9]+)', ah(async (req: any, res: any, next: any) => {
  const id = parseInt(req.params.id);
  const hard = req.query.hard === '1';

  const deleted = await menusService.delete(id, hard);
  if (!deleted) {
    return res.status(404).json({
      ok: false,
      reason: 'not_found'
    });
  }

  res.json({ ok: true });
}));

router.post('/menus/reorder', ah(async (req: any, res: any, next: any) => {
  const success = req.validationResult?.success;
  if (!success) {
    return res.status(400).json({
      ok: false,
      reason: 'validation_failed',
      errors: req.validationResult?.errors
    });
  }

  await menusService.reorder(req.validationResult?.data || { items: [] });
  res.json({ ok: true });
}));

export { router };
