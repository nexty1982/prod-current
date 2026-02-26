/**
 * Collaboration Links API Routes
 * Shareable links for adding new records or updating existing records
 * without requiring authentication.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateToken, hashToken } = require('../utils/tokenUtils');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { getAppPool, getTenantPool } = require('../config/db');

const router = express.Router();

// Rate limiters for public endpoints
const collabGetLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
});

const collabSubmitLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyGenerator: (req) => {
    const token = req.params.token || '';
    return `${req.ip || 'unknown'}_${token.substring(0, 8)}`;
  },
});

// ---------- Helpers ----------

function getDb() {
  return getAppPool();
}

const TABLE_MAP = {
  baptism: 'baptism_records',
  marriage: 'marriage_records',
  funeral: 'funeral_records',
};

const FIELD_MAP = {
  baptism: {
    first_name: 'first_name',
    last_name: 'last_name',
    birth_date: 'birth_date',
    reception_date: 'reception_date',
    birthplace: 'birthplace',
    entry_type: 'entry_type',
    sponsors: 'sponsors',
    parents: 'parents',
    clergy: 'clergy',
  },
  marriage: {
    fname_groom: 'fname_groom',
    lname_groom: 'lname_groom',
    fname_bride: 'fname_bride',
    lname_bride: 'lname_bride',
    mdate: 'mdate',
    parentsg: 'parentsg',
    parentsb: 'parentsb',
    witness: 'witness',
    mlicense: 'mlicense',
    clergy: 'clergy',
  },
  funeral: {
    name: 'name',
    lastname: 'lastname',
    deceased_date: 'deceased_date',
    burial_date: 'burial_date',
    age: 'age',
    burial_location: 'burial_location',
    clergy: 'clergy',
  },
};

const IGNORE_FIELDS = new Set([
  'customPriest', 'churchName', 'createdAt', 'updatedAt', 'notes',
  'id', 'churchId', 'church_id', 'recordType', 'record_type',
]);

function mapFields(recordType, body, churchId) {
  const mapping = FIELD_MAP[recordType] || {};
  const cols = {};

  for (const [key, value] of Object.entries(body)) {
    if (IGNORE_FIELDS.has(key)) continue;
    const dbCol = mapping[key];
    if (dbCol && value !== undefined && value !== null && value !== '') {
      cols[dbCol] = value;
    }
  }

  cols.church_id = parseInt(churchId, 10);
  return cols;
}

async function getChurchName(churchId) {
  const db = getDb();
  const [rows] = await db.query('SELECT church_name FROM churches WHERE id = ?', [churchId]);
  return rows[0]?.church_name || 'Church';
}

async function getClergyOptions(churchId) {
  try {
    const pool = getTenantPool(churchId);
    // Try getting distinct clergy values from all record types
    const tables = ['baptism_records', 'marriage_records', 'funeral_records'];
    const clergySet = new Set();
    for (const table of tables) {
      try {
        const [rows] = await pool.query(`SELECT DISTINCT clergy FROM ${table} WHERE clergy IS NOT NULL AND clergy != ''`);
        rows.forEach(r => clergySet.add(r.clergy));
      } catch (e) {
        // Table may not exist, skip
      }
    }
    return Array.from(clergySet).sort();
  } catch (e) {
    return [];
  }
}

async function lookupRequest(tokenHash) {
  const db = getDb();
  const [rows] = await db.query(
    'SELECT * FROM collaboration_requests WHERE token_hash = ?',
    [tokenHash]
  );
  if (rows.length === 0) return null;

  const req = rows[0];

  // Check expiration
  if (new Date(req.expires_at) < new Date()) {
    if (req.status === 'active') {
      await db.query(
        "UPDATE collaboration_requests SET status = 'expired', updated_at = NOW() WHERE id = ?",
        [req.id]
      );
    }
    return { ...req, status: 'expired' };
  }

  return req;
}

// ================================================================
// AUTHENTICATED ENDPOINTS (mounted at /api/collaboration-links)
// ================================================================

/**
 * POST /api/collaboration-links
 * Create a new collaboration link
 */
