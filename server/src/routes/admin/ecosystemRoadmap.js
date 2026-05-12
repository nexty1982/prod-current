/**
 * /api/admin/ecosystem-roadmap — read-only proxy to the canonical Component
 * Maturity Roadmap hosted by OMStudio.
 *
 * OM is intentionally NOT canonical. We forward server-to-server to OMStudio
 * (no auth header by default — adjust if upstream gates the endpoint), pass
 * the response shape through unchanged, and surface structured empty / error
 * states when upstream is unavailable so the admin page can render an empty
 * shell instead of crashing.
 */

const express = require('express');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();

function omstudioBase() {
  const raw = process.env.OMSTUDIO_URL || 'http://192.168.1.242';
  return raw.replace(/\/$/, '');
}

router.get(
  '/ecosystem-roadmap',
  requireRole(['super_admin', 'admin']),
  async (_req, res) => {
    const base = omstudioBase();
    const upstream = `${base}/api/governance/component-roadmap`;

    let upstreamRes;
    try {
      upstreamRes = await fetch(upstream, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      return res.status(502).json({
        available: false,
        upstream,
        error: 'omstudio_unreachable',
        detail: String(err?.message || err),
      });
    }

    if (upstreamRes.status === 404) {
      return res.status(200).json({
        available: false,
        upstream,
        error: 'endpoint_not_yet_published',
        detail: 'OMStudio has not yet published /api/governance/component-roadmap. The page will render once upstream is available.',
      });
    }

    if (!upstreamRes.ok) {
      let detail = `upstream HTTP ${upstreamRes.status}`;
      try {
        const body = await upstreamRes.text();
        if (body) detail += ` — ${body.slice(0, 500)}`;
      } catch {
        // ignore
      }
      return res.status(502).json({
        available: false,
        upstream,
        error: 'upstream_error',
        detail,
      });
    }

    let payload;
    try {
      payload = await upstreamRes.json();
    } catch (err) {
      return res.status(502).json({
        available: false,
        upstream,
        error: 'upstream_invalid_json',
        detail: String(err?.message || err),
      });
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
