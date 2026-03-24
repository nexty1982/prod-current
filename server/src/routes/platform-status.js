/**
 * Platform Status API — Read-only platform health (DB + services + system)
 * GET /api/platform/status — Returns live health metrics with computed alerts
 * GET /api/platform/status/history — Returns recent status snapshots
 */

const express = require('express');
const router = express.Router();
const { exec, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { getAppPool } = require('../config/db');

const DB_HOST = process.env.DB_HOST || '192.168.1.241';
const SSH_TIMEOUT_MS = 8000;
const HEALTH_SCRIPT = '/usr/local/bin/om-db-health.sh';
const OMAI_HEALTH_URL = 'http://127.0.0.1:7060/omai/health';
const OMAI_HEALTH_TIMEOUT_MS = 3000;

// Snapshot debounce: minimum 5 minutes between writes unless status changes
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
let lastSnapshot = { time: 0, overallStatus: null };

// Systemd service definitions
const SERVICES = [
  { key: 'backend',    service_name: 'orthodox-backend', label: 'Backend' },
  { key: 'ocr_worker', service_name: 'om-ocr-worker',   label: 'OCR Worker' },
  { key: 'omai',       service_name: 'omai',             label: 'OMAI' },
];

// ─── Service Health (systemd) ─────────────────────────────────────

function getServiceHealth(serviceName) {
  try {
    const raw = execSync(
      `systemctl show ${serviceName} --property=ActiveState,SubState,ActiveEnterTimestamp --no-pager 2>/dev/null`,
      { timeout: 3000, encoding: 'utf8' }
    );
    const props = {};
    for (const line of raw.trim().split('\n')) {
      const eq = line.indexOf('=');
      if (eq > 0) props[line.slice(0, eq)] = line.slice(eq + 1);
    }
    const active = props.ActiveState || 'unknown';
    const sub = props.SubState || 'unknown';
    const since = props.ActiveEnterTimestamp || '';

    let uptime = null;
    if (since && active === 'active') {
      const sinceMs = new Date(since).getTime();
      if (!isNaN(sinceMs)) {
        const secs = Math.floor((Date.now() - sinceMs) / 1000);
        const d = Math.floor(secs / 86400);
        const h = Math.floor((secs % 86400) / 3600);
        const m = Math.floor((secs % 3600) / 60);
        uptime = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
      }
    }

    return {
      status: active === 'active' && sub === 'running' ? 'ok' : active === 'activating' ? 'starting' : 'down',
      active_state: active,
      sub_state: sub,
      uptime,
      since: since || null,
    };
  } catch (_) {
    return { status: 'unknown', active_state: 'unknown', sub_state: 'unknown', uptime: null, since: null };
  }
}

/**
 * Check OMAI via its HTTP /health endpoint (preferred over systemd-only).
 * Returns a promise that resolves to a health object matching getServiceHealth shape.
 * Falls back to systemd status on HTTP failure.
 */
function getOmaiHealthHttp() {
  return new Promise((resolve) => {
    const req = http.get(OMAI_HEALTH_URL, { timeout: OMAI_HEALTH_TIMEOUT_MS }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (res.statusCode === 200 && data.ok) {
            // HTTP health is live — get uptime/since from systemd for display
            const systemd = getServiceHealth('omai');
            resolve({
              status: 'ok',
              active_state: systemd.active_state,
              sub_state: systemd.sub_state,
              uptime: systemd.uptime,
              since: systemd.since,
              health_source: 'http',
            });
          } else {
            // HTTP responded but unhealthy — report as degraded
            const systemd = getServiceHealth('omai');
            resolve({ ...systemd, status: 'degraded', health_source: 'http' });
          }
        } catch (_) {
          resolve({ ...getServiceHealth('omai'), health_source: 'systemd_fallback' });
        }
      });
    });
    req.on('error', () => {
      resolve({ ...getServiceHealth('omai'), health_source: 'systemd_fallback' });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ ...getServiceHealth('omai'), health_source: 'systemd_fallback' });
    });
  });
}

