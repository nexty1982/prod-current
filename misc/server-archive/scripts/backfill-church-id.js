// server/scripts/backfill-church-id.js
const { promisePool } = require('../config/db');

const defaultChurchDb = 'ssppoc_records_db';
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
  return rows[0].church_id;
}

async function backfillChurchId(dbName = defaultChurchDb) {
  try {
    // 1. Get the correct church_id
    const churchId = await getChurchIdForDb(dbName);
    console.log(`Church ID for ${dbName}: ${churchId}`);

    // 2. For each table, update all rows to set church_id
    for (const table of tables) {
      // Check if the column exists
      const [cols] = await promisePool.query(`SHOW COLUMNS FROM \
        \`${dbName}\`.\`${table}\``);
      const hasChurchId = cols.some(col => col.Field === 'church_id');
      if (!hasChurchId) {
        console.log(`Adding church_id column to ${table}...`);
        await promisePool.query(`ALTER TABLE \`${dbName}\`.\`${table}\` ADD COLUMN church_id INT`);
      }
      // Update all rows
      const [result] = await promisePool.query(
        `UPDATE \`${dbName}\`.\`${table}\` SET church_id = ?`,
        [churchId]
      );
      console.log(`Updated ${result.affectedRows} rows in ${table}`);
    }
    console.log('Backfill complete.');
  } catch (err) {
    console.error('Error during backfill:', err);
  } finally {
    promisePool.end();
  }
}

const dbNameArg = process.argv[2] || defaultChurchDb;
backfillChurchId(dbNameArg); 