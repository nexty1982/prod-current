/**
 * Platform Actions API — Safe operational controls for super_admin
 * All actions are authenticated, role-gated, audit-logged, and cooldown-protected.
 *
 * POST /api/platform/actions/service/:name/restart — Restart a systemd service
 * GET  /api/platform/actions/service/:name/logs    — Fetch recent journalctl output
 * POST /api/platform/actions/database/backup       — Trigger DB backup on remote host
 * GET  /api/platform/actions/database/ping          — Run SELECT 1 latency test
 * GET  /api/platform/actions/history                — Recent action audit feed
 */

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { getAppPool } = require('../config/db');

const DB_HOST = process.env.DB_HOST || '192.168.1.241';

// Allowed services — ONLY these can be targeted
const ALLOWED_SERVICES = {
  'orthodox-backend': { label: 'Backend',    key: 'backend' },
  'om-ocr-worker':    { label: 'OCR Worker', key: 'ocr_worker' },
  'omai':             { label: 'OMAI',       key: 'omai' },
};

// ─── Cooldown & Lock State (in-memory, resets on restart) ───────

const ACTION_COOLDOWNS = {
  service_restart: 15000,   // 15s between restarts of same service
  database_backup: 60000,   // 60s between backup triggers
  database_ping:   3000,    // 3s between pings
};

const lastActionTime = {};  // key → timestamp of last completed action
const activeActions = {};   // key → true while action is in progress

function getCooldownKey(actionType, target) {
  return `${actionType}:${target}`;
}

function checkCooldown(actionType, target) {
  const key = getCooldownKey(actionType, target);
  const cooldownMs = ACTION_COOLDOWNS[actionType] || 10000;
  const lastTime = lastActionTime[key];
  if (lastTime) {
    const elapsed = Date.now() - lastTime;
    if (elapsed < cooldownMs) {
      const remainingSec = Math.ceil((cooldownMs - elapsed) / 1000);
      return { blocked: true, reason: 'cooldown', remaining_seconds: remainingSec };
    }
  }
  return { blocked: false };
}

function checkLock(actionType, target) {
  const key = getCooldownKey(actionType, target);
  if (activeActions[key]) {
    return { blocked: true, reason: 'already_in_progress' };
  }
  return { blocked: false };
}

function acquireLock(actionType, target) {
  activeActions[getCooldownKey(actionType, target)] = true;
}

function releaseLock(actionType, target) {
  delete activeActions[getCooldownKey(actionType, target)];
  lastActionTime[getCooldownKey(actionType, target)] = Date.now();
}

// ─── Standardized Response Builder ──────────────────────────────

function actionResponse(status, message, extras = {}) {
  return {
    status,       // 'success' | 'failed' | 'blocked' | 'started'
    message,
    timestamp: new Date().toISOString(),
    ...extras,
  };
}

// ─── Audit Logger ────────────────────────────────────────────────

