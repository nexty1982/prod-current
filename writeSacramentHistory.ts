import { v4 as uuidv4 } from 'uuid';
import { getChurchDbConnection } from './dbSwitcher';

/**
 * History table names for sacrament records
 */
export type HistoryTableName = 'marriage_history' | 'baptism_history' | 'funeral_history';

/**
 * History event types
 */
export type HistoryType = 'create' | 'update' | 'delete' | 'import' | 'ocr' | 'merge' | 'restore';

/**
 * Source of the change
 */
export type HistorySource = 'ui' | 'api' | 'import' | 'ocr' | 'system';

/**
 * Parameters for writing sacrament history
 */
export interface WriteSacramentHistoryParams {
  /** History table name (marriage_history | baptism_history | funeral_history) */
  historyTableName: HistoryTableName;
  /** Church ID */
  churchId: number;
  /** Record ID */
  recordId: number;
  /** Event type */
  type: HistoryType;
  /** Human-readable description */
  description: string;
  /** Before state (null for create) */
  before: Record<string, any> | null;
  /** After state (null for delete) */
  after: Record<string, any> | null;
  /** Actor user ID (nullable) */
  actorUserId: number | null;
  /** Source of the change */
  source: HistorySource;
  /** Request ID (UUID, nullable) */
  requestId: string | null;
  /** IP address (nullable) */
  ipAddress: string | null;
  /** Database name (for church database connection) */
  databaseName: string;
}

/**
 * Normalize a value for comparison (treat null and undefined as equivalent)
 */
function normalizeValue(value: any): any {
  if (value === null || value === undefined) {
    return null;
  }
  return value;
}

/**
 * Compare two values, treating null and undefined as equivalent
 */
function valuesEqual(a: any, b: any): boolean {
  const normalizedA = normalizeValue(a);
  const normalizedB = normalizeValue(b);
  
  // Handle primitive types
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
 * Returns changed fields and a patch map
 */
function computeDiff(
  before: Record<string, any> | null,
  after: Record<string, any> | null
): { changedFields: string[]; patch: Record<string, { before: any; after: any }> } {
  const changedFields: string[] = [];
  const patch: Record<string, { before: any; after: any }> = {};
  
  // Collect all unique keys from both objects
  const allKeys = new Set<string>();
  
  if (before) {
    Object.keys(before).forEach(key => allKeys.add(key));
  }
  
  if (after) {
    Object.keys(after).forEach(key => allKeys.add(key));
  }
  
  // Compare each key
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
function safeJsonStringify(obj: any): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(obj, (key, value) => {
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      // Handle undefined (convert to null)
      if (value === undefined) {
        return null;
      }
      // Handle dates
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
async function writeSacramentHistory(params: WriteSacramentHistoryParams): Promise<void> {
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
    // Optionally re-throw if you want history failures to be critical
    // throw error;
  }
}

/**
 * Helper to generate a request ID if not provided
 */
function generateRequestId(): string {
  return uuidv4();
}

// CommonJS exports for compatibility with JavaScript require
module.exports = {
  writeSacramentHistory,
  generateRequestId
};

