// server/routes/admin/records-inspector.js - Dynamic Records Inspector API
const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth');

const requireAdmin = requireRole(['admin', 'super_admin']);

function apiResponse(success, data = null, error = null) {
    const response = { success };
    if (data) response.data = data;
    if (error) response.error = error;
    return response;
}

const RECORD_TABLES = ['baptism_records', 'marriage_records', 'funeral_records'];

// GET /api/admin/records-inspector/churches — lightweight church list for dropdown
router.get('/churches', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [churches] = await promisePool.query(
            'SELECT id, name, church_name, database_name FROM churches WHERE is_active = 1 ORDER BY church_name, name'
        );
        res.json(apiResponse(true, { churches }));
    } catch (error) {
        console.error('❌ Error listing churches for inspector:', error);
        res.status(500).json(apiResponse(false, null, error.message));
    }
});

// GET /api/admin/records-inspector/summary — aggregate counts by type/church
router.get('/summary', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { type = 'all', church_id = 'all' } = req.query;

        // Get active churches
        let churchQuery = 'SELECT id, name, church_name, database_name FROM churches WHERE is_active = 1';
        const churchParams = [];
        if (church_id !== 'all') {
            churchQuery += ' AND id = ?';
            churchParams.push(parseInt(church_id));
        }
        const [churches] = await promisePool.query(churchQuery, churchParams);

        const tablesToQuery = type === 'all'
            ? RECORD_TABLES
            : [`${type}_records`];

        let totalRecords = 0;
        const byType = { baptism: 0, marriage: 0, funeral: 0 };
        const byChurch = {};
        const recentActivity = [];

        // Query each church in parallel
        await Promise.allSettled(churches.map(async (church) => {
            const dbName = church.database_name;
            if (!dbName) return;

            const churchName = church.church_name || church.name;
            byChurch[church.id] = { name: churchName, counts: {} };

            for (const tableName of tablesToQuery) {
                try {
                    const [rows] = await promisePool.query(
                        `SELECT COUNT(*) as cnt FROM \`${dbName}\`.\`${tableName}\``
                    );
                    const count = rows[0].cnt;
                    const recordType = tableName.replace('_records', '');
                    byType[recordType] = (byType[recordType] || 0) + count;
                    byChurch[church.id].counts[recordType] = count;
                    totalRecords += count;

                    // Get recent activity (last 3 per type per church)
                    const [recent] = await promisePool.query(
                        `SELECT id, created_at FROM \`${dbName}\`.\`${tableName}\` ORDER BY created_at DESC LIMIT 3`
                    );
                    recent.forEach(r => recentActivity.push({
                        church_id: church.id,
                        church_name: churchName,
                        type: recordType,
                        record_id: r.id,
                        created_at: r.created_at
                    }));
                } catch {
                    // Table may not exist in this church DB — skip
                }
            }
        }));

        recentActivity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json(apiResponse(true, {
            totalRecords,
            byType,
            byChurch,
            recentActivity: recentActivity.slice(0, 15)
        }));
    } catch (error) {
        console.error('❌ Error fetching inspector summary:', error);
        res.status(500).json(apiResponse(false, null, error.message));
    }
});

// GET /api/admin/records-inspector/records — paginated records with search
router.get('/records', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { type = 'all', church_id = 'all', search = '', page = '1', limit = '50' } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Get target churches
        let churchQuery = 'SELECT id, name, church_name, database_name FROM churches WHERE is_active = 1';
        const churchParams = [];
        if (church_id !== 'all') {
            churchQuery += ' AND id = ?';
            churchParams.push(parseInt(church_id));
        }
        const [churches] = await promisePool.query(churchQuery, churchParams);

        const tablesToQuery = type === 'all'
            ? RECORD_TABLES
            : [`${type}_records`];

        // Collect all records
        const allRecords = [];

        await Promise.allSettled(churches.map(async (church) => {
            const dbName = church.database_name;
            if (!dbName) return;

            const churchName = church.church_name || church.name;

            for (const tableName of tablesToQuery) {
                try {
                    const recordType = tableName.replace('_records', '');

                    // Build search condition based on record type
                    let searchCondition = '';
                    const queryParams = [];

                    if (search) {
                        const searchFields = {
                            baptism: ['first_name', 'last_name'],
                            marriage: ['fname_groom', 'lname_groom', 'fname_bride', 'lname_bride'],
                            funeral: ['name', 'lastname']
                        };
                        const fields = searchFields[recordType] || ['id'];
                        const conditions = fields.map(f => `\`${f}\` LIKE ?`);
                        searchCondition = `WHERE (${conditions.join(' OR ')})`;
                        fields.forEach(() => queryParams.push(`%${search}%`));
                    }

                    const [rows] = await promisePool.query(
                        `SELECT id, created_at FROM \`${dbName}\`.\`${tableName}\` ${searchCondition} ORDER BY created_at DESC LIMIT 500`,
                        queryParams
                    );

                    rows.forEach(r => allRecords.push({
                        id: r.id,
                        type: recordType,
                        churchId: church.id,
                        churchName,
                        createdAt: r.created_at
                    }));
                } catch {
                    // Table may not exist — skip
                }
            }
        }));

        // Sort by date descending
        allRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const totalCount = allRecords.length;
        const paginatedRecords = allRecords.slice(offset, offset + limitNum);

        res.json(apiResponse(true, {
            records: paginatedRecords,
            totalCount,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalCount / limitNum)
        }));
    } catch (error) {
        console.error('❌ Error fetching inspector records:', error);
        res.status(500).json(apiResponse(false, null, error.message));
    }
});

