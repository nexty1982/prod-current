// server/scripts/list-church-records-tables.js
const { promisePool } = require('../../config/db');

// Change this to the church records DB you want to inspect
const defaultChurchDb = 'ssppoc_records_db';

async function listTablesAndChurchIdColumns(dbName = defaultChurchDb) {
  try {
    // Get all tables in the database
    const [tables] = await promisePool.query(`SHOW TABLES FROM \`${dbName}\``);
    const tableKey = `Tables_in_${dbName}`;
    console.log(`\nTables in ${dbName}:`);
    for (const row of tables) {
      const table = row[tableKey];
      // Get columns for each table
      const [columns] = await promisePool.query(`SHOW COLUMNS FROM \`${dbName}\`.\`${table}\``);
      const hasChurchId = columns.some(col => col.Field === 'church_id');
      console.log(`- ${table}${hasChurchId ? '  [church_id present]' : ''}`);
      // Optionally, print all columns if you want:
      // console.log('  Columns:', columns.map(c => c.Field).join(', '));
    }
  } catch (err) {
    console.error('Error listing tables/columns:', err);
  } finally {
    promisePool.end();
  }
}

// Allow DB name override from command line
const dbNameArg = process.argv[2];
listTablesAndChurchIdColumns(dbNameArg); 