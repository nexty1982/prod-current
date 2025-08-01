// server/scripts/fix-church-id-inconsistencies.js
const { promisePool } = require('../config/db');

const defaultChurchDb = 'ssppoc_records_db';

// List of tables to check/update
const tables = [
  'activity_log',
  'baptism_history',
  'baptism_records',
  'change_log',
  'funeral_history',
  'funeral_records',
  'marriage_history',
  'marriage_records',
];

async function getChurchIdForDb(dbName) {
  // Query the main orthodoxmetrics_db for the church_id matching this database
  const [rows] = await promisePool.query(
    'SELECT id AS church_id, name FROM orthodoxmetrics_db.churches WHERE database_name = ?',
    [dbName]
  );
  if (rows.length === 0) {
    throw new Error(`No church found in orthodoxmetrics_db for database_name='${dbName}'`);
  }
  // Return both id and name
  return { church_id: rows[0].church_id, name: rows[0].name };
}

async function fixChurchIdInconsistencies(dbName = defaultChurchDb) {
  try {
    const { church_id: correctChurchId, name: churchName } = await getChurchIdForDb(dbName);
    console.log(`Correct church_id for ${dbName}: ${correctChurchId} (Church Name: ${churchName})`);
    for (const table of tables) {
      // Only update if the table has a church_id column
      const [cols] = await promisePool.query(`SHOW COLUMNS FROM \
        \`${dbName}\`.\`${table}\``);
      const hasChurchId = cols.some(col => col.Field === 'church_id');
      if (!hasChurchId) {
        console.log(`Skipping ${table} (no church_id column)`);
        continue;
      }
      // Update all rows to have the correct church_id
      const [result] = await promisePool.query(
        `UPDATE \`${dbName}\`.\`${table}\` SET church_id = ? WHERE church_id != ? OR church_id IS NULL`,
        [correctChurchId, correctChurchId]
      );
      console.log(`Updated ${result.affectedRows} rows in ${table}`);
    }
    console.log('Church ID consistency fix complete.');
  } catch (err) {
    console.error('Error during church ID consistency fix:', err);
  } finally {
    promisePool.end();
  }
}

const dbNameArg = process.argv[2] || defaultChurchDb;
fixChurchIdInconsistencies(dbNameArg); 