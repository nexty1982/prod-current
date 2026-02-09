// server/routes/admin/table-requests.js - Dynamic Table Creation Request + Approval Workflow
const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth');

const requireAdmin = requireRole(['admin', 'super_admin']);
const requireSuperAdmin = requireRole(['super_admin']);

// Try to load notification service — non-fatal if unavailable
let notificationService = null;
try {
    const notifications = require('../../api/notifications');
    notificationService = notifications.notificationService;
} catch {
    console.warn('table-requests: NotificationService not available');
}

function apiResponse(success, data = null, error = null) {
    const response = { success };
    if (data) response.data = data;
    if (error) response.error = error;
    return response;
}

// Allowlisted column types for safe table creation
const ALLOWED_TYPES = new Set([
    'INT', 'BIGINT', 'TINYINT', 'SMALLINT',
    'VARCHAR', 'TEXT', 'MEDIUMTEXT',
    'DATE', 'DATETIME', 'TIMESTAMP',
    'DECIMAL', 'FLOAT', 'DOUBLE',
    'BOOLEAN', 'JSON'
]);

const TABLE_NAME_REGEX = /^[a-z][a-z0-9_]{2,63}$/;
const COLUMN_NAME_REGEX = /^[a-z][a-z0-9_]{0,63}$/;
const DB_NAME_REGEX = /^om_church_\d+$/;

const RESERVED_WORDS = new Set([
    'select', 'insert', 'update', 'delete', 'drop', 'alter', 'create', 'table',
    'index', 'from', 'where', 'join', 'on', 'and', 'or', 'not', 'null', 'true',
    'false', 'primary', 'key', 'foreign', 'references', 'default', 'constraint',
    'database', 'schema', 'grant', 'revoke', 'user', 'group', 'order', 'by',
    'limit', 'offset', 'having', 'union', 'all', 'distinct', 'as', 'in', 'like',
    'between', 'exists', 'case', 'when', 'then', 'else', 'end', 'is', 'set'
]);

function validateColumnDef(col) {
    if (!col.name || !COLUMN_NAME_REGEX.test(col.name)) {
        return `Invalid column name: "${col.name}" (lowercase letters, numbers, underscores; must start with letter)`;
    }
    if (RESERVED_WORDS.has(col.name.toLowerCase())) {
        return `Column name "${col.name}" is a SQL reserved word`;
    }
    const baseType = (col.type || '').toUpperCase().replace(/\(.*\)/, '');
    if (!ALLOWED_TYPES.has(baseType)) {
        return `Column type "${col.type}" is not allowed. Allowed: ${Array.from(ALLOWED_TYPES).join(', ')}`;
    }
    if (baseType === 'VARCHAR' && (!col.length || col.length < 1 || col.length > 65535)) {
        return `VARCHAR requires length between 1 and 65535`;
    }
    if (baseType === 'DECIMAL') {
        if (col.precision && (col.precision < 1 || col.precision > 65)) {
            return `DECIMAL precision must be between 1 and 65`;
        }
        if (col.scale && (col.scale < 0 || col.scale > 30)) {
            return `DECIMAL scale must be between 0 and 30`;
        }
    }
    return null;
}

