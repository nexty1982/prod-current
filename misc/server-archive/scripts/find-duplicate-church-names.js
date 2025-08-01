// server/scripts/find-duplicate-church-names.js
const { promisePool } = require('../config/db');

async function findDuplicateChurchNames() {
  try {
    const [rows] = await promisePool.query(`
      SELECT name, GROUP_CONCAT(id) as ids, COUNT(*) as count
      FROM churches
      GROUP BY name
      HAVING count > 1
      ORDER BY count DESC
    `);
    if (rows.length === 0) {
      console.log('No duplicate church names found.');
      return;
    }
    console.log('Duplicate church names:');
    rows.forEach(row => {
      console.log(`Name: ${row.name} | IDs: ${row.ids} | Count: ${row.count}`);
    });
  } catch (err) {
    console.error('Error finding duplicate church names:', err);
  } finally {
    promisePool.end();
  }
}

findDuplicateChurchNames(); 