// POST /api/admin/records-inspector/provision-church — create a new test church with record tables
router.post('/provision-church', requireAuth, requireAdmin, async (req, res) => {
    const mysql = require('mysql2/promise');
    const { name, email } = req.body;
    if (!name) return res.status(400).json(apiResponse(false, null, 'name is required'));

    // Generate safe database name
    const dbSuffix = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').substring(0, 40);

    let connection;
    try {
        // Find next church ID from the churches table
        const [maxRow] = await promisePool.query('SELECT MAX(id) AS maxId FROM churches');
        const nextId = (maxRow[0].maxId || 50) + 1;
        const dbName = `om_church_${nextId}`;
        const churchIdStr = `PROV_${nextId}`;

        // Create database using a direct connection (needs multipleStatements for schema creation)
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true,
        });

        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.execute(`USE \`${dbName}\``);

        // Create the 3 core record tables
        await connection.query(`
            CREATE TABLE IF NOT EXISTS baptism_records (
                id INT NOT NULL AUTO_INCREMENT,
                source_scan_id VARCHAR(255) DEFAULT NULL,
                first_name VARCHAR(100) DEFAULT NULL,
                last_name VARCHAR(100) DEFAULT NULL,
                birth_date DATE DEFAULT NULL,
                reception_date DATE DEFAULT NULL,
                birthplace VARCHAR(150) DEFAULT NULL,
                entry_type VARCHAR(50) NOT NULL DEFAULT 'Baptism',
                sponsors TEXT DEFAULT NULL,
                parents TEXT DEFAULT NULL,
                clergy VARCHAR(150) DEFAULT NULL,
                church_id INT NOT NULL DEFAULT ${nextId},
                ocr_confidence DECIMAL(5,2) DEFAULT 0.00,
                verified_by INT DEFAULT NULL,
                verified_at DATETIME DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_church_id (church_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

            CREATE TABLE IF NOT EXISTS marriage_records (
                id INT NOT NULL AUTO_INCREMENT,
                mdate DATE DEFAULT NULL,
                fname_groom VARCHAR(100) DEFAULT NULL,
                lname_groom VARCHAR(100) DEFAULT NULL,
                parentsg VARCHAR(200) DEFAULT NULL,
                fname_bride VARCHAR(100) DEFAULT NULL,
                lname_bride VARCHAR(100) DEFAULT NULL,
                parentsb VARCHAR(200) DEFAULT NULL,
                witness TEXT DEFAULT NULL,
                mlicense TEXT DEFAULT NULL,
                clergy VARCHAR(150) DEFAULT NULL,
                church_id INT NOT NULL DEFAULT ${nextId},
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_church_id (church_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

            CREATE TABLE IF NOT EXISTS funeral_records (
                id INT NOT NULL AUTO_INCREMENT,
                deceased_date DATE DEFAULT NULL,
                burial_date DATE DEFAULT NULL,
                name VARCHAR(100) DEFAULT NULL,
                lastname VARCHAR(100) DEFAULT NULL,
                age INT DEFAULT NULL,
                clergy VARCHAR(150) DEFAULT NULL,
                burial_location TEXT DEFAULT NULL,
                church_id INT NOT NULL DEFAULT ${nextId},
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_church_id (church_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);

        // Register in global churches table
        await promisePool.query(
            `INSERT INTO churches (name, church_name, email, database_name, is_active) VALUES (?, ?, ?, ?, 1)`,
            [name, name, email || `admin@${dbSuffix}.test`, dbName]
        );

        // Get the auto-incremented id
        const [inserted] = await promisePool.query('SELECT id, database_name FROM churches WHERE database_name = ?', [dbName]);

        console.log(`✅ Provisioned test church: ${name} → ${dbName} (id=${inserted[0]?.id})`);
        res.json(apiResponse(true, {
            church_id: inserted[0]?.id,
            name,
            database_name: dbName,
            tables: ['baptism_records', 'marriage_records', 'funeral_records'],
        }));
    } catch (error) {
        console.error('❌ Error provisioning church:', error);
        res.status(500).json(apiResponse(false, null, error.message));
    } finally {
        if (connection) await connection.end();
    }
});

module.exports = router;