function generateCreateTableSQL(databaseName, tableName, columns) {
    // Validate database name
    if (!DB_NAME_REGEX.test(databaseName)) {
        return { sql: null, error: `Invalid database name: ${databaseName}` };
    }
    // Validate table name
    if (!TABLE_NAME_REGEX.test(tableName)) {
        return { sql: null, error: `Invalid table name: ${tableName}` };
    }

    const colDefs = [];

    // Auto-add id PK
    colDefs.push('  `id` INT AUTO_INCREMENT PRIMARY KEY');

    for (const col of columns) {
        const err = validateColumnDef(col);
        if (err) return { sql: null, error: err };

        const baseType = col.type.toUpperCase().replace(/\(.*\)/, '');
        let typeDef = baseType;

        if (baseType === 'VARCHAR') {
            typeDef = `VARCHAR(${col.length || 255})`;
        } else if (baseType === 'DECIMAL') {
            typeDef = `DECIMAL(${col.precision || 10},${col.scale || 2})`;
        }

        let line = `  \`${col.name}\` ${typeDef}`;
        if (col.nullable === false) line += ' NOT NULL';
        if (col.defaultValue !== undefined && col.defaultValue !== null && col.defaultValue !== '') {
            // Escape default value
            const escaped = String(col.defaultValue).replace(/'/g, "''");
            line += ` DEFAULT '${escaped}'`;
        }
        colDefs.push(line);
    }

    // Auto-add timestamps
    colDefs.push('  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP');
    colDefs.push('  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    const sql = `CREATE TABLE \`${databaseName}\`.\`${tableName}\` (\n${colDefs.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

    return { sql, error: null };
}

// POST /api/admin/table-requests — submit a new table creation request
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { church_id, table_name, display_name, columns } = req.body;
        const userId = req.session?.user?.id || req.user?.id;

        if (!church_id) return res.status(400).json(apiResponse(false, null, 'church_id is required'));
        if (!table_name) return res.status(400).json(apiResponse(false, null, 'table_name is required'));
        if (!columns || !Array.isArray(columns) || columns.length === 0) {
            return res.status(400).json(apiResponse(false, null, 'At least one column is required'));
        }

        // Validate table name
        if (!TABLE_NAME_REGEX.test(table_name)) {
            return res.status(400).json(apiResponse(false, null,
                'Table name must be lowercase letters, numbers, and underscores (2-63 chars, start with letter)'));
        }

        // Check for reserved words
        if (RESERVED_WORDS.has(table_name.toLowerCase())) {
            return res.status(400).json(apiResponse(false, null, `Table name "${table_name}" is a SQL reserved word`));
        }

        // Check for duplicate column names
        const colNames = columns.map(c => c.name);
        const dupes = colNames.filter((n, i) => colNames.indexOf(n) !== i);
        if (dupes.length > 0) {
            return res.status(400).json(apiResponse(false, null, `Duplicate column names: ${dupes.join(', ')}`));
        }

        // Validate each column
        for (const col of columns) {
            const err = validateColumnDef(col);
            if (err) return res.status(400).json(apiResponse(false, null, err));
        }

        // Validate church exists
        const [churchRows] = await promisePool.query(
            'SELECT id, database_name, church_name, name FROM churches WHERE id = ? AND is_active = 1',
            [church_id]
        );
        if (churchRows.length === 0) {
            return res.status(404).json(apiResponse(false, null, 'Church not found or inactive'));
        }

        const church = churchRows[0];
        const dbName = church.database_name;

        // Check if table already exists in church DB
        const [existing] = await promisePool.query(
            'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
            [dbName, table_name]
        );
        if (existing.length > 0) {
            return res.status(409).json(apiResponse(false, null, `Table "${table_name}" already exists in ${dbName}`));
        }

        // Generate SQL preview
        const { sql, error: sqlError } = generateCreateTableSQL(dbName, table_name, columns);
        if (sqlError) {
            return res.status(400).json(apiResponse(false, null, sqlError));
        }

        // Insert request
        const [result] = await promisePool.query(
            `INSERT INTO orthodoxmetrics_db.admin_table_requests
             (church_id, requested_by, table_name, display_name, columns_json, sql_preview, status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [church_id, userId, table_name, display_name || table_name, JSON.stringify(columns), sql]
        );

        // Notify super_admins
        if (notificationService) {
            try {
                const [superAdmins] = await promisePool.query(
                    "SELECT id FROM users WHERE role = 'super_admin' AND is_active = 1"
                );
                const churchName = church.church_name || church.name;
                for (const admin of superAdmins) {
                    await notificationService.createNotification(
                        admin.id,
                        'table_request',
                        'New Table Creation Request',
                        `A new table "${table_name}" has been requested for ${churchName}`,
                        {
                            data: { request_id: result.insertId, church_id, table_name },
                            actionUrl: '/devel-tools/table-requests',
                            actionText: 'Review Request',
                            priority: 'high'
                        }
                    );
                }
            } catch (notifErr) {
                console.warn('Failed to send table request notification:', notifErr.message);
            }
        }

        res.status(201).json(apiResponse(true, {
            id: result.insertId,
            church_id,
            table_name,
            sql_preview: sql,
            status: 'pending'
        }));
    } catch (error) {
        console.error('Error creating table request:', error);
        res.status(500).json(apiResponse(false, null, error.message));
    }
});

// GET /api/admin/table-requests — list requests
router.get('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { status, church_id } = req.query;

        let query = `
            SELECT tr.*,
                   u.username as requested_by_name, u.email as requested_by_email,
                   c.church_name, c.name as church_short_name, c.database_name,
                   r.username as reviewed_by_name
            FROM orthodoxmetrics_db.admin_table_requests tr
            LEFT JOIN users u ON tr.requested_by = u.id
            LEFT JOIN churches c ON tr.church_id = c.id
            LEFT JOIN users r ON tr.reviewed_by = r.id
        `;
        const params = [];
        const conditions = [];

        if (status) {
            conditions.push('tr.status = ?');
            params.push(status);
        }
        if (church_id) {
            conditions.push('tr.church_id = ?');
            params.push(parseInt(church_id));
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY tr.created_at DESC';

        const [requests] = await promisePool.query(query, params);

        // Parse columns_json
        requests.forEach(r => {
            if (r.columns_json && typeof r.columns_json === 'string') {
                try { r.columns_json = JSON.parse(r.columns_json); } catch { /* keep as string */ }
            }
        });

        res.json(apiResponse(true, { requests }));
    } catch (error) {
        console.error('Error listing table requests:', error);
        res.status(500).json(apiResponse(false, null, error.message));
    }
});

// GET /api/admin/table-requests/:id — get single request
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            `SELECT tr.*,
                    u.username as requested_by_name,
                    c.church_name, c.name as church_short_name, c.database_name,
                    r.username as reviewed_by_name
             FROM orthodoxmetrics_db.admin_table_requests tr
             LEFT JOIN users u ON tr.requested_by = u.id
             LEFT JOIN churches c ON tr.church_id = c.id
             LEFT JOIN users r ON tr.reviewed_by = r.id
             WHERE tr.id = ?`,
            [parseInt(req.params.id)]
        );

        if (rows.length === 0) {
            return res.status(404).json(apiResponse(false, null, 'Request not found'));
        }

        const request = rows[0];
        if (request.columns_json && typeof request.columns_json === 'string') {
            try { request.columns_json = JSON.parse(request.columns_json); } catch { /* keep */ }
        }

        res.json(apiResponse(true, { request }));
    } catch (error) {
        console.error('Error getting table request:', error);
        res.status(500).json(apiResponse(false, null, error.message));
    }
});

// POST /api/admin/table-requests/:id/approve — approve + execute
router.post('/:id/approve', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const reviewerId = req.session?.user?.id || req.user?.id;
        const { notes } = req.body;

        // Load request
        const [rows] = await promisePool.query(
            'SELECT * FROM orthodoxmetrics_db.admin_table_requests WHERE id = ? AND status = ?',
            [requestId, 'pending']
        );
        if (rows.length === 0) {
            return res.status(404).json(apiResponse(false, null, 'Request not found or not in pending status'));
        }

        const request = rows[0];

        // Verify church still exists
        const [churchRows] = await promisePool.query(
            'SELECT id, database_name, church_name, name FROM churches WHERE id = ? AND is_active = 1',
            [request.church_id]
        );
        if (churchRows.length === 0) {
            await promisePool.query(
                'UPDATE orthodoxmetrics_db.admin_table_requests SET status = ?, error_message = ?, reviewed_by = ?, review_notes = ? WHERE id = ?',
                ['failed', 'Church no longer exists or is inactive', reviewerId, notes, requestId]
            );
            return res.status(400).json(apiResponse(false, null, 'Church no longer exists or is inactive'));
        }

        const dbName = churchRows[0].database_name;

        // Check table doesn't already exist
        const [existing] = await promisePool.query(
            'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
            [dbName, request.table_name]
        );
        if (existing.length > 0) {
            await promisePool.query(
                'UPDATE orthodoxmetrics_db.admin_table_requests SET status = ?, error_message = ?, reviewed_by = ?, review_notes = ? WHERE id = ?',
                ['failed', `Table "${request.table_name}" already exists`, reviewerId, notes, requestId]
            );
            return res.status(409).json(apiResponse(false, null, `Table "${request.table_name}" already exists in ${dbName}`));
        }

        // Execute the SQL
        try {
            await promisePool.query(request.sql_preview);

            // Mark as executed
            await promisePool.query(
                `UPDATE orthodoxmetrics_db.admin_table_requests
                 SET status = 'executed', reviewed_by = ?, review_notes = ?, executed_at = NOW()
                 WHERE id = ?`,
                [reviewerId, notes, requestId]
            );

            // Notify requester
            if (notificationService) {
                try {
                    const churchName = churchRows[0].church_name || churchRows[0].name;
                    await notificationService.createNotification(
                        request.requested_by,
                        'table_request_approved',
                        'Table Request Approved',
                        `Your table "${request.table_name}" has been created in ${churchName}`,
                        {
                            data: { request_id: requestId, table_name: request.table_name },
                            priority: 'normal'
                        }
                    );
                } catch (notifErr) {
                    console.warn('Failed to send approval notification:', notifErr.message);
                }
            }

            res.json(apiResponse(true, {
                request_id: requestId,
                table_name: request.table_name,
                database_name: dbName,
                status: 'executed'
            }));
        } catch (execError) {
            // Mark as failed
            await promisePool.query(
                `UPDATE orthodoxmetrics_db.admin_table_requests
                 SET status = 'failed', reviewed_by = ?, review_notes = ?, error_message = ?
                 WHERE id = ?`,
                [reviewerId, notes, execError.message, requestId]
            );

            console.error('Table creation failed:', execError);
            res.status(500).json(apiResponse(false, null, `Table creation failed: ${execError.message}`));
        }
    } catch (error) {
        console.error('Error approving table request:', error);
        res.status(500).json(apiResponse(false, null, error.message));
    }
});

// POST /api/admin/table-requests/:id/reject — reject with reason
router.post('/:id/reject', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const reviewerId = req.session?.user?.id || req.user?.id;
        const { notes } = req.body;

        if (!notes || !notes.trim()) {
            return res.status(400).json(apiResponse(false, null, 'Rejection reason is required'));
        }

        const [rows] = await promisePool.query(
            'SELECT * FROM orthodoxmetrics_db.admin_table_requests WHERE id = ? AND status = ?',
            [requestId, 'pending']
        );
        if (rows.length === 0) {
            return res.status(404).json(apiResponse(false, null, 'Request not found or not in pending status'));
        }

        const request = rows[0];

        await promisePool.query(
            `UPDATE orthodoxmetrics_db.admin_table_requests
             SET status = 'rejected', reviewed_by = ?, review_notes = ?
             WHERE id = ?`,
            [reviewerId, notes, requestId]
        );

        // Notify requester
        if (notificationService) {
            try {
                await notificationService.createNotification(
                    request.requested_by,
                    'table_request_rejected',
                    'Table Request Rejected',
                    `Your table request "${request.table_name}" was rejected: ${notes}`,
                    {
                        data: { request_id: requestId, table_name: request.table_name, reason: notes },
                        priority: 'normal'
                    }
                );
            } catch (notifErr) {
                console.warn('Failed to send rejection notification:', notifErr.message);
            }
        }

        res.json(apiResponse(true, {
            request_id: requestId,
            status: 'rejected',
            review_notes: notes
        }));
    } catch (error) {
        console.error('Error rejecting table request:', error);
        res.status(500).json(apiResponse(false, null, error.message));
    }
});

module.exports = router;
