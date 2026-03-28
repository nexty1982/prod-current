/**
 * Church Decommissioning API
 *
 * Wizard-driven endpoints for safely decommissioning a church:
 *  1. Preview impact assessment
 *  2. Disable church
 *  3. List / remove users
 *  4. Export tenant DB records
 *  5. Clean platform DB references
 *  6. Finalize deletion (+ optional DROP DATABASE)
 *
 * Mounted at /api/admin/church-decom
 * super_admin only
 */

const express = require('express');
const router = express.Router();
const { getAppPool } = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth');

const SUPER_ADMIN = ['super_admin'];

// ═══════════════════════════════════════════════════════════════
// PREVIEW — Full impact assessment for a church
// ═══════════════════════════════════════════════════════════════

router.get('/preview/:churchId', requireAuth, requireRole(SUPER_ADMIN), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) return res.status(400).json({ success: false, error: 'Invalid church ID' });

    const pool = getAppPool();

    // Church info
    const [churches] = await pool.query(
      'SELECT id, name, is_active, setup_complete, onboarding_phase, database_name, created_at FROM churches WHERE id = ?',
      [churchId]
    );
    if (!churches.length) return res.status(404).json({ success: false, error: 'Church not found' });
    const church = churches[0];

    // User count
    const [userRows] = await pool.query('SELECT COUNT(*) as count FROM users WHERE church_id = ?', [churchId]);

    // Token count
    const [tokenRows] = await pool.query('SELECT COUNT(*) as count FROM church_registration_tokens WHERE church_id = ?', [churchId]);

    // Tenant DB check
    const tenantDbName = `om_church_${churchId}`;
    const [dbExists] = await pool.query(
      'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
      [tenantDbName]
    );

    // Tenant DB tables + row counts
    let tenantTables = [];
    if (dbExists.length > 0) {
      const [tables] = await pool.query(
        'SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
        [tenantDbName]
      );
      tenantTables = tables.map(t => ({ table: t.TABLE_NAME, rows: t.TABLE_ROWS || 0 }));
    }

    // Platform DB tables with FK references to this church
    const [fkTables] = await pool.query(`
      SELECT DISTINCT TABLE_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_NAME = 'churches'
        AND REFERENCED_COLUMN_NAME = 'id'
        AND TABLE_SCHEMA = 'orthodoxmetrics_db'
      ORDER BY TABLE_NAME
    `);

    // Also include known non-FK tables with church_id
    const nonFkTables = [
      'ocr_jobs', 'ocr_api_daily_usage', 'ocr_api_usage', 'ocr_batch_schedules',
      'ocr_correction_log', 'ocr_dead_letter_queue', 'ocr_extraction_cache',
      'ocr_extractors', 'ocr_notification_settings', 'ocr_template_accuracy',
      'church_themes', 'church_image_paths', 'church_dynamic_records_config',
      'church_records_landing', 'church_record_fields', 'church_record_settings',
      'church_onboarding_tasks', 'calendar_events', 'parish_settings',
      'banner_assignments', 'certificate_positions', 'storage_usage',
      'access_override_requests', 'admin_table_requests', 'collaboration_requests',
      'email_submissions', 'export_jobs', 'field_mapper_settings',
      'image_assignments', 'image_bindings', 'invite_tokens',
      'record_creation_presets', 'tickets', 'user_profiles', 'user_profile_complete',
      'church_enrichment_profiles',
      'omai_onboarding_activity_log', 'omai_onboarding_emails', 'omai_onboarding_record_requirements',
    ];

    const allTableNames = new Set([
      ...fkTables.map(t => t.TABLE_NAME),
      ...nonFkTables,
    ]);

    // Count rows per table
    const platformCounts = [];
    for (const tableName of allTableNames) {
      try {
        // Check column name (some use parish_id instead of church_id)
        const [cols] = await pool.query(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' AND TABLE_NAME = ? AND COLUMN_NAME IN ('church_id', 'parish_id')`,
          [tableName]
        );
        if (!cols.length) continue;
        const colName = cols[0].COLUMN_NAME;

        const [cnt] = await pool.query(
          `SELECT COUNT(*) as count FROM \`${tableName}\` WHERE \`${colName}\` = ?`,
          [churchId]
        );
        if (cnt[0].count > 0) {
          platformCounts.push({ table: tableName, column: colName, rows: cnt[0].count });
        }
      } catch {
        // Table may not exist, skip
      }
    }

    res.json({
      success: true,
      church,
      users: userRows[0].count,
      tokens: tokenRows[0].count,
      tenantDb: {
        name: tenantDbName,
        exists: dbExists.length > 0,
        tables: tenantTables,
      },
      platformReferences: platformCounts,
    });
  } catch (err) {
    console.error('[Church Decom] Preview error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate preview' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DISABLE — Set is_active = 0
// ═══════════════════════════════════════════════════════════════

router.post('/:churchId/disable', requireAuth, requireRole(SUPER_ADMIN), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) return res.status(400).json({ success: false, error: 'Invalid church ID' });

    const pool = getAppPool();
    await pool.query('UPDATE churches SET is_active = 0 WHERE id = ?', [churchId]);

    console.log(`[Church Decom] Church ${churchId} disabled`);
    res.json({ success: true, message: `Church ${churchId} disabled` });
  } catch (err) {
    console.error('[Church Decom] Disable error:', err);
    res.status(500).json({ success: false, error: 'Failed to disable church' });
  }
});

