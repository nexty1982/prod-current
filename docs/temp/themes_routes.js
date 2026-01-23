router.get('/themes/global', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    // Get global themes from the themes table (church_id = 0 for global)
    const [themes] = await getAppPool().query(
      `SELECT themes
       FROM orthodoxmetrics_db.church_themes
       WHERE church_id = 0
       LIMIT 1`
    );

    const themesData = themes.length > 0 && themes[0].themes ? JSON.parse(themes[0].themes) : {};

    res.json(ApiResponse(true, {
      themes: themesData
    }));

  } catch (error) {
    console.error('❌ Error fetching global themes:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch global themes',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// POST /api/admin/churches/themes/global - Save global themes
router.post('/themes/global', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const { themes } = req.body;

    // Create table if it doesn't exist
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.church_themes (     
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL DEFAULT 0,
        themes JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church (church_id),
        -- FOREIGN KEY removed - table stores both global (church_id=0) and church-specific themes
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci        
    `);

    // Upsert the global themes (church_id = 0 for global)
    await getAppPool().query(`
      INSERT INTO orthodoxmetrics_db.church_themes
        (church_id, themes)
      VALUES (0, ?)
      ON DUPLICATE KEY UPDATE
        themes = VALUES(themes),
        updated_at = CURRENT_TIMESTAMP
    `, [
      JSON.stringify(themes || {})
    ]);
router.get('/:id/themes', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    // Get church database name
    const [churches] = await getAppPool().query(
      'SELECT database_name FROM churches WHERE id = ? AND is_active = 1',      
      [churchId]
    );

    if (churches.length === 0) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    // Get existing themes from the themes table
    const [themes] = await getAppPool().query(
      `SELECT themes
       FROM orthodoxmetrics_db.church_themes
       WHERE church_id = ?`,
      [churchId]
    );

    const themesData = themes.length > 0 && themes[0].themes ? JSON.parse(themes[0].themes) : {};

    res.json(ApiResponse(true, {
      themes: themesData
    }));

  } catch (error) {
    console.error('❌ Error fetching themes:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch themes',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// POST /api/admin/churches/:id/themes - Save themes for a church
router.post('/:id/themes', requireAuth, requireChurchAccess, async (req, res) => {
