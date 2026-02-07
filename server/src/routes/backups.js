/**
 * Unified Backup Routes
 * Integrates Borg-based backups (om-backup-v2.sh) with BackupEngine
 * Provides API for both UI-triggered and script-triggered backups
 * 
 * Routes:
 * - POST /api/backups/start - Start backup job
 * - GET /api/backups/jobs - List all backup jobs
 * - GET /api/backups/jobs/:id - Get job details
 * - GET /api/backups/settings - Get backup settings
 * - PUT /api/backups/settings - Update backup settings
 * - GET /api/backups/statistics - Get backup statistics
 * - POST /api/backups/borg/run - Run borg backup (om-backup-v2.sh)
 * - GET /api/backups/borg/list - List borg archives
 * - GET /api/backups/borg/info - Get borg repository info
 */

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fsSync = require('fs');
const fs = fsSync.promises;
const { requireRole } = require('../middleware/auth');
const { sendBackupNotification } = require('../utils/emailService');
const { getAppPool: getAppPoolForSettings } = require('../config/db-compat');

// Helper: Get notification email from backup settings if enabled
async function getBackupNotificationEmail() {
  try {
    const [rows] = await getAppPoolForSettings().query('SELECT settings FROM backup_settings WHERE id = 1');
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

// Import BackupEngine if available
let BackupEngine;
try {
  BackupEngine = require('../modules/backup/BackupEngine');
} catch (err) {
  console.warn('BackupEngine not available, using legacy backup methods');
}

// All routes require super_admin
router.use(requireRole(['super_admin']));

// Constants
const BORG_REPO = process.env.BORG_REPO || '/var/backups/OM/repo';
const BORG_SCRIPT = process.env.BORG_SCRIPT || '/var/backups/OM/om-backup-v2-fixed.sh';
const BACKUP_ROOT = process.env.BACKUP_ROOT || '/var/backups/orthodoxmetrics';

// Helper: Get DB connection
function getDb() {
  const db = require('../config/db-compat');
  return db.getAppPool();
}

// Helper: Run shell command with promise
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      ...options,
      env: { 
        ...process.env, 
        BORG_PASSPHRASE: process.env.BORG_PASSPHRASE || '' 
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }
    
    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
    
    proc.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * GET /api/backups/settings
 * Get backup configuration settings
 */
router.get('/settings', async (req, res) => {
  try {
    const db = getDb();
    const [settings] = await db.query('SELECT * FROM backup_settings LIMIT 1');
    
    if (settings.length === 0) {
      // Return default settings
      return res.json({
        success: true,
        data: {
          settings: {
            enabled: true,
            schedule: '0 2 * * *',
            keep_hourly: 48,
            keep_daily: 30,
            keep_weekly: 12,
            keep_monthly: 6,
            compression_level: 3,
            borg_repo_path: BORG_REPO,
            include_database: true,
            include_files: true,
            include_uploads: true,
            email_notifications: false,
            notification_email: '',
            verify_after_backup: true
          }
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        settings: settings[0]
      }
    });
  } catch (error) {
    console.error('Error fetching backup settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup settings'
    });
  }
});

/**
 * PUT /api/backups/settings
 * Update backup configuration settings
 */
router.put('/settings', async (req, res) => {
  try {
    const db = getDb();
    const { settings } = req.body;
    
    if (!settings) {
      return res.status(400).json({
        success: false,
        error: 'Settings object is required'
      });
    }
    
    // Check if settings exist
    const [existing] = await db.query('SELECT id FROM backup_settings LIMIT 1');
    
    const fields = [
      'enabled', 'schedule', 'keep_hourly', 'keep_daily', 'keep_weekly', 'keep_monthly',
      'compression_level', 'borg_repo_path', 'include_database', 'include_files',
      'include_uploads', 'email_notifications', 'notification_email', 'verify_after_backup'
    ];
    
    const values = fields.map(f => settings[f] !== undefined ? settings[f] : null);
    
    if (existing.length === 0) {
      // Insert new settings
      await db.query(
        `INSERT INTO backup_settings (${fields.join(', ')}, updated_at) VALUES (${fields.map(() => '?').join(', ')}, NOW())`,
        values
      );
    } else {
      // Update existing settings
      await db.query(
        `UPDATE backup_settings SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = NOW() WHERE id = ?`,
        [...values, existing[0].id]
      );
    }
    
    res.json({
      success: true,
      message: 'Backup settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating backup settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update backup settings'
    });
  }
});

/**
 * POST /api/backups/start
 * Start a new backup job (uses BackupEngine for tar/mysql backups)
 */
router.post('/start', async (req, res) => {
  try {
    const { type = 'full' } = req.body;
    const userId = req.session?.user?.id || req.session?.user?.email;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // Map type to BackupEngine kind
    let kind;
    if (type === 'full' || type === 'incremental') {
      kind = 'both'; // Both database and files
    } else if (type === 'database') {
      kind = 'db';
    } else if (type === 'files') {
      kind = 'files';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid backup type. Must be full, incremental, database, or files'
      });
    }
    
    if (!BackupEngine) {
      return res.status(500).json({
        success: false,
        error: 'Backup engine not available'
      });
    }
    
    const db = getDb();
    const engine = new BackupEngine(db, {
      backupRoot: BACKUP_ROOT,
      prodRoot: process.env.PROD_ROOT || '/var/www/orthodoxmetrics/prod',
      database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'orthodoxmetrics_db'
      }
    });
    
    await engine.initialize();
    const result = await engine.createBackupJob(kind, userId);
    
    res.json({
      success: true,
      message: 'Backup job started',
      data: result
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
 * POST /api/backups/borg/run
 * Run borg backup using om-backup-v2.sh script
 */
router.post('/borg/run', async (req, res) => {
  try {
    const userId = req.session?.user?.id || req.session?.user?.email;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // Check if borg script exists
    try {
      await fs.access(BORG_SCRIPT, fsSync.constants.X_OK);
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'Borg backup script not found or not executable',
        path: BORG_SCRIPT
      });
    }
    
    // Create a job record in the database
    const db = getDb();
    
    const [insertResult] = await db.query(
      'INSERT INTO backup_jobs (kind, status, created_at, requested_by, started_at) VALUES (?, ?, NOW(), ?, NOW())',
      ['borg', 'running', userId]
    );
    const jobId = insertResult.insertId;
    
    // Run borg backup script asynchronously
    runCommand('bash', [BORG_SCRIPT])
      .then(async (result) => {
        // Update job as successful
        try {
          await db.query(
            'UPDATE backup_jobs SET status = ?, finished_at = NOW(), duration_ms = TIMESTAMPDIFF(MICROSECOND, started_at, NOW()) / 1000 WHERE id = ?',
            ['success', jobId]
          );
        } catch (dbErr) {
          console.error(`Failed to update job ${jobId} status:`, dbErr);
        }
        console.log(`Borg backup job ${jobId} completed successfully`);
        // Send email notification if enabled
        const notifyEmail = await getBackupNotificationEmail();
        if (notifyEmail) {
          sendBackupNotification(notifyEmail, { jobId, kind: 'borg', status: 'success' }).catch(() => {});
        }
      })
      .catch(async (error) => {
        // Update job as failed
        try {
          await db.query(
            'UPDATE backup_jobs SET status = ?, finished_at = NOW(), error = ?, duration_ms = TIMESTAMPDIFF(MICROSECOND, started_at, NOW()) / 1000 WHERE id = ?',
            ['failed', error.message, jobId]
          );
        } catch (dbErr) {
          console.error(`Failed to update job ${jobId} failure status:`, dbErr);
        }
        console.error(`Borg backup job ${jobId} failed:`, error);
        // Send email notification if enabled
        const notifyEmail = await getBackupNotificationEmail();
        if (notifyEmail) {
          sendBackupNotification(notifyEmail, { jobId, kind: 'borg', status: 'failed', error: error.message }).catch(() => {});
        }
      });
    
    res.json({
      success: true,
      message: 'Borg backup started',
      data: {
        jobId,
        status: 'running',
        message: 'Borg backup script is running. Check job history for progress.'
      }
    });
  } catch (error) {
    console.error('Error starting borg backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start borg backup',
      message: error.message
    });
  }
});

/**
 * GET /api/backups/borg/list
 * List borg repository archives
 */
router.get('/borg/list', async (req, res) => {
  try {
    const result = await runCommand('borg', ['list', '--json', BORG_REPO]);
    const archives = JSON.parse(result.stdout);
    
    res.json({
      success: true,
      data: {
        archives: archives.archives || [],
        repository: BORG_REPO
      }
    });
  } catch (error) {
    console.error('Error listing borg archives:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list borg archives',
      message: error.message
    });
  }
});

