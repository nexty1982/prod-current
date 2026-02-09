/**
 * Backup Management API
 * Endpoints for managing backups using the database-integrated backup system
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { getAppPool } = require('../config/db-compat');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const BACKUP_SCRIPT = '/var/backups/OM/om-backup-v2-fixed.sh';
const { sendBackupNotification } = require('../utils/emailService');

// Helper: Get notification email from backup settings if enabled
async function getBackupNotificationEmail() {
  try {
    const [rows] = await getAppPool().query('SELECT settings FROM backup_settings WHERE id = 1');
    if (rows.length === 0) return null;
    const s = typeof rows[0].settings === 'string' ? JSON.parse(rows[0].settings) : rows[0].settings;
    if (s && s.email_notifications && s.notification_email) {
      return s.notification_email;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * GET /api/backups/jobs - List recent backup jobs
 */
router.get('/jobs', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const [jobs] = await getAppPool().query(`
      SELECT 
        bj.id,
        bj.kind,
        bj.status,
        bj.requested_by,
        bj.started_at,
        bj.finished_at,
        bj.duration_ms,
        bj.error,
        bj.created_at,
        u.email as requested_by_email,
        u.first_name as requested_by_name,
        COUNT(ba.id) as artifact_count,
        SUM(ba.size_bytes) as total_size_bytes
      FROM backup_jobs bj
      LEFT JOIN users u ON bj.requested_by = u.id
      LEFT JOIN backup_artifacts ba ON bj.id = ba.job_id
      GROUP BY bj.id
      ORDER BY bj.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [countResult] = await getAppPool().query(
      'SELECT COUNT(*) as total FROM backup_jobs'
    );

    res.json({
      success: true,
      data: {
        jobs,
        total: countResult[0].total,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Error fetching backup jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup jobs',
      message: error.message
    });
  }
});

/**
 * GET /api/backups/jobs/:id - Get specific backup job details
 */
router.get('/jobs/:id', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);

    const [jobs] = await getAppPool().query(`
      SELECT 
        bj.*,
        u.email as requested_by_email,
        u.first_name as requested_by_name
      FROM backup_jobs bj
      LEFT JOIN users u ON bj.requested_by = u.id
      WHERE bj.id = ?
    `, [jobId]);

    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Backup job not found'
      });
    }

    const [artifacts] = await getAppPool().query(`
      SELECT 
        id,
        artifact_type,
        path,
        size_bytes,
        sha256,
        manifest_path,
        created_at
      FROM backup_artifacts
      WHERE job_id = ?
      ORDER BY created_at DESC
    `, [jobId]);

    res.json({
      success: true,
      data: {
        job: jobs[0],
        artifacts
      }
    });
  } catch (error) {
    console.error('Error fetching backup job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup job',
      message: error.message
    });
  }
});

/**
 * POST /api/backups/start - Start a new backup
 */
router.post('/start', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const { type = 'full' } = req.body;
    const userId = req.session?.user?.id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Map type to kind for DB record
    let kind;
    if (type === 'full' || type === 'incremental') {
      kind = 'both';
    } else if (type === 'database') {
      kind = 'db';
    } else if (type === 'files') {
      kind = 'files';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid backup type. Must be full, database, or files'
      });
    }

    // Create job record in DB
    const [insertResult] = await getAppPool().query(
      'INSERT INTO backup_jobs (kind, status, created_at, requested_by, started_at) VALUES (?, ?, NOW(), ?, NOW())',
      [kind, 'running', userId]
    );
    const jobId = insertResult.insertId;

    // Run backup script asynchronously
    const { spawn } = require('child_process');
    const proc = spawn('bash', [BACKUP_SCRIPT], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        BORG_PASSPHRASE: process.env.BORG_PASSPHRASE || ''
      }
    });

    // Drain stdout/stderr to prevent buffer blocking
    if (proc.stdout) proc.stdout.resume();
    if (proc.stderr) proc.stderr.resume();

    // Track completion asynchronously
    const startTime = Date.now();
    proc.on('close', async (code) => {
      const durationMs = Date.now() - startTime;
      try {
        if (code === 0) {
          await getAppPool().query(
            'UPDATE backup_jobs SET status = ?, finished_at = NOW(), duration_ms = ? WHERE id = ?',
            ['success', durationMs, jobId]
          );
          console.log(`Backup job ${jobId} completed successfully in ${durationMs}ms`);
          // Send email notification if enabled
          const notifyEmail = await getBackupNotificationEmail();
          if (notifyEmail) {
            sendBackupNotification(notifyEmail, { jobId, kind, status: 'success', durationMs }).catch(() => {});
          }
        } else {
          const errMsg = `Script exited with code ${code}`;
          await getAppPool().query(
            'UPDATE backup_jobs SET status = ?, finished_at = NOW(), duration_ms = ?, error = ? WHERE id = ?',
            ['failed', durationMs, errMsg, jobId]
          );
          console.error(`Backup job ${jobId} failed with code ${code}`);
          // Send email notification if enabled
          const notifyEmail = await getBackupNotificationEmail();
          if (notifyEmail) {
            sendBackupNotification(notifyEmail, { jobId, kind, status: 'failed', durationMs, error: errMsg }).catch(() => {});
          }
        }
      } catch (dbErr) {
        console.error(`Failed to update backup job ${jobId}:`, dbErr);
      }
    });

    proc.on('error', async (error) => {
      try {
        await getAppPool().query(
          'UPDATE backup_jobs SET status = ?, finished_at = NOW(), error = ? WHERE id = ?',
          ['failed', error.message, jobId]
        );
      } catch (dbErr) {
        console.error(`Failed to update backup job ${jobId}:`, dbErr);
      }
      console.error(`Backup job ${jobId} error:`, error);
    });

    res.json({
      success: true,
      message: `${type} backup started`,
      data: {
        jobId,
        status: 'running',
        kind
      }
    });
  } catch (error) {
    console.error('Error starting backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start backup',
      message: error.message
    });
  }
});

/**
 * GET /api/backups/filters - Get backup filters
 */
router.get('/filters', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const scope = req.query.scope; // 'files', 'db', or undefined for all

    let query = 'SELECT * FROM backup_filters';
    const params = [];

    if (scope) {
      query += ' WHERE scope = ?';
      params.push(scope);
    }

    query += ' ORDER BY scope, label';

    const [filters] = await getAppPool().query(query, params);

    res.json({
      success: true,
      data: { filters }
    });
  } catch (error) {
    console.error('Error fetching backup filters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup filters',
      message: error.message
    });
  }
});

/**
 * PUT /api/backups/filters/:id - Update backup filter
 */
router.put('/filters/:id', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const filterId = parseInt(req.params.id);
    const { label, include_regex, exclude_regex, is_active } = req.body;

    const updates = [];
    const values = [];

    if (label !== undefined) { updates.push('label = ?'); values.push(label); }
    if (include_regex !== undefined) { updates.push('include_regex = ?'); values.push(include_regex || null); }
    if (exclude_regex !== undefined) { updates.push('exclude_regex = ?'); values.push(exclude_regex || null); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(filterId);

    await getAppPool().query(
      `UPDATE backup_filters SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [updated] = await getAppPool().query(
      'SELECT * FROM backup_filters WHERE id = ?',
      [filterId]
    );

    res.json({
      success: true,
      message: 'Filter updated successfully',
      data: { filter: updated[0] }
    });
  } catch (error) {
    console.error('Error updating backup filter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update backup filter',
      message: error.message
    });
  }
});

