/**
 * Record Supplements API
 * Per-church sidecar data: attach additional fields to any record.
 *
 * Mounted at:
 *   /api/churches/:churchId/records/:recordType/:recordId/supplements
 *   /api/records/:recordType/:recordId/supplements
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { promisePool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');
const { info, warn, error: logError } = require('../utils/dbLogger');

const LOG_SOURCE = 'record-supplements';

// ── Validation constants ──

const RECORD_TYPE_RE = /^[a-zA-Z0-9:_-]{1,64}$/;
const FIELD_KEY_RE = /^[a-zA-Z0-9_.:-]{1,128}$/;
const VALID_FIELD_TYPES = ['string', 'number', 'date', 'bool', 'json'];
const VALID_SOURCES = ['manual', 'ocr', 'import', 'system'];
const ALLOWED_ROLES = ['super_admin', 'admin', 'church_admin', 'priest', 'deacon'];

// ── Helpers ──

// Cache: churchId → database_name
const churchDbCache = new Map();

async function resolveChurchDb(req) {
  const churchId = req.params.churchId || req.user?.church_id;
  if (!churchId) {
    const err = new Error('No church context: churchId missing from URL and user session');
    err.statusCode = 400;
    throw err;
  }
  const key = String(churchId);
  if (churchDbCache.has(key)) return { churchId, dbName: churchDbCache.get(key) };

  const [rows] = await promisePool.execute(
    'SELECT database_name FROM churches WHERE id = ?', [churchId]
  );
  if (rows.length === 0 || !rows[0].database_name) {
    const err = new Error(`No database configured for church ID: ${churchId}`);
    err.statusCode = 404;
    throw err;
  }
  churchDbCache.set(key, rows[0].database_name);
  return { churchId, dbName: rows[0].database_name };
}

const qt = (dbName) => `\`${dbName}\`.\`record_supplements\``;

/**
 * Coerce value into the correct typed column based on field_type.
 * Returns an object with exactly one value_* key set.
 */
function coerceValue(fieldType, value) {
  const result = {
    value_string: null,
    value_number: null,
    value_date: null,
    value_bool: null,
    value_json: null,
  };

  if (value === null || value === undefined) return result;

  switch (fieldType) {
    case 'string':
      result.value_string = String(value);
      break;
    case 'number': {
      const num = Number(value);
      if (isNaN(num)) throw new Error(`Invalid number value: ${value}`);
      result.value_number = num;
      break;
    }
    case 'date':
      // Accept ISO date strings; let MySQL validate the actual date
      result.value_date = String(value);
      break;
    case 'bool': {
      const boolVal = value === true || value === 1 || value === '1' || value === 'true';
      result.value_bool = boolVal ? 1 : 0;
      break;
    }
    case 'json':
      result.value_json = typeof value === 'string' ? value : JSON.stringify(value);
      break;
    default:
      throw new Error(`Unknown field_type: ${fieldType}`);
  }

  return result;
}

// ── Middleware ──

function checkRecordPermissions(req, res, next) {
  if (!ALLOWED_ROLES.includes(req.user?.role)) {
    return res.status(403).json(
      ApiResponse.error('Insufficient permissions', 'FORBIDDEN', 403)
    );
  }
  next();
}

function validateParams(req, res, next) {
  const { recordType, recordId } = req.params;

  if (!RECORD_TYPE_RE.test(recordType)) {
    return res.status(400).json(
      ApiResponse.validationError(
        [{ field: 'recordType', message: 'Must match /^[a-zA-Z0-9:_-]{1,64}$/' }],
        'Invalid recordType'
      )
    );
  }

  if (!recordId || isNaN(Number(recordId))) {
    return res.status(400).json(
      ApiResponse.validationError(
        [{ field: 'recordId', message: 'Must be a positive integer' }],
        'Invalid recordId'
      )
    );
  }

  next();
}

// ── Routes ──

/**
 * GET /:recordType/:recordId/supplements
 * List all supplements for a record.
 */
router.get('/:recordType/:recordId/supplements',
  requireAuth,
  validateParams,
  async (req, res) => {
    try {
      const { recordType, recordId } = req.params;
      const { dbName, churchId } = await resolveChurchDb(req);

      const [rows] = await promisePool.execute(
        `SELECT * FROM ${qt(dbName)} WHERE record_type = ? AND record_id = ? ORDER BY id ASC`,
        [recordType, Number(recordId)]
      );

      info(LOG_SOURCE, `Listed ${rows.length} supplements`, { churchId, recordType, recordId });
      res.json(ApiResponse.success(rows, 'Supplements retrieved'));
    } catch (err) {
      logError(LOG_SOURCE, `GET supplements failed: ${err.message}`, { error: err.message });
      const status = err.statusCode || 500;
      res.status(status).json(ApiResponse.error(err.message, 'ERROR', status));
    }
  }
);

/**
 * POST /:recordType/:recordId/supplements
 * Create or update a supplement.
 */
