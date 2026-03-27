/**
 * Analytics API Routes
 * 
 * GET /api/analytics/us-church-counts
 *   Returns aggregated church counts per US state from us_church_counts table.
 *   Response: { states: { "CA": 134, ... }, min, max, total, generatedAt }
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/us-church-counts', requireAuth, async (req, res) => {
  try {
    const { promisePool } = require('../config/db');

    const [rows] = await promisePool.query(
      'SELECT state_code, church_count FROM us_church_counts ORDER BY state_code'
    );

    const states = {};
    let min = Infinity;
    let max = 0;
    let total = 0;

    for (const row of rows) {
      const count = row.church_count;
      states[row.state_code] = count;
      if (count < min) min = count;
      if (count > max) max = count;
      total += count;
    }

    if (rows.length === 0) {
      min = 0;
    }

    res.json({
      states,
      min,
      max,
      total,
      stateCount: rows.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching US church counts:', error);
    res.status(500).json({
      error: 'Failed to fetch church counts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// GET /api/analytics/us-churches?state=XX&jurisdiction=YY
// Returns list of churches for a given state, optionally filtered by jurisdiction
router.get('/us-churches', requireAuth, async (req, res) => {
  try {
    const { promisePool } = require('../config/db');
    const { state, jurisdiction } = req.query;

    if (!state || typeof state !== 'string' || state.length !== 2) {
      return res.status(400).json({ error: 'state query param required (2-letter code)' });
    }

    let sql = `SELECT name, street, city, state_code, zip, phone, website, latitude, longitude, jurisdiction
               FROM us_churches WHERE state_code = ?`;
    const params = [state.toUpperCase()];

    if (jurisdiction) {
      sql += ' AND jurisdiction = ?';
      params.push(jurisdiction);
    }

    sql += ' ORDER BY jurisdiction, city, name';

    const [rows] = await promisePool.query(sql, params);

    // Also get jurisdiction breakdown for this state
    const [jCounts] = await promisePool.query(
      'SELECT jurisdiction, COUNT(*) as count FROM us_churches WHERE state_code = ? GROUP BY jurisdiction ORDER BY count DESC',
      [state.toUpperCase()]
    );

    res.json({
      state: state.toUpperCase(),
      total: rows.length,
      jurisdictions: jCounts,
      churches: rows,
    });
  } catch (error) {
    console.error('❌ Error fetching US churches:', error);
    res.status(500).json({ error: 'Failed to fetch churches' });
  }
});

// GET /api/analytics/om-churches
// Returns list of active OrthodoxMetrics churches with coordinates (for map pins)
router.get('/om-churches', requireAuth, async (req, res) => {
  try {
    const { promisePool } = require('../config/db');

    const [rows] = await promisePool.query(`
      SELECT id, name, church_name, address, city, state_province AS state, latitude, longitude
      FROM churches 
      WHERE is_active = 1 AND latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY state_province, city, name
    `);

    res.json({
      total: rows.length,
      churches: rows,
    });
  } catch (error) {
    console.error('❌ Error fetching OM churches:', error);
    res.status(500).json({ error: 'Failed to fetch OM churches' });
  }
});

// GET /api/analytics/us-churches-enriched?state=XX&jurisdiction=YY
// Returns churches enriched with CRM pipeline stage + onboarding status
router.get('/us-churches-enriched', requireAuth, async (req, res) => {
  try {
    const { promisePool } = require('../config/db');
    const { state, jurisdiction, status } = req.query;

    if (!state || typeof state !== 'string' || state.length !== 2) {
      return res.status(400).json({ error: 'state query param required (2-letter code)' });
    }

    const stateUpper = state.toUpperCase();

    // Get CRM churches with pipeline stage
    let crmSql = `
      SELECT uc.id, uc.name, uc.street, uc.city, uc.state_code, uc.zip,
             uc.phone, uc.website, uc.latitude, uc.longitude, uc.jurisdiction,
             uc.pipeline_stage, uc.priority, uc.is_client, uc.provisioned_church_id,
             uc.last_contacted_at, uc.next_follow_up,
             ps.label AS stage_label, ps.color AS stage_color
      FROM us_churches uc
      LEFT JOIN crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
      WHERE uc.state_code = ?`;
    const params = [stateUpper];

    if (jurisdiction) {
      crmSql += ' AND uc.jurisdiction = ?';
      params.push(jurisdiction);
    }

    crmSql += ' ORDER BY uc.jurisdiction, uc.city, uc.name';
    const [crmRows] = await promisePool.query(crmSql, params);

    // Get onboarded churches in this state
    const [onboardedRows] = await promisePool.query(`
      SELECT c.id, c.name, c.city, c.state_province, c.phone, c.website,
             c.latitude, c.longitude, c.jurisdiction, c.is_active, c.setup_complete,
             c.address,
             COALESCE(tok.active_tokens, 0) AS active_tokens,
             COALESCE(usr.active_users, 0) AS active_users,
             COALESCE(usr.pending_users, 0) AS pending_users
      FROM churches c
      LEFT JOIN (
        SELECT church_id, COUNT(*) AS active_tokens
        FROM church_registration_tokens WHERE is_active = 1
        GROUP BY church_id
      ) tok ON tok.church_id = c.id
      LEFT JOIN (
        SELECT church_id,
          SUM(CASE WHEN is_locked = 0 THEN 1 ELSE 0 END) AS active_users,
          SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END) AS pending_users
        FROM users WHERE church_id IS NOT NULL
        GROUP BY church_id
      ) usr ON usr.church_id = c.id
      WHERE c.state_province = ?
    `, [stateUpper]);

    // Build provisioned ID set for dedup
    const provisionedSet = new Set(
      crmRows.filter(r => r.provisioned_church_id).map(r => r.provisioned_church_id)
    );

    // Compute operational status for each church
    const churches = crmRows.map(r => {
      let op_status = 'directory';
      if (r.provisioned_church_id) {
        const ob = onboardedRows.find(o => o.id === r.provisioned_church_id);
        if (ob) {
          if (ob.setup_complete) op_status = 'live';
          else if (ob.active_users > 0) op_status = 'live';
          else if (ob.active_tokens > 0 || ob.pending_users > 0) op_status = 'onboarding';
          else op_status = 'onboarding';
        } else {
          op_status = 'client';
        }
      } else if (r.pipeline_stage && r.pipeline_stage !== 'new_lead') {
        op_status = 'pipeline';
      }
      return {
        ...r,
        source: 'crm',
        op_status,
        onboarded_church_id: r.provisioned_church_id || null,
      };
    });

    // Add standalone onboarded churches not in CRM
    for (const ob of onboardedRows) {
      if (provisionedSet.has(ob.id)) continue;
      let op_status = 'onboarding';
      if (ob.setup_complete || ob.active_users > 0) op_status = 'live';
      churches.push({
        id: `church_${ob.id}`,
        name: ob.name,
        street: ob.address,
        city: ob.city,
        state_code: ob.state_province,
        zip: null,
        phone: ob.phone,
        website: ob.website,
        latitude: ob.latitude,
        longitude: ob.longitude,
        jurisdiction: ob.jurisdiction,
        pipeline_stage: op_status === 'live' ? 'active' : 'onboarding',
        priority: null,
        is_client: 1,
        provisioned_church_id: null,
        last_contacted_at: null,
        next_follow_up: null,
        stage_label: op_status === 'live' ? 'Active' : 'Onboarding',
        stage_color: op_status === 'live' ? '#2e7d32' : '#00bcd4',
        source: 'onboarded',
        op_status,
        onboarded_church_id: ob.id,
      });
    }

    // Filter by operational status
    let filtered = churches;
    if (status && status !== 'all') {
      filtered = churches.filter(c => c.op_status === status);
    }

    // Jurisdiction breakdown
    const [jCounts] = await promisePool.query(
      'SELECT jurisdiction, COUNT(*) as count FROM us_churches WHERE state_code = ? GROUP BY jurisdiction ORDER BY count DESC',
      [stateUpper]
    );

    // Status breakdown for this state
    const statusCounts = { directory: 0, pipeline: 0, onboarding: 0, live: 0, client: 0 };
    for (const c of churches) {
      statusCounts[c.op_status] = (statusCounts[c.op_status] || 0) + 1;
    }

    res.json({
      state: stateUpper,
      total: filtered.length,
      totalAll: churches.length,
      jurisdictions: jCounts,
      statusCounts,
      churches: filtered,
    });
  } catch (error) {
    console.error('Error fetching enriched US churches:', error);
    res.status(500).json({ error: 'Failed to fetch enriched churches' });
  }
});

// GET /api/analytics/us-church-status-counts
// Returns per-state counts broken down by operational status
router.get('/us-church-status-counts', requireAuth, async (req, res) => {
  try {
    const { promisePool } = require('../config/db');

    // Get all CRM churches with their state and pipeline status
    const [crmRows] = await promisePool.query(`
      SELECT uc.state_code, uc.pipeline_stage, uc.provisioned_church_id
      FROM us_churches uc
      WHERE uc.state_code IS NOT NULL
    `);

    // Get onboarded churches
    const [obRows] = await promisePool.query(`
      SELECT c.id, c.state_province AS state_code, c.setup_complete, c.is_active,
             COALESCE(usr.active_users, 0) AS active_users
      FROM churches c
      LEFT JOIN (
        SELECT church_id, SUM(CASE WHEN is_locked = 0 THEN 1 ELSE 0 END) AS active_users
        FROM users WHERE church_id IS NOT NULL
        GROUP BY church_id
      ) usr ON usr.church_id = c.id
    `);

    const provisionedSet = new Set(
      crmRows.filter(r => r.provisioned_church_id).map(r => r.provisioned_church_id)
    );

    // Build per-state status breakdown
    const stateStats = {};
    const initState = () => ({ total: 0, directory: 0, pipeline: 0, onboarding: 0, live: 0 });

    for (const r of crmRows) {
      if (!stateStats[r.state_code]) stateStats[r.state_code] = initState();
      const s = stateStats[r.state_code];
      s.total++;

      if (r.provisioned_church_id) {
        const ob = obRows.find(o => o.id === r.provisioned_church_id);
        if (ob && (ob.setup_complete || ob.active_users > 0)) s.live++;
        else s.onboarding++;
      } else if (r.pipeline_stage && r.pipeline_stage !== 'new_lead') {
        s.pipeline++;
      } else {
        s.directory++;
      }
    }

    // Add standalone onboarded churches
    for (const ob of obRows) {
      if (provisionedSet.has(ob.id)) continue;
      const sc = ob.state_code;
      if (!sc) continue;
      if (!stateStats[sc]) stateStats[sc] = initState();
      stateStats[sc].total++;
      if (ob.setup_complete || ob.active_users > 0) stateStats[sc].live++;
      else stateStats[sc].onboarding++;
    }

    // Global totals
    const globalTotals = { total: 0, directory: 0, pipeline: 0, onboarding: 0, live: 0 };
    for (const s of Object.values(stateStats)) {
      for (const k of Object.keys(globalTotals)) {
        globalTotals[k] += s[k];
      }
    }

    res.json({ states: stateStats, totals: globalTotals });
  } catch (error) {
    console.error('Error fetching church status counts:', error);
    res.status(500).json({ error: 'Failed to fetch status counts' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PARISH GEO MAP — GeoJSON endpoint for parish-level mapping
// ═══════════════════════════════════════════════════════════════

// Affiliation normalization map
const AFFILIATION_NORMALIZE = {
  'greek orthodox': 'Greek Orthodox',
  'goarch': 'Greek Orthodox',
  'greek archdiocese': 'Greek Orthodox',
  'greek orthodox archdiocese': 'Greek Orthodox',
  'oca': 'OCA',
  'orthodox church in america': 'OCA',
  'rocor': 'ROCOR',
  'russian orthodox': 'ROCOR',
  'russian orthodox church outside russia': 'ROCOR',
  'antiochian': 'Antiochian',
  'antiochian orthodox': 'Antiochian',
  'aocana': 'Antiochian',
  'serbian': 'Serbian',
  'serbian orthodox': 'Serbian',
  'soc': 'Serbian',
  'romanian': 'Romanian',
  'romanian orthodox': 'Romanian',
  'roea': 'Romanian',
  'ukrainian': 'Ukrainian',
  'ukrainian orthodox': 'Ukrainian',
  'uoc-usa': 'Ukrainian',
  'bulgarian': 'Bulgarian',
  'beod': 'Bulgarian',
  'albanian': 'Albanian',
  'aoa': 'Albanian',
  'carpatho-russian': 'Carpatho-Russian',
  'acrod': 'Carpatho-Russian',
  'georgian': 'Georgian',
  'goc': 'Georgian',
};

function normalizeAffiliation(raw) {
  if (!raw) return 'Other';
  const key = raw.trim().toLowerCase();
  return AFFILIATION_NORMALIZE[key] || raw.trim();
}

// GET /api/analytics/church-map/parishes?state=XX
// Returns GeoJSON FeatureCollection for parish-level map with enriched data
router.get('/church-map/parishes', requireAuth, async (req, res) => {
  try {
    const { promisePool } = require('../config/db');
    const { state } = req.query;

    if (!state || typeof state !== 'string' || state.length !== 2) {
      return res.status(400).json({ error: 'state query param required (2-letter code)' });
    }

    const stateUpper = state.toUpperCase();

    // Get all churches for this state with CRM pipeline data
    const [crmRows] = await promisePool.query(`
      SELECT uc.id, uc.name, uc.street, uc.city, uc.state_code, uc.zip,
             uc.phone, uc.website, uc.latitude, uc.longitude, uc.jurisdiction,
             uc.pipeline_stage, uc.priority, uc.is_client, uc.provisioned_church_id,
             ps.label AS stage_label, ps.color AS stage_color
      FROM us_churches uc
      LEFT JOIN crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
      WHERE uc.state_code = ?
      ORDER BY uc.jurisdiction, uc.city, uc.name
    `, [stateUpper]);

    // Get onboarded churches for status enrichment
    const [obRows] = await promisePool.query(`
      SELECT c.id, c.state_province, c.setup_complete,
             COALESCE(usr.active_users, 0) AS active_users,
             COALESCE(usr.pending_users, 0) AS pending_users,
             COALESCE(tok.active_tokens, 0) AS active_tokens
      FROM churches c
      LEFT JOIN (
        SELECT church_id, COUNT(*) AS active_tokens
        FROM church_registration_tokens WHERE is_active = 1
        GROUP BY church_id
      ) tok ON tok.church_id = c.id
      LEFT JOIN (
        SELECT church_id,
          SUM(CASE WHEN is_locked = 0 THEN 1 ELSE 0 END) AS active_users,
          SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END) AS pending_users
        FROM users WHERE church_id IS NOT NULL
        GROUP BY church_id
      ) usr ON usr.church_id = c.id
      WHERE c.state_province = ?
    `, [stateUpper]);

    const obMap = new Map(obRows.map(o => [o.id, o]));

    // Build GeoJSON features
    const features = [];
    const affiliationCounts = {};

    for (const r of crmRows) {
      const lat = parseFloat(r.latitude);
      const lng = parseFloat(r.longitude);
      const hasCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

      // Compute operational status
      let op_status = 'directory';
      if (r.provisioned_church_id) {
        const ob = obMap.get(r.provisioned_church_id);
        if (ob) {
          if (ob.setup_complete || ob.active_users > 0) op_status = 'live';
          else op_status = 'onboarding';
        } else {
          op_status = 'client';
        }
      } else if (r.pipeline_stage && r.pipeline_stage !== 'new_lead') {
        op_status = 'pipeline';
      }

      const affNorm = normalizeAffiliation(r.jurisdiction);

      // Count affiliations
      affiliationCounts[affNorm] = (affiliationCounts[affNorm] || 0) + 1;

      const properties = {
        id: r.id,
        name: r.name,
        city: r.city || null,
        state: r.state_code,
        street: r.street || null,
        zip: r.zip || null,
        phone: r.phone || null,
        website: r.website || null,
        affiliation: r.jurisdiction || null,
        affiliation_normalized: affNorm,
        op_status,
        stage_label: r.stage_label || null,
        stage_color: r.stage_color || null,
        priority: r.priority || null,
        is_client: r.is_client || 0,
        has_coordinates: hasCoords,
        directory_only: op_status === 'directory',
      };

      if (hasCoords) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties,
        });
      } else {
        // Include in response but without geometry for list display
        features.push({
          type: 'Feature',
          geometry: null,
          properties,
        });
      }
    }

    // Sort affiliation counts descending
    const affiliations = Object.entries(affiliationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      type: 'FeatureCollection',
      features,
      metadata: {
        state: stateUpper,
        total: features.length,
        withCoordinates: features.filter(f => f.geometry !== null).length,
        withoutCoordinates: features.filter(f => f.geometry === null).length,
        affiliations,
      },
    });
  } catch (error) {
    console.error('Error fetching parish geo data:', error);
    res.status(500).json({ error: 'Failed to fetch parish geo data' });
  }
});

module.exports = router;
