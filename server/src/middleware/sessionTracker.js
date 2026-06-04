/**
 * sessionTracker.js — Tracks all authenticated sessions in user_sessions table.
 *
 * On every request:
 *  1. Resolves the user (from session or JWT)
 *  2. Upserts into user_sessions with IP, UA, browser, device
 *  3. Throttles last_activity updates (30s)
 *  4. Logs route activity to session_route_log (throttled)
 *
 * Also enforces:
 *  - Locked sessions → 403
 *  - Terminated sessions → 401
 */

const { getAppPool } = require('../config/db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'change_me_access_256bit';

// ─── UA parser (lightweight, no dependency) ─────────────────
function parseUA(ua) {
  if (!ua) return { client: 'Unknown', device_type: 'unknown' };

  let client = 'Unknown';
  let device_type = 'desktop';

  // Browser detection
  if (/curl/i.test(ua)) client = 'curl';
  else if (/axios/i.test(ua)) client = 'API Client';
  else if (/Claude/i.test(ua)) client = 'Claude CLI';
  else if (/node-fetch|node/i.test(ua)) client = 'Node.js';
  else if (/Edg\//i.test(ua)) client = 'Edge ' + (ua.match(/Edg\/([\d.]+)/)?.[1]?.split('.')[0] || '');
  else if (/OPR|Opera/i.test(ua)) client = 'Opera';
  else if (/Chrome\/([\d]+)/i.test(ua)) client = 'Chrome ' + (ua.match(/Chrome\/([\d]+)/)?.[1] || '');
  else if (/Firefox\/([\d]+)/i.test(ua)) client = 'Firefox ' + (ua.match(/Firefox\/([\d]+)/)?.[1] || '');
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) client = 'Safari';

  // Device detection
  if (/Mobile|Android.*Mobile|iPhone|iPod/i.test(ua)) device_type = 'mobile';
  else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) device_type = 'tablet';

  return { client: client.trim(), device_type };
}

// ─── IP resolution (proxy-aware) ────────────────────────────
function resolveIP(req) {
  // Trust X-Forwarded-For from nginx
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first && first !== '127.0.0.1' && first !== '::1') return first;
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp && realIp !== '127.0.0.1' && realIp !== '::1') return realIp;
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

// ─── Throttle map: sessionToken → lastUpdateTimestamp ───────
const activityThrottle = new Map();
const THROTTLE_MS = 30000; // 30 seconds

// Route log buffer: batch inserts every 10 seconds
const routeLogBuffer = [];
let routeLogTimer = null;

function flushRouteLog() {
  if (routeLogBuffer.length === 0) return;
  const batch = routeLogBuffer.splice(0, routeLogBuffer.length);
  const values = batch.map(r => [r.session_id, r.method, r.path, r.status_code, r.response_time_ms]);
  const placeholders = values.map(() => '(?,?,?,?,?,NOW())').join(',');
  const flat = values.flat();
  getAppPool().query(
    `INSERT INTO session_route_log (session_id, method, path, status_code, response_time_ms, created_at) VALUES ${placeholders}`,
    flat
  ).catch(err => console.error('[SessionTracker] route log flush error:', err.message));
}

// Start the flush timer
if (!routeLogTimer) {
  routeLogTimer = setInterval(flushRouteLog, 10000);
  if (routeLogTimer.unref) routeLogTimer.unref(); // Don't block process exit
}

// ─── Stable device session key (one row per user + device, not per token refresh) ──
const SESSION_IDLE_MINUTES = parseInt(process.env.SESSION_IDLE_MINUTES || '30', 10);
const SESSION_ABSOLUTE_HOURS = parseInt(process.env.SESSION_ABSOLUTE_HOURS || '24', 10);
const SESSION_CLI_MINUTES = parseInt(process.env.SESSION_CLI_MINUTES || '10', 10);

function deriveDeviceSessionKey(userId, ip, client, deviceType) {
  const raw = `${userId}|${ip}|${client}|${deviceType}`;
  return 'dev_' + crypto.createHash('sha256').update(raw).digest('hex').substring(0, 40);
}

function detectSourceApplication(req) {
  const realm = req.headers['x-om-realm'] || req.session?.activeRealm || req.session?.realm;
  if (realm === 'omstudio') return 'OMStudio';
  if (realm === 'workshop') return 'OM-Workshop';
  if (realm === 'omai') return 'OMAI';
  const path = req.path || '';
  if (path.startsWith('/api/omai') || path.includes('control-panel')) return 'OMAI';
  return 'OM';
}

/** @deprecated Use deriveDeviceSessionKey — kept for terminate sid cleanup */
function deriveLegacySidToken(req) {
  if (req.sessionID) return 'sid_' + req.sessionID;
  return null;
}

function deriveSessionToken(req, user, ip, client, device_type) {
  return deriveDeviceSessionKey(user.id, ip, client, device_type);
}

