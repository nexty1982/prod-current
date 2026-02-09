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

module.exports = router;