// ═══════════════════════════════════════════════════════════════
// USERS — List and remove users
// ═══════════════════════════════════════════════════════════════

router.get('/:churchId/users', requireAuth, requireRole(SUPER_ADMIN), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) return res.status(400).json({ success: false, error: 'Invalid church ID' });

    const pool = getAppPool();
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.full_name, u.role, u.is_locked, u.created_at,
              CASE WHEN cu.id IS NOT NULL THEN 1 ELSE 0 END AS has_church_user_row
       FROM users u
       LEFT JOIN church_users cu ON cu.user_id = u.id AND cu.church_id = ?
       WHERE u.church_id = ?
       ORDER BY u.created_at DESC`,
      [churchId, churchId]
    );

    res.json({ success: true, users });
  } catch (err) {
    console.error('[Church Decom] Users list error:', err);
    res.status(500).json({ success: false, error: 'Failed to list users' });
  }
});

router.delete('/:churchId/users', requireAuth, requireRole(SUPER_ADMIN), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) return res.status(400).json({ success: false, error: 'Invalid church ID' });

    const { userIds } = req.body; // number[] or 'all'

    const pool = getAppPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      let targetIds;
      if (userIds === 'all') {
        const [rows] = await conn.query('SELECT id FROM users WHERE church_id = ?', [churchId]);
        targetIds = rows.map(r => r.id);
      } else if (Array.isArray(userIds) && userIds.length > 0) {
        targetIds = userIds.map(id => parseInt(id)).filter(id => !isNaN(id));
      } else {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, error: 'userIds must be an array or "all"' });
      }

      if (targetIds.length === 0) {
        await conn.rollback();
        conn.release();
        return res.json({ success: true, removed: 0 });
      }

      const placeholders = targetIds.map(() => '?').join(',');

      // Delete from FK child tables first
      const userFkTables = [
        'church_users', 'church_user_roles', 'user_roles', 'user_sessions',
        'user_sessions_social', 'user_activity_logs', 'user_notification_preferences',
        'user_social_settings', 'user_component_summary', 'user_profiles_backup',
        'refresh_tokens', 'password_resets', 'push_subscriptions',
        'notification_subscriptions', 'social_reactions',
      ];

      for (const table of userFkTables) {
        try {
          await conn.query(`DELETE FROM \`${table}\` WHERE user_id IN (${placeholders})`, targetIds);
        } catch {
          // Table may not have user_id column or may not exist
        }
      }

      // Delete users
      const [result] = await conn.query(
        `DELETE FROM users WHERE id IN (${placeholders}) AND church_id = ?`,
        [...targetIds, churchId]
      );

      await conn.commit();
      conn.release();

      console.log(`[Church Decom] Removed ${result.affectedRows} users from church ${churchId}`);
      res.json({ success: true, removed: result.affectedRows });
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (err) {
    console.error('[Church Decom] Users remove error:', err);
    res.status(500).json({ success: false, error: 'Failed to remove users' });
  }
});