/**
 * GET /api/backups/settings - Get backup settings
 */
router.get('/settings', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const [settings] = await getAppPool().query(
      'SELECT * FROM backup_settings WHERE id = 1'
    );

    if (settings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Backup settings not found'
      });
    }

    const settingsData = settings[0];
    
    // Parse JSON settings with fallback defaults
    const defaults = {
      enabled: true,
      schedule: '0 2 * * *',
      keep_hourly: 48,
      keep_daily: 30,
      keep_weekly: 12,
      keep_monthly: 6,
      compression_level: 3,
      borg_repo_path: '/var/backups/OM/repo',
      include_database: true,
      include_files: true,
      include_uploads: true,
      email_notifications: false,
      notification_email: '',
      verify_after_backup: true
    };

    try {
      if (typeof settingsData.settings === 'string' && settingsData.settings) {
        settingsData.settings = JSON.parse(settingsData.settings);
      } else if (!settingsData.settings || typeof settingsData.settings !== 'object') {
        settingsData.settings = defaults;
      }
    } catch (parseErr) {
      console.warn('Failed to parse backup settings JSON, using defaults:', parseErr.message);
      settingsData.settings = defaults;
    }

    res.json({
      success: true,
      data: settingsData
    });
  } catch (error) {
    console.error('Error fetching backup settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup settings',
      message: error.message
    });
  }
});

/**
 * PUT /api/backups/settings - Update backup settings
 */
router.put('/settings', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings object'
      });
    }

    const settingsJson = JSON.stringify(settings);

    await getAppPool().query(
      'UPDATE backup_settings SET settings = ?, updated_at = NOW() WHERE id = 1',
      [settingsJson]
    );

    const [updated] = await getAppPool().query(
      'SELECT * FROM backup_settings WHERE id = 1'
    );

    const settingsData = updated[0];
    if (typeof settingsData.settings === 'string') {
      settingsData.settings = JSON.parse(settingsData.settings);
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settingsData
    });
  } catch (error) {
    console.error('Error updating backup settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update backup settings',
      message: error.message
    });
  }
});

/**
 * GET /api/backups/statistics - Get backup statistics
 */
router.get('/statistics', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const [stats] = await getAppPool().query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_jobs,
        AVG(CASE WHEN status = 'success' THEN duration_ms END) as avg_duration_ms,
        MAX(finished_at) as last_backup_at
      FROM backup_jobs
    `);

    const [artifactStats] = await getAppPool().query(`
      SELECT 
        COUNT(*) as total_artifacts,
        SUM(size_bytes) as total_size_bytes,
        COUNT(CASE WHEN artifact_type = 'files' THEN 1 END) as file_artifacts,
        COUNT(CASE WHEN artifact_type = 'db' THEN 1 END) as db_artifacts
      FROM backup_artifacts
    `);

    // Get disk space info for backup partition
    let diskInfo = { total_space: 0, used_space: 0, backup_space: 0 };
    try {
      const dfResult = await execAsync("df -B1 /var/backups 2>/dev/null | tail -1 | awk '{print $2, $3, $4}'");
      const parts = dfResult.stdout.trim().split(/\s+/);
      if (parts.length >= 3) {
        diskInfo.total_space = parseInt(parts[0]) || 0;
        diskInfo.used_space = parseInt(parts[1]) || 0;
      }
      // Get actual backup directory size
      const duResult = await execAsync("du -sb /var/backups/OM 2>/dev/null | awk '{print $1}'");
      diskInfo.backup_space = parseInt(duResult.stdout.trim()) || 0;
    } catch (diskErr) {
      // Non-fatal - disk info just won't be available
      console.warn('Could not get disk space info:', diskErr.message);
    }

    res.json({
      success: true,
      data: {
        jobs: stats[0],
        artifacts: artifactStats[0],
        disk: diskInfo
      }
    });
  } catch (error) {
    console.error('Error fetching backup statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup statistics',
      message: error.message
    });
  }
});

module.exports = router;
