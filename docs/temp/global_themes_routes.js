router.get('/themes/global', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    // Get global themes from the themes table (church_id = NULL for global)
    const [themes] = await getAppPool().query(
      `SELECT themes
       FROM orthodoxmetrics_db.church_themes
       WHERE church_id IS NULL
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
        church_id INT NULL,
        themes JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church (church_id),
        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE       
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci        
    `);

    // Upsert the global themes (church_id = NULL for global)
    await getAppPool().query(`
      INSERT INTO orthodoxmetrics_db.church_themes
        (church_id, themes)
      VALUES (NULL, ?)
      ON DUPLICATE KEY UPDATE
        themes = VALUES(themes),
        updated_at = CURRENT_TIMESTAMP
    `, [
      JSON.stringify(themes || {})
    ]);
