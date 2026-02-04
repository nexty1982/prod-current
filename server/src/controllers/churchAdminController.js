//const { promisePool } = require('../config/db'); // central DB connection (orthodoxmetrics_db)controllers/churchAdminController.js
// Detects context (dist vs source) and uses appropriate path
const path = require('path');
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

let dbSwitcherModule;
if (isDist) {
    dbSwitcherModule = require('../utils/dbSwitcher');
} else {
    try {
        dbSwitcherModule = require('../utils/dbSwitcher');
    } catch (e) {
        dbSwitcherModule = require('../utils/dbSwitcher');
    }
}
const { getChurchDbConnection } = dbSwitcherModule;
const { promisePool } = require('../config/db'); // central DB connection (orthodoxmetrics_db)
const bcrypt = require('bcrypt');

/**
 * Get comprehensive church overview data
 * Fetches church metadata from central DB and church-specific data from church DB
 */
exports.getChurchOverview = async (req, res) => {
  try {
    const churchId = req.params.id;
    
    // Step 1: Lookup church metadata from central database
    const [rows] = await promisePool.query('SELECT * FROM churches WHERE id = ?', [churchId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const church = rows[0];
    
    // Step 2: Get connection to church-specific database
    const db = await getChurchDbConnection(church.database_name);

    // Step 3: Fetch data from church database
    try {
      // Church info
      const [[info]] = await db.query('SELECT * FROM church_info WHERE church_id = ?', [churchId]);
      
      // Admin users
      const [users] = await db.query("SELECT id, name, email, role FROM orthodoxmetrics_db.users WHERE role = 'admin' OR role = 'super_admin'");
      
      // Record counts
      const [[baptismCount]] = await db.query('SELECT COUNT(*) as count FROM baptism_records WHERE church_id = ?', [churchId]);
      const [[marriageCount]] = await db.query('SELECT COUNT(*) as count FROM marriage_records WHERE church_id = ?', [churchId]);
      const [[funeralCount]] = await db.query('SELECT COUNT(*) as count FROM funeral_records WHERE church_id = ?', [churchId]);
      
      // Recent activity logs
      const [logs] = await db.query('SELECT * FROM activity_log WHERE church_id = ? ORDER BY created_at DESC LIMIT 10', [churchId]);
      
      // Recent invoices
      const [invoices] = await db.query('SELECT * FROM invoice_history WHERE church_id = ? ORDER BY date DESC LIMIT 5', [churchId]);

      res.json({
        metadata: church,
        info: info || {},
        adminUsers: users || [],
        counts: {
          baptisms: baptismCount?.count || 0,
          marriages: marriageCount?.count || 0,
          funerals: funeralCount?.count || 0,
        },
        activityLog: logs || [],
        invoices: invoices || [],
      });
    } catch (dbError) {
      console.error(`Error querying church database ${church.database_name}:`, dbError);
      
      // Return basic church metadata even if church DB queries fail
      res.json({
        metadata: church,
        info: {},
        adminUsers: [],
        counts: {
          baptisms: 0,
          marriages: 0,
          funerals: 0,
        },
        activityLog: [],
        invoices: [],
        warning: 'Some church data could not be retrieved'
      });
    }
  } catch (error) {
    console.error('Error in getChurchOverview:', error);
    res.status(500).json({ 
      error: 'Failed to fetch church overview',
      details: error.message 
    });
  }
};

/**
 * Reset user password in church-specific database
 */
exports.resetUserPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    const churchId = req.params.id;

    if (!userId || !newPassword) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId and newPassword' 
      });
    }

    // Step 1: Get church database name from central database
    const [rows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    // Step 2: Get connection to church-specific database
    const db = await getChurchDbConnection(rows[0].database_name);

    // Step 3: Verify user exists in church database
    const [userCheck] = await db.query('SELECT id, name, email FROM orthodoxmetrics_db.users WHERE id = ?', [userId]);
    if (!userCheck.length) {
      return res.status(404).json({ error: 'User not found in church database' });
    }

    // Step 4: Hash new password and update
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE orthodoxmetrics_db.users SET password = ? WHERE id = ?', [hash, userId]);

    // Step 5: Log the password reset activity
    try {
      await db.query(
        'INSERT INTO activity_log (church_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, NOW())',
        [churchId, userId, 'password_reset', `Password reset for user ${userCheck[0].name} (${userCheck[0].email})`]
      );
    } catch (logError) {
      console.warn('Failed to log password reset activity:', logError);
    }

    res.json({ 
      success: true,
      message: `Password successfully reset for user ${userCheck[0].name}`
    });
  } catch (error) {
    console.error('Error in resetUserPassword:', error);
    res.status(500).json({ 
      error: 'Failed to reset password',
      details: error.message 
    });
  }
};

