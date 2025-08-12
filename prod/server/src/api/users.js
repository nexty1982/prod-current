const { getAppPool } = require('../../config/db-compat');
// server/routes/users.js
const express     = require('express');
const { promisePool } = require('../../config/db-compat');
const router      = express.Router();

router.get('/', async (req, res) => {
  try {
    // either select * or list every column explicitly — NO '...' placeholders!
    const [rows] = await getAppPool().query(`
      SELECT *
      FROM orthodoxmetrics_auth_db.users
    `);

    return res.json({ users: rows });
  } catch (err) {
    console.error('❌ Error in GET /api/users:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