// ─── Main middleware ─────────────────────────────────────────
async function sessionTracker(req, res, next) {
  // Skip health/static/favicon
  const path = req.path;
  if (
    path === '/api/system/health' ||
    path === '/api/maintenance/status' ||
    path.startsWith('/assets/') ||
    path === '/favicon.ico'
  ) {
    return next();
  }

  // Resolve user identity — check session, then req.user, then decode JWT
  let user = req.session?.user || req.user || null;
  if (!user?.id) {
    // Try to decode JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.substring(7), JWT_ACCESS_SECRET);
        user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          church_id: decoded.churchId
        };
      } catch { /* invalid token — skip tracking */ }
    }
  }
  if (!user?.id) {
    return next(); // Anonymous — don't track
  }

  const ip = resolveIP(req);
  const ua = (req.get('User-Agent') || '').substring(0, 2000);
  const { client, device_type } = parseUA(ua);
  const sessionToken = deriveSessionToken(req, user, ip, client, device_type);
  if (!sessionToken) {
    return next();
  }

  const isCli = ['curl', 'API Client', 'Claude CLI', 'Node.js'].includes(client);
  const sessionExpiryMinutes = isCli ? SESSION_CLI_MINUTES : SESSION_ABSOLUTE_HOURS * 60;
  const sourceApp = detectSourceApplication(req);
  const authProvider = req.session?.oidc ? 'keycloak' : (req.cookies?.refresh_token ? 'jwt' : 'express-session');
  const now = Date.now();

  try {
    // Mark expired rows for this device key before upsert (idle + absolute)
    await getAppPool().query(
      `UPDATE user_sessions SET is_active = 0
       WHERE session_token = ? AND terminated_at IS NULL
         AND (expires_at <= NOW() OR last_activity < DATE_SUB(NOW(), INTERVAL ? MINUTE))`,
      [sessionToken, SESSION_IDLE_MINUTES]
    ).catch(() => {});

    const lastUpdate = activityThrottle.get(sessionToken);
    const shouldUpdate = !lastUpdate || (now - lastUpdate) > THROTTLE_MS;

    if (shouldUpdate) {
      await getAppPool().query(
        `INSERT INTO user_sessions
          (user_id, user_email, role, session_token, session_source, church_id,
           ip_address, user_agent, client, device_type, last_activity, expires_at, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE), 1, NOW())
        ON DUPLICATE KEY UPDATE
          user_email = VALUES(user_email),
          role = VALUES(role),
          user_id = VALUES(user_id),
          session_source = VALUES(session_source),
          ip_address = VALUES(ip_address),
          user_agent = VALUES(user_agent),
          client = VALUES(client),
          device_type = VALUES(device_type),
          last_activity = NOW(),
          expires_at = GREATEST(expires_at, DATE_ADD(NOW(), INTERVAL ? MINUTE)),
          is_active = CASE WHEN terminated_at IS NOT NULL THEN 0 ELSE 1 END`,
        [
          user.id,
          user.email || null,
          user.role || null,
          sessionToken,
          sourceApp,
          user.church_id || null,
          ip,
          ua,
          client,
          device_type,
          sessionExpiryMinutes,
          sessionExpiryMinutes,
        ]
      );

      activityThrottle.set(sessionToken, now);
    }

    // Check if session is locked or terminated
    const [rows] = await getAppPool().query(
      'SELECT id, is_locked, lock_reason, terminated_at FROM user_sessions WHERE session_token = ? LIMIT 1',
      [sessionToken]
    );

    if (rows.length > 0) {
      const sess = rows[0];

      // Attach session ID for route logging
      req._trackingSessionId = sess.id;

      if (sess.terminated_at) {
        return res.status(401).json({
          error: 'Session terminated',
          code: 'SESSION_TERMINATED',
          message: 'Your session has been terminated by an administrator.'
        });
      }

      if (sess.is_locked) {
        return res.status(403).json({
          error: 'Session locked',
          code: 'SESSION_LOCKED',
          message: sess.lock_reason || 'Your session has been locked by an administrator.'
        });
      }

      // Log route activity (buffered)
      const startTime = now;
      res.on('finish', () => {
        routeLogBuffer.push({
          session_id: sess.id,
          method: req.method,
          path: path.substring(0, 500),
          status_code: res.statusCode,
          response_time_ms: Date.now() - startTime
        });
      });
    }
  } catch (err) {
    // Non-blocking — never fail the request due to tracking errors
    console.error('[SessionTracker] Error:', err.message);
  }

  next();
}

// ─── Cleanup stale throttle entries every 5 minutes ─────────
setInterval(() => {
  const cutoff = Date.now() - (5 * 60 * 1000);
  for (const [key, ts] of activityThrottle) {
    if (ts < cutoff) activityThrottle.delete(key);
  }
}, 5 * 60 * 1000).unref();

module.exports = sessionTracker;
module.exports.parseUA = parseUA;
module.exports.resolveIP = resolveIP;
module.exports.flushRouteLog = flushRouteLog;
module.exports.SESSION_IDLE_MINUTES = SESSION_IDLE_MINUTES;
module.exports.SESSION_ABSOLUTE_HOURS = SESSION_ABSOLUTE_HOURS;
module.exports.deriveDeviceSessionKey = deriveDeviceSessionKey;
module.exports.detectSourceApplication = detectSourceApplication;
