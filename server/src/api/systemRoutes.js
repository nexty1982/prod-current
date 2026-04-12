/**
 * System Routes — Read-only route introspection endpoint
 *
 * Extracted from apiExplorer.js during OM→OMAI migration (Wave 1, Cluster #20 Part C).
 * This minimal endpoint remains in OM so the OMAI-hosted API Explorer can
 * introspect OM routes via dual-target proxy.
 *
 * Endpoint:
 *   GET /api/system/routes — List all registered Express routes (super_admin)
 */

const express = require('express');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

const NO_AUTH_PATHS = [
  '/api/system/health',
  '/api/maintenance/status',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
];

function classifyAuth(path) {
  if (NO_AUTH_PATHS.includes(path)) return 'none';
  if (path.startsWith('/api/admin')) return 'super_admin';
  if (path.startsWith('/__debug')) return 'none';
  return 'session';
}

function classifyTag(path) {
  if (path.startsWith('/api/system') || path.startsWith('/__debug')) return 'system';
  if (path.startsWith('/api/admin')) return 'admin';
  if (path.startsWith('/api/auth')) return 'auth';
  if (path.includes('record') || path.includes('baptism') || path.includes('marriage') || path.includes('funeral')) return 'records';
  if (path.includes('certificate')) return 'certificates';
  if (path.includes('church')) return 'churches';
  if (path.includes('ocr')) return 'ocr';
  if (path.includes('library') || path.includes('docs')) return 'library';
  if (path.includes('social') || path.includes('blog') || path.includes('chat')) return 'social';
  if (path.includes('invoice') || path.includes('billing') || path.includes('ecommerce')) return 'billing';
  if (path.includes('omai') || path.includes('ai')) return 'ai';
  if (path.includes('kanban') || path.includes('task')) return 'tasks';
  if (path.includes('notification')) return 'notifications';
  if (path.includes('calendar')) return 'calendar';
  if (path.includes('gallery') || path.includes('upload') || path.includes('image')) return 'media';
  if (path.includes('build') || path.includes('version') || path.includes('jit') || path.includes('git')) return 'devops';
  return 'other';
}

function extractRoutes(stack, basePath = '') {
  const routes = [];
  if (!stack || !Array.isArray(stack)) return routes;

  for (const layer of stack) {
    try {
      if (layer.route) {
        const path = basePath + (layer.route.path || '');
        const methods = Object.keys(layer.route.methods || {})
          .filter(m => layer.route.methods[m])
          .map(m => m.toUpperCase());

        for (const method of methods) {
          routes.push({
            method,
            path: path || '/',
            auth: classifyAuth(path),
            tags: [classifyTag(path)],
            source: '',
          });
        }
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        let prefix = '';
        if (layer.regexp) {
          const match = layer.regexp.source
            .replace('\\/?', '')
            .replace('(?=\\/|$)', '')
            .replace(/\\\//g, '/')
            .replace(/\^/, '')
            .replace(/\$/, '');
          if (match && match !== '/' && match !== '') {
            prefix = match;
          }
        }
        if (layer.keys && layer.keys.length > 0) {
          const paramNames = layer.keys.map(k => `:${k.name}`);
          let paramPrefix = prefix;
          for (const pn of paramNames) {
            paramPrefix = paramPrefix.replace(/\/\([^)]+\)/, `/${pn}`);
          }
          prefix = paramPrefix;
        }
        const nestedRoutes = extractRoutes(layer.handle.stack, basePath + prefix);
        routes.push(...nestedRoutes);
      }
    } catch (err) {
      continue;
    }
  }

  return routes;
}

router.get('/routes', requireRole(['super_admin']), (req, res) => {
  try {
    const app = req.app;
    if (!app || !app._router || !app._router.stack) {
      return res.json({ success: true, routes: [], message: 'No routes found' });
    }

    const rawRoutes = extractRoutes(app._router.stack);

    const seen = new Set();
    const routes = [];
    for (const r of rawRoutes) {
      if (r.path.includes('favicon') || r.path === '/' || !r.path) continue;
      const key = `${r.method}:${r.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      routes.push(r);
    }

    routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

    res.json({ success: true, count: routes.length, routes });
  } catch (err) {
    console.error('[SystemRoutes] Route introspection failed:', err.message);
    res.status(500).json({ success: false, error: 'Route introspection failed', message: err.message });
  }
});

module.exports = router;