/**
 * GET /api/backups/borg/info
 * Get borg repository information
 */
router.get('/borg/info', async (req, res) => {
  try {
    const result = await runCommand('borg', ['info', '--json', BORG_REPO]);
    const info = JSON.parse(result.stdout);
    
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    console.error('Error getting borg info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get borg repository info',
      message: error.message
    });
  }
});

/**
 * GET /api/backups/jobs
 * List backup jobs with optional filtering
 */
router.get('/jobs', async (req, res) => {
  try {
    const { limit = 20, offset = 0, status, kind } = req.query;
    
    const db = getDb();
    let query = `
      SELECT 
        j.*,
        u.email as requested_by_email,
        u.first_name as requested_by_name,
        (SELECT COUNT(*) FROM backup_artifacts WHERE job_id = j.id) as artifact_count,
        (SELECT SUM(file_size) FROM backup_artifacts WHERE job_id = j.id) as total_size_bytes
      FROM backup_jobs j
      LEFT JOIN orthodoxmetrics_db.users u ON j.requested_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND j.status = ?';
      params.push(status);
    }
    
    if (kind) {
      query += ' AND j.kind = ?';
      params.push(kind);
    }
    
    query += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [jobs] = await db.query(query, params);
    
    res.json({
      success: true,
      data: {
        jobs,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching backup jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup jobs'
    });
  }
});

/**
 * GET /api/backups/jobs/:id
 * Get detailed information about a specific backup job
 */
router.get('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    const [jobs] = await db.query(
      `SELECT 
        j.*,
        u.email as requested_by_email,
        u.first_name as requested_by_name
      FROM backup_jobs j
      LEFT JOIN orthodoxmetrics_db.users u ON j.requested_by = u.id
      WHERE j.id = ?`,
      [id]
    );
    
    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Backup job not found'
      });
    }
    
    const [artifacts] = await db.query(
      'SELECT * FROM backup_artifacts WHERE job_id = ?',
      [id]
    );
    
    res.json({
      success: true,
      data: {
        job: jobs[0],
        artifacts
      }
    });
  } catch (error) {
    console.error('Error fetching backup job details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup job details'
    });
  }
});

/**
 * GET /api/backups/statistics
 * Get backup statistics and summary
 */
router.get('/statistics', async (req, res) => {
  try {
    const db = getDb();
    
    const [jobStats] = await db.query(`
      SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_jobs,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_jobs,
        AVG(CASE WHEN duration_ms IS NOT NULL THEN duration_ms END) as avg_duration_ms
      FROM backup_jobs
    `);
    
    const [artifactStats] = await db.query(`
      SELECT 
        COUNT(*) as total_artifacts,
        SUM(file_size) as total_size_bytes,
        artifact_type,
        COUNT(*) as count
      FROM backup_artifacts
      GROUP BY artifact_type
    `);
    
    const [recentJobs] = await db.query(`
      SELECT * FROM backup_jobs 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    res.json({
      success: true,
      data: {
        jobs: jobStats[0] || {},
        artifacts: {
          total_count: artifactStats.reduce((sum, a) => sum + (a.count || 0), 0),
          total_size_bytes: artifactStats.reduce((sum, a) => sum + (a.total_size_bytes || 0), 0),
          by_type: artifactStats
        },
        recent: recentJobs
      }
    });
  } catch (error) {
    console.error('Error fetching backup statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup statistics'
    });
  }
});

module.exports = router;