async function logAction(req, actionType, target, result, durationMs = null, extra = null) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const details = {
      action_type: actionType,
      target,
      result,
      ...(durationMs != null ? { duration_ms: durationMs } : {}),
      ...(extra || {}),
    };
    await getAppPool().query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at)
       VALUES (?, ?, 'platform_action', NULL, ?, ?, ?, NOW())`,
      [
        userId,
        actionType,
        JSON.stringify(details),
        req.ip || null,
        req.headers['user-agent'] || null,
      ]
    );
  } catch (err) {
    console.error('[Platform Actions] Audit log failed:', err.message);
  }
}

// ─── Helper: Run shell command with timeout ─────────────────────

function runCommand(cmd, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: timeoutMs, encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) return reject(new Error('Command timed out'));
        return reject(new Error(error.message));
      }
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

// ─── Helper: Get service status after action ────────────────────

async function getServiceStatus(serviceName) {
  try {
    const { stdout } = await runCommand(
      `systemctl show ${serviceName} --property=ActiveState,SubState --no-pager 2>/dev/null`,
      3000
    );
    const props = {};
    for (const line of stdout.split('\n')) {
      const eq = line.indexOf('=');
      if (eq > 0) props[line.slice(0, eq)] = line.slice(eq + 1);
    }
    const active = props.ActiveState || 'unknown';
    const sub = props.SubState || 'unknown';
    return {
      status: active === 'active' && sub === 'running' ? 'ok' : active === 'activating' ? 'starting' : 'down',
      active_state: active,
      sub_state: sub,
    };
  } catch (_) {
    return { status: 'unknown', active_state: 'unknown', sub_state: 'unknown' };
  }
}

// ─── Middleware: Validate service name ───────────────────────────

function validateService(req, res, next) {
  const name = req.params.name;
  if (!ALLOWED_SERVICES[name]) {
    return res.status(400).json(
      actionResponse('failed', `Service "${name}" is not in the allowed list. Allowed: ${Object.keys(ALLOWED_SERVICES).join(', ')}`)
    );
  }
  req.serviceName = name;
  req.serviceLabel = ALLOWED_SERVICES[name].label;
  next();
}

// ─── Middleware: Cooldown + Lock gate ────────────────────────────

function guardAction(actionType) {
  return (req, res, next) => {
    const target = req.serviceName || 'mariadb';

    const lock = checkLock(actionType, target);
    if (lock.blocked) {
      return res.status(429).json(
        actionResponse('blocked', `${actionType} is already running for ${target}`, { reason: lock.reason })
      );
    }

    const cooldown = checkCooldown(actionType, target);
    if (cooldown.blocked) {
      return res.status(429).json(
        actionResponse('blocked', `Please wait ${cooldown.remaining_seconds}s before retrying`, {
          reason: cooldown.reason,
          remaining_seconds: cooldown.remaining_seconds,
        })
      );
    }

    next();
  };
}

// ─── 1. Restart Service ─────────────────────────────────────────

router.post(
  '/service/:name/restart',
  authMiddleware,
  requireRole('super_admin'),
  validateService,
  guardAction('service_restart'),
  async (req, res) => {
    const { serviceName, serviceLabel } = req;
    const userId = req.user?.id || req.session?.user?.id;
    const startTime = Date.now();

    console.log(`[Platform Actions] User ${userId} requested restart of ${serviceName}`);
    acquireLock('service_restart', serviceName);

    const isBackend = serviceName === 'orthodox-backend';

    try {
      if (isBackend) {
        const duration = Date.now() - startTime;
        await logAction(req, 'service_restart', serviceName, 'started', duration, { note: 'Backend self-restart — delayed 2s' });
        releaseLock('service_restart', serviceName);

        res.json(actionResponse('started', 'Backend restart initiated. Connection will drop momentarily.', {
          service: serviceName,
          label: serviceLabel,
          self_restart: true,
          duration_ms: duration,
        }));

        setTimeout(() => {
          exec('sudo systemctl restart orthodox-backend', { timeout: 10000 }, (err) => {
            if (err) console.error('[Platform Actions] Backend restart failed:', err.message);
          });
        }, 1500);

        return;
      }

      // Normal service restart
      await runCommand(`sudo systemctl restart ${serviceName}`, 15000);

      // Wait for stabilization, then check status
      await new Promise(r => setTimeout(r, 2000));
      const newStatus = await getServiceStatus(serviceName);
      const duration = Date.now() - startTime;
      const result = newStatus.status === 'ok' ? 'success' : 'failed';

      await logAction(req, 'service_restart', serviceName, result, duration, { new_status: newStatus });
      releaseLock('service_restart', serviceName);

      res.json(actionResponse(result === 'success' ? 'success' : 'failed',
        result === 'success' ? `${serviceLabel} restarted successfully` : `${serviceLabel} restart completed but service is ${newStatus.status}`,
        { service: serviceName, label: serviceLabel, new_status: newStatus, duration_ms: duration }
      ));
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[Platform Actions] Restart failed for ${serviceName}:`, err.message);
      await logAction(req, 'service_restart', serviceName, 'failed', duration, { error: err.message });
      releaseLock('service_restart', serviceName);

      res.status(500).json(
        actionResponse('failed', `Failed to restart ${serviceLabel}: ${err.message}`, { service: serviceName, duration_ms: duration })
      );
    }
  }
);

// ─── 2. Service Logs ────────────────────────────────────────────

