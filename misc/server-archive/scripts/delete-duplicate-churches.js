// server/scripts/delete-duplicate-churches.js
const { promisePool } = require('../config/db');

async function deleteDuplicateChurches() {
  try {
    // Find all duplicate names
    const [dupes] = await promisePool.query(`
      SELECT name
      FROM churches
      GROUP BY name
      HAVING COUNT(*) > 1
    `);
    if (dupes.length === 0) {
      console.log('No duplicate church names found.');
      return;
    }
    for (const row of dupes) {
      const name = row.name;
      // Get all IDs for this name, sorted ascending
      const [ids] = await promisePool.query(
        'SELECT id FROM churches WHERE name = ? ORDER BY id ASC', [name]
      );
      if (ids.length < 2) continue;
      const keepId = ids[0].id;
      const deleteIds = ids.slice(1).map(r => r.id);
      console.log(`Keeping church '${name}' with ID ${keepId}. Deleting duplicates: ${deleteIds.join(', ')}`);
      if (deleteIds.length > 0) {
        await promisePool.query(
          `DELETE FROM churches WHERE id IN (${deleteIds.map(() => '?').join(',')})`,
          deleteIds
        );
      }
    }
    console.log('Duplicate church cleanup complete.');
  } catch (err) {
    console.error('Error deleting duplicate churches:', err);
  } finally {
    promisePool.end();
  }
}

deleteDuplicateChurches(); 