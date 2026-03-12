/**
 * Page Content Builds API — Code Change Detection & Auto-Builds
 *
 * Tracks source-code edits made via the Page Content Editor,
 * notifies admins/super_admins, and allows triggering frontend
 * builds from the web UI.
 *
 * Mounted at /api/page-content-builds
 */

const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getAppPool } = require('../config/db-compat');

const router = express.Router();

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const FRONTEND_DIR = path.join(PROJECT_ROOT, 'front-end');

// In-memory build state (single-server setup)
let activeBuild = null;

// ── Log a page-content change + notify admins ──

async function logContentChange(userId, pageId, pageName, filesChanged, itemCount) {
  const pool = getAppPool();

  try {
    // Insert change record
    const [result] = await pool.query(`
      INSERT INTO page_content_changes
        (user_id, page_id, page_name, files_changed, items_changed, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [userId, pageId, pageName, JSON.stringify(filesChanged), itemCount]);

    const changeId = result.insertId;

    // Notify all admin + super_admin users
    const [admins] = await pool.query(`
      SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND is_active = 1
    `);

    // Look up the editor's name
    const [editorRows] = await pool.query(`SELECT display_name, email FROM users WHERE id = ?`, [userId]);
    const editorName = editorRows[0]?.display_name || editorRows[0]?.email || `User #${userId}`;

    for (const admin of admins) {
      try {
        // Use the system_alert notification type (already exists)
        const [typeRows] = await pool.query(
          `SELECT id FROM notification_types WHERE name = 'system_alert' AND is_active = TRUE`
        );
        if (typeRows.length === 0) continue;

        await pool.query(`
          INSERT INTO notifications
            (user_id, notification_type_id, title, message, data, priority, action_url, action_text, icon)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          admin.id,
          typeRows[0].id,
          `Page Content Updated: ${pageName}`,
          `${editorName} edited ${itemCount} item${itemCount > 1 ? 's' : ''} across ${filesChanged.length} file${filesChanged.length > 1 ? 's' : ''}. A frontend rebuild is needed for changes to go live.`,
          JSON.stringify({ changeId, pageId, pageName, filesChanged, itemCount, editorName }),
          'high',
          '/admin/ai/code-changes',
          'View Changes',
          'code_change',
        ]);
      } catch (notifErr) {
        console.error('[page-content-builds] notification error for user', admin.id, notifErr.message);
      }
    }

    return changeId;
  } catch (err) {
    console.error('[page-content-builds] logContentChange error:', err.message);
    return null;
  }
}

// ── GET /changes — Recent page content changes ──

router.get('/changes', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const pool = getAppPool();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const [rows] = await pool.query(`
      SELECT
        pcc.id,
        pcc.page_id,
        pcc.page_name,
        pcc.files_changed,
        pcc.items_changed,
        pcc.build_triggered,
        pcc.created_at,
        u.display_name as editor_name,
        u.email as editor_email
      FROM page_content_changes pcc
      LEFT JOIN users u ON u.id = pcc.user_id
      ORDER BY pcc.created_at DESC
      LIMIT ?
    `, [limit]);

    // Parse JSON columns
    const changes = rows.map(r => ({
      ...r,
      files_changed: typeof r.files_changed === 'string' ? JSON.parse(r.files_changed) : r.files_changed,
    }));

    // Count changes pending build (created after last successful build)
    const [pendingRows] = await pool.query(`
      SELECT COUNT(*) as cnt
      FROM page_content_changes
      WHERE build_triggered = 0
    `);

    res.json({
      success: true,
      data: changes,
      pendingBuildCount: pendingRows[0].cnt,
    });
  } catch (err) {
    console.error('[page-content-builds] changes error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /build-status — Current build state ──

router.get('/build-status', requireAuth, requireRole(['super_admin', 'admin']), (req, res) => {
  if (activeBuild) {
    const elapsed = Date.now() - activeBuild.startedAt;
    res.json({
      success: true,
      building: true,
      runId: activeBuild.runId,
      startedAt: new Date(activeBuild.startedAt).toISOString(),
      elapsedMs: elapsed,
      triggeredBy: activeBuild.triggeredBy,
    });
  } else {
    res.json({ success: true, building: false });
  }
});

// ── POST /trigger-build — Trigger a frontend rebuild ──

router.post('/trigger-build', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  if (activeBuild) {
    return res.status(409).json({
      success: false,
      error: 'A build is already in progress',
      runId: activeBuild.runId,
    });
  }

  const userId = req.session?.user?.id || req.user?.id;
  const [editorRows] = await getAppPool().query(`SELECT display_name, email FROM users WHERE id = ?`, [userId]);
  const editorName = editorRows[0]?.display_name || editorRows[0]?.email || `User #${userId}`;
  const runId = `web-${Date.now()}`;

  activeBuild = {
    runId,
    startedAt: Date.now(),
    triggeredBy: editorName,
    userId,
    log: [],
  };

  // Respond immediately — build runs in background
  res.json({
    success: true,
    message: 'Frontend build started',
    runId,
  });

  // Run the build
  const buildCmd = `cd "${FRONTEND_DIR}" && npx vite build 2>&1`;
  const child = exec(buildCmd, { maxBuffer: 10 * 1024 * 1024, timeout: 300000 });

  let output = '';
  child.stdout.on('data', (data) => {
    output += data;
    if (activeBuild) activeBuild.log.push(data.toString());
  });
  child.stderr.on('data', (data) => {
    output += data;
    if (activeBuild) activeBuild.log.push(data.toString());
  });

  child.on('close', async (code) => {
    const durationMs = Date.now() - activeBuild.startedAt;
    const success = code === 0;

    try {
      const pool = getAppPool();

      // Mark pending changes as built
      if (success) {
        await pool.query(`UPDATE page_content_changes SET build_triggered = 1 WHERE build_triggered = 0`);
      }

      // Log the build
      await pool.query(`
        INSERT INTO page_content_builds
          (run_id, triggered_by_user_id, status, duration_ms, output_tail, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [runId, userId, success ? 'success' : 'failed', durationMs, output.slice(-2000)]);

      // Notify admins
      const [admins] = await pool.query(`
        SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND is_active = 1
      `);
      const [typeRows] = await pool.query(
        `SELECT id FROM notification_types WHERE name = ? AND is_active = TRUE`,
        [success ? 'build_completed' : 'build_failed']
      );
      if (typeRows.length > 0) {
        for (const admin of admins) {
          await pool.query(`
            INSERT INTO notifications
              (user_id, notification_type_id, title, message, data, priority, action_url, action_text, icon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            admin.id,
            typeRows[0].id,
            success ? 'Frontend Build Completed' : 'Frontend Build Failed',
            success
              ? `Frontend rebuild triggered by ${editorName} completed in ${Math.round(durationMs / 1000)}s. Changes are now live.`
              : `Frontend rebuild triggered by ${editorName} failed after ${Math.round(durationMs / 1000)}s.`,
            JSON.stringify({ runId, durationMs, triggeredBy: editorName, success }),
            success ? 'normal' : 'high',
            '/admin/ai/code-changes',
            'View Build History',
            success ? 'build_success' : 'build_error',
          ]);
        }
      }
    } catch (err) {
      console.error('[page-content-builds] post-build error:', err.message);
    }

    activeBuild = null;
  });
});

// ── GET /builds — Build history ──

router.get('/builds', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const pool = getAppPool();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const [rows] = await pool.query(`
      SELECT
        pcb.id,
        pcb.run_id,
        pcb.status,
        pcb.duration_ms,
        pcb.output_tail,
        pcb.created_at,
        u.display_name as triggered_by_name,
        u.email as triggered_by_email
      FROM page_content_builds pcb
      LEFT JOIN users u ON u.id = pcb.triggered_by_user_id
      ORDER BY pcb.created_at DESC
      LIMIT ?
    `, [limit]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[page-content-builds] builds error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /build-log/:runId — Get log output for active or completed build ──

router.get('/build-log/:runId', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  const { runId } = req.params;

  // Check active build first
  if (activeBuild && activeBuild.runId === runId) {
    return res.json({
      success: true,
      status: 'running',
      log: activeBuild.log.join(''),
      elapsedMs: Date.now() - activeBuild.startedAt,
    });
  }

  // Check completed builds
  try {
    const [rows] = await getAppPool().query(
      `SELECT status, duration_ms, output_tail FROM page_content_builds WHERE run_id = ?`,
      [runId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Build not found' });

    res.json({
      success: true,
      status: rows[0].status,
      log: rows[0].output_tail,
      durationMs: rows[0].duration_ms,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
module.exports.logContentChange = logContentChange;
