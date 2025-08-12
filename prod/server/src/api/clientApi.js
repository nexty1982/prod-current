const { getAppPool } = require('../../config/db-compat');
// routes/clientApi.js
// Client-specific API endpoints that work with individual client databases

const express = require('express');
const mysql = require('mysql2/promise');
const { promisePool } = require('../../config/db-compat'); // For platform database access

const router = express.Router();

// Middleware to establish client database connection
router.use(async (req, res, next) => {
    if (!req.clientDatabase) {
        return res.status(400).json({ error: 'Client context not initialized' });
    }

    try {
        // Create connection to client database
        req.clientDb = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: req.clientDatabase
        });

        console.log(`Connected to client database: ${req.clientDatabase}`);
        next();
    } catch (error) {
        console.error('Client database connection failed:', error);
        res.status(500).json({ error: 'Client database connection failed' });
    }
});

// ═══════════════════════════════════════════════════════════════
// CHURCH INFO ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Get church information
router.get('/church-info', async (req, res) => {
    try {
        // Get church metadata from platform database (orthodoxmetrics_db)
        // Use church_id from session or default to church ID 14 (Saints Peter and Paul)
        const churchId = req.session?.user?.church_id || 14;
        
        const [rows] = await getAppPool().query('SELECT * FROM churches WHERE id = ?', [churchId]);
        const churchInfo = rows[0] || {};

        // Add client branding from main database
        if (req.client && req.client.branding_config) {
            const branding = JSON.parse(req.client.branding_config);
            churchInfo.branding = branding;
        }

        res.json(churchInfo);
    } catch (error) {
        console.error('Error fetching church info:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update church information
router.put('/church-info', async (req, res) => {
    try {
        const { name, address, phone, email, website, primary_color, secondary_color } = req.body;
        const churchId = req.session?.user?.church_id || 14;

        await getAppPool().query(`
            UPDATE churches SET 
                name = ?, address = ?, phone = ?, email = ?, website = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, address, phone, email, website, churchId]);

        res.json({ success: true, message: 'Church information updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// BAPTISM RECORDS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Get baptism records with pagination and search
router.get('/baptism-records', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM baptism_records';
        let countQuery = 'SELECT COUNT(*) as total FROM baptism_records';
        let params = [];

        if (search) {
            const searchCondition = ` WHERE first_name LIKE ? OR last_name LIKE ? OR clergy LIKE ? OR parents LIKE ?`;
            query += searchCondition;
            countQuery += searchCondition;
            params = [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`];
        }

        query += ' ORDER BY reception_date DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [records] = await req.getAppPool().query(query, params);
        const [countResult] = await req.getAppPool().query(countQuery, search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : []);

        res.json({
            records,
            pagination: {
                page,
                limit,
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create baptism record
router.post('/baptism-records', async (req, res) => {
    try {
        const {
            first_name, last_name, birth_date, reception_date,
            birthplace, entry_type, sponsors, parents, clergy, notes
        } = req.body;

        const [result] = await req.getAppPool().query(`
            INSERT INTO baptism_records 
            (first_name, last_name, birth_date, reception_date, birthplace, 
             entry_type, sponsors, parents, clergy, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [first_name, last_name, birth_date, reception_date, birthplace,
            entry_type, sponsors, parents, clergy, notes]);

        res.json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// MARRIAGE RECORDS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Get marriage records
router.get('/marriage-records', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM marriage_records';
        let countQuery = 'SELECT COUNT(*) as total FROM marriage_records';
        let params = [];

        if (search) {
            const searchCondition = ` WHERE groom_first_name LIKE ? OR groom_last_name LIKE ? OR 
                                      bride_first_name LIKE ? OR bride_last_name LIKE ? OR clergy LIKE ?`;
            query += searchCondition;
            countQuery += searchCondition;
            params = [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`];
        }

        query += ' ORDER BY marriage_date DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [records] = await req.getAppPool().query(query, params);
        const [countResult] = await req.getAppPool().query(countQuery, search ?
            [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : []);

        res.json({
            records,
            pagination: {
                page,
                limit,
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create marriage record
router.post('/marriage-records', async (req, res) => {
    try {
        const {
            groom_first_name, groom_last_name, groom_birth_date,
            bride_first_name, bride_last_name, bride_birth_date,
            marriage_date, marriage_place, witnesses, clergy, notes
        } = req.body;

        const [result] = await req.getAppPool().query(`
            INSERT INTO marriage_records 
            (groom_first_name, groom_last_name, groom_birth_date,
             bride_first_name, bride_last_name, bride_birth_date,
             marriage_date, marriage_place, witnesses, clergy, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [groom_first_name, groom_last_name, groom_birth_date,
            bride_first_name, bride_last_name, bride_birth_date,
            marriage_date, marriage_place, witnesses, clergy, notes]);

        res.json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// FUNERAL RECORDS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Get funeral records
router.get('/funeral-records', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const [records] = await req.getAppPool().query(
            'SELECT * FROM funeral_records ORDER BY death_date DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );

        const [countResult] = await req.getAppPool().query('SELECT COUNT(*) as total FROM funeral_records');

        res.json({
            records,
            pagination: {
                page,
                limit,
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// STATISTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const [baptismCount] = await req.getAppPool().query('SELECT COUNT(*) as count FROM baptism_records');
        const [marriageCount] = await req.getAppPool().query('SELECT COUNT(*) as count FROM marriage_records');
        const [funeralCount] = await req.getAppPool().query('SELECT COUNT(*) as count FROM funeral_records');
        const [cemeteryCount] = await req.getAppPool().query('SELECT COUNT(*) as count FROM cemetery_records');

        // Recent activity
        const [recentBaptisms] = await req.getAppPool().query(
            'SELECT first_name, last_name, reception_date FROM baptism_records ORDER BY created_at DESC LIMIT 5'
        );

        res.json({
            totals: {
                baptisms: baptismCount[0].count,
                marriages: marriageCount[0].count,
                funerals: funeralCount[0].count,
                cemetery: cemeteryCount[0].count
            },
            recent: {
                baptisms: recentBaptisms
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// CLEANUP MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Clean up database connection
router.use(async (req, res, next) => {
    if (req.clientDb) {
        try {
            await req.clientDb.end();
        } catch (error) {
            console.error('Error closing client database connection:', error);
        }
    }
    next();
});

module.exports = router;