router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req, res) => {
    try {
      const {
        churchId,
        linkType,
        recordType,
        maxRecords,
        targetRecordIds,
        label,
        recipientName,
        recipientEmail,
        expiresDays = 30,
      } = req.body;

      const userId = req.user?.id || req.session?.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Validate
      if (!churchId || !linkType || !recordType) {
        return res.status(400).json({ error: 'Missing required fields: churchId, linkType, recordType' });
      }
      if (!['add_new', 'request_updates'].includes(linkType)) {
        return res.status(400).json({ error: 'Invalid linkType' });
      }
      if (!['baptism', 'marriage', 'funeral'].includes(recordType)) {
        return res.status(400).json({ error: 'Invalid recordType' });
      }

      if (linkType === 'add_new') {
        if (!maxRecords || maxRecords < 1 || maxRecords > 100) {
          return res.status(400).json({ error: 'maxRecords must be between 1 and 100' });
        }
      }

      if (linkType === 'request_updates') {
        if (!Array.isArray(targetRecordIds) || targetRecordIds.length === 0) {
          return res.status(400).json({ error: 'targetRecordIds must be a non-empty array' });
        }
        // Verify records exist
        const pool = getTenantPool(churchId);
        const table = TABLE_MAP[recordType];
        const placeholders = targetRecordIds.map(() => '?').join(',');
        const [existing] = await pool.query(
          `SELECT id FROM ${table} WHERE id IN (${placeholders})`,
          targetRecordIds
        );
        if (existing.length !== targetRecordIds.length) {
          return res.status(400).json({ error: 'Some target records were not found' });
        }
      }

      const token = generateToken();
      const tokenHash = hashToken(token);
      const id = uuidv4();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresDays);

      const db = getDb();
      await db.query(
        `INSERT INTO collaboration_requests
         (id, church_id, created_by_user_id, link_type, record_type,
          max_records, target_record_ids_json, token_hash, status,
          label, recipient_name, recipient_email, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
        [
          id, churchId, userId, linkType, recordType,
          linkType === 'add_new' ? maxRecords : null,
          linkType === 'request_updates' ? JSON.stringify(targetRecordIds) : null,
          tokenHash,
          label || null,
          recipientName || null,
          recipientEmail || null,
          expiresAt,
        ]
      );

      const frontendUrl = process.env.FRONTEND_URL || 'https://orthodoxmetrics.com';
      const url = `${frontendUrl}/c/${token}`;

      res.json({ id, token, url, expiresAt });
    } catch (error) {
      console.error('Error creating collaboration link:', error);
      res.status(500).json({ error: 'Failed to create collaboration link' });
    }
  }
);

/**
 * GET /api/collaboration-links
 * List collaboration links for a church
 */
router.get(
  '/',
  requireAuth,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req, res) => {
    try {
      const { churchId, status, limit = 50, offset = 0 } = req.query;
      if (!churchId) return res.status(400).json({ error: 'churchId is required' });

      const db = getDb();
      let query = 'SELECT * FROM collaboration_requests WHERE church_id = ?';
      const params = [parseInt(churchId)];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const [countResult] = await db.query(countQuery, params);

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      const [rows] = await db.query(query, params);

      res.json({
        items: rows.map(r => ({
          ...r,
          targetRecordIds: r.target_record_ids_json ? JSON.parse(r.target_record_ids_json) : null,
        })),
        total: countResult[0]?.total || 0,
      });
    } catch (error) {
      console.error('Error listing collaboration links:', error);
      res.status(500).json({ error: 'Failed to list collaboration links' });
    }
  }
);

/**
 * GET /api/collaboration-links/:id
 * Get details of a single collaboration request
 */
router.get(
  '/:id',
  requireAuth,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      const [rows] = await db.query('SELECT * FROM collaboration_requests WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

      const r = rows[0];
      res.json({
        ...r,
        targetRecordIds: r.target_record_ids_json ? JSON.parse(r.target_record_ids_json) : null,
      });
    } catch (error) {
      console.error('Error fetching collaboration link:', error);
      res.status(500).json({ error: 'Failed to fetch collaboration link' });
    }
  }
);

/**
 * POST /api/collaboration-links/:id/revoke
 * Revoke a collaboration link
 */
router.post(
  '/:id/revoke',
  requireAuth,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      await db.query(
        "UPDATE collaboration_requests SET status = 'revoked', updated_at = NOW() WHERE id = ?",
        [id]
      );
      res.json({ message: 'Link revoked' });
    } catch (error) {
      console.error('Error revoking collaboration link:', error);
      res.status(500).json({ error: 'Failed to revoke link' });
    }
  }
);

// ================================================================
// PUBLIC ENDPOINTS (mounted at /c)
// ================================================================

/**
 * GET /c/public/:token
 * Load form data for a collaboration link recipient
 */
router.get(
  '/public/:token',
  collabGetLimiter,
  async (req, res) => {
    try {
      const { token } = req.params;
      const tokenHash = hashToken(token);
      const collab = await lookupRequest(tokenHash);

      if (!collab) {
        return res.status(404).json({ error: 'Invalid or expired link' });
      }
      if (collab.status !== 'active') {
        const msg = collab.status === 'completed' ? 'This link has already been used'
          : collab.status === 'expired' ? 'This link has expired'
          : collab.status === 'revoked' ? 'This link has been revoked'
          : 'This link is no longer active';
        return res.status(410).json({ error: msg, status: collab.status });
      }

      // Update first_accessed_at
      if (!collab.first_accessed_at) {
        const db = getDb();
        await db.query(
          'UPDATE collaboration_requests SET first_accessed_at = NOW() WHERE id = ?',
          [collab.id]
        );
      }

      const churchName = await getChurchName(collab.church_id);
      const clergyOptions = await getClergyOptions(collab.church_id);

      const response = {
        linkType: collab.link_type,
        recordType: collab.record_type,
        churchName,
        clergyOptions,
        label: collab.label,
      };

      if (collab.link_type === 'add_new') {
        response.maxRecords = collab.max_records;
        response.recordsSubmitted = collab.records_submitted;
      }

      if (collab.link_type === 'request_updates') {
        const targetIds = JSON.parse(collab.target_record_ids_json || '[]');
        const pool = getTenantPool(collab.church_id);
        const table = TABLE_MAP[collab.record_type];
        const records = [];

        for (const recordId of targetIds) {
          const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [recordId]);
          if (rows[0]) {
            records.push(rows[0]);
          }
        }
        response.records = records;
      }

      res.json(response);
    } catch (error) {
      console.error('Error fetching collaboration link data:', error);
      res.status(500).json({ error: 'Failed to load form data' });
    }
  }
);

/**
 * POST /c/public/:token/submit
 * Submit record(s) for a collaboration link
 */
router.post(
  '/public/:token/submit',
  collabSubmitLimiter,
  async (req, res) => {
    try {
      const { token } = req.params;
      const tokenHash = hashToken(token);
      const collab = await lookupRequest(tokenHash);

      if (!collab) {
        return res.status(404).json({ error: 'Invalid or expired link' });
      }
      if (collab.status !== 'active') {
        return res.status(410).json({ error: 'This link is no longer active', status: collab.status });
      }

      const db = getDb();
      const pool = getTenantPool(collab.church_id);
      const table = TABLE_MAP[collab.record_type];

      // ---------- Scenario A: Add New Records ----------
      if (collab.link_type === 'add_new') {
        const { records } = req.body;
        if (!Array.isArray(records) || records.length === 0) {
          return res.status(400).json({ error: 'records must be a non-empty array' });
        }

        const remaining = collab.max_records - collab.records_submitted;
        if (records.length > remaining) {
          return res.status(400).json({
            error: `Only ${remaining} more record(s) can be submitted`,
          });
        }

        const insertedIds = [];
        for (const record of records) {
          const cols = mapFields(collab.record_type, record, collab.church_id);

          // Default entry_type for baptism
          if (collab.record_type === 'baptism' && !cols.entry_type) {
            cols.entry_type = 'Baptism';
          }

          const colNames = Object.keys(cols);
          const placeholders = colNames.map(() => '?').join(', ');
          const values = colNames.map(c => cols[c]);

          const [result] = await pool.query(
            `INSERT INTO ${table} (${colNames.join(', ')}) VALUES (${placeholders})`,
            values
          );
          insertedIds.push(result.insertId);
        }

        // Update counter
        const newCount = collab.records_submitted + records.length;
        const isComplete = newCount >= collab.max_records;

        await db.query(
          `UPDATE collaboration_requests
           SET records_submitted = ?,
               status = ?,
               completed_at = ${isComplete ? 'NOW()' : 'NULL'},
               updated_at = NOW()
           WHERE id = ?`,
          [newCount, isComplete ? 'completed' : 'active', collab.id]
        );

        res.json({
          message: `${records.length} record(s) created`,
          insertedIds,
          recordsSubmitted: newCount,
          maxRecords: collab.max_records,
          completed: isComplete,
        });
      }

      // ---------- Scenario B: Update Existing Records ----------
      else if (collab.link_type === 'request_updates') {
        const { updates } = req.body;
        if (!Array.isArray(updates) || updates.length === 0) {
          return res.status(400).json({ error: 'updates must be a non-empty array' });
        }

        const targetIds = JSON.parse(collab.target_record_ids_json || '[]');
        const targetIdSet = new Set(targetIds.map(Number));

        let updatedCount = 0;
        for (const update of updates) {
          if (!update.recordId || !update.fields) continue;
          if (!targetIdSet.has(Number(update.recordId))) {
            return res.status(403).json({ error: `Record ${update.recordId} is not part of this collaboration` });
          }

          const mapping = FIELD_MAP[collab.record_type] || {};
          const setClauses = [];
          const values = [];

          for (const [key, value] of Object.entries(update.fields)) {
            if (IGNORE_FIELDS.has(key)) continue;
            const dbCol = mapping[key];
            if (dbCol && value !== undefined && value !== null && value !== '') {
              setClauses.push(`\`${dbCol}\` = ?`);
              values.push(value);
            }
          }

          if (setClauses.length > 0) {
            setClauses.push('updated_at = NOW()');
            values.push(update.recordId);
            await pool.query(
              `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = ?`,
              values
            );
            updatedCount++;
          }
        }

        // Mark as completed
        await db.query(
          "UPDATE collaboration_requests SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = ?",
          [collab.id]
        );

        res.json({
          message: `${updatedCount} record(s) updated`,
          completed: true,
        });
      }
    } catch (error) {
      console.error('Error submitting collaboration data:', error);
      res.status(500).json({ error: 'Failed to submit data' });
    }
  }
);

module.exports = router;
