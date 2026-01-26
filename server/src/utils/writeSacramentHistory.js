/**
 * JavaScript implementation of writeSacramentHistory
 * This file ensures the module can be required even if TypeScript compilation fails
 * 
 * NOTE: This file will be copied to dist/utils/ during build, potentially overwriting
 * the compiled TypeScript version. That's intentional - this ensures uptime even if
 * TypeScript compilation has issues.
 */

const { v4: uuidv4 } = require('uuid');
const { getChurchDbConnection } = require('./dbSwitcher');

/**
 * Normalize a value for comparison (treat null and undefined as equivalent)
 */
function normalizeValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return value;
}

/**
 * Compare two values, treating null and undefined as equivalent
 */
function valuesEqual(a, b) {
  const normalizedA = normalizeValue(a);
  const normalizedB = normalizeValue(b);
  
  if (normalizedA === normalizedB) {
    return true;
  }
  
  // Handle dates (compare as ISO strings)
  if (normalizedA instanceof Date && normalizedB instanceof Date) {
    return normalizedA.toISOString() === normalizedB.toISOString();
  }
  
  // Handle arrays (shallow comparison)
  if (Array.isArray(normalizedA) && Array.isArray(normalizedB)) {
    if (normalizedA.length !== normalizedB.length) {
      return false;
    }
    return normalizedA.every((val, idx) => valuesEqual(val, normalizedB[idx]));
  }
  
  // Handle objects (shallow comparison)
  if (typeof normalizedA === 'object' && typeof normalizedB === 'object' && normalizedA !== null && normalizedB !== null) {
    const keysA = Object.keys(normalizedA);
    const keysB = Object.keys(normalizedB);
    if (keysA.length !== keysB.length) {
      return false;
    }
    return keysA.every(key => valuesEqual(normalizedA[key], normalizedB[key]));
  }
  
  return false;
}

/**
 * Compute a shallow diff between before and after objects
 */
function computeDiff(before, after) {
  const changedFields = [];
  const patch = {};
  
  const allKeys = new Set();
  if (before) {
    Object.keys(before).forEach(key => allKeys.add(key));
  }
  if (after) {
    Object.keys(after).forEach(key => allKeys.add(key));
  }
  
  for (const key of allKeys) {
    const beforeValue = before?.[key];
    const afterValue = after?.[key];
    
    if (!valuesEqual(beforeValue, afterValue)) {
      changedFields.push(key);
      patch[key] = {
        before: normalizeValue(beforeValue),
        after: normalizeValue(afterValue)
      };
    }
  }
  
  return { changedFields, patch };
}

/**
 * Safely serialize JSON, handling circular references and special values
 */
function safeJsonStringify(obj) {
  const seen = new WeakSet();
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      if (value === undefined) {
        return null;
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
  } catch (error) {
    console.error('Error serializing JSON:', error);
    return JSON.stringify({ error: 'Failed to serialize' });
  }
}

/**
 * Write a history record for a sacrament mutation
 */
async function writeSacramentHistory(params) {
  const {
    historyTableName,
    churchId,
    recordId,
    type,
    description,
    before,
    after,
    actorUserId,
    source,
    requestId,
    ipAddress,
    databaseName
  } = params;
  
  try {
    // Compute diff
    const { changedFields, patch } = computeDiff(before, after);
    
    // Build record_data JSON
    const recordData = {
      before: before || null,
      after: after || null,
      meta: {
        source,
        request_id: requestId || null,
        actor_user_id: actorUserId,
        ip_address: ipAddress || null
      }
    };
    
    // Build diff_data JSON
    const diffData = {
      changed_fields: changedFields,
      patch: patch
    };
    
    // Serialize JSON safely
    const recordDataJson = safeJsonStringify(recordData);
    const diffDataJson = safeJsonStringify(diffData);
    
    // Get database connection
    const churchDbPool = await getChurchDbConnection(databaseName);
    
    // Insert history record
    const sql = `
      INSERT INTO ${historyTableName} 
        (type, description, timestamp, record_id, record_data, church_id, actor_user_id, source, request_id, ip_address, diff_data)
      VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await churchDbPool.query(sql, [
      type,
      description,
      recordId,
      recordDataJson,
      churchId,
      actorUserId,
      source,
      requestId,
      ipAddress,
      diffDataJson
    ]);
    
    console.log(`✅ History written for ${historyTableName}: ${type} on record ${recordId}`);
  } catch (error) {
    // Log error but don't throw - history writing should not break the main operation
    console.error(`❌ Error writing history for ${historyTableName}:`, error);
    // Don't throw - allow the main operation to continue
  }
}

/**
 * Helper to generate a request ID if not provided
 */
function generateRequestId() {
  return uuidv4();
}

module.exports = {
  writeSacramentHistory,
  generateRequestId
};
