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
// SEARCH HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Build multi-token search condition.
 * Each space-separated token must match at least one searchable column (AND logic).
 * All parameters are safely escaped via prepared statements.
 */
function buildSearchCondition(searchStr, columns) {
    if (!searchStr || !searchStr.trim()) return { condition: '', params: [] };
    const tokens = searchStr.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return { condition: '', params: [] };

    const tokenConditions = tokens.map(() => {
        const colConds = columns.map(col => `${col} LIKE ?`);
        return `(${colConds.join(' OR ')})`;
    });

    const params = tokens.flatMap(token =>
        columns.map(() => `%${token}%`)
    );

    return {
        condition: tokenConditions.join(' AND '),
        params
    };
}

// ═══════════════════════════════════════════════════════════════
// SQL RELEVANCE ORDERING HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Build a SQL expression for relevance-based ORDER BY.
 * Produces CASE WHEN clauses that score: exact > starts-with > contains,
 * weighted by column importance. This ensures pagination returns best matches first.
 * Column names come from hardcoded weights (safe); token values are parameterized.
 */
function buildRelevanceOrder(searchStr, columnWeights) {
    if (!searchStr || !searchStr.trim()) return { orderExpr: '', params: [] };
    const tokens = searchStr.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return { orderExpr: '', params: [] };

    const cases = [];
    const params = [];

    for (const [col, weight] of Object.entries(columnWeights)) {
        for (const token of tokens) {
            // Exact match (3x weight)
            cases.push(`CASE WHEN LOWER(COALESCE(${col},'')) = LOWER(?) THEN ${Math.round(weight * 3)} ELSE 0 END`);
            params.push(token);
            // Starts-with (2x weight)
            cases.push(`CASE WHEN LOWER(COALESCE(${col},'')) LIKE LOWER(?) THEN ${Math.round(weight * 2)} ELSE 0 END`);
            params.push(`${token}%`);
            // Contains (1x weight)
            cases.push(`CASE WHEN LOWER(COALESCE(${col},'')) LIKE LOWER(?) THEN ${weight} ELSE 0 END`);
            params.push(`%${token}%`);
        }
    }

    return { orderExpr: `(${cases.join(' + ')})`, params };
}

// ═══════════════════════════════════════════════════════════════
// MATCH SCORING HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Compute match scores for records against a search string.
 * columnWeights = { column_name: weight, ... }
 * Returns records with _matchScore, _matchedFields, and _matchSummary appended.
 * Scoring: exact > starts-with > contains, with multi-field bonus.
 */
function computeMatchScores(records, searchStr, columnWeights, secondarySortField, secondarySortDir) {
    if (!searchStr || !searchStr.trim() || !records.length) return records;
    const tokens = searchStr.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return records;

    const friendlyNames = {
        last_name: 'Last Name', first_name: 'First Name', parents: 'Parents',
        clergy: 'Clergy', sponsors: 'Godparents', notes: 'Notes',
        birthplace: 'Birthplace', entry_type: 'Entry Type',
        groom_last_name: 'Groom Last Name', groom_first_name: 'Groom First Name',
        bride_last_name: 'Bride Last Name', bride_first_name: 'Bride First Name',
        witnesses: 'Witnesses', lastname: 'Last Name', name: 'First Name',
        burial_location: 'Burial Location'
    };

    const scored = records.map(record => {
        const matchedFields = [];
        let score = 0;
        for (const [col, weight] of Object.entries(columnWeights)) {
            const val = (record[col] || '').toString().toLowerCase();
            if (!val) continue;
            let colScore = 0;
            for (const t of tokens) {
                if (val === t) {
                    colScore += weight * 3;          // exact
                } else if (val.startsWith(t)) {
                    colScore += weight * 2;          // starts-with
                } else if (val.includes(t)) {
                    colScore += weight;              // contains
                }
            }
            if (colScore > 0) {
                matchedFields.push(col);
                score += colScore;
            }
        }
        // Multi-field bonus
        if (matchedFields.length > 1) {
            score += (matchedFields.length - 1) * 50;
        }
        const summary = matchedFields.length
            ? `Matched in: ${matchedFields.map(f => friendlyNames[f] || f).join(', ')}`
            : '';
        return { ...record, _matchScore: score, _matchedFields: matchedFields, _matchSummary: summary };
    });

    return scored;
}

