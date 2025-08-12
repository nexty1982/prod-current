const { getAppPool } = require('../../config/db-compat');
// server/routes/funeral.js
const express = require('express');
const { getChurchDbConnection } = require('../utils/dbSwitcher');
const { cleanRecords, cleanRecord, transformFuneralRecords, transformFuneralRecord } = require('../utils/dateFormatter');
const { promisePool } = require('../../config/db-compat');
const router = express.Router();

/**
 * Get church database name by church_id
 * @param {number} churchId 
 * @returns {Promise<string>} database name
 */
async function getChurchDatabaseName(churchId) {
    try {
        if (!churchId || churchId === '0') {
            // Get the first active church as default
            console.log('🏛️ No church_id provided, looking for default church...');
            const [defaultChurches] = await getAppPool().query(
                'SELECT id, database_name FROM orthodoxmetrics_db.churches WHERE is_active = 1 ORDER BY id LIMIT 1'
            );
            
            if (defaultChurches.length === 0) {
                console.error('❌ No active churches found in database');
                throw new Error('No active churches configured');
            }
            
            const defaultChurch = defaultChurches[0];
            console.log(`🏛️ Using default church ID: ${defaultChurch.id}, database: ${defaultChurch.database_name}`);
            return defaultChurch.database_name || `orthodoxmetrics_ch_${defaultChurch.id}`;
        }
        
        console.log('🔍 Looking up database name for church_id:', churchId);
        
        const [churches] = await getAppPool().query(
            'SELECT database_name FROM orthodoxmetrics_db.churches WHERE id = ? AND is_active = 1',
            [churchId]
        );
        
        if (churches.length === 0) {
            console.warn(`⚠️ No active church found with ID: ${churchId}, using default church`);
            // Get the first active church as fallback
            const [defaultChurches] = await getAppPool().query(
                'SELECT id, database_name FROM orthodoxmetrics_db.churches WHERE is_active = 1 ORDER BY id LIMIT 1'
            );
            
            if (defaultChurches.length === 0) {
                throw new Error('No active churches configured');
            }
            
            const defaultChurch = defaultChurches[0];
            return defaultChurch.database_name || `orthodoxmetrics_ch_${defaultChurch.id}`;
        }
        
        if (!churches[0].database_name) {
            console.warn(`⚠️ No database_name configured for church ID: ${churchId}, using generated database name`);
            return `orthodoxmetrics_ch_${churchId}`;
        }
        
        console.log(`✅ Found database: ${churches[0].database_name} for church_id: ${churchId}`);
        return churches[0].database_name;
    } catch (error) {
        console.error('❌ Error in getChurchDatabaseName:', error);
        console.log('🔄 Falling back to orthodoxmetrics_ch_37');
        return 'orthodoxmetrics_ch_37'; // Fallback to known working database
    }
}

// Test endpoint to verify API is working
	router.get('/test', (req, res) => {
    	res.json({ 
        message: 'Funeral API is working', 
        timestamp: new Date().toISOString(),
        headers: req.headers 
    });
});

// GET /api/funeral-records
	router.get('/', async (req, res) => {
    	try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            church_id = null,
            sortField = 'id', 
            sortDirection = 'desc' 
        } = req.query;

        console.log('📋 Funeral query parameters:', { page, limit, search, church_id, sortField, sortDirection });

        // Dynamically resolve church database name
        const databaseName = await getChurchDatabaseName(church_id);
        console.log(`🏛️ Using database: ${databaseName} for church_id: ${church_id}`);

        let query = 'SELECT * FROM funeral_records';
        let countQuery = 'SELECT COUNT(*) as total FROM funeral_records';
        const queryParams = [];
        const countParams = [];
        let whereConditions = [];

        // Add church filtering
        if (church_id && church_id !== '0') {
            whereConditions.push('church_id = ?');
            queryParams.push(church_id);
            countParams.push(church_id);
            console.log(`🏛️ Filtering funeral records by church_id: ${church_id}`);
        }

        // Add search functionality
        if (search && search.trim()) {
            const searchCondition = `(name LIKE ? 
                OR lastname LIKE ? 
                OR clergy LIKE ? 
                OR burial_location LIKE ?)`;
            const searchParam = `%${search.trim()}%`;
            
            whereConditions.push(searchCondition);
            
            // Add search parameters for main query (4 parameters now)
            queryParams.push(searchParam, searchParam, searchParam, searchParam);
            // Add search parameters for count query (4 parameters now)
            countParams.push(searchParam, searchParam, searchParam, searchParam);
            console.log(`🔍 Searching funeral records for: "${search.trim()}"`);
        }
        
        // Apply WHERE conditions if any exist
        if (whereConditions.length > 0) {
            const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
            query += whereClause;
            countQuery += whereClause;
        }

        // Add sorting
        const validSortFields = ['id', 'name', 'lastname', 'deceased_date', 'funeral_date', 'clergy'];
        const validSortDirections = ['asc', 'desc'];
        
        const finalSortField = validSortFields.includes(sortField) ? sortField : 'id';
        const finalSortDirection = validSortDirections.includes(sortDirection.toLowerCase()) ? sortDirection.toUpperCase() : 'DESC';
        
        query += ` ORDER BY ${finalSortField} ${finalSortDirection}`;

        // Add pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), offset);

        // Execute queries
        // Get church database connection using the dynamically resolved database name
        const churchDbPool = await getChurchDbConnection(databaseName);
        
        const [rows] = await getAppPool().query(query, queryParams);
        const [countResult] = await getAppPool().query(countQuery, countParams);
        
        const totalRecords = countResult[0].total;
        
        res.json({ 
            records: transformFuneralRecords(rows),
            totalRecords,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalRecords / parseInt(limit))
        });
    } catch (err) {
        console.error('fetch funeral-records error:', err);
        res.status(500).json({ error: 'Could not fetch funeral records' });
    }
});

