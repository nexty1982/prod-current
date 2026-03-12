/**
 * Church Records Landing Page Branding API
 *
 * GET  /api/churches/:churchId/records-landing  — fetch branding for a church
 * PUT  /api/churches/:churchId/records-landing  — upsert branding (admin)
 * POST /api/churches/:churchId/records-landing/logo — upload logo (admin)
 * POST /api/churches/:churchId/records-landing/background — upload background image (admin)
 * DELETE /api/churches/:churchId/records-landing/logo — remove logo (admin)
 * DELETE /api/churches/:churchId/records-landing/background — remove background (admin)
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getAppPool } = require('../config/db-compat');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// ── Storage ──────────────────────────────────────────────────────────────────
const UPLOAD_ROOT = path.resolve(__dirname, '../../storage/church-branding');

function churchDir(churchId) {
  const dir = path.join(UPLOAD_ROOT, String(churchId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function makeUpload(fieldName) {
  const storage = multer.diskStorage({
    destination: (req, _file, cb) => cb(null, churchDir(req.params.churchId)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${fieldName}-${Date.now()}${ext}`);
    }
  });
  return multer({
    storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
      cb(new Error('Only PNG, JPEG, SVG, and WebP images are allowed'));
    }
  }).single(fieldName);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function validateChurchAccess(user, churchId) {
  if (user.role === 'super_admin') return { allowed: true };
  if (['admin', 'church_admin'].includes(user.role)) {
    if (user.church_id && parseInt(churchId) === user.church_id) return { allowed: true };
    return { allowed: false };
  }
  return { allowed: false };
}

const TABLE = 'orthodoxmetrics_db.church_records_landing';

const DEFAULTS = {
  logo_path: null,
  background_image_path: null,
  title: null,
  subtitle: null,
  welcome_text: null,
  accent_color: null,
  default_view: 'table',
  show_analytics_highlights: false
};

// ── GET /:churchId/records-landing ───────────────────────────────────────────
// No auth required — branding data is non-sensitive and displayed to all users
router.get('/:churchId/records-landing', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) return res.status(400).json({ success: false, error: 'Invalid church ID' });

    const [rows] = await getAppPool().query(
      `SELECT * FROM ${TABLE} WHERE church_id = ?`, [churchId]
    );

    if (rows.length === 0) {
      // Also fetch church name for default title
      const [church] = await getAppPool().query(
        'SELECT name FROM orthodoxmetrics_db.churches WHERE id = ?', [churchId]
      );
      const churchName = church.length > 0 ? church[0].name : null;
      return res.json({
        success: true,
        data: { ...DEFAULTS, church_id: churchId },
        churchName,
        isDefault: true
      });
    }

    const row = rows[0];
    // Also fetch church name
    const [church] = await getAppPool().query(
      'SELECT name FROM orthodoxmetrics_db.churches WHERE id = ?', [churchId]
    );
    const churchName = church.length > 0 ? church[0].name : null;

    res.json({
      success: true,
      data: {
        church_id: row.church_id,
        logo_path: row.logo_path,
        background_image_path: row.background_image_path,
        title: row.title,
        subtitle: row.subtitle,
        welcome_text: row.welcome_text,
        accent_color: row.accent_color,
        default_view: row.default_view,
        show_analytics_highlights: !!row.show_analytics_highlights
      },
      churchName,
      isDefault: false
    });
  } catch (err) {
    console.error('Error fetching records-landing branding:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch branding settings' });
  }
});

// ── PUT /:churchId/records-landing ───────────────────────────────────────────
router.put('/:churchId/records-landing', requireAuth, requireRole(['admin', 'super_admin', 'church_admin']), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) return res.status(400).json({ success: false, error: 'Invalid church ID' });

    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) return res.status(403).json({ success: false, error: 'Access denied' });

    const { title, subtitle, welcome_text, accent_color, default_view, show_analytics_highlights } = req.body;

    // Validate accent_color if provided
    if (accent_color && !/^#[0-9a-fA-F]{6}$/.test(accent_color)) {
      return res.status(400).json({ success: false, error: 'Invalid accent color format. Use #RRGGBB.' });
    }

    // Validate default_view
    const validViews = ['table', 'card', 'timeline', 'analytics'];
    if (default_view && !validViews.includes(default_view)) {
      return res.status(400).json({ success: false, error: `Invalid default_view. Must be one of: ${validViews.join(', ')}` });
    }

    await getAppPool().query(`
      INSERT INTO ${TABLE} (church_id, title, subtitle, welcome_text, accent_color, default_view, show_analytics_highlights)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        subtitle = VALUES(subtitle),
        welcome_text = VALUES(welcome_text),
        accent_color = VALUES(accent_color),
        default_view = VALUES(default_view),
        show_analytics_highlights = VALUES(show_analytics_highlights),
        updated_at = CURRENT_TIMESTAMP
    `, [
      churchId,
      title || null,
      subtitle || null,
      welcome_text || null,
      accent_color || null,
      default_view || 'table',
      show_analytics_highlights ? 1 : 0
    ]);

    res.json({ success: true, message: 'Records landing settings saved' });
  } catch (err) {
    console.error('Error saving records-landing branding:', err);
    res.status(500).json({ success: false, error: 'Failed to save branding settings' });
  }
});

// ── POST /:churchId/records-landing/logo ─────────────────────────────────────
router.post('/:churchId/records-landing/logo', requireAuth, requireRole(['admin', 'super_admin', 'church_admin']), (req, res) => {
  const churchId = parseInt(req.params.churchId);
  const access = validateChurchAccess(req.user, churchId);
  if (!access.allowed) return res.status(403).json({ success: false, error: 'Access denied' });

  makeUpload('logo')(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ success: false, error: uploadErr.message });
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    try {
      const logoPath = `/church-branding/${churchId}/${req.file.filename}`;

      // Remove old logo if exists
      const [existing] = await getAppPool().query(
        `SELECT logo_path FROM ${TABLE} WHERE church_id = ?`, [churchId]
      );
      if (existing.length > 0 && existing[0].logo_path) {
        const oldFile = path.join(UPLOAD_ROOT, '..', existing[0].logo_path.replace('/church-branding/', ''));
        const resolvedOld = path.resolve(UPLOAD_ROOT, '..', existing[0].logo_path.replace(/^\//, ''));
        if (fs.existsSync(resolvedOld)) fs.unlinkSync(resolvedOld);
      }

      await getAppPool().query(`
        INSERT INTO ${TABLE} (church_id, logo_path) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE logo_path = VALUES(logo_path), updated_at = CURRENT_TIMESTAMP
      `, [churchId, logoPath]);

      res.json({ success: true, logo_path: logoPath });
    } catch (err) {
      console.error('Error uploading logo:', err);
      res.status(500).json({ success: false, error: 'Failed to save logo' });
    }
  });
});

// ── POST /:churchId/records-landing/background ───────────────────────────────
router.post('/:churchId/records-landing/background', requireAuth, requireRole(['admin', 'super_admin', 'church_admin']), (req, res) => {
  const churchId = parseInt(req.params.churchId);
  const access = validateChurchAccess(req.user, churchId);
  if (!access.allowed) return res.status(403).json({ success: false, error: 'Access denied' });

  makeUpload('background')(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ success: false, error: uploadErr.message });
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    try {
      const bgPath = `/church-branding/${churchId}/${req.file.filename}`;

      // Remove old background if exists
      const [existing] = await getAppPool().query(
        `SELECT background_image_path FROM ${TABLE} WHERE church_id = ?`, [churchId]
      );
      if (existing.length > 0 && existing[0].background_image_path) {
        const resolvedOld = path.resolve(UPLOAD_ROOT, '..', existing[0].background_image_path.replace(/^\//, ''));
        if (fs.existsSync(resolvedOld)) fs.unlinkSync(resolvedOld);
      }

      await getAppPool().query(`
        INSERT INTO ${TABLE} (church_id, background_image_path) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE background_image_path = VALUES(background_image_path), updated_at = CURRENT_TIMESTAMP
      `, [churchId, bgPath]);

      res.json({ success: true, background_image_path: bgPath });
    } catch (err) {
      console.error('Error uploading background:', err);
      res.status(500).json({ success: false, error: 'Failed to save background image' });
    }
  });
});

// ── DELETE /:churchId/records-landing/logo ────────────────────────────────────
router.delete('/:churchId/records-landing/logo', requireAuth, requireRole(['admin', 'super_admin', 'church_admin']), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) return res.status(403).json({ success: false, error: 'Access denied' });

    const [existing] = await getAppPool().query(
      `SELECT logo_path FROM ${TABLE} WHERE church_id = ?`, [churchId]
    );
    if (existing.length > 0 && existing[0].logo_path) {
      const resolvedOld = path.resolve(UPLOAD_ROOT, '..', existing[0].logo_path.replace(/^\//, ''));
      if (fs.existsSync(resolvedOld)) fs.unlinkSync(resolvedOld);
    }

    await getAppPool().query(
      `UPDATE ${TABLE} SET logo_path = NULL, updated_at = CURRENT_TIMESTAMP WHERE church_id = ?`,
      [churchId]
    );
    res.json({ success: true, message: 'Logo removed' });
  } catch (err) {
    console.error('Error removing logo:', err);
    res.status(500).json({ success: false, error: 'Failed to remove logo' });
  }
});

// ── DELETE /:churchId/records-landing/background ─────────────────────────────
router.delete('/:churchId/records-landing/background', requireAuth, requireRole(['admin', 'super_admin', 'church_admin']), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) return res.status(403).json({ success: false, error: 'Access denied' });

    const [existing] = await getAppPool().query(
      `SELECT background_image_path FROM ${TABLE} WHERE church_id = ?`, [churchId]
    );
    if (existing.length > 0 && existing[0].background_image_path) {
      const resolvedOld = path.resolve(UPLOAD_ROOT, '..', existing[0].background_image_path.replace(/^\//, ''));
      if (fs.existsSync(resolvedOld)) fs.unlinkSync(resolvedOld);
    }

    await getAppPool().query(
      `UPDATE ${TABLE} SET background_image_path = NULL, updated_at = CURRENT_TIMESTAMP WHERE church_id = ?`,
      [churchId]
    );
    res.json({ success: true, message: 'Background image removed' });
  } catch (err) {
    console.error('Error removing background:', err);
    res.status(500).json({ success: false, error: 'Failed to remove background image' });
  }
});

module.exports = router;
