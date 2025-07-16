// server/routes/baptism.js
const express = require('express');
const { getChurchDbConnection } = require('../utils/dbSwitcher');
const { cleanRecords, cleanRecord, transformBaptismRecords, transformBaptismRecord } = require('../utils/dateFormatter');
const router = express.Router();

// Church database configuration
const CHURCH_DB_NAME = 'ssppoc_records_db';

// Test endpoint to verify API is working
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Baptism API is working', 
        timestamp: new Date().toISOString(),
        headers: req.headers 
    });
});

// GET /api/baptism-records
router.get('/', async (req, res) => {
    try {
        console.log('🔍 Fetching baptism records from church database...');
        
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            sortField = 'id', 
            sortDirection = 'desc' 
        } = req.query;

        // Get church database connection
        const churchDbPool = await getChurchDbConnection(CHURCH_DB_NAME);

        let query = 'SELECT * FROM baptism_records';
        let countQuery = 'SELECT COUNT(*) as total FROM baptism_records';
        const queryParams = [];
        const countParams = [];

        // Add search functionality
        if (search && search.trim()) {
            const searchConditions = `
                WHERE first_name LIKE ? 
                OR last_name LIKE ? 
                OR clergy LIKE ? 
                OR sponsors LIKE ? 
                OR parents LIKE ? 
                OR birthplace LIKE ?
            `;
            const searchParam = `%${search.trim()}%`;
            
            query += searchConditions;
            countQuery += searchConditions;
            
            // Add search parameters for main query
            queryParams.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
            // Add search parameters for count query
            countParams.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
        }

        // Add sorting
        const validSortFields = ['id', 'first_name', 'last_name', 'birth_date', 'reception_date', 'clergy'];
        const validSortDirections = ['asc', 'desc'];
        
        const finalSortField = validSortFields.includes(sortField) ? sortField : 'id';
        const finalSortDirection = validSortDirections.includes(sortDirection.toLowerCase()) ? sortDirection.toUpperCase() : 'DESC';
        
        query += ` ORDER BY ${finalSortField} ${finalSortDirection}`;

        // Add pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), offset);

        console.log('📊 Executing query:', query);
        console.log('🔧 Query params:', queryParams);

        // Execute queries
        const [rows] = await churchDbPool.query(query, queryParams);
        const [countResult] = await churchDbPool.query(countQuery, countParams);
        
        const totalRecords = countResult[0].total;
        
        console.log(`✅ Found ${rows.length} baptism records (${totalRecords} total)`);
        
        res.json({ 
            records: transformBaptismRecords(rows),
            totalRecords,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalRecords / parseInt(limit))
        });
    } catch (err) {
        console.error('fetch baptism-records error:', err);
        res.status(500).json({ error: 'Could not fetch baptism records' });
    }
});

