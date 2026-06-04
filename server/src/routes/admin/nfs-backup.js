// routes/admin/nfs-backup.js
// Delegates to OMAI ops remote-backup API (rsync/SSH hub at 192.168.1.244).
let mod;
try {
  mod = require('/var/www/omai/_runtime/server/src/api-ops/admin-nfs-backup');
} catch (e) {
  const express = require('express');
  const router = express.Router();
  router.use((_req, res) => {
    res.status(503).json({
      success: false,
      error: 'OMAI backup module not available. Ensure /var/www/omai is deployed on this host.',
    });
  });
  mod = { router };
}
module.exports = mod.router || mod;