router.post('/:recordType/:recordId/supplements',
  requireAuth,
  checkRecordPermissions,
  validateParams,
  async (req, res) => {
    try {
      const { recordType, recordId } = req.params;
      const { dbName, churchId } = await resolveChurchDb(req);
      const userId = req.user?.id || null;

      const { id, field_key, field_type = 'string', value, source = 'manual', confidence, notes } = req.body;

      // Validate field_key
      if (!field_key || !FIELD_KEY_RE.test(field_key)) {
        warn(LOG_SOURCE, 'Invalid field_key', { field_key });
        return res.status(400).json(
          ApiResponse.validationError(
            [{ field: 'field_key', message: 'Must match /^[a-zA-Z0-9_.:-]{1,128}$/' }],
            'Invalid field_key'
          )
        );
      }

      // Validate field_type
      if (!VALID_FIELD_TYPES.includes(field_type)) {
        return res.status(400).json(
          ApiResponse.validationError(
            [{ field: 'field_type', message: `Must be one of: ${VALID_FIELD_TYPES.join(', ')}` }],
            'Invalid field_type'
          )
        );
      }

      // Validate source
      if (!VALID_SOURCES.includes(source)) {
        return res.status(400).json(
          ApiResponse.validationError(
            [{ field: 'source', message: `Must be one of: ${VALID_SOURCES.join(', ')}` }],
            'Invalid source'
          )
        );
      }

      // Validate confidence
      if (confidence !== undefined && confidence !== null) {
        const conf = Number(confidence);
        if (isNaN(conf) || conf < 0 || conf > 1) {
          return res.status(400).json(
            ApiResponse.validationError(
              [{ field: 'confidence', message: 'Must be between 0 and 1' }],
              'Invalid confidence'
            )
          );
        }
      }

      // Coerce value
      let valueColumns;
      try {
        valueColumns = coerceValue(field_type, value);
      } catch (coerceErr) {
        return res.status(400).json(
          ApiResponse.validationError(
            [{ field: 'value', message: coerceErr.message }],
            'Invalid value'
          )
        );
      }

      const numRecordId = Number(recordId);

      if (id) {
        // ── UPDATE existing supplement ──
        // Verify the row exists and matches record_type + record_id
        const [existing] = await promisePool.execute(
          `SELECT id FROM ${qt(dbName)} WHERE id = ? AND record_type = ? AND record_id = ?`,
          [Number(id), recordType, numRecordId]
        );

        if (existing.length === 0) {
          return res.status(404).json(
            ApiResponse.notFound('supplement', id)
          );
        }

        await promisePool.execute(
          `UPDATE ${qt(dbName)} SET
            field_key = ?, field_type = ?,
            value_string = ?, value_number = ?, value_date = ?, value_bool = ?, value_json = ?,
            source = ?, confidence = ?, notes = ?, updated_by = ?
          WHERE id = ? AND record_type = ? AND record_id = ?`,
          [
            field_key, field_type,
            valueColumns.value_string, valueColumns.value_number,
            valueColumns.value_date, valueColumns.value_bool, valueColumns.value_json,
            source, confidence ?? null, notes ?? null, userId,
            Number(id), recordType, numRecordId
          ]
        );

        const [updated] = await promisePool.execute(
          `SELECT * FROM ${qt(dbName)} WHERE id = ?`, [Number(id)]
        );

        info(LOG_SOURCE, `Updated supplement ${id}`, { churchId, recordType, recordId, field_key });
        res.json(ApiResponse.success(updated[0], 'Supplement updated'));
      } else {
        // ── INSERT new supplement ──
        const [result] = await promisePool.execute(
          `INSERT INTO ${qt(dbName)}
            (record_type, record_id, field_key, field_type,
             value_string, value_number, value_date, value_bool, value_json,
             source, confidence, notes, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            recordType, numRecordId, field_key, field_type,
            valueColumns.value_string, valueColumns.value_number,
            valueColumns.value_date, valueColumns.value_bool, valueColumns.value_json,
            source, confidence ?? null, notes ?? null, userId, userId
          ]
        );

        const [created] = await promisePool.execute(
          `SELECT * FROM ${qt(dbName)} WHERE id = ?`, [result.insertId]
        );

        info(LOG_SOURCE, `Created supplement ${result.insertId}`, { churchId, recordType, recordId, field_key });
        res.status(201).json(ApiResponse.success(created[0], 'Supplement created'));
      }
    } catch (err) {
      logError(LOG_SOURCE, `POST supplement failed: ${err.message}`, { error: err.message });
      const status = err.statusCode || 500;
      res.status(status).json(ApiResponse.error(err.message, 'ERROR', status));
    }
  }
);

/**
 * DELETE /:recordType/:recordId/supplements/:supplementId
 * Delete a supplement by ID.
 */
router.delete('/:recordType/:recordId/supplements/:supplementId',
  requireAuth,
  checkRecordPermissions,
  validateParams,
  async (req, res) => {
    try {
      const { recordType, recordId, supplementId } = req.params;
      const { dbName, churchId } = await resolveChurchDb(req);

      if (!supplementId || isNaN(Number(supplementId))) {
        return res.status(400).json(
          ApiResponse.validationError(
            [{ field: 'supplementId', message: 'Must be a positive integer' }],
            'Invalid supplementId'
          )
        );
      }

      // Verify row exists AND matches record_type + record_id
      const [existing] = await promisePool.execute(
        `SELECT id FROM ${qt(dbName)} WHERE id = ? AND record_type = ? AND record_id = ?`,
        [Number(supplementId), recordType, Number(recordId)]
      );

      if (existing.length === 0) {
        return res.status(404).json(
          ApiResponse.notFound('supplement', supplementId)
        );
      }

      await promisePool.execute(
        `DELETE FROM ${qt(dbName)} WHERE id = ? AND record_type = ? AND record_id = ?`,
        [Number(supplementId), recordType, Number(recordId)]
      );

      info(LOG_SOURCE, `Deleted supplement ${supplementId}`, { churchId, recordType, recordId });
      res.json(ApiResponse.success(null, 'Supplement deleted'));
    } catch (err) {
      logError(LOG_SOURCE, `DELETE supplement failed: ${err.message}`, { error: err.message });
      const status = err.statusCode || 500;
      res.status(status).json(ApiResponse.error(err.message, 'ERROR', status));
    }
  }
);

module.exports = router;
