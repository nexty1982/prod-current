/**
 * Analytics API Routes
 * 
 * GET /api/analytics/us-church-counts
 *   Returns aggregated church counts per US state from us_church_counts table.
 *   Response: { states: { "CA": 134, ... }, min, max, total, generatedAt }
 */

const express = require('express');
const path = require('path');
const { execFileSync } = require('child_process');
const { requireAuth } = require('../middleware/auth');
const { getAppPool, getTenantPool } = require('../config/db');
const { detectColumns } = require('../utils/detectColumns');

const router = express.Router();

const DIOCESE_XLSX_PATH = path.resolve(
  __dirname,
  '../../../01-17-2026.orthodox-church.US-sales-color-coded-dioceses.xlsx'
);

/** @type {Map<string, { diocese: string, name: string, city: string, state: string, notes: string }> | null} */
let ocaDioceseByExtId = null;

function slugifyDiocese(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function loadOcaDioceseMap() {
  if (ocaDioceseByExtId) return ocaDioceseByExtId;
  const py = `
import zipfile, xml.etree.ElementTree as ET, re, json, sys
path = sys.argv[1]
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def col_to_idx(col):
    n = 0
    for c in col:
        n = n * 26 + (ord(c) - 64)
    return n - 1

def cell_ref_to_rc(ref):
    m = re.match(r'([A-Z]+)(\\d+)', ref)
    return int(m.group(2)) - 1, col_to_idx(m.group(1))

def cell_value(c, strings):
    t = c.attrib.get('t')
    if t == 'inlineStr':
        return ''.join((x.text or '') for x in c.findall('.//m:t', NS))
    v_el = c.find('m:v', NS)
    if v_el is None: return ''
    val = v_el.text or ''
    if t == 's':
        val = strings[int(val)]
    return val

with zipfile.ZipFile(path) as z:
    sst_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    strings = [''.join((t.text or '') for t in si.findall('.//m:t', NS)) for si in sst_root.findall('m:si', NS)]
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    sheets = [(s.attrib['name'], s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']) for s in wb.findall('.//m:sheet', NS)]
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rid_map = {rel.attrib['Id']: rel.attrib['Target'].lstrip('/') for rel in rels}
    rid = next(r for n, r in sheets if n == 'OCA')
    root = ET.fromstring(z.read(rid_map[rid]))
    rows = {}
    for row in root.findall('.//m:sheetData/m:row', NS):
        for c in row.findall('m:c', NS):
            ref = c.attrib.get('r')
            if not ref: continue
            ri, ci = cell_ref_to_rc(ref)
            rows.setdefault(ri, {})[ci] = cell_value(c, strings)
    out = {}
    for r in range(1, max(rows) + 1):
        row = rows.get(r, {})
        ext_id = row.get(0, '')
        if not ext_id: continue
        out[ext_id] = {
            'diocese': row.get(13, ''),
            'name': row.get(1, ''),
            'city': row.get(3, ''),
            'state': row.get(4, ''),
            'notes': row.get(14, ''),
        }
    print(json.dumps(out))
`;
  try {
    const raw = execFileSync('python3', ['-c', py, DIOCESE_XLSX_PATH], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    const parsed = JSON.parse(raw.trim());
    ocaDioceseByExtId = new Map(Object.entries(parsed));
  } catch (err) {
    console.error('Failed to load OCA diocese xlsx:', err.message);
    ocaDioceseByExtId = new Map();
  }
  return ocaDioceseByExtId;
}

const DIOCESE_LEGEND = [
  { slug: 'diocese-of-alaska', name: 'Diocese of Alaska', states: ['AK'], color: '#1e3a5f' },
  { slug: 'diocese-of-eastern-pennsylvania', name: 'Diocese of Eastern Pennsylvania', states: ['PA', 'DE'], color: '#2d5a87' },
  { slug: 'diocese-of-the-midwest', name: 'Diocese of the Midwest', states: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'], color: '#3b6ea5' },
  { slug: 'diocese-of-new-england', name: 'Diocese of New England', states: ['CT', 'ME', 'MA', 'NH', 'RI', 'VT'], color: '#4a7fb8' },
  { slug: 'diocese-of-new-york-and-new-jersey', name: 'Diocese of New York and New Jersey', states: ['NY', 'NJ'], color: '#c9a14a' },
  { slug: 'diocese-of-the-south', name: 'Diocese of the South', states: ['AL', 'AR', 'FL', 'GA', 'KY', 'LA', 'MS', 'NM', 'NC', 'OK', 'SC', 'TN', 'TX', 'VA'], color: '#5a90c4' },
  { slug: 'archdiocese-of-washington-d-c', name: 'Archdiocese of Washington, D.C.', states: ['DC', 'MD', 'VA', 'DE'], color: '#1a365d' },
  { slug: 'diocese-of-the-west', name: 'Diocese of the West', states: ['AZ', 'CA', 'CO', 'HI', 'MT', 'NV', 'OR', 'WA'], color: '#6ba0d0' },
  { slug: 'archdiocese-of-western-pennsylvania', name: 'Archdiocese of Western Pennsylvania', states: ['PA', 'WV', 'OH'], color: '#2c5282' },
  { slug: 'albanian-archdiocese', name: 'Albanian Archdiocese', ethnic: true, color: '#8b5cf6' },
  { slug: 'bulgarian-diocese', name: 'Bulgarian Diocese', ethnic: true, color: '#059669' },
  { slug: 'romanian-episcopate', name: 'Romanian Episcopate', ethnic: true, color: '#dc2626' },
  { slug: 'archdiocese-of-canada', name: 'Archdiocese of Canada', states: [], color: '#0369a1' },
  { slug: 'diocese-of-mexico', name: 'Diocese of Mexico', states: [], color: '#b45309' },
];

const PARISH_SIZE_BRACKETS = [
  { id: 'small', label: 'Small', min: 0, max: 499 },
  { id: 'medium', label: 'Medium', min: 500, max: 999 },
  { id: 'large', label: 'Large', min: 1000, max: Infinity },
];

const PERIOD_CONFIG = {
  '30d': { label: 'Last 30 days', days: 30 },
  '90d': { label: 'Last 90 days', days: 90 },
  ytd: { label: 'Year to date', ytd: true },
  '12m': { label: 'Last 12 months', months: 12 },
  all: { label: 'All time' },
};

function resolveRegion(state, latitude) {
  const s = String(state || '').toUpperCase();
  if (s === 'NY') {
    const lat = Number(latitude);
    return lat && lat >= 41.5 ? 'NY Upstate' : 'NY Downstate';
  }
  if (s === 'NJ') {
    const lat = Number(latitude);
    return lat && lat < 40.2 ? 'NJ South' : 'NJ North';
  }
  return s || 'Unknown';
}

function periodBounds(periodKey) {
  const cfg = PERIOD_CONFIG[periodKey] || PERIOD_CONFIG['12m'];
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start;
  let prevStart;
  let prevEnd;

  if (cfg.ytd) {
    start = new Date(now.getFullYear(), 0, 1);
    prevStart = new Date(now.getFullYear() - 1, 0, 1);
    prevEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (cfg.months) {
    start = new Date(end);
    start.setMonth(start.getMonth() - cfg.months);
    prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevStart = new Date(prevEnd);
    prevStart.setMonth(prevStart.getMonth() - cfg.months);
  } else if (cfg.days) {
    start = new Date(end);
    start.setDate(start.getDate() - cfg.days);
    prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - cfg.days);
  } else {
    start = null;
    prevStart = null;
    prevEnd = null;
  }

  const fmt = (d) => (d ? d.toISOString().slice(0, 10) : null);
  return {
    label: cfg.label,
    start: fmt(start),
    end: fmt(end),
    prevStart: fmt(prevStart),
    prevEnd: fmt(prevEnd),
    isAllTime: !start,
  };
}

async function getChurchRecordMetrics(churchId, bounds, recordType) {
  const empty = {
    baptism: 0, marriage: 0, funeral: 0, custom: 0, total: 0,
    addedInPeriod: 0, addedPrevPeriod: 0,
    completeness: 0,
    completenessByType: { baptism: 0, marriage: 0, funeral: 0 },
    lastActivityAt: null,
    monthlyTrend: [],
    dataStatus: 'no_data',
  };

  try {
    const pool = getTenantPool(churchId);
    const cols = await detectColumns(pool);

    const [[counts]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM baptism_records) AS baptism,
        (SELECT COUNT(*) FROM marriage_records) AS marriage,
        (SELECT COUNT(*) FROM funeral_records) AS funeral
    `);
    const baptism = Number(counts.baptism || 0);
    const marriage = Number(counts.marriage || 0);
    const funeral = Number(counts.funeral || 0);
    const total = baptism + marriage + funeral;

    const dateFilter = (dateCol, start, end) => {
      if (!dateCol) return '0';
      if (!start || !end) return `CASE WHEN ${dateCol} IS NOT NULL THEN 1 ELSE 0 END`;
      return `CASE WHEN ${dateCol} >= '${start}' AND ${dateCol} <= '${end} 23:59:59' THEN 1 ELSE 0 END`;
    };

    const periodParts = [];
    const prevParts = [];
    const lastParts = [];
    const monthParts = [];

    const addType = (dateCol, table) => {
      if (!dateCol) return;
      if (bounds.isAllTime) {
        periodParts.push(`SELECT COUNT(*) AS c FROM ${table} WHERE ${dateCol} IS NOT NULL`);
      } else {
        periodParts.push(`SELECT SUM(${dateFilter(dateCol, bounds.start, bounds.end)}) AS c FROM ${table}`);
        prevParts.push(`SELECT SUM(${dateFilter(dateCol, bounds.prevStart, bounds.prevEnd)}) AS c FROM ${table}`);
      }
      lastParts.push(`SELECT MAX(${dateCol}) AS d FROM ${table} WHERE ${dateCol} IS NOT NULL`);
      monthParts.push(`SELECT DATE_FORMAT(${dateCol}, '%Y-%m') AS month, COUNT(*) AS c FROM ${table} WHERE ${dateCol} IS NOT NULL AND ${dateCol} >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH) GROUP BY month`);
    };

    if (!recordType || recordType === 'all' || recordType === 'baptism') addType(cols.baptismDate, 'baptism_records');
    if (!recordType || recordType === 'all' || recordType === 'marriage') addType(cols.marriageDate, 'marriage_records');
    if (!recordType || recordType === 'all' || recordType === 'funeral') addType(cols.funeralDate, 'funeral_records');

    let addedInPeriod = 0;
    let addedPrevPeriod = 0;
    if (periodParts.length) {
      const [rows] = await pool.query(`SELECT SUM(c) AS total FROM (${periodParts.map((p) => `(${p})`).join(' UNION ALL ')}) x`);
      addedInPeriod = Number(rows[0]?.total || 0);
    }
    if (prevParts.length) {
      const [rows] = await pool.query(`SELECT SUM(c) AS total FROM (${prevParts.map((p) => `(${p})`).join(' UNION ALL ')}) x`);
      addedPrevPeriod = Number(rows[0]?.total || 0);
    }

    let lastActivityAt = null;
    if (lastParts.length) {
      const [rows] = await pool.query(`SELECT MAX(d) AS last_d FROM (${lastParts.join(' UNION ALL ')}) x`);
      lastActivityAt = rows[0]?.last_d ? new Date(rows[0].last_d).toISOString() : null;
    }

    const monthlyMap = {};
    if (monthParts.length) {
      const [rows] = await pool.query(monthParts.join(' UNION ALL '));
      rows.forEach((r) => {
        monthlyMap[r.month] = (monthlyMap[r.month] || 0) + Number(r.c);
      });
    }
    const monthlyTrend = Object.entries(monthlyMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const completenessChecks = [];
    if (cols.baptismDate && cols.baptismName) {
      completenessChecks.push({
        type: 'baptism',
        q: `SELECT COUNT(*) AS total, SUM(CASE WHEN ${cols.baptismName} IS NOT NULL AND ${cols.baptismName} != '' AND ${cols.baptismDate} IS NOT NULL THEN 1 ELSE 0 END) AS complete FROM baptism_records`,
      });
    }
    if (cols.marriageDate && cols.marriageName) {
      completenessChecks.push({
        type: 'marriage',
        q: `SELECT COUNT(*) AS total, SUM(CASE WHEN ${cols.marriageName} IS NOT NULL AND ${cols.marriageName} != '' AND ${cols.marriageDate} IS NOT NULL THEN 1 ELSE 0 END) AS complete FROM marriage_records`,
      });
    }
    if (cols.funeralDate && cols.funeralName) {
      completenessChecks.push({
        type: 'funeral',
        q: `SELECT COUNT(*) AS total, SUM(CASE WHEN ${cols.funeralName} IS NOT NULL AND ${cols.funeralName} != '' AND ${cols.funeralDate} IS NOT NULL THEN 1 ELSE 0 END) AS complete FROM funeral_records`,
      });
    }

    const completenessByType = { baptism: 0, marriage: 0, funeral: 0 };
    let totalRec = 0;
    let completeRec = 0;
    for (const check of completenessChecks) {
      const [[row]] = await pool.query(check.q);
      const t = Number(row.total || 0);
      const c = Number(row.complete || 0);
      completenessByType[check.type] = t > 0 ? Math.round((c / t) * 100) : 0;
      totalRec += t;
      completeRec += c;
    }
    const completeness = totalRec > 0 ? Math.round((completeRec / totalRec) * 100) : 0;

    let dataStatus = 'live';
    if (total === 0) dataStatus = 'no_data';
    else if (completeness < 50) dataStatus = 'incomplete';
    else if (lastActivityAt) {
      const daysSince = (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 180) dataStatus = 'stale';
    }

    return {
      baptism, marriage, funeral, custom: 0, total,
      addedInPeriod, addedPrevPeriod,
      completeness, completenessByType, lastActivityAt, monthlyTrend, dataStatus,
    };
  } catch (err) {
    return { ...empty, dataStatus: 'error', error: err.message };
  }
}

function parishSizeId(total) {
  const bracket = PARISH_SIZE_BRACKETS.find((b) => total >= b.min && total <= b.max);
  return bracket ? bracket.id : 'small';
}

function buildInsights(parishes, averages, periodLabel) {
  const insights = [];
  const growthThreshold = 15;
  const declineThreshold = -15;
  const staleDays = 180;
  const incompleteThreshold = 60;

  const growing = parishes
    .filter((p) => p.changePercent >= growthThreshold && p.records.addedInPeriod > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 3);
  growing.forEach((p) => {
    insights.push({
      type: 'growth',
      severity: 'positive',
      title: `${p.name} — strong record growth`,
      detail: `${p.changePercent > 0 ? '+' : ''}${p.changePercent}% vs prior period (${p.records.addedInPeriod} records added in ${periodLabel}).`,
      parishIds: [p.churchId],
    });
  });

  const declining = parishes
    .filter((p) => p.changePercent <= declineThreshold && p.records.total > 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 3);
  declining.forEach((p) => {
    insights.push({
      type: 'decline',
      severity: 'attention',
      title: `${p.name} — declining activity`,
      detail: `${p.changePercent}% change in records added during ${periodLabel}. Review whether this reflects reporting gaps or seasonal patterns.`,
      parishIds: [p.churchId],
    });
  });

  parishes
    .filter((p) => p.records.completeness < incompleteThreshold && p.records.total > 0)
    .slice(0, 3)
    .forEach((p) => {
      insights.push({
        type: 'incomplete',
        severity: 'warning',
        title: `${p.name} — incomplete records`,
        detail: `Data completeness score ${p.records.completeness}% across sacramental records.`,
        parishIds: [p.churchId],
      });
    });

  const now = Date.now();
  parishes
    .filter((p) => {
      if (!p.records.lastActivityAt) return p.records.total > 0;
      const days = (now - new Date(p.records.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
      return days > staleDays;
    })
    .slice(0, 3)
    .forEach((p) => {
      insights.push({
        type: 'stale',
        severity: 'attention',
        title: `${p.name} — no recent updates`,
        detail: p.records.lastActivityAt
          ? `Last sacramental record dated ${new Date(p.records.lastActivityAt).toLocaleDateString('en-US')}.`
          : 'Parish has records on file but no dated sacramental activity detected.',
        parishIds: [p.churchId],
      });
    });

  const typeTotals = parishes.reduce(
    (acc, p) => {
      acc.baptism += p.records.baptism;
      acc.marriage += p.records.marriage;
      acc.funeral += p.records.funeral;
      return acc;
    },
    { baptism: 0, marriage: 0, funeral: 0 }
  );
  const typeAvg = (typeTotals.baptism + typeTotals.marriage + typeTotals.funeral) / 3;
  ['baptism', 'marriage', 'funeral'].forEach((type) => {
    if (typeTotals[type] < typeAvg * 0.65 && typeTotals[type] > 0) {
      insights.push({
        type: 'underrepresented',
        severity: 'info',
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} records underrepresented`,
        detail: `${type} records account for ${Math.round((typeTotals[type] / (typeTotals.baptism + typeTotals.marriage + typeTotals.funeral)) * 100)}% of diocesan volume — below the balanced share across record types.`,
        parishIds: [],
      });
    }
  });

  const outliers = parishes.filter(
    (p) => p.records.total > averages.totalRecords * 2.5 || (p.records.total > 0 && p.records.completeness < 30)
  );
  outliers.slice(0, 2).forEach((p) => {
    insights.push({
      type: 'outlier',
      severity: 'review',
      title: `${p.name} — outlier for review`,
      detail:
        p.records.total > averages.totalRecords * 2.5
          ? `Total record volume (${p.records.total.toLocaleString()}) is significantly above the diocesan average.`
          : `Low completeness (${p.records.completeness}%) with ${p.records.total} records on file.`,
      parishIds: [p.churchId],
    });
  });

  return insights;
}

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
      } else if (r.pipeline_stage && r.pipeline_stage !== 'prospects') {
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
        pipeline_stage: op_status === 'live' ? 'active_parish' : 'deployment',
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
      } else if (r.pipeline_stage && r.pipeline_stage !== 'prospects') {
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
      } else if (r.pipeline_stage && r.pipeline_stage !== 'prospects') {
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

// GET /api/analytics/diocesan-dashboard
// Executive diocesan analytics — diocese assignments from color-coded OCA xlsx
router.get('/diocesan-dashboard', requireAuth, async (req, res) => {
  try {
    const {
      diocese: dioceseSlug = 'diocese-of-new-york-and-new-jersey',
      period = '12m',
      recordType = 'all',
      region = 'all',
      parishSize = 'all',
      churchIds: churchIdsParam,
    } = req.query;

    const dioceseMap = loadOcaDioceseMap();
    const dioceseMeta = DIOCESE_LEGEND.find((d) => d.slug === dioceseSlug)
      || DIOCESE_LEGEND.find((d) => d.slug === 'diocese-of-new-york-and-new-jersey');
    const bounds = periodBounds(String(period));
    const selectedChurchIds = churchIdsParam
      ? String(churchIdsParam).split(',').map((id) => Number(id)).filter(Boolean)
      : null;

    const pool = getAppPool();
    const [churchRows] = await pool.query(`
      SELECT
        c.id AS church_id,
        c.name,
        c.city,
        c.state_province AS state,
        c.latitude,
        c.longitude,
        c.is_active,
        c.onboarding_phase,
        c.database_name,
        c.db_name,
        c.updated_at,
        c.last_login_at,
        cl.ext_id,
        uc.ext_id AS uc_ext_id
      FROM churches c
      LEFT JOIN omai_crm_leads cl ON cl.id = c.crm_lead_id
      LEFT JOIN us_churches uc ON uc.id = cl.legacy_us_church_id
      WHERE (c.database_name IS NOT NULL OR c.db_name IS NOT NULL)
      ORDER BY c.state_province, c.name
    `);

    const parishesRaw = [];
    for (const row of churchRows) {
      const extId = row.ext_id || row.uc_ext_id;
      const xlsxRow = extId ? dioceseMap.get(extId) : null;
      const dioceseName = xlsxRow?.diocese || null;
      if (!dioceseName || slugifyDiocese(dioceseName) !== dioceseMeta.slug) continue;

      if (selectedChurchIds && !selectedChurchIds.includes(row.church_id)) continue;

      parishesRaw.push({ ...row, dioceseName, assignmentNotes: xlsxRow?.notes || '' });
    }

    const metricsList = [];
    for (const row of parishesRaw) {
      const metrics = await getChurchRecordMetrics(row.church_id, bounds, String(recordType));
      const sizeId = parishSizeId(metrics.total);
      const geoRegion = resolveRegion(row.state, row.latitude);

      if (region !== 'all' && geoRegion !== region && row.state !== region) continue;
      if (parishSize !== 'all' && sizeId !== parishSize) continue;

      const changePercent =
        metrics.addedPrevPeriod > 0
          ? Math.round(((metrics.addedInPeriod - metrics.addedPrevPeriod) / metrics.addedPrevPeriod) * 100)
          : metrics.addedInPeriod > 0
            ? 100
            : 0;

      metricsList.push({
        churchId: row.church_id,
        name: row.name,
        city: row.city,
        state: row.state,
        region: geoRegion,
        diocese: row.dioceseName,
        parishSize: sizeId,
        latitude: row.latitude ? Number(row.latitude) : null,
        longitude: row.longitude ? Number(row.longitude) : null,
        isActive: !!row.is_active,
        onboardingPhase: row.onboarding_phase,
        assignmentNotes: row.assignmentNotes,
        records: metrics,
        changePercent,
      });
    }

    const reporting = metricsList.filter((p) => p.records.total > 0);
    const totalRecords = reporting.reduce((s, p) => s + p.records.total, 0);
    const addedInPeriod = reporting.reduce((s, p) => s + p.records.addedInPeriod, 0);
    const addedPrevPeriod = reporting.reduce((s, p) => s + p.records.addedPrevPeriod, 0);
    const avgRecords = reporting.length ? Math.round(totalRecords / reporting.length) : 0;
    const participationRate = metricsList.length
      ? Math.round((reporting.length / metricsList.length) * 100)
      : 0;
    const growthRate =
      addedPrevPeriod > 0
        ? Math.round(((addedInPeriod - addedPrevPeriod) / addedPrevPeriod) * 100)
        : addedInPeriod > 0
          ? 100
          : 0;

    const prevTotalRecords = totalRecords - addedInPeriod + addedPrevPeriod;
    const prevAvgRecords = reporting.length ? Math.round(prevTotalRecords / reporting.length) : 0;
    const prevParticipation = participationRate;
    const prevGrowth = growthRate;

    const mostActive = [...reporting].sort((a, b) => b.records.addedInPeriod - a.records.addedInPeriod)[0] || null;
    const needsAttention = [...metricsList]
      .filter((p) => p.records.dataStatus === 'stale' || p.records.dataStatus === 'incomplete' || p.records.dataStatus === 'no_data')
      .sort((a, b) => a.records.completeness - b.records.completeness)[0] || null;

    const averages = {
      totalRecords: reporting.length ? Math.round(totalRecords / reporting.length) : 0,
      addedInPeriod: reporting.length ? Math.round(addedInPeriod / reporting.length) : 0,
      completeness: reporting.length
        ? Math.round(reporting.reduce((s, p) => s + p.records.completeness, 0) / reporting.length)
        : 0,
      baptism: reporting.length ? Math.round(reporting.reduce((s, p) => s + p.records.baptism, 0) / reporting.length) : 0,
      marriage: reporting.length ? Math.round(reporting.reduce((s, p) => s + p.records.marriage, 0) / reporting.length) : 0,
      funeral: reporting.length ? Math.round(reporting.reduce((s, p) => s + p.records.funeral, 0) / reporting.length) : 0,
    };

    const compareVsAverage = (p) => {
      if (!p.records.total) return 'no_data';
      const ratio = averages.totalRecords > 0 ? p.records.total / averages.totalRecords : 1;
      if (ratio >= 1.15) return 'above';
      if (ratio <= 0.85) return 'below';
      return 'near';
    };

    const parishes = metricsList
      .map((p) => ({ ...p, vsDiocesanAverage: compareVsAverage(p) }))
      .sort((a, b) => b.records.total - a.records.total);

    const monthSet = new Set();
    parishes.forEach((p) => p.records.monthlyTrend.forEach((m) => monthSet.add(m.month)));
    const months = [...monthSet].sort();
    const activityOverTime = months.map((month) => {
      const point = { month };
      parishes.forEach((p) => {
        const hit = p.records.monthlyTrend.find((m) => m.month === month);
        point[`p${p.churchId}`] = hit ? hit.count : 0;
        point[`_${p.churchId}`] = p.name;
      });
      return point;
    });

    const insights = buildInsights(parishes, averages, bounds.label);

    const dioceseList = DIOCESE_LEGEND.map((d) => {
      const count = [...dioceseMap.values()].filter((v) => slugifyDiocese(v.diocese) === d.slug).length;
      const reportingCount = d.slug === dioceseMeta.slug ? parishes.length : 0;
      return { ...d, directoryParishes: count, reportingParishes: reportingCount };
    });

    res.json({
      success: true,
      filters: {
        diocese: dioceseMeta.slug,
        dioceseName: dioceseMeta.name,
        period: String(period),
        periodLabel: bounds.label,
        recordType: String(recordType),
        region: String(region),
        parishSize: String(parishSize),
      },
      dioceses: dioceseList,
      regions: ['all', 'NY Downstate', 'NY Upstate', 'NJ North', 'NJ South', ...[...new Set(parishes.map((p) => p.state))].sort()],
      parishSizeBrackets: PARISH_SIZE_BRACKETS,
      periods: Object.entries(PERIOD_CONFIG).map(([id, cfg]) => ({ id, label: cfg.label })),
      executiveSummary: {
        totalParishesReporting: {
          value: reporting.length,
          previous: prevParticipation,
          changePercent: reporting.length - prevParticipation,
          label: 'Parishes with records on file',
        },
        totalRecordsManaged: {
          value: totalRecords,
          previous: prevTotalRecords,
          changePercent: prevTotalRecords > 0 ? Math.round(((totalRecords - prevTotalRecords) / prevTotalRecords) * 100) : 0,
        },
        recordsAddedInPeriod: {
          value: addedInPeriod,
          previous: addedPrevPeriod,
          changePercent: growthRate,
        },
        avgRecordsPerParish: {
          value: avgRecords,
          previous: prevAvgRecords,
          changePercent: prevAvgRecords > 0 ? Math.round(((avgRecords - prevAvgRecords) / prevAvgRecords) * 100) : 0,
        },
        participationRate: {
          value: participationRate,
          previous: prevParticipation,
          changePercent: 0,
          label: '% of diocesan parishes reporting data',
        },
        diocesanGrowthRate: {
          value: growthRate,
          previous: prevGrowth,
          changePercent: growthRate - prevGrowth,
        },
        mostActiveParish: mostActive
          ? { churchId: mostActive.churchId, name: mostActive.name, value: mostActive.records.addedInPeriod }
          : null,
        parishRequiringAttention: needsAttention
          ? { churchId: needsAttention.churchId, name: needsAttention.name, reason: needsAttention.records.dataStatus }
          : null,
      },
      averages,
      parishes,
      charts: {
        recordsByParish: parishes.map((p) => ({
          churchId: p.churchId,
          name: p.name,
          total: p.records.total,
          baptism: p.records.baptism,
          marriage: p.records.marriage,
          funeral: p.records.funeral,
          custom: p.records.custom,
        })),
        activityOverTime,
        growthComparison: parishes.map((p) => ({
          churchId: p.churchId,
          name: p.name,
          changePercent: p.changePercent,
          diocesanAvg: growthRate,
        })),
        completenessMatrix: parishes.map((p) => ({
          churchId: p.churchId,
          name: p.name,
          baptism: p.records.completenessByType.baptism,
          marriage: p.records.completenessByType.marriage,
          funeral: p.records.completenessByType.funeral,
          overall: p.records.completeness,
        })),
        geoParishes: parishes
          .filter((p) => p.latitude && p.longitude)
          .map((p) => ({
            churchId: p.churchId,
            name: p.name,
            city: p.city,
            state: p.state,
            latitude: p.latitude,
            longitude: p.longitude,
            total: p.records.total,
            addedInPeriod: p.records.addedInPeriod,
            changePercent: p.changePercent,
          })),
      },
      insights,
      meta: {
        source: '01-17-2026.orthodox-church.US-sales-color-coded-dioceses.xlsx',
        computedAt: new Date().toISOString(),
        totalParishesInDiocese: parishes.length,
      },
    });
  } catch (error) {
    console.error('Diocesan dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load diocesan dashboard' });
  }
});

module.exports = router;