// POST /api/baptism-records - Create a single record
router.post('/', async (req, res) => {
    try {
        const record = req.body;
        console.log('Received record data:', record);
        
        // Validate required fields - check for both null/undefined and empty strings
        const isValidField = (field) => field && field.toString().trim() !== '';
        
        if (!isValidField(record.first_name) || !isValidField(record.last_name) || !isValidField(record.birth_date) || !isValidField(record.clergy)) {
            console.log('Validation failed:', {
                first_name: record.first_name,
                last_name: record.last_name,
                birth_date: record.birth_date,
                clergy: record.clergy
            });
            return res.status(400).json({ 
                error: 'Missing required fields: first_name, last_name, birth_date, clergy',
                received: {
                    first_name: !!isValidField(record.first_name),
                    last_name: !!isValidField(record.last_name),
                    birth_date: !!isValidField(record.birth_date),
                    clergy: !!isValidField(record.clergy)
                }
            });
        }

        console.log('Record validation passed, inserting into database...');
        
        // Convert empty strings to null for optional fields
        const processedRecord = {
            birth_date: record.birth_date || null,
            reception_date: record.reception_date || null,
            first_name: record.first_name,
            last_name: record.last_name,
            birthplace: record.birthplace || null,
            entry_type: record.entry_type || null,
            sponsors: record.sponsors || null,
            parents: record.parents || null,
            clergy: record.clergy
        };
        
        console.log('Clean record for database:', processedRecord);

        const sql = `INSERT INTO baptism_records 
          (birth_date, reception_date, first_name, last_name, birthplace, entry_type, sponsors, parents, clergy) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        // Get church database connection
        const churchDbPool = await getChurchDbConnection(CHURCH_DB_NAME);
        
        const [result] = await churchDbPool.query(sql, [
            processedRecord.birth_date,
            processedRecord.reception_date,
            processedRecord.first_name,
            processedRecord.last_name,
            processedRecord.birthplace,
            processedRecord.entry_type,
            processedRecord.sponsors,
            processedRecord.parents,
            processedRecord.clergy
        ]);

        const newRecord = transformBaptismRecord({ ...record, id: result.insertId });
        console.log('Successfully created record:', newRecord);
        res.json({ success: true, record: newRecord });
    } catch (err) {
        console.error('create baptism-record error:', err);
        res.status(500).json({ error: 'Could not create baptism record' });
    }
});

// PUT /api/baptism-records/:id - Update a single record
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const record = req.body;
        console.log('Updating record ID:', id, 'with data:', record);
        
        // Validate required fields - check for both null/undefined and empty strings
        const isValidField = (field) => field && field.toString().trim() !== '';
        
        if (!isValidField(record.first_name) || !isValidField(record.last_name) || !isValidField(record.birth_date) || !isValidField(record.clergy)) {
            console.log('Update validation failed:', {
                first_name: record.first_name,
                last_name: record.last_name,
                birth_date: record.birth_date,
                clergy: record.clergy
            });
            return res.status(400).json({ 
                error: 'Missing required fields: first_name, last_name, birth_date, clergy',
                received: {
                    first_name: !!isValidField(record.first_name),
                    last_name: !!isValidField(record.last_name),
                    birth_date: !!isValidField(record.birth_date),
                    clergy: !!isValidField(record.clergy)
                }
            });
        }

        console.log('Update validation passed, updating database...');
        
        // Convert empty strings to null for optional fields
        const cleanRecord = {
            birth_date: record.birth_date || null,
            reception_date: record.reception_date || null,
            first_name: record.first_name,
            last_name: record.last_name,
            birthplace: record.birthplace || null,
            entry_type: record.entry_type || null,
            sponsors: record.sponsors || null,
            parents: record.parents || null,
            clergy: record.clergy
        };
        
        console.log('Clean record for update:', cleanRecord);

        const sql = `UPDATE baptism_records SET 
          birth_date = ?, 
          reception_date = ?, 
          first_name = ?, 
          last_name = ?, 
          birthplace = ?, 
          entry_type = ?, 
          sponsors = ?, 
          parents = ?, 
          clergy = ? 
          WHERE id = ?`;

        // Get church database connection
        const churchDbPool = await getChurchDbConnection(CHURCH_DB_NAME);

        const [result] = await churchDbPool.query(sql, [
            cleanRecord.birth_date,
            cleanRecord.reception_date,
            cleanRecord.first_name,
            cleanRecord.last_name,
            cleanRecord.birthplace,
            cleanRecord.entry_type,
            cleanRecord.sponsors,
            cleanRecord.parents,
            cleanRecord.clergy,
            id
        ]);

        if (result.affectedRows === 0) {
            console.log('No record found with ID:', id);
            return res.status(404).json({ error: 'Record not found' });
        }

        console.log('Successfully updated record with ID:', id);
        res.json({ success: true, record: { ...cleanRecord, id: parseInt(id) } });
    } catch (err) {
        console.error('update baptism-record error:', err);
        res.status(500).json({ error: 'Could not update baptism record' });
    }
});

// POST /api/baptism-records/batch - Create/update multiple records (legacy support)
router.post('/batch', async (req, res) => {
    try {
        const { records } = req.body;
        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ error: 'Invalid request format' });
        }

        // Get church database connection
        const churchDbPool = await getChurchDbConnection(CHURCH_DB_NAME);

        const updatedRecords = [];
        for (const record of records) {
            if (record.id) {
                // Update existing record
                const sql = `UPDATE baptism_records SET 
                  birth_date = ?, 
                  reception_date = ?, 
                  first_name = ?, 
                  last_name = ?, 
                  birthplace = ?, 
                  entry_type = ?, 
                  sponsors = ?, 
                  parents = ?, 
                  clergy = ? 
                  WHERE id = ?`;

                await churchDbPool.query(sql, [
                    record.birth_date,
                    record.reception_date,
                    record.first_name,
                    record.last_name,
                    record.birthplace,
                    record.entry_type,
                    record.sponsors,
                    record.parents,
                    record.clergy,
                    record.id
                ]);
                updatedRecords.push(record);
            } else {
                // Insert new record
                const sql = `INSERT INTO baptism_records 
                  (birth_date, reception_date, first_name, last_name, birthplace, entry_type, sponsors, parents, clergy) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                const [result] = await churchDbPool.query(sql, [
                    record.birth_date,
                    record.reception_date,
                    record.first_name,
                    record.last_name,
                    record.birthplace,
                    record.entry_type,
                    record.sponsors,
                    record.parents,
                    record.clergy
                ]);

                updatedRecords.push({ ...record, id: result.insertId });
            }
        }

        res.json({ success: true, updatedRecords });
    } catch (err) {
        console.error('save baptism-records error:', err);
        res.status(500).json({ error: 'Could not save baptism records' });
    }
});

// DELETE /api/baptism-records/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get church database connection
        const churchDbPool = await getChurchDbConnection(CHURCH_DB_NAME);
        
        await churchDbPool.query('DELETE FROM baptism_records WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('delete baptism-record error:', err);
        res.status(500).json({ error: 'Could not delete baptism record' });
    }
});

// GET /api/unique-values?table=…&column=…
router.get('/unique-values', async (req, res) => {
    const { table, column } = req.query;
    if (!table || !column) {
        return res.status(400).json({ error: 'table and column query params required' });
    }
    try {
        // Get church database connection
        const churchDbPool = await getChurchDbConnection(CHURCH_DB_NAME);
        
        // **Warning**: ensure table/column come from a whitelist in production!
        const sql = `SELECT DISTINCT TRIM(\`${column}\`) AS value FROM \`${table}\` WHERE \`${column}\` IS NOT NULL AND TRIM(\`${column}\`) != ''`;
        const [rows] = await churchDbPool.query(sql);
        
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
    const { table } = req.query;
    if (!table) {
        return res.status(400).json({ error: 'table query param required' });
    }
    try {
        // Get church database connection
        const churchDbPool = await getChurchDbConnection(CHURCH_DB_NAME);
        
        // beware SQL-injection in prod—validate table/column against a whitelist!
        const sql = `SELECT DISTINCT \`${column}\` AS value FROM \`${table}\``;
        const [rows] = await churchDbPool.query(sql);
        res.json({ values: rows.map(r => r.value) });
    } catch (err) {
        console.error('fetch dropdown-options error:', err);
        res.status(500).json({ error: 'Could not fetch dropdown options' });
    }
});

module.exports = router;