async function getAllServiceHealth() {
  const services = {};
  for (const svc of SERVICES) {
    if (svc.key === 'omai') continue; // handled separately via HTTP
    const health = getServiceHealth(svc.service_name);
    services[svc.key] = { ...health, service_name: svc.service_name, label: svc.label };
  }
  // OMAI: prefer HTTP health check
  const omaiSvc = SERVICES.find(s => s.key === 'omai');
  const omaiHealth = await getOmaiHealthHttp();
  services.omai = { ...omaiHealth, service_name: omaiSvc.service_name, label: omaiSvc.label };
  return services;
}

// ─── System Health (app VM) ───────────────────────────────────────

function getSystemHealth() {
  try {
    // Load average
    const loadRaw = fs.readFileSync('/proc/loadavg', 'utf8').trim();
    const loadParts = loadRaw.split(' ');
    const load1 = parseFloat(loadParts[0]) || 0;
    const load5 = parseFloat(loadParts[1]) || 0;
    const load15 = parseFloat(loadParts[2]) || 0;
    const cpuCount = os.cpus().length || 1;
    // CPU usage approximation: 1-min load as percentage of cores
    const cpu_usage_pct = Math.round((load1 / cpuCount) * 100);

    // Memory from /proc/meminfo (more reliable than os.freemem)
    const memRaw = fs.readFileSync('/proc/meminfo', 'utf8');
    const memTotal = parseInt(memRaw.match(/MemTotal:\s+(\d+)/)?.[1] || '0', 10);
    const memAvailable = parseInt(memRaw.match(/MemAvailable:\s+(\d+)/)?.[1] || '0', 10);
    const memUsedKb = memTotal - memAvailable;
    const memory_used_pct = memTotal > 0 ? Math.round((memUsedKb / memTotal) * 100) : 0;
    const memory_total_gb = +(memTotal / 1048576).toFixed(1);
    const memory_used_gb = +(memUsedKb / 1048576).toFixed(1);

    // Disk usage for root filesystem
    let disk_usage_pct = 0;
    let disk_used = '';
    let disk_total = '';
    try {
      const dfOut = execSync('df -h / 2>/dev/null', { timeout: 2000, encoding: 'utf8' });
      const dfLine = dfOut.trim().split('\n')[1];
      if (dfLine) {
        const parts = dfLine.split(/\s+/);
        disk_total = parts[1] || '';
        disk_used = parts[2] || '';
        disk_usage_pct = parseInt(parts[4]) || 0;
      }
    } catch (_) {}

    return {
      cpu_usage_pct,
      load_average: [load1, load5, load15],
      cpu_count: cpuCount,
      memory_used_pct,
      memory_used_gb,
      memory_total_gb,
      disk_usage_pct,
      disk_used,
      disk_total,
    };
  } catch (_) {
    return null;
  }
}

// ─── Alert Thresholds ───────────────────────────────────────────