// ═══════════════════════════════════════════════════════════════
// RECORDS — List tenant DB tables and export as CSV
// ═══════════════════════════════════════════════════════════════

router.get('/:churchId/records', requireAuth, requireRole(SUPER_ADMIN), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) return res.status(400).json({ success: false, error: 'Invalid church ID' });

    const pool = getAppPool();
    const tenantDbName = `om_church_${churchId}`;

    const [dbExists] = await pool.query(
      'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
      [tenantDbName]
    );

    if (!dbExists.length) {
      return res.json({ success: true, exists: false, tables: [] });
    }

    const [tables] = await pool.query(
      'SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
      [tenantDbName]
    );

    res.json({
      success: true,
      exists: true,
      database: tenantDbName,
      tables: tables.map(t => ({ table: t.TABLE_NAME, rows: t.TABLE_ROWS || 0 })),
    });
  } catch (err) {
    console.error('[Church Decom] Records list error:', err);
    res.status(500).json({ success: false, error: 'Failed to list records' });
  }
});

router.get('/:churchId/export/:tableName', requireAuth, requireRole(SUPER_ADMIN), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const { tableName } = req.params;
    if (isNaN(churchId)) return res.status(400).json({ success: false, error: 'Invalid church ID' });

    const pool = getAppPool();
    const tenantDbName = `om_church_${churchId}`;

    // Validate table exists in tenant DB (prevent SQL injection)
    const [validTables] = await pool.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      [tenantDbName, tableName]
    );
    if (!validTables.length) {
      return res.status(404).json({ success: false, error: 'Table not found in tenant database' });
    }

    // Query all rows
    const [rows] = await pool.query(`SELECT * FROM \`${tenantDbName}\`.\`${tableName}\``);

    if (!rows.length) {
      return res.status(200).json({ success: true, message: 'Table is empty' });
    }

    // Build CSV
    const columns = Object.keys(rows[0]);
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [columns.join(',')];
    for (const row of rows) {
      csvLines.push(columns.map(col => escapeCsv(row[col])).join(','));
    }

    const csv = csvLines.join('\n');
    const filename = `church_${churchId}_${tableName}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('[Church Decom] Export error:', err);
    res.status(500).json({ success: false, error: 'Failed to export table' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CLEANUP — Remove platform DB references
// ═══════════════════════════════════════════════════════════════

router.post('/:churchId/cleanup', requireAuth, requireRole(SUPER_ADMIN), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) return res.status(400).json({ success: false, error: 'Invalid church ID' });

    const pool = getAppPool();

    // Discover all tables referencing churches via FK
    const [fkTables] = await pool.query(`
      SELECT DISTINCT kcu.TABLE_NAME, kcu.COLUMN_NAME,
        (SELECT GROUP_CONCAT(DISTINCT kcu2.TABLE_NAME)
         FROM information_schema.KEY_COLUMN_USAGE kcu2
         WHERE kcu2.REFERENCED_TABLE_NAME = kcu.TABLE_NAME
           AND kcu2.TABLE_SCHEMA = 'orthodoxmetrics_db') AS dependents
      FROM information_schema.KEY_COLUMN_USAGE kcu
      WHERE kcu.REFERENCED_TABLE_NAME = 'churches'
        AND kcu.REFERENCED_COLUMN_NAME = 'id'
        AND kcu.TABLE_SCHEMA = 'orthodoxmetrics_db'
      ORDER BY kcu.TABLE_NAME
    `);

    // Build table list: tables with dependents go after their dependents
    // Simple approach: delete tables with dependents last, leaf tables first
    const withDependents = [];
    const leafTables = [];

    for (const t of fkTables) {
      if (t.dependents) {
        withDependents.push(t);
      } else {
        leafTables.push(t);
      }
    }

    const orderedTables = [...leafTables, ...withDependents];

    // Also add known non-FK tables
    const nonFkTables = [
      { TABLE_NAME: 'ocr_jobs', COLUMN_NAME: 'church_id' },
      { TABLE_NAME: 'ocr_api_daily_usage', COLUMN_NAME: 'church_id' },
      { TABLE_NAME: 'ocr_api_usage', COLUMN_NAME: 'church_id' },
      { TABLE_NAME: 'church_themes', COLUMN_NAME: 'church_id' },
      { TABLE_NAME: 'church_image_paths', COLUMN_NAME: 'church_id' },
      { TABLE_NAME: 'church_onboarding_tasks', COLUMN_NAME: 'church_id' },
      { TABLE_NAME: 'calendar_events', COLUMN_NAME: 'church_id' },
      { TABLE_NAME: 'parish_settings', COLUMN_NAME: 'church_id' },
      { TABLE_NAME: 'church_enrichment_profiles', COLUMN_NAME: 'church_id' },
    ];

    const conn = await pool.getConnection();
    const results = [];

    try {
      await conn.beginTransaction();

      // Non-FK tables first (no dependency issues)
      for (const t of nonFkTables) {
        try {
          const [result] = await conn.query(
            `DELETE FROM \`${t.TABLE_NAME}\` WHERE \`${t.COLUMN_NAME}\` = ?`, [churchId]
          );
          if (result.affectedRows > 0) {
            results.push({ table: t.TABLE_NAME, deleted: result.affectedRows });
          }
        } catch { /* table may not exist */ }
      }

      // FK tables in dependency order
      for (const t of orderedTables) {
        try {
          const [result] = await conn.query(
            `DELETE FROM \`${t.TABLE_NAME}\` WHERE \`${t.COLUMN_NAME}\` = ?`, [churchId]
          );
          if (result.affectedRows > 0) {
            results.push({ table: t.TABLE_NAME, deleted: result.affectedRows });
          }
        } catch (tableErr) {
          results.push({ table: t.TABLE_NAME, error: tableErr.message });
        }
      }

      await conn.commit();
      conn.release();

      console.log(`[Church Decom] Platform cleanup for church ${churchId}: ${results.length} tables affected`);
      res.json({ success: true, results });
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (err) {
    console.error('[Church Decom] Cleanup error:', err);
    res.status(500).json({ success: false, error: 'Failed to clean up platform references' });
  }
});