// ═══════════════════════════════════════════════════════════════
// BAPTISM RECORDS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Get baptism records with pagination and search
router.get('/baptism-records', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || req.query.q || '';
        const churchId = req.query.church_id;
        const sortField = req.query.sortField || 'reception_date';
        const sortDirection = (req.query.sortDirection || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const offset = (page - 1) * limit;

        const validSortCols = ['reception_date', 'first_name', 'last_name', 'clergy', 'created_at', 'updated_at', 'id'];
        const safeSort = validSortCols.includes(sortField) ? sortField : 'reception_date';

        const conditions = [];
        let params = [];

        if (churchId && churchId !== '0') {
            conditions.push('church_id = ?');
            params.push(churchId);
        }

        const searchCols = ['first_name', 'last_name', 'clergy', 'parents', 'sponsors', 'notes', 'birthplace', 'entry_type'];
        const { condition: searchCond, params: searchParams } = buildSearchCondition(search, searchCols);
        if (searchCond) {
            conditions.push(searchCond);
            params = params.concat(searchParams);
        }

        const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

        const countParams = [...params];
        const [countResult] = await getAppPool().query(
            `SELECT COUNT(*) as total FROM baptism_records${whereClause}`, countParams
        );
        const total = countResult[0].total;

        const baptismWeights = { last_name: 100, first_name: 80, parents: 70, clergy: 50, sponsors: 40, notes: 20, birthplace: 20, entry_type: 20 };

        // When searching, order by relevance first so pagination returns best matches
        let orderClause;
        if (search) {
            const { orderExpr, params: relParams } = buildRelevanceOrder(search, baptismWeights);
            params = params.concat(relParams);
            orderClause = `${orderExpr} DESC, ${safeSort} ${sortDirection}`;
        } else {
            orderClause = `${safeSort} ${sortDirection}`;
        }

        params.push(limit, offset);
        const [records] = await getAppPool().query(
            `SELECT * FROM baptism_records${whereClause} ORDER BY ${orderClause} LIMIT ? OFFSET ?`, params
        );

        const scored = search ? computeMatchScores(records, search, baptismWeights, safeSort, sortDirection) : records;

        res.json({
            records: scored,
            totalRecords: total,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
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
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || req.query.q || '';
        const churchId = req.query.church_id;
        const sortField = req.query.sortField || 'marriage_date';
        const sortDirection = (req.query.sortDirection || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const offset = (page - 1) * limit;

        const validSortCols = ['marriage_date', 'groom_first_name', 'groom_last_name', 'bride_first_name', 'bride_last_name', 'clergy', 'created_at', 'updated_at', 'id'];
        const safeSort = validSortCols.includes(sortField) ? sortField : 'marriage_date';

        const conditions = [];
        let params = [];

        if (churchId && churchId !== '0') {
            conditions.push('church_id = ?');
            params.push(churchId);
        }

        const searchCols = ['groom_first_name', 'groom_last_name', 'bride_first_name', 'bride_last_name', 'clergy', 'witnesses', 'notes'];
        const { condition: searchCond, params: searchParams } = buildSearchCondition(search, searchCols);
        if (searchCond) {
            conditions.push(searchCond);
            params = params.concat(searchParams);
        }

        const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

        const countParams = [...params];
        const [countResult] = await getAppPool().query(
            `SELECT COUNT(*) as total FROM marriage_records${whereClause}`, countParams
        );
        const total = countResult[0].total;

        const marriageWeights = { groom_last_name: 100, bride_last_name: 100, groom_first_name: 80, bride_first_name: 80, clergy: 50, witnesses: 40, notes: 20 };

        let mOrderClause;
        if (search) {
            const { orderExpr, params: relParams } = buildRelevanceOrder(search, marriageWeights);
            params = params.concat(relParams);
            mOrderClause = `${orderExpr} DESC, ${safeSort} ${sortDirection}`;
        } else {
            mOrderClause = `${safeSort} ${sortDirection}`;
        }

        params.push(limit, offset);
        const [records] = await getAppPool().query(
            `SELECT * FROM marriage_records${whereClause} ORDER BY ${mOrderClause} LIMIT ? OFFSET ?`, params
        );

        const scored = search ? computeMatchScores(records, search, marriageWeights, safeSort, sortDirection) : records;

        res.json({
            records: scored,
            totalRecords: total,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
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
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || req.query.q || '';
        const churchId = req.query.church_id;
        const sortField = req.query.sortField || 'death_date';
        const sortDirection = (req.query.sortDirection || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const offset = (page - 1) * limit;

        const validSortCols = ['death_date', 'burial_date', 'name', 'lastname', 'clergy', 'created_at', 'updated_at', 'id'];
        const safeSort = validSortCols.includes(sortField) ? sortField : 'death_date';

        const conditions = [];
        let params = [];

        if (churchId && churchId !== '0') {
            conditions.push('church_id = ?');
            params.push(churchId);
        }

        const searchCols = ['name', 'lastname', 'clergy', 'burial_location', 'notes'];
        const { condition: searchCond, params: searchParams } = buildSearchCondition(search, searchCols);
        if (searchCond) {
            conditions.push(searchCond);
            params = params.concat(searchParams);
        }

        const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

        const countParams = [...params];
        const [countResult] = await getAppPool().query(
            `SELECT COUNT(*) as total FROM funeral_records${whereClause}`, countParams
        );
        const total = countResult[0].total;

        const funeralWeights = { lastname: 100, name: 80, clergy: 50, burial_location: 40, notes: 20 };

        let fOrderClause;
        if (search) {
            const { orderExpr, params: relParams } = buildRelevanceOrder(search, funeralWeights);
            params = params.concat(relParams);
            fOrderClause = `${orderExpr} DESC, ${safeSort} ${sortDirection}`;
        } else {
            fOrderClause = `${safeSort} ${sortDirection}`;
        }

        params.push(limit, offset);
        const [records] = await getAppPool().query(
            `SELECT * FROM funeral_records${whereClause} ORDER BY ${fOrderClause} LIMIT ? OFFSET ?`, params
        );

        const scored = search ? computeMatchScores(records, search, funeralWeights, safeSort, sortDirection) : records;

        res.json({
            records: scored,
            totalRecords: total,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
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