function computeAlerts(db, services, system) {
  const alerts = [];

  // --- Database alerts ---
  if (db) {
    if (db.disk_usage_pct > 90) {
      alerts.push({ metric: 'db_disk', severity: 'error', message: `DB disk usage at ${db.disk_usage_pct}% — critical`, observed_value: db.disk_usage_pct, threshold: 90 });
    } else if (db.disk_usage_pct > 80) {
      alerts.push({ metric: 'db_disk', severity: 'warn', message: `DB disk usage at ${db.disk_usage_pct}% — elevated`, observed_value: db.disk_usage_pct, threshold: 80 });
    }

    if (db.last_backup_age_hours < 0) {
      alerts.push({ metric: 'backup', severity: 'error', message: 'No backups found', observed_value: -1, threshold: 24 });
    } else if (db.last_backup_age_hours > 24) {
      alerts.push({ metric: 'backup', severity: 'error', message: `Last backup ${db.last_backup_age_hours}h ago — critical`, observed_value: db.last_backup_age_hours, threshold: 24 });
    } else if (db.last_backup_age_hours > 12) {
      alerts.push({ metric: 'backup', severity: 'warn', message: `Last backup ${db.last_backup_age_hours}h ago — stale`, observed_value: db.last_backup_age_hours, threshold: 12 });
    }

    if (db.connections > 180) {
      alerts.push({ metric: 'connections', severity: 'error', message: `${db.connections} active connections — near limit`, observed_value: db.connections, threshold: 180 });
    } else if (db.connections > 150) {
      alerts.push({ metric: 'connections', severity: 'warn', message: `${db.connections} active connections — elevated`, observed_value: db.connections, threshold: 150 });
    }

    if (db.latency_ms > 100) {
      alerts.push({ metric: 'latency', severity: 'error', message: `Query latency ${db.latency_ms}ms — critical`, observed_value: db.latency_ms, threshold: 100 });
    } else if (db.latency_ms > 50) {
      alerts.push({ metric: 'latency', severity: 'warn', message: `Query latency ${db.latency_ms}ms — elevated`, observed_value: db.latency_ms, threshold: 50 });
    }

    if (db.buffer_pool_used_pct > 85) {
      alerts.push({ metric: 'buffer_pool', severity: 'warn', message: `Buffer pool at ${db.buffer_pool_used_pct}% utilization`, observed_value: db.buffer_pool_used_pct, threshold: 85 });
    }
  }

  // --- Service alerts ---
  if (services) {
    for (const svc of SERVICES) {
      const s = services[svc.key];
      if (s && s.status !== 'ok' && s.status !== 'starting') {
        alerts.push({ metric: `service_${svc.key}`, severity: 'error', message: `${svc.label} service is not running (${s.active_state})`, observed_value: s.active_state, threshold: 'active' });
      }
    }
  }

  // --- System alerts ---
  if (system) {
    if (system.cpu_usage_pct > 95) {
      alerts.push({ metric: 'app_cpu', severity: 'error', message: `App VM CPU at ${system.cpu_usage_pct}% — critical`, observed_value: system.cpu_usage_pct, threshold: 95 });
    } else if (system.cpu_usage_pct > 85) {
      alerts.push({ metric: 'app_cpu', severity: 'warn', message: `App VM CPU at ${system.cpu_usage_pct}% — elevated`, observed_value: system.cpu_usage_pct, threshold: 85 });
    }

    if (system.memory_used_pct > 95) {
      alerts.push({ metric: 'app_memory', severity: 'error', message: `App VM memory at ${system.memory_used_pct}% — critical`, observed_value: system.memory_used_pct, threshold: 95 });
    } else if (system.memory_used_pct > 85) {
      alerts.push({ metric: 'app_memory', severity: 'warn', message: `App VM memory at ${system.memory_used_pct}% — elevated`, observed_value: system.memory_used_pct, threshold: 85 });
    }

    if (system.disk_usage_pct > 90) {
      alerts.push({ metric: 'app_disk', severity: 'error', message: `App VM disk at ${system.disk_usage_pct}% — critical`, observed_value: system.disk_usage_pct, threshold: 90 });
    } else if (system.disk_usage_pct > 80) {
      alerts.push({ metric: 'app_disk', severity: 'warn', message: `App VM disk at ${system.disk_usage_pct}% — elevated`, observed_value: system.disk_usage_pct, threshold: 80 });
    }
  }

  return alerts;
}

function computeOverallStatus(alerts, dbStatus) {
  if (dbStatus !== 'ok') return 'error';
  if (alerts.some(a => a.severity === 'error')) return 'error';
  if (alerts.some(a => a.severity === 'warn')) return 'warn';
  return 'ok';
}

// ─── Snapshot Persistence ───────────────────────────────────────

async function maybeWriteSnapshot(overallStatus, alerts, db, services, system, responseTimeMs) {
  const now = Date.now();
  const statusChanged = lastSnapshot.overallStatus !== null && lastSnapshot.overallStatus !== overallStatus;
  const intervalElapsed = (now - lastSnapshot.time) >= SNAPSHOT_INTERVAL_MS;

  if (!statusChanged && !intervalElapsed) return;

  try {
    const metrics = {
      // DB metrics
      connections: db?.connections,
      max_connections: db?.max_connections,
      latency_ms: db?.latency_ms,
      disk_usage_pct: db?.disk_usage_pct,
      buffer_pool_used_pct: db?.buffer_pool_used_pct,
      last_backup_age_hours: db?.last_backup_age_hours,
      uptime_seconds: db?.uptime_seconds,
      // Service statuses
      services: services ? Object.fromEntries(
        Object.entries(services).map(([k, v]) => [k, v.status])
      ) : undefined,
      // System metrics
      app_cpu_usage_pct: system?.cpu_usage_pct,
      app_memory_used_pct: system?.memory_used_pct,
      app_disk_usage_pct: system?.disk_usage_pct,
      app_load_average: system?.load_average,
    };

    await getAppPool().query(
      `INSERT INTO platform_status_snapshots (overall_status, alerts, metrics, response_time_ms) VALUES (?, ?, ?, ?)`,
      [overallStatus, JSON.stringify(alerts), JSON.stringify(metrics), responseTimeMs]
    );

    lastSnapshot = { time: now, overallStatus };
  } catch (err) {
    console.error('[Platform Status] Failed to write snapshot:', err.message);
  }
}

