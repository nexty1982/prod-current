const express = require('express');
const { getAppPool } = require('../config/db-compat');
const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// CHURCH INFO ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Get church information
router.get('/church-info', async (req, res) => {
    try {
        // Use church_id from session or throw error if not available
        const churchId = req.session?.user?.church_id;
        if(!churchId) {
            return res.status(400).json({ error: 'Church ID not found in session' });
        }

        const [rows] = await getAppPool().query(`
            SELECT 
                id, church_name AS name, email, phone, address, city, state_province, postal_code, 
                country, website, preferred_language, timezone, currency, tax_id, 
                description_multilang, settings, is_active, database_name, created_at, updated_at
            FROM churches WHERE id = ?`, [churchId]);

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
        const churchId = req.session?.user?.church_id;
        if (!churchId) {
            return res.status(400).json({ error: 'Church ID not found in session' });
        }

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

        const [records] = await getAppPool().query(query, params);
        const [countResult] = await getAppPool().query(countQuery, search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : []);

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

        const [result] = await getAppPool().query(`
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

        const [records] = await getAppPool().query(query, params);
        const [countResult] = await getAppPool().query(countQuery, search ?
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

        const [result] = await getAppPool().query(`
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

        const [records] = await getAppPool().query(
            'SELECT * FROM funeral_records ORDER BY death_date DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );

        const [countResult] = await getAppPool().query('SELECT COUNT(*) as total FROM funeral_records');

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
        const [baptismCount] = await getAppPool().query('SELECT COUNT(*) as count FROM baptism_records');
        const [marriageCount] = await getAppPool().query('SELECT COUNT(*) as count FROM marriage_records');
        const [funeralCount] = await getAppPool().query('SELECT COUNT(*) as count FROM funeral_records');
        const [cemeteryCount] = await getAppPool().query('SELECT COUNT(*) as count FROM cemetery_records');

        // Recent activity
        const [recentBaptisms] = await getAppPool().query(
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
// CLERGY DROPDOWN ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Get unique clergy names for dropdowns
router.get('/clergy/:recordType', async (req, res) => {
    try {
        const { recordType } = req.params;
        const churchId = req.session?.user?.church_id;
        
        if (!churchId) {
            return res.status(400).json({ error: 'Church ID not found in session' });
        }

        let tableName;
        let clergyColumn;
        
        switch (recordType) {
            case 'baptism':
                tableName = 'baptism_records';
                clergyColumn = 'clergy';
                break;
            case 'marriage':
                tableName = 'marriage_records';
                clergyColumn = 'clergy';
                break;
            case 'funeral':
                tableName = 'funeral_records';
                clergyColumn = 'clergy';
                break;
            default:
                return res.status(400).json({ error: 'Invalid record type' });
        }

        const [rows] = await getAppPool().query(`
            SELECT DISTINCT ${clergyColumn} as clergy_name
            FROM ${tableName}
            WHERE ${clergyColumn} IS NOT NULL 
            AND ${clergyColumn} != '' 
            AND ${clergyColumn} != 'N/A'
            ORDER BY ${clergyColumn} ASC
        `);

        const clergyNames = rows.map(row => row.clergy_name).filter(name => name && name.trim());

        res.json({
            success: true,
            clergy: clergyNames,
            count: clergyNames.length
        });
    } catch (error) {
        console.error('Error fetching clergy names:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
