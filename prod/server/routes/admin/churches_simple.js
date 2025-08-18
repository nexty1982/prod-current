const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db');
const { authMiddleware, requireRole } = require('../../middleware/auth');

// Apply authentication middleware
router.use(authMiddleware);
router.use(requireRole(['admin', 'super_admin']));

// GET /api/admin/churches - Get all churches
router.get('/', async (req, res) => {
  try {
    console.log('📍 Church Management API called');
    console.log('👤 User:', req.session?.user?.email);

    const [churches] = await promisePool.query(`
      SELECT * FROM churches ORDER BY name ASC
    `);

    console.log(`✅ Found ${churches.length} churches`);

    res.json({
      success: true,
      churches: churches || []
    });

  } catch (error) {
    console.error('❌ Error fetching churches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch churches',
      details: error.message
    });
  }
});

module.exports = router;