// ═══════════════════════════════════════════════════════════════
// FINALIZE — Delete church row + optionally DROP tenant DB
// ═══════════════════════════════════════════════════════════════

router.delete('/:churchId/finalize', requireAuth, requireRole(SUPER_ADMIN), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) return res.status(400).json({ success: false, error: 'Invalid church ID' });

    const { dropDatabase, confirmName } = req.body;

    const pool = getAppPool();

    // Verify church exists and get name for confirmation
    const [churches] = await pool.query('SELECT id, name FROM churches WHERE id = ?', [churchId]);
    if (!churches.length) return res.status(404).json({ success: false, error: 'Church not found' });

    // Require name confirmation
    if (confirmName !== churches[0].name) {
      return res.status(400).json({ success: false, error: 'Church name confirmation does not match' });
    }

    // Safety check: verify no FK references remain
    const [fkCheck] = await pool.query(`
      SELECT TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_NAME = 'churches'
        AND REFERENCED_COLUMN_NAME = 'id'
        AND TABLE_SCHEMA = 'orthodoxmetrics_db'
    `);

    for (const t of fkCheck) {
      try {
        const col = t.TABLE_NAME.includes('parish') ? 'parish_id' : 'church_id';
        const [cnt] = await pool.query(
          `SELECT COUNT(*) as c FROM \`${t.TABLE_NAME}\` WHERE \`${col}\` = ?`, [churchId]
        );
        if (cnt[0].c > 0) {
          return res.status(400).json({
            success: false,
            error: `Cannot finalize: ${t.TABLE_NAME} still has ${cnt[0].c} rows referencing this church. Run cleanup first.`,
          });
        }
      } catch { /* skip tables where column doesn't match */ }
    }

    // Also unlink CRM lead if any
    await pool.query(
      'UPDATE omai_crm_leads SET provisioned_church_id = NULL WHERE provisioned_church_id = ?',
      [churchId]
    );

    // Delete church row
    await pool.query('DELETE FROM churches WHERE id = ?', [churchId]);
    console.log(`[Church Decom] Church ${churchId} (${churches[0].name}) deleted from churches table`);

    // Optionally drop tenant DB
    let dbDropped = false;
    if (dropDatabase) {
      const tenantDbName = `om_church_${churchId}`;
      const [dbExists] = await pool.query(
        'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
        [tenantDbName]
      );
      if (dbExists.length > 0) {
        await pool.query(`DROP DATABASE \`${tenantDbName}\``);
        dbDropped = true;
        console.log(`[Church Decom] Dropped tenant DB: ${tenantDbName}`);
      }
    }

    res.json({
      success: true,
      message: `Church "${churches[0].name}" (ID: ${churchId}) has been fully decommissioned`,
      dbDropped,
    });
  } catch (err) {
    console.error('[Church Decom] Finalize error:', err);
    res.status(500).json({ success: false, error: 'Failed to finalize decommission' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ORPHAN AUDIT — Find incomplete decommissions and orphaned data
// ═══════════════════════════════════════════════════════════════

router.get('/audit/orphans', requireAuth, requireRole(SUPER_ADMIN), async (req, res) => {
  try {
    const pool = getAppPool();

    // 1. Orphaned tenant DBs — om_church_## databases with no matching churches row
    const [allTenantDbs] = await pool.query(
      "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'om\\_church\\_%'"
    );

    const orphanedDbs = [];
    for (const db of allTenantDbs) {
      const idMatch = db.SCHEMA_NAME.match(/^om_church_(\d+)$/);
      if (!idMatch) continue;
      const churchId = parseInt(idMatch[1]);

      const [exists] = await pool.query('SELECT id, name FROM churches WHERE id = ?', [churchId]);

      if (exists.length === 0) {
        // Orphaned — get table details
        const [tables] = await pool.query(
          'SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
          [db.SCHEMA_NAME]
        );

        let totalRows = 0;
        const tableDetails = tables.map(t => {
          const rows = t.TABLE_ROWS || 0;
          totalRows += rows;
          return { table: t.TABLE_NAME, rows };
        });

        orphanedDbs.push({
          database: db.SCHEMA_NAME,
          churchId,
          tableCount: tables.length,
          totalRows,
          tables: tableDetails,
        });
      }
    }

    // 2. Orphaned platform references — church_id values in key tables with no churches row
    const checkTables = [
      { table: 'users', column: 'church_id' },
      { table: 'church_users', column: 'church_id' },
      { table: 'church_registration_tokens', column: 'church_id' },
    ];

    const orphanedRefs = [];
    for (const t of checkTables) {
      try {
        const [rows] = await pool.query(
          `SELECT DISTINCT t.\`${t.column}\` as church_id, COUNT(*) as count
           FROM \`${t.table}\` t
           LEFT JOIN churches c ON c.id = t.\`${t.column}\`
           WHERE c.id IS NULL AND t.\`${t.column}\` IS NOT NULL
           GROUP BY t.\`${t.column}\``,
        );
        for (const r of rows) {
          orphanedRefs.push({ table: t.table, churchId: r.church_id, rows: r.count });
        }
      } catch { /* table may not exist */ }
    }

    // 3. CRM leads pointing to deleted churches
    const [orphanedCrm] = await pool.query(
      `SELECT cl.id, cl.name, cl.provisioned_church_id
       FROM omai_crm_leads cl
       LEFT JOIN churches c ON c.id = cl.provisioned_church_id
       WHERE cl.provisioned_church_id IS NOT NULL AND c.id IS NULL`
    );

    res.json({
      success: true,
      orphanedDatabases: orphanedDbs,
      orphanedPlatformRefs: orphanedRefs,
      orphanedCrmLinks: orphanedCrm,
      summary: {
        orphanedDbCount: orphanedDbs.length,
        orphanedRefCount: orphanedRefs.length,
        orphanedCrmCount: orphanedCrm.length,
        totalIssues: orphanedDbs.length + orphanedRefs.length + orphanedCrm.length,
      },
    });
  } catch (err) {
    console.error('[Church Decom] Orphan audit error:', err);
    res.status(500).json({ success: false, error: 'Failed to run orphan audit' });
  }
});

// DROP an orphaned tenant DB (no church row required)
router.delete('/audit/orphan-db/:dbName', requireAuth, requireRole(SUPER_ADMIN), async (req, res) => {
  try {
    const { dbName } = req.params;
    const { confirmName } = req.body;

    // Validate it's an om_church_## database
    if (!/^om_church_\d+$/.test(dbName)) {
      return res.status(400).json({ success: false, error: 'Invalid tenant database name' });
    }

    if (confirmName !== dbName) {
      return res.status(400).json({ success: false, error: 'Database name confirmation does not match' });
    }

    const pool = getAppPool();

    // Verify DB exists
    const [dbExists] = await pool.query(
      'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [dbName]
    );
    if (!dbExists.length) {
      return res.status(404).json({ success: false, error: 'Database not found' });
    }

    // Verify it's truly orphaned (no churches row)
    const idMatch = dbName.match(/^om_church_(\d+)$/);
    const churchId = parseInt(idMatch[1]);
    const [churchExists] = await pool.query('SELECT id FROM churches WHERE id = ?', [churchId]);
    if (churchExists.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Church ${churchId} still exists in the churches table. Use the full decom wizard instead.`,
      });
    }

    await pool.query(`DROP DATABASE \`${dbName}\``);
    console.log(`[Church Decom] Dropped orphaned tenant DB: ${dbName}`);

    res.json({ success: true, message: `Dropped orphaned database: ${dbName}` });
  } catch (err) {
    console.error('[Church Decom] Orphan DB drop error:', err);
    res.status(500).json({ success: false, error: 'Failed to drop orphaned database' });
  }
});

// Export a table from an orphaned tenant DB
router.get('/audit/orphan-db/:dbName/export/:tableName', requireAuth, requireRole(SUPER_ADMIN), async (req, res) => {
  try {
    const { dbName, tableName } = req.params;

    if (!/^om_church_\d+$/.test(dbName)) {
      return res.status(400).json({ success: false, error: 'Invalid tenant database name' });
    }

    const pool = getAppPool();

    // Validate table exists
    const [validTables] = await pool.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      [dbName, tableName]
    );
    if (!validTables.length) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    const [rows] = await pool.query(`SELECT * FROM \`${dbName}\`.\`${tableName}\``);
    if (!rows.length) {
      return res.status(200).json({ success: true, message: 'Table is empty' });
    }

    const columns = Object.keys(rows[0]);
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [columns.join(',')];
    for (const row of rows) {
      csvLines.push(columns.map(col => escapeCsv(row[col])).join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${dbName}_${tableName}.csv"`);
    res.send(csvLines.join('\n'));
  } catch (err) {
    console.error('[Church Decom] Orphan export error:', err);
    res.status(500).json({ success: false, error: 'Failed to export table' });
  }
});

module.exports = router;