router.get(
  '/service/:name/logs',
  authMiddleware,
  requireRole('super_admin'),
  validateService,
  async (req, res) => {
    const { serviceName, serviceLabel } = req;
    const lines = Math.min(parseInt(req.query.lines) || 100, 500);
    const startTime = Date.now();

    try {
      const { stdout } = await runCommand(
        `journalctl -u ${serviceName} -n ${lines} --no-pager --output=short-iso 2>/dev/null`,
        10000
      );
      const duration = Date.now() - startTime;

      await logAction(req, 'service_logs', serviceName, 'success', duration, { lines });

      res.json(actionResponse('success', `Fetched ${lines} log lines for ${serviceLabel}`, {
        service: serviceName,
        label: serviceLabel,
        lines,
        output: stdout,
        duration_ms: duration,
      }));
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[Platform Actions] Log fetch failed for ${serviceName}:`, err.message);
      res.status(500).json(
        actionResponse('failed', `Failed to fetch logs for ${serviceLabel}: ${err.message}`, { duration_ms: duration })
      );
    }
  }
);

// ─── 3. Trigger Backup ──────────────────────────────────────────

router.post(
  '/database/backup',
  authMiddleware,
  requireRole('super_admin'),
  guardAction('database_backup'),
  async (req, res) => {
    const userId = req.user?.id || req.session?.user?.id;
    const startTime = Date.now();
    console.log(`[Platform Actions] User ${userId} requested database backup`);
    acquireLock('database_backup', 'mariadb');

    try {
      const cmd = `ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no next@${DB_HOST} "sudo /usr/local/bin/om-db-backup.sh" 2>/dev/null`;
      const { stdout, stderr } = await runCommand(cmd, 120000);
      const duration = Date.now() - startTime;

      const success = stdout.includes('Backup OK');
      const result = success ? 'success' : 'failed';

      await logAction(req, 'database_backup', 'mariadb', result, duration, {
        output: stdout.substring(0, 500),
      });
      releaseLock('database_backup', 'mariadb');

      if (success) {
        res.json(actionResponse('success', stdout.trim(), { duration_ms: duration }));
      } else {
        res.status(500).json(
          actionResponse('failed', stderr || stdout || 'Backup returned unexpected output', { duration_ms: duration })
        );
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error('[Platform Actions] Backup failed:', err.message);
      await logAction(req, 'database_backup', 'mariadb', 'failed', duration, { error: err.message });
      releaseLock('database_backup', 'mariadb');

      res.status(500).json(
        actionResponse('failed', `Backup failed: ${err.message}`, { duration_ms: duration })
      );
    }
  }
);

// ─── 4. DB Ping Test ────────────────────────────────────────────

router.get(
  '/database/ping',
  authMiddleware,
  requireRole('super_admin'),
  guardAction('database_ping'),
  async (req, res) => {
    acquireLock('database_ping', 'mariadb');
    const startTime = Date.now();
    try {
      await getAppPool().query('SELECT 1');
      const latencyMs = Date.now() - startTime;

      await logAction(req, 'database_ping', 'mariadb', 'success', latencyMs);
      releaseLock('database_ping', 'mariadb');

      res.json(actionResponse('success', `Database responded in ${latencyMs}ms`, {
        latency_ms: latencyMs,
        host: DB_HOST,
      }));
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error('[Platform Actions] DB ping failed:', err.message);
      releaseLock('database_ping', 'mariadb');

      res.status(503).json(
        actionResponse('failed', `Database unreachable: ${err.message}`, { duration_ms: duration })
      );
    }
  }
);

// ─── 5. Action History Feed ─────────────────────────────────────

router.get(
  '/history',
  authMiddleware,
  requireRole('super_admin'),
  async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    try {
      const [rows] = await getAppPool().query(
        `SELECT al.id, al.user_id, u.email AS user_email, u.first_name, u.last_name,
                al.action AS action_type, al.details, al.created_at
         FROM activity_log al
         LEFT JOIN users u ON al.user_id = u.id
         WHERE al.entity_type = 'platform_action'
         ORDER BY al.created_at DESC
         LIMIT ?`,
        [limit]
      );

      const actions = rows.map(row => {
        let parsed = {};
        try { parsed = JSON.parse(row.details || '{}'); } catch (_) {}
        return {
          id: row.id,
          action_type: parsed.action_type || row.action_type,
          target: parsed.target || null,
          result: parsed.result || null,
          message: parsed.message || null,
          duration_ms: parsed.duration_ms || null,
          user: row.user_email
            ? `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.user_email
            : 'system',
          timestamp: row.created_at,
        };
      });

      res.json(actionResponse('success', `${actions.length} recent actions`, { actions, limit }));
    } catch (err) {
      console.error('[Platform Actions] History fetch failed:', err.message);
      res.status(500).json(
        actionResponse('failed', `Failed to fetch action history: ${err.message}`)
      );
    }
  }
);

module.exports = router;
