/**
 * Demo Churches API Routes
 * Quick-create demo churches with sample data, bypassing CRM pipeline
 *
 * Mounted at /api/admin/demo-churches
 */

const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const router = express.Router();

const requireAdmin = requireRole(['admin', 'super_admin']);

function getPool() {
  return require('../../config/db').promisePool;
}

// ═══════════════════════════════════════════════════════════════
// LIST — all demo churches
// ═══════════════════════════════════════════════════════════════

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.email, c.city, c.state_province, c.database_name,
              c.jurisdiction_id, c.calendar_type, c.is_active, c.demo_expires_at, c.created_at,
              j.name AS jurisdiction_name, j.abbreviation AS jurisdiction_abbr
       FROM churches c
       LEFT JOIN jurisdictions j ON c.jurisdiction_id = j.id
       WHERE c.is_demo = TRUE
       ORDER BY c.created_at DESC`
    );

    // Get record counts for each demo church
    for (const church of rows) {
      if (church.database_name) {
        try {
          const { getTenantPool } = require('../../config/db');
          const tenantPool = getTenantPool(church.id);
          const [[b]] = await tenantPool.query('SELECT COUNT(*) as c FROM baptism_records');
          const [[m]] = await tenantPool.query('SELECT COUNT(*) as c FROM marriage_records');
          const [[f]] = await tenantPool.query('SELECT COUNT(*) as c FROM funeral_records');
          church.record_counts = { baptisms: b.c, marriages: m.c, funerals: f.c };
        } catch {
          church.record_counts = null;
        }
      }
    }

    res.json({ churches: rows, total: rows.length });
  } catch (err) {
    console.error('Failed to list demo churches:', err);
    res.status(500).json({ error: 'Failed to list demo churches' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATE — quick-create a demo church with sample data
// ═══════════════════════════════════════════════════════════════

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const {
      name,
      jurisdiction_id,
      sample_data_counts = { baptisms: 20, marriages: 10, funerals: 5 },
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Church name is required' });
    }

    // Look up jurisdiction for calendar_type
    let calendarType = null;
    let jurisdictionName = null;
    if (jurisdiction_id) {
      const [jRows] = await pool.query('SELECT name, calendar_type FROM jurisdictions WHERE id = ?', [jurisdiction_id]);
      if (jRows.length) {
        calendarType = jRows[0].calendar_type;
        jurisdictionName = jRows[0].name;
      }
    }

    // 1. Create church record
    const [insertResult] = await pool.query(
      `INSERT INTO churches (name, email, jurisdiction_id, calendar_type, is_demo, is_active, country)
       VALUES (?, ?, ?, ?, TRUE, TRUE, 'United States')`,
      [name.trim(), `demo-${Date.now()}@orthodoxmetrics.com`, jurisdiction_id || null, calendarType]
    );
    const churchId = insertResult.insertId;

    // 2. Create tenant database via ChurchProvisioner
    let dbResult = null;
    try {
      const ChurchProvisioner = require('../../services/church-provisioner');
      const provisioner = new ChurchProvisioner();
      dbResult = await provisioner.createChurchDatabase({
        name: name.trim(),
        email: `demo-${churchId}@orthodoxmetrics.com`,
        country: 'United States',
      });

      if (dbResult?.databaseName) {
        await pool.query('UPDATE churches SET database_name = ? WHERE id = ?', [dbResult.databaseName, churchId]);
      }
    } catch (provisionErr) {
      console.error('Demo church provisioning failed:', provisionErr.message);
      // Rollback church record
      await pool.query('DELETE FROM churches WHERE id = ?', [churchId]);
      return res.status(500).json({ error: 'Failed to create demo database: ' + provisionErr.message });
    }

    // 3. Load sample data
    let sampleResults = null;
    if (dbResult?.databaseName) {
      try {
        const { getTenantPool } = require('../../config/db');
        const tenantPool = getTenantPool(churchId);
        const TestChurchDataGenerator = require('../../services/testChurchDataGenerator');
        const generator = new TestChurchDataGenerator();
        sampleResults = await generator.loadSampleDataIntoDb(tenantPool, sample_data_counts);
      } catch (dataErr) {
        console.error('Sample data loading failed (non-fatal):', dataErr.message);
      }
    }

    res.status(201).json({
      success: true,
      church: {
        id: churchId,
        name: name.trim(),
        database_name: dbResult?.databaseName || null,
        jurisdiction_name: jurisdictionName,
        calendar_type: calendarType,
        is_demo: true,
      },
      sample_data: sampleResults,
      message: `Demo church "${name.trim()}" created successfully`,
    });
  } catch (err) {
    console.error('Failed to create demo church:', err);
    res.status(500).json({ error: 'Failed to create demo church' });
  }
});

// ═══════════════════════════════════════════════════════════════
// REFRESH — regenerate sample data for a demo church
// ═══════════════════════════════════════════════════════════════

router.post('/:id/refresh', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM churches WHERE id = ? AND is_demo = TRUE', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Demo church not found' });

    const church = rows[0];
    if (!church.database_name) {
      return res.status(400).json({ error: 'Demo church has no database' });
    }

    const { getTenantPool } = require('../../config/db');
    const tenantPool = getTenantPool(church.id);

    // Clear existing sample data
    await tenantPool.query('DELETE FROM baptism_records');
    await tenantPool.query('DELETE FROM marriage_records');
    await tenantPool.query('DELETE FROM funeral_records');

    // Reload
    const counts = req.body.sample_data_counts || { baptisms: 20, marriages: 10, funerals: 5 };
    const TestChurchDataGenerator = require('../../services/testChurchDataGenerator');
    const generator = new TestChurchDataGenerator();
    const results = await generator.loadSampleDataIntoDb(tenantPool, counts);

    res.json({ success: true, sample_data: results });
  } catch (err) {
    console.error('Failed to refresh demo data:', err);
    res.status(500).json({ error: 'Failed to refresh demo data' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DELETE — remove a demo church and its database
// ═══════════════════════════════════════════════════════════════

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM churches WHERE id = ? AND is_demo = TRUE', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Demo church not found' });

    const church = rows[0];

    // Drop tenant database if it exists
    if (church.database_name) {
      try {
        const mysql = require('mysql2/promise');
        const conn = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
        });
        await conn.execute(`DROP DATABASE IF EXISTS \`${church.database_name}\``);
        await conn.end();
        console.log(`Dropped demo database: ${church.database_name}`);
      } catch (dropErr) {
        console.error('Failed to drop demo database (non-fatal):', dropErr.message);
      }
    }

    // Remove registration tokens
    await pool.query('DELETE FROM church_registration_tokens WHERE church_id = ?', [church.id]).catch(() => {});

    // Remove church record
    await pool.query('DELETE FROM churches WHERE id = ?', [church.id]);

    res.json({ success: true, message: `Demo church "${church.name}" deleted` });
  } catch (err) {
    console.error('Failed to delete demo church:', err);
    res.status(500).json({ error: 'Failed to delete demo church' });
  }
});

module.exports = router;
