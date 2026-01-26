// server/services/recordHistoryLogger.js
// Service to log all INSERT/UPDATE/DELETE operations on *_records tables to corresponding *_history tables

const { getChurchDbConnection } = require('../utils/dbSwitcher');

/**
 * Map record table name to history table name
 */
function getHistoryTableName(recordsTableName) {
  if (recordsTableName.endsWith('_records')) {
    return recordsTableName.replace('_records', '_history');
  }
  return null;
}

/**
 * Log a record change to the history table
 * @param {number} churchId - Church ID
 * @param {string} recordsTableName - Name of the records table (e.g., 'baptism_records')
 * @param {string} action - 'INSERT', 'UPDATE', or 'DELETE'
 * @param {number} recordId - ID of the record being changed
 * @param {Object|null} beforeData - Record data before change (null for INSERT)
 * @param {Object|null} afterData - Record data after change (null for DELETE)
 * @param {number|null} userId - User ID who made the change
 * @returns {Promise<number>} History record ID
 */
async function logRecordChange(churchId, recordsTableName, action, recordId, beforeData = null, afterData = null, userId = null) {
  const historyTableName = getHistoryTableName(recordsTableName);
  
  if (!historyTableName) {
    console.warn(`⚠️ Cannot determine history table for ${recordsTableName}, skipping history log`);
    return null;
  }

  if (!['INSERT', 'UPDATE', 'DELETE'].includes(action)) {
    throw new Error(`Invalid action: ${action}. Must be INSERT, UPDATE, or DELETE`);
  }

  try {
    // Get church database connection
    const dbName = `om_church_${churchId}`;
    const churchDb = await getChurchDbConnection(dbName);
    const connection = await churchDb.getConnection();

    try {
      // Check if history table exists
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      `, [dbName, historyTableName]);

      if (tables.length === 0) {
        console.warn(`⚠️ History table ${historyTableName} does not exist for church ${churchId}, creating it...`);
        // Create history table if it doesn't exist
        await createHistoryTable(connection, historyTableName);
      }

      // Serialize before/after data to JSON
      const beforeJson = beforeData ? JSON.stringify(beforeData) : null;
      const afterJson = afterData ? JSON.stringify(afterData) : null;

      // Insert history record
      const [result] = await connection.execute(`
        INSERT INTO \`${historyTableName}\` 
        (record_id, action, changed_by, before_json, after_json)
        VALUES (?, ?, ?, ?, ?)
      `, [recordId, action, userId, beforeJson, afterJson]);

      console.log(`✅ Logged ${action} for ${recordsTableName} record ${recordId} to ${historyTableName}`);
      return result.insertId;

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error(`❌ Error logging record change to ${historyTableName}:`, error);
    // Don't throw - history logging should not break the main operation
    return null;
  }
}

/**
 * Create a history table if it doesn't exist
 */
async function createHistoryTable(connection, historyTableName) {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS \`${historyTableName}\` (
      id INT PRIMARY KEY AUTO_INCREMENT,
      record_id INT NOT NULL,
      action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
      changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      changed_by INT,
      before_json LONGTEXT,
      after_json LONGTEXT,
      INDEX idx_record_id (record_id),
      INDEX idx_changed_at (changed_at),
      INDEX idx_action (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  await connection.execute(createTableSQL);
  console.log(`✅ Created history table ${historyTableName}`);
}

/**
 * Verify all record tables have corresponding history tables
 * @param {number} churchId - Church ID
 * @returns {Promise<Object>} Verification results
 */
async function verifyHistoryTables(churchId) {
  const results = {
    church_id: churchId,
    tables_checked: [],
    missing: [],
    errors: []
  };

  try {
    const dbName = `om_church_${churchId}`;
    const churchDb = await getChurchDbConnection(dbName);
    const connection = await churchDb.getConnection();

    try {
      // Find all *_records tables
      const [recordsTables] = await connection.execute(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = ? 
          AND TABLE_NAME LIKE '%_records'
          AND TABLE_TYPE = 'BASE TABLE'
      `, [dbName]);

      for (const row of recordsTables) {
        const recordsTable = row.TABLE_NAME;
        const historyTable = getHistoryTableName(recordsTable);

        if (!historyTable) {
          results.errors.push(`Cannot determine history table for ${recordsTable}`);
          continue;
        }

        // Check if history table exists
        const [historyTables] = await connection.execute(`
          SELECT TABLE_NAME
          FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        `, [dbName, historyTable]);

        const exists = historyTables.length > 0;

        results.tables_checked.push({
          records_table: recordsTable,
          history_table: historyTable,
          exists: exists
        });

        if (!exists) {
          results.missing.push({
            records_table: recordsTable,
            history_table: historyTable
          });
        }
      }

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error(`❌ Error verifying history tables for church ${churchId}:`, error);
    results.errors.push(error.message);
  }

  return results;
}

module.exports = {
  logRecordChange,
  verifyHistoryTables,
  getHistoryTableName,
  createHistoryTable
};