// POST /api/funeral-records - Create a single record
	router.post('/', async (req, res) => {
    	try {
        const record = req.body;
        console.log('Received record data:', record);
        
        // Validate required fields - check for both null/undefined and empty strings
        const isValidField = (field) => field && field.toString().trim() !== '';
        
        if (!isValidField(record.name) || !isValidField(record.lastname) || !isValidField(record.deceased_date) || !isValidField(record.clergy)) {
            console.log('Validation failed:', {
                name: record.name,
                lastname: record.lastname,
                deceased_date: record.deceased_date,
                clergy: record.clergy
            });
            return res.status(400).json({ 
                error: 'Missing required fields: name, lastname, deceased_date, clergy',
                received: {
                    name: !!isValidField(record.name),
                    lastname: !!isValidField(record.lastname),
                    deceased_date: !!isValidField(record.deceased_date),
                    clergy: !!isValidField(record.clergy)
                }
            });
        }

        console.log('Record validation passed, inserting into database...');
        
        // Convert empty strings to null for optional fields
        const cleanRecord = {
            deceased_date: record.deceased_date || null,
            burial_date: record.burial_date || null,
            name: record.name,
            lastname: record.lastname,
            age: record.age ? parseInt(record.age) : null,
            clergy: record.clergy,
            burial_location: record.burial_location || null
        };
        
        console.log('Clean record for database:', cleanRecord);

        const sql = `INSERT INTO funeral_records 
          (deceased_date, burial_date, name, lastname, age, clergy, burial_location) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await getAppPool().query(sql, [
            cleanRecord.deceased_date,
            cleanRecord.burial_date,
            cleanRecord.name,
            cleanRecord.lastname,
            cleanRecord.age,
            cleanRecord.clergy,
            cleanRecord.burial_location
        ]);

        const newRecord = { ...cleanRecord, id: result.insertId };
        console.log('Successfully created record:', newRecord);
        res.json({ success: true, record: newRecord });
    } catch (err) {
        console.error('create funeral-record error:', err);
        res.status(500).json({ error: 'Could not create funeral record' });
    }
});

// PUT /api/funeral-records/:id - Update a single record
	router.put('/:id', async (req, res) => {
    	try {
        const { id } = req.params;
        const record = req.body;
        console.log('Updating record ID:', id, 'with data:', record);
        
        // Validate required fields - check for both null/undefined and empty strings
        const isValidField = (field) => field && field.toString().trim() !== '';
        
        if (!isValidField(record.name) || !isValidField(record.lastname) || !isValidField(record.deceased_date) || !isValidField(record.clergy)) {
            console.log('Update validation failed:', {
                name: record.name,
                lastname: record.lastname,
                deceased_date: record.deceased_date,
                clergy: record.clergy
            });
            return res.status(400).json({ 
                error: 'Missing required fields: name, lastname, deceased_date, clergy',
                received: {
                    name: !!isValidField(record.name),
                    lastname: !!isValidField(record.lastname),
                    deceased_date: !!isValidField(record.deceased_date),
                    clergy: !!isValidField(record.clergy)
                }
            });
        }

        console.log('Update validation passed, updating database...');
        
        // Convert empty strings to null for optional fields
        const cleanRecord = {
            deceased_date: record.deceased_date || null,
            burial_date: record.burial_date || null,
            name: record.name,
            lastname: record.lastname,
            age: record.age ? parseInt(record.age) : null,
            clergy: record.clergy,
            burial_location: record.burial_location || null
        };
        
        console.log('Clean record for update:', cleanRecord);

        const sql = `UPDATE funeral_records SET 
          deceased_date = ?, 
          burial_date = ?, 
          name = ?, 
          lastname = ?, 
          age = ?, 
          clergy = ?, 
          burial_location = ? 
          WHERE id = ?`;

        const [result] = await getAppPool().query(sql, [
            cleanRecord.deceased_date,
            cleanRecord.burial_date,
            cleanRecord.name,
            cleanRecord.lastname,
            cleanRecord.age,
            cleanRecord.clergy,
            cleanRecord.burial_location,
            id
        ]);

        if (result.affectedRows === 0) {
            console.log('No record found with ID:', id);
            return res.status(404).json({ error: 'Record not found' });
        }

        console.log('Successfully updated record with ID:', id);
        res.json({ success: true, record: { ...cleanRecord, id: parseInt(id) } });
    } catch (err) {
        console.error('update funeral-record error:', err);
        res.status(500).json({ error: 'Could not update funeral record' });
    }
});

// POST /api/funeral-records/batch - Create/update multiple records (legacy support)
	router.post('/batch', async (req, res) => {
    	try {
        const { records } = req.body;
        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ error: 'Invalid request format' });
        }

        const updatedRecords = [];
        for (const record of records) {
            if (record.id) {
                // Update existing record
          const sql = `UPDATE funeral_records SET 
          deceased_date = ?, 
          burial_date = ?, 
          name = ?, 
          lastname = ?, 
          age = ?, 
          clergy = ?, 
          burial_location = ? 
          WHERE id = ?`;

                await getAppPool().query(sql, [
                    record.deceased_date,
                    record.burial_date,
                    record.name,
                    record.lastname,
                    record.age,
                    record.clergy,
                    record.burial_location,
                    record.id
                ]);
                updatedRecords.push(record);
            } else {
                // Insert new record
          const sql = `INSERT INTO funeral_records 
          (deceased_date, burial_date, name, lastname, age, clergy, burial_location) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`;

                const [result] = await getAppPool().query(sql, [
                    record.deceased_date,
                    record.burial_date,
                    record.name,
                    record.lastname,
                    record.age,
                    record.clergy,
                    record.burial_location
                ]);

                updatedRecords.push({ ...record, id: result.insertId });
            }
        }

        res.json({ success: true, updatedRecords });
    } catch (err) {
        console.error('save funeral-records error:', err);
        res.status(500).json({ error: 'Could not save funeral records' });
    }
});

// DELETE /api/funeral-records/:id
	router.delete('/:id', async (req, res) => {
    	try {
        const { id } = req.params;
        await getAppPool().query('DELETE FROM funeral_records WHERE id = ?', [id]);
        res.json({ success: true });
    	} catch (err) {
        console.error('delete funeral-record error:', err);
        res.status(500).json({ error: 'Could not delete funeral record' });
    }
});

// GET /api/unique-values?table=…&column=…
	router.get('/unique-values', async (req, res) => {
    	const { table, column } = req.query;
    	if (!table || !column) {
        return res.status(400).json({ error: 'table and column query params required' });
    }
    	try {
        // **Warning**: ensure table/column come from a whitelist in production!
        const sql = `SELECT DISTINCT TRIM(\`${column}\`) AS value FROM \`${table}\` WHERE \`${column}\` IS NOT NULL AND TRIM(\`${column}\`) != ''`;
        const [rows] = await getAppPool().query(sql);
        
        // Additional deduplication in JavaScript to handle case variations
        const valueSet = new Set();
        const valueList = [];
        
        rows.forEach(row => {
            if (row.value) {
                const trimmedValue = row.value.trim();
                const normalizedValue = trimmedValue.toLowerCase();
                
                // Check if we already have this value (case-insensitive)
                if (!valueSet.has(normalizedValue)) {
                    valueSet.add(normalizedValue);
                    valueList.push(trimmedValue);
                }
            }
        });
        
        // Sort alphabetically
        valueList.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        
        res.json({ values: valueList });
    } catch (err) {
        console.error('fetch unique-values error:', err);
        res.status(500).json({ error: 'Could not fetch unique values' });
    }
});

	router.get('/dropdown-options/:column', async (req, res) => {
    	const { column } = req.params;
    	const { table, church_id } = req.query;
    	if (!table) {
        return res.status(400).json({ error: 'table query param required' });
    }
    try {
        // Dynamically resolve church database name
        const databaseName = await getChurchDatabaseName(church_id);
        
        const churchDbPool = await getChurchDbConnection(databaseName);
        // beware SQL-injection in prod—validate table/column against a whitelist!
        const sql = `SELECT DISTINCT \`${column}\` AS value FROM \`${table}\``;
        const [rows] = await getAppPool().query(sql);
        res.json({ values: rows.map(r => r.value) });
    } catch (err) {
        console.error('fetch dropdown-options error:', err);
        res.status(500).json({ error: 'Could not fetch dropdown options' });
    }
});

module.exports = router;
