// server/services/templateTableProvisioner.js
// Utility to create database tables from template.fields definitions

const { getAppPool } = require('../config/db');
const APP_DB = process.env.APP_DB_NAME || 'orthodoxmetrics_db';

/**
 * Convert template field type to SQL column type
 */
function fieldTypeToSqlType(field) {
  const type = field.type?.toLowerCase() || 'string';
  const column = field.column || field.field || '';
  
  // Map common types
  if (type === 'date' || column.includes('date') || column.includes('_date')) {
    return 'DATE';
  }
  if (type === 'number' || type === 'int' || column.includes('id') || column.includes('_id') || column.includes('count') || column.includes('number')) {
    return 'INT';
  }
  if (type === 'boolean' || type === 'bool') {
    return 'BOOLEAN';
  }
  if (type === 'text' || column.includes('notes') || column.includes('description')) {
    return 'TEXT';
  }
  // Default to VARCHAR
  return 'VARCHAR(255)';
}

/**
 * Generate CREATE TABLE statement from template fields
 * @param {string} tableName - Name of the table (e.g., 'baptism_records')
 * @param {Array} fields - Array of field definitions from template.fields
 * @param {number} churchId - Church ID for default values
 * @returns {string} CREATE TABLE SQL statement
 */
function generateCreateTableFromTemplate(tableName, fields, churchId) {
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    throw new Error(`Template fields are required for table ${tableName}`);
  }

  const columns = [];
  
  // Always add id as primary key
  columns.push('id INT PRIMARY KEY AUTO_INCREMENT');
  
  // Add church_id if not already present
  const hasChurchId = fields.some(f => (f.column || f.field || '').toLowerCase() === 'church_id');
  if (!hasChurchId) {
    columns.push(`church_id INT NOT NULL DEFAULT ${churchId || 0}`);
  }
  
  // Add columns from template fields
  for (const field of fields) {
    const columnName = field.column || field.field || '';
    if (!columnName || columnName === 'id' || columnName === 'church_id') {
      continue; // Skip if already added or invalid
    }
    
    const sqlType = fieldTypeToSqlType(field);
    const notNull = field.required ? 'NOT NULL' : '';
    // Escape default value to prevent SQL injection
    let defaultValue = '';
    if (field.default !== undefined && field.default !== null) {
      const safeDefault = String(field.default).replace(/'/g, "''");
      defaultValue = `DEFAULT '${safeDefault}'`;
    }
    
    columns.push(`\`${columnName}\` ${sqlType} ${notNull} ${defaultValue}`.trim());
  }
  
  // Add standard timestamps
  columns.push('created_by INT');
  columns.push('created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  columns.push('updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  
  // Add indexes for common fields
  const indexes = [];
  const indexedFields = ['church_id', 'first_name', 'last_name', 'baptism_date', 'marriage_date', 'death_date', 'funeral_date'];
  for (const field of fields) {
    const colName = (field.column || field.field || '').toLowerCase();
    if (indexedFields.includes(colName)) {
      indexes.push(`INDEX idx_${tableName}_${colName} (\`${field.column || field.field}\`)`);
    }
  }
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      ${columns.join(',\n      ')}
      ${indexes.length > 0 ? ',\n      ' + indexes.join(',\n      ') : ''}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.trim();
  
  return createTableSQL;
}

/**
 * Provision record tables in church database from template slugs
 * @param {number} churchId - Church ID (used to get database connection)
 * @param {Object} selectedTemplates - Object with template slugs: { baptism: 'en_baptism_records', marriage: 'en_marriage_records', funeral: 'en_funeral_records' }
 * @returns {Object} Provisioning results
 */
async function provisionTablesFromTemplates(churchId, selectedTemplates) {
  const results = {
    tables_created: [],
    tables_failed: [],
    errors: []
  };
  
  if (!selectedTemplates || Object.keys(selectedTemplates).length === 0) {
    return results;
  }
  
  try {
    // Get church database connection
    const { getChurchDbConnection } = require('../utils/dbSwitcher');
    const dbName = `om_church_${churchId}`;
    const churchDbPool = await getChurchDbConnection(dbName);
    const connection = await churchDbPool.getConnection();
    
    try {
      // Map record types to table names
      const recordTypeToTableName = {
        baptism: 'baptism_records',
        marriage: 'marriage_records',
        funeral: 'funeral_records'
      };
      
      // Get templates from database
      for (const [recordType, templateSlug] of Object.entries(selectedTemplates)) {
        if (!templateSlug) continue;
        
        const tableName = recordTypeToTableName[recordType];
        if (!tableName) {
          console.warn(`⚠️ Unknown record type: ${recordType}, skipping`);
          continue;
        }
        
        try {
          // Fetch template from orthodoxmetrics_db.templates
          const [templates] = await getAppPool().query(`
            SELECT slug, name, record_type, fields
            FROM \`${APP_DB}\`.templates
            WHERE slug = ? AND is_global = 1
          `, [templateSlug]);
          
          if (templates.length === 0) {
            console.warn(`⚠️ Template not found: ${templateSlug}, skipping table creation`);
            results.tables_failed.push({ table: tableName, reason: `Template ${templateSlug} not found` });
            continue;
          }
          
          const template = templates[0];
          const fields = typeof template.fields === 'string' 
            ? JSON.parse(template.fields) 
            : template.fields;
          
          // Generate CREATE TABLE statement
          const createTableSQL = generateCreateTableFromTemplate(tableName, fields, churchId);
          
          // Execute in church database
          await connection.execute(createTableSQL);
          
          console.log(`✅ Created table ${tableName} from template ${templateSlug}`);
          results.tables_created.push({
            table: tableName,
            template_slug: templateSlug,
            template_name: template.name,
            fields_count: fields.length
          });

          // Create corresponding history table
          const historyTableName = tableName.replace('_records', '_history');
          const createHistoryTableSQL = `
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
          
          await connection.execute(createHistoryTableSQL);
          console.log(`✅ Created history table ${historyTableName} for ${tableName}`);
          
        } catch (error) {
          console.error(`❌ Failed to create table ${tableName} from template ${templateSlug}:`, error);
          results.tables_failed.push({
            table: tableName,
            template_slug: templateSlug,
            error: error.message
          });
          results.errors.push(error.message);
        }
      }
    } finally {
      connection.release();
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Error provisioning tables from templates:', error);
    throw error;
  }
}

module.exports = {
  generateCreateTableFromTemplate,
  provisionTablesFromTemplates,
  fieldTypeToSqlType
};