/**
 * Get church records by type (baptism, marriage, funeral)
 */
exports.getChurchRecords = async (req, res) => {
  try {
    const churchId = req.params.id;
    const recordType = req.params.recordType;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Validate record type
    const validTypes = ['baptism', 'marriage', 'funeral'];
    if (!validTypes.includes(recordType)) {
      return res.status(400).json({ 
        error: 'Invalid record type. Must be: baptism, marriage, or funeral' 
      });
    }

    // Get church database name
    const [rows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    // Get connection to church-specific database
    const db = await getChurchDbConnection(rows[0].database_name);

    // Build table name
    const tableName = `${recordType}_records`;

    // Get records with pagination
    const [records] = await db.query(
      `SELECT * FROM ${tableName} WHERE church_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [churchId, limit, offset]
    );

    // Get total count for pagination
    const [[countResult]] = await db.query(
      `SELECT COUNT(*) as total FROM ${tableName} WHERE church_id = ?`,
      [churchId]
    );

    res.json({
      records: records || [],
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        pages: Math.ceil((countResult?.total || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in getChurchRecords:', error);
    res.status(500).json({ 
      error: 'Failed to fetch church records',
      details: error.message 
    });
  }
};

// Update advanced config for a church
exports.updateChurchConfig = async (req, res) => {
  try {
    const churchId = req.params.id;
    const fields = [
      'records_database_name', 'avatar_dir', 'calendar_type',
      'show_fast_days', 'show_local_saints', 'feast_overrides_path', 'theme_color',
      'logo_path', 'banner_path', 'favicon_path', 'enable_certificates',
      'enable_liturgical_calendar', 'enable_invoicing', 'enable_audit_logs', 'slug', 'name'
    ];
    const updates = [];
    const values = [];
    fields.forEach(field => {
      if (field in req.body) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    });
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    values.push(churchId);
    await promisePool.query(`UPDATE churches SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update church config', details: err.message });
  }
};

// List assigned users for a church
exports.listAssignedUsers = async (req, res) => {
  try {
    const churchId = req.params.id;
    const [users] = await promisePool.query(
      `SELECT u.id, u.name, u.email, cu.role FROM church_users cu JOIN orthodoxmetrics_db.users u ON cu.user_id = u.id WHERE cu.church_id = ?`,
      [churchId]
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list assigned users', details: err.message });
  }
};

// Assign user to church
exports.assignUserToChurch = async (req, res) => {
  try {
    const churchId = req.params.id;
    const { user_id, role } = req.body;
    if (!user_id || !role) return res.status(400).json({ error: 'user_id and role required' });
    await promisePool.query(
      `INSERT INTO church_users (church_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)`,
      [churchId, user_id, role]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign user', details: err.message });
  }
};

// Remove user from church
exports.removeUserFromChurch = async (req, res) => {
  try {
    const churchId = req.params.id;
    const userId = req.params.userId;
    await promisePool.query(
      `DELETE FROM church_users WHERE church_id = ? AND user_id = ?`,
      [churchId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove user', details: err.message });
  }
};
