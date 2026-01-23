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
  try {
    const churchId = parseInt(req.params.id);
    const { themes } = req.body;

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

    // Create table if it doesn't exist
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.church_themes (     
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NULL,
        themes JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church (church_id),
        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE       
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci        
    `);

    // Upsert the themes
    await getAppPool().query(`
      INSERT INTO orthodoxmetrics_db.church_themes
        (church_id, themes)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        themes = VALUES(themes),
        updated_at = CURRENT_TIMESTAMP
    `, [
      churchId,
      JSON.stringify(themes || {})
    ]);

    res.json(ApiResponse(true, {
      message: 'Themes saved successfully',
      church_id: churchId
    }));

  } catch (error) {
    console.error('❌ Error saving themes:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to save themes',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// GET /api/admin/churches/themes/global - Get global themes