// ─── Routes ─────────────────────────────────────────────────────

/**
 * GET /api/platform/status
 * Returns DB health (via SSH), service health (systemd), and system health (local)
 */
router.get('/status', authMiddleware, requireRole('super_admin'), async (req, res) => {
  const startTime = Date.now();

  // Collect service, system, and DB health in parallel
  const [services, system, dbResult] = await Promise.all([
    getAllServiceHealth(),
    Promise.resolve(getSystemHealth()),
    getDbHealth().then(h => ({ health: h, status: h.status || 'ok', error: null }))
      .catch(err => ({ health: null, status: 'error', error: err.message })),
  ]);

  let dbHealth = dbResult.health;
  let dbStatus = dbResult.status;
  let dbError = dbResult.error;

  if (dbError) {
    console.error('[Platform Status] Failed to get DB health:', dbError);
  }

  const elapsed = Date.now() - startTime;
  const alerts = computeAlerts(dbHealth, services, system);

  // Add DB connectivity error alert if DB failed
  if (dbError) {
    alerts.unshift({ metric: 'connectivity', severity: 'error', message: dbError, observed_value: null, threshold: null });
  }

  const overallStatus = computeOverallStatus(alerts, dbStatus);

  // Fire-and-forget snapshot write
  maybeWriteSnapshot(overallStatus, alerts, dbHealth || {}, services, system, elapsed).catch(() => {});

  const statusCode = dbHealth ? 200 : 503;

  res.status(statusCode).json({
    status: dbStatus,
    overall_status: overallStatus,
    alerts,
    timestamp: new Date().toISOString(),
    response_time_ms: elapsed,
    database: dbHealth,
    services,
    system,
    ...(dbError && { error: dbError }),
  });
});

/**
 * GET /api/platform/status/history?hours=24
 * Returns recent status snapshots for trend analysis
 */
router.get('/status/history', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const hours = Math.min(parseInt(req.query.hours) || 24, 168); // max 7 days
    const [rows] = await getAppPool().query(
      `SELECT id, overall_status, alerts, metrics, response_time_ms, created_at
       FROM platform_status_snapshots
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
       ORDER BY created_at DESC
       LIMIT 500`,
      [hours]
    );

    // Parse JSON fields
    const snapshots = rows.map(row => ({
      ...row,
      alerts: typeof row.alerts === 'string' ? JSON.parse(row.alerts) : row.alerts,
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
    }));

    res.json({ snapshots, hours, count: snapshots.length });
  } catch (error) {
    console.error('[Platform Status] Failed to fetch history:', error.message);
    res.status(500).json({ error: 'Failed to fetch status history' });
  }
});

// ─── SSH Health Check ───────────────────────────────────────────

function getDbHealth() {
  return new Promise((resolve, reject) => {
    const cmd = `ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no next@${DB_HOST} "sudo ${HEALTH_SCRIPT} --json" 2>/dev/null`;

    const child = exec(cmd, { timeout: SSH_TIMEOUT_MS }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          return reject(new Error('Health check timed out'));
        }
        return reject(new Error(`Health check failed: ${error.message}`));
      }

      try {
        const data = JSON.parse(stdout.trim());
        resolve(data);
      } catch (parseErr) {
        reject(new Error(`Invalid JSON from health script: ${parseErr.message}`));
      }
    });
  });
}

module.exports = router;
