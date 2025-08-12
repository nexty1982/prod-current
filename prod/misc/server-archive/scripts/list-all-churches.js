// server/scripts/list-all-churches.js
const { promisePool } = require('../../config/db');

async function listAllChurches() {
  try {
    const [rows] = await promisePool.query('SELECT id, name, database_name FROM orthodoxmetrics_db.churches ORDER BY id');
    if (rows.length === 0) {
      console.log('No churches found in orthodoxmetrics_db.churches');
      return;
    }
    console.log('Churches in orthodoxmetrics_db:');
    console.log('---------------------------------------------');
    console.log('| ID  | Name                                 | Database Name           |');
    console.log('---------------------------------------------');
    rows.forEach(row => {
      const id = (row.id ?? '').toString().padEnd(3);
      const name = (row.name ?? '').padEnd(36);
      const dbName = (row.database_name ?? '').padEnd(22);
      console.log(`| ${id} | ${name} | ${dbName} |`);
    });
    console.log('---------------------------------------------');
  } catch (err) {
    console.error('Error listing churches:', err);
  } finally {
    promisePool.end();
  }
}

listAllChurches(); 