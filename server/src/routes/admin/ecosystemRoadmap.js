/**
 * /api/admin/ecosystem-roadmap — read-only proxy to the canonical Component
 * Maturity Roadmap hosted by OMStudio (OMSD-1590).
 *
 * Auth flow:
 *   OM logs in as an omsvc service identity against OMStudio's /api/auth/login,
 *   caches the resulting JWT in-memory (OMStudio TTL is 8h), and uses it as
 *   the bearer for /api/governance/component-roadmap. On a 401 we clear the
 *   cache and retry once. No human or session credential is ever forwarded.
 *
 * Response contract:
 *   This proxy ALWAYS returns HTTP 200 unless the OM-side auth gate (super_admin
 *   / admin) blocks the caller. When the upstream is misbehaving, unreachable,
 *   or hasn't yet published the endpoint, we return:
 *
 *     { available: false, upstream, error: <code>, detail }
 *
 *   The frontend reads `available` and renders a structured Alert. Returning
 *   5xx here would make axios throw a generic error message — which was the
 *   regression behind the OMOD-1594 follow-up to OMOD-1592.
 *
 * Required config (graceful empty-state if missing):
 *   OMSTUDIO_URL                 default http://192.168.1.242 (LAN host).
 *                                Set to http://omstudio.orthodoxmetrics.com once
 *                                that DNS is reachable from the OM backend.
 *   OMSTUDIO_OMSVC_EMAIL         default omsvc@orthodoxmetrics.com (same email
 *                                as the OMAI omsvc identity, but a DIFFERENT
 *                                password lives in a DIFFERENT vault — do not
 *                                confuse them).
 *   OMSTUDIO_OMSVC_PASSWORD      env var, else read from
 *                                /var/lib/omstudio/secrets/OMSTUDIO_OMSVC_PASSWORD.creds
 *                                (matches the existing vault convention).
 *                                Override the path via OMSTUDIO_OMSVC_PASSWORD_FILE.
 *
 * OM is intentionally NOT canonical — the page is read-only and we never
 * persist the response.
 */

const express = require('express');
const fs = require('fs');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();

const TOKEN_CACHE_MS = 7 * 60 * 60 * 1000; // refresh well inside OMStudio's 8h TTL
const UPSTREAM_TIMEOUT_MS = 8000;
const DEFAULT_PASSWORD_FILE = '/var/lib/omstudio/secrets/OMSTUDIO_OMSVC_PASSWORD.creds';

let cachedToken = null;
let cachedTokenExpiresAt = 0;

function omstudioBase() {
  const raw = process.env.OMSTUDIO_URL || 'http://192.168.1.242';
  return raw.replace(/\/$/, '');
}

function emptyState(upstream, error, detail) {
  return { available: false, upstream, error, detail };
}

function readPassword() {
  const fromEnv = process.env.OMSTUDIO_OMSVC_PASSWORD;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  const path = process.env.OMSTUDIO_OMSVC_PASSWORD_FILE || DEFAULT_PASSWORD_FILE;
  try {
    const raw = fs.readFileSync(path, 'utf8');
    const trimmed = raw.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

async function mintToken(base) {
  const password = readPassword();
  if (!password) {
    const err = new Error(
      `OMStudio omsvc password not found (checked OMSTUDIO_OMSVC_PASSWORD env, then ${process.env.OMSTUDIO_OMSVC_PASSWORD_FILE || DEFAULT_PASSWORD_FILE})`,
    );
    err.code = 'credentials_not_provisioned';
    throw err;
  }
  const email = process.env.OMSTUDIO_OMSVC_EMAIL || 'omsvc@orthodoxmetrics.com';

  let res;
  try {
    res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (cause) {
    const err = new Error(`omsvc login network error: ${cause.message || cause}`);
    err.code = 'omstudio_unreachable';
    throw err;
  }

  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch { /* ignore */ }
    const err = new Error(`omsvc login HTTP ${res.status} — ${body.slice(0, 300)}`);
    err.code = res.status === 401 || res.status === 403 ? 'omsvc_login_rejected' : 'omsvc_login_failed';
    throw err;
  }

  let payload;
  try { payload = await res.json(); } catch {
    const err = new Error('omsvc login returned non-JSON');
    err.code = 'omsvc_login_failed';
    throw err;
  }
  const token = payload && (payload.access_token || payload.token || payload.accessToken);
  if (!token) {
    const err = new Error('omsvc login response missing access_token');
    err.code = 'omsvc_login_failed';
    throw err;
  }
  return token;
}

async function getToken(base, { force = false } = {}) {
  const now = Date.now();
  if (!force && cachedToken && cachedTokenExpiresAt > now) return cachedToken;
  cachedToken = await mintToken(base);
  cachedTokenExpiresAt = now + TOKEN_CACHE_MS;
  return cachedToken;
}

async function fetchRoadmap(base, token) {
  return fetch(`${base}/api/governance/component-roadmap`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

router.get(
  '/ecosystem-roadmap',
  requireRole(['super_admin', 'admin']),
  async (_req, res) => {
    const base = omstudioBase();
    const upstream = `${base}/api/governance/component-roadmap`;

    let token;
    try {
      token = await getToken(base);
    } catch (err) {
      return res.status(200).json(emptyState(upstream, err.code || 'auth_error', err.message));
    }

    let upstreamRes;
    try {
      upstreamRes = await fetchRoadmap(base, token);
    } catch (err) {
      return res.status(200).json(emptyState(upstream, 'omstudio_unreachable', String(err.message || err)));
    }

    // One retry on 401 with a freshly minted token (handles rotated/revoked JWT).
    if (upstreamRes.status === 401) {
      cachedToken = null;
      cachedTokenExpiresAt = 0;
      try {
        token = await getToken(base, { force: true });
        upstreamRes = await fetchRoadmap(base, token);
      } catch (err) {
        return res.status(200).json(emptyState(upstream, err.code || 'auth_error', err.message));
      }
    }

    if (upstreamRes.status === 404) {
      return res.status(200).json(emptyState(
        upstream,
        'endpoint_not_yet_published',
        'OMStudio has not yet published /api/governance/component-roadmap. The page will render once upstream is available.',
      ));
    }

    if (!upstreamRes.ok) {
      let detail = `upstream HTTP ${upstreamRes.status}`;
      try {
        const body = await upstreamRes.text();
        if (body) detail += ` — ${body.slice(0, 500)}`;
      } catch { /* ignore */ }
      return res.status(200).json(emptyState(upstream, 'upstream_error', detail));
    }

    let payload;
    try {
      payload = await upstreamRes.json();
    } catch (err) {
      return res.status(200).json(emptyState(upstream, 'upstream_invalid_json', String(err.message || err)));
    }

    res.json({
      available: true,
      upstream,
      fetched_at: new Date().toISOString(),
      data: payload,
    });
  },
);

module.exports = router;
