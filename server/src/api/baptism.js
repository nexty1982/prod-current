const { getAppPool } = require('../../config/db-compat');
// server/routes/baptism.js
const express = require('express');
const { getChurchDbConnection } = require('../utils/dbSwitcher');
const { cleanRecords, cleanRecord, transformBaptismRecords, transformBaptismRecord } = require('../utils/dateFormatter');
const { promisePool } = require('../../config/db-compat');
const { safeRequire } = require('../../utils/safeRequire');
const { requireAuth } = require('../middleware/auth');

// Safe require for writeSacramentHistory - handles missing module gracefully
const writeSacramentHistoryModule = safeRequire(
  '../utils/writeSacramentHistory',
  () => ({
    writeSacramentHistory: async () => {
      // No-op fallback - history writing is optional for uptime
      return Promise.resolve();
    },
    generateRequestId: () => require('uuid').v4()
  }),
  'writeSacramentHistory'
);

const { writeSacramentHistory, generateRequestId } = writeSacramentHistoryModule;
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

async function getChurchInfo(churchId) {
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
            return {
                churchId: defaultChurch.id,
                databaseName: defaultChurch.database_name || `orthodoxmetrics_ch_${defaultChurch.id}`
            };
        }
        
        console.log('🔍 Looking up database name for church_id:', churchId);
        
        const [churches] = await getAppPool().query(
            'SELECT id, database_name FROM orthodoxmetrics_db.churches WHERE id = ? AND is_active = 1',
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
            return {
                churchId: defaultChurch.id,
                databaseName: defaultChurch.database_name || `orthodoxmetrics_ch_${defaultChurch.id}`
            };
        }
        
        if (!churches[0].database_name) {
            console.warn(`⚠️ No database_name configured for church ID: ${churchId}, using generated database name`);
            return {
                churchId: parseInt(churchId),
                databaseName: `orthodoxmetrics_ch_${churchId}`
            };
        }
        
        console.log(`✅ Found database: ${churches[0].database_name} for church_id: ${churchId}`);
        return {
            churchId: parseInt(churchId),
            databaseName: churches[0].database_name
        };
    } catch (error) {
        console.error('❌ Error in getChurchInfo:', error);
        console.log('🔄 Falling back to orthodoxmetrics_ch_37');
        // Try to get church_id from database name
        const fallbackId = 37; // Default fallback
        return {
            churchId: fallbackId,
            databaseName: 'orthodoxmetrics_ch_37'
        };
    }
}

// Test endpoint to verify API is working
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Baptism API is working', 
        timestamp: new Date().toISOString(),
        headers: req.headers 
    });
});

// GET /api/baptism-records - Require authentication
router.get('/', requireAuth, async (req, res) => {
    try {
        console.log('🔍 Fetching baptism records from church database...');
        
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            church_id = null,
            sortField = 'id', 
            sortDirection = 'desc' 
        } = req.query;

        // Get church_id from session if not provided in query
        const finalChurchId = church_id || req.session?.user?.church_id || req.user?.church_id || null;
        
        console.log('📋 Query parameters:', { page, limit, search, church_id: finalChurchId, sortField, sortDirection });
        console.log('👤 User session:', { userId: req.session?.user?.id, churchId: req.session?.user?.church_id });

        // Dynamically resolve church database name
        const databaseName = await getChurchDatabaseName(finalChurchId);
        console.log(`🏛️ Using database: ${databaseName} for church_id: ${finalChurchId}`);

        // Get church database connection
        const churchDbPool = await getChurchDbConnection(databaseName);

        let query = 'SELECT * FROM baptism_records';
        let countQuery = 'SELECT COUNT(*) as total FROM baptism_records';
        const queryParams = [];
        const countParams = [];
        let whereConditions = [];

        // Add church filtering
        if (church_id && church_id !== '0') {
            whereConditions.push('church_id = ?');
            queryParams.push(church_id);
            countParams.push(church_id);
            console.log(`🏛️ Filtering by church_id: ${church_id} (type: ${typeof church_id})`);
        } else {
            console.log(`🏛️ No church_id filter applied - church_id: ${church_id}`);
        }

        // Add search functionality
        if (search && search.trim()) {
            const searchCondition = `(first_name LIKE ? 
                OR last_name LIKE ? 
                OR clergy LIKE ? 
                OR sponsors LIKE ? 
                OR parents LIKE ? 
                OR birthplace LIKE ?)`;
            const searchParam = `%${search.trim()}%`;
            
            whereConditions.push(searchCondition);
            
            // Add search parameters for main query
            queryParams.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
            // Add search parameters for count query
            countParams.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
            console.log(`🔍 Searching for: "${search.trim()}"`);
        }
        
        // Apply WHERE conditions if any exist
        if (whereConditions.length > 0) {
            const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
            query += whereClause;
            countQuery += whereClause;
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
        
        console.log(`✅ Found ${rows.length} baptism records (${totalRecords} total) in database: ${databaseName}`);
        
        // Debug: Log first few records if any exist
        if (rows.length > 0) {
            console.log(`📄 Sample records:`, rows.slice(0, 2).map(r => ({ id: r.id, first_name: r.first_name, last_name: r.last_name, church_id: r.church_id })));
        } else {
            console.log(`📄 No records found in database: ${databaseName}`);
        }
        
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

// POST /api/baptism-records - Create a single record (require auth)
router.post('/', requireAuth, async (req, res) => {
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

        // Get church_id from request (body or query)
        const church_id = record.church_id || req.query.church_id || null;
        
        // Get church info (both churchId and databaseName)
        const churchInfo = await getChurchInfo(church_id);
        console.log(`🏛️ Using database: ${churchInfo.databaseName} for church_id: ${churchInfo.churchId}`);
        
        // Get church database connection
        const churchDbPool = await getChurchDbConnection(churchInfo.databaseName);
        
        // Check if a similar record already exists (match on name, birth_date, and church)
        const [existingRecords] = await churchDbPool.query(
            `SELECT * FROM baptism_records 
             WHERE church_id = ? AND first_name = ? AND last_name = ? AND birth_date = ?
             LIMIT 1`,
            [churchInfo.churchId, processedRecord.first_name, processedRecord.last_name, processedRecord.birth_date]
        );

        if (existingRecords.length > 0) {
            const existing = existingRecords[0];
            console.log('Found existing record:', existing.id);
            
            // Count non-null fields in existing vs new record
            const countFields = (obj) => Object.values(obj).filter(v => v !== null && v !== undefined && v !== '').length;
            const existingFieldCount = countFields(existing);
            const newFieldCount = countFields(processedRecord);
            
            // Merge: prefer new non-null values over existing null values
            const mergedRecord = {
                birth_date: processedRecord.birth_date || existing.birth_date,
                reception_date: processedRecord.reception_date || existing.reception_date,
                first_name: processedRecord.first_name || existing.first_name,
                last_name: processedRecord.last_name || existing.last_name,
                birthplace: processedRecord.birthplace || existing.birthplace,
                entry_type: processedRecord.entry_type || existing.entry_type,
                sponsors: processedRecord.sponsors || existing.sponsors,
                parents: processedRecord.parents || existing.parents,
                clergy: processedRecord.clergy || existing.clergy
            };
            
            console.log(`Updating existing record ${existing.id} (existing: ${existingFieldCount} fields, new: ${newFieldCount} fields)`);
            
            const updateSql = `UPDATE baptism_records SET 
                birth_date = ?, reception_date = ?, first_name = ?, last_name = ?, 
                birthplace = ?, entry_type = ?, sponsors = ?, parents = ?, clergy = ?
                WHERE id = ?`;
            
            await churchDbPool.query(updateSql, [
                mergedRecord.birth_date,
                mergedRecord.reception_date,
                mergedRecord.first_name,
                mergedRecord.last_name,
                mergedRecord.birthplace,
                mergedRecord.entry_type,
                mergedRecord.sponsors,
                mergedRecord.parents,
                mergedRecord.clergy,
                existing.id
            ]);
            
            // Fetch after state
            const [afterRows] = await churchDbPool.query(
                'SELECT * FROM baptism_records WHERE id = ?',
                [existing.id]
            );
            const afterRecord = afterRows[0];
            
            const updatedRecord = transformBaptismRecord({ ...mergedRecord, id: existing.id });
            console.log('Successfully merged/updated existing record:', updatedRecord);
            
            // Write history for merge/update
            const requestId = req.requestId || generateRequestId();
            await writeSacramentHistory({
                historyTableName: 'baptism_history',
                churchId: churchInfo.churchId,
                recordId: existing.id,
                type: 'merge',
                description: `Merged/updated baptism record ${existing.id} for ${mergedRecord.first_name} ${mergedRecord.last_name}`,
                before: existing,
                after: afterRecord,
                actorUserId: req.user?.id || null,
                source: 'ui',
                requestId: requestId,
                ipAddress: req.ip || null,
                databaseName: churchInfo.databaseName
            });
            
            return res.json({ success: true, record: updatedRecord, merged: true, message: 'Record updated with additional data' });
        }

        // No existing record found, insert new
        const sql = `INSERT INTO baptism_records 
          (church_id, birth_date, reception_date, first_name, last_name, birthplace, entry_type, sponsors, parents, clergy) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const [result] = await churchDbPool.query(sql, [
            churchInfo.churchId,
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

        // Fetch after state
        const [afterRows] = await churchDbPool.query(
            'SELECT * FROM baptism_records WHERE id = ?',
            [result.insertId]
        );
        const afterRecord = afterRows[0];

        const newRecord = transformBaptismRecord({ ...record, id: result.insertId });
        console.log('Successfully created record:', newRecord);
        
        // Write history
        const requestId = req.requestId || generateRequestId();
        await writeSacramentHistory({
            historyTableName: 'baptism_history',
            churchId: churchInfo.churchId,
            recordId: result.insertId,
            type: 'create',
            description: `Created baptism record for ${processedRecord.first_name} ${processedRecord.last_name}`,
            before: null,
            after: afterRecord,
            actorUserId: req.user?.id || null,
            source: 'ui',
            requestId: requestId,
            ipAddress: req.ip || null,
            databaseName: churchInfo.databaseName
        });
        
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
        
        // Normalize field names (accept both camelCase and snake_case)
        const normalizedRecord = {
            first_name: record.first_name || record.firstName,
            last_name: record.last_name || record.lastName,
            birth_date: record.birth_date || record.dateOfBirth || record.birthDate,
            reception_date: record.reception_date || record.dateOfBaptism || record.baptismDate,
            birthplace: record.birthplace || record.placeOfBirth,
            entry_type: record.entry_type || record.entryType,
            sponsors: record.sponsors || record.godparents,
            parents: record.parents,
            clergy: record.clergy || record.priest
        };

        // Validate required fields - check for both null/undefined and empty strings
        const isValidField = (field) => field && field.toString().trim() !== '';
        
        // For updates, birth_date is optional if not provided (keep existing)
        if (!isValidField(normalizedRecord.first_name) || !isValidField(normalizedRecord.last_name) || !isValidField(normalizedRecord.clergy)) {
            console.log('Update validation failed:', {
                first_name: normalizedRecord.first_name,
                last_name: normalizedRecord.last_name,
                birth_date: normalizedRecord.birth_date,
                clergy: normalizedRecord.clergy
            });
            return res.status(400).json({ 
                error: 'Missing required fields: first_name, last_name, clergy',
                received: {
                    first_name: !!isValidField(normalizedRecord.first_name),
                    last_name: !!isValidField(normalizedRecord.last_name),
                    birth_date: !!isValidField(normalizedRecord.birth_date),
                    clergy: !!isValidField(normalizedRecord.clergy)
                }
            });
        }

        console.log('Update validation passed, updating database...');
        
        // Convert empty strings to null for optional fields
        const cleanRecord = {
            birth_date: normalizedRecord.birth_date || null,
            reception_date: normalizedRecord.reception_date || null,
            first_name: normalizedRecord.first_name,
            last_name: normalizedRecord.last_name,
            birthplace: normalizedRecord.birthplace || null,
            entry_type: normalizedRecord.entry_type || null,
            sponsors: normalizedRecord.sponsors || null,
            parents: normalizedRecord.parents || null,
            clergy: normalizedRecord.clergy
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

        // Get church_id from request (body or query)
        const church_id = record.church_id || req.query.church_id || null;
        
        // Get church info (both churchId and databaseName)
        const churchInfo = await getChurchInfo(church_id);
        console.log(`🏛️ Using database: ${churchInfo.databaseName} for church_id: ${churchInfo.churchId}`);
        
        // Get church database connection
        const churchDbPool = await getChurchDbConnection(churchInfo.databaseName);

        // Fetch before state
        const [beforeRows] = await churchDbPool.query(
            'SELECT * FROM baptism_records WHERE id = ?',
            [id]
        );
        
        if (beforeRows.length === 0) {
            console.log('No record found with ID:', id);
            return res.status(404).json({ error: 'Record not found' });
        }
        
        const beforeRecord = beforeRows[0];

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

        // Fetch after state
        const [afterRows] = await churchDbPool.query(
            'SELECT * FROM baptism_records WHERE id = ?',
            [id]
        );
        const afterRecord = afterRows[0];

        console.log('Successfully updated record with ID:', id);
        
        // Write history
        const requestId = req.requestId || generateRequestId();
        await writeSacramentHistory({
            historyTableName: 'baptism_history',
            churchId: churchInfo.churchId,
            recordId: parseInt(id),
            type: 'update',
            description: `Updated baptism record ${id} for ${cleanRecord.first_name} ${cleanRecord.last_name}`,
            before: beforeRecord,
            after: afterRecord,
            actorUserId: req.user?.id || null,
            source: 'ui',
            requestId: requestId,
            ipAddress: req.ip || null,
            databaseName: churchInfo.databaseName
        });
        
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

        // Get church_id from request (body or query)
        const church_id = req.body.church_id || req.query.church_id || null;
        
        // Get church info (both churchId and databaseName)
        const churchInfo = await getChurchInfo(church_id);
        console.log(`🏛️ Using database: ${churchInfo.databaseName} for church_id: ${churchInfo.churchId}`);
        
        // Get church database connection
        const churchDbPool = await getChurchDbConnection(churchInfo.databaseName);

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
                  (church_id, birth_date, reception_date, first_name, last_name, birthplace, entry_type, sponsors, parents, clergy) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                const [result] = await churchDbPool.query(sql, [
                    churchInfo.churchId,
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
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get church_id from request (body or query)
        const church_id = req.body.church_id || req.query.church_id || null;
        
        // Get church info (both churchId and databaseName)
        const churchInfo = await getChurchInfo(church_id);
        console.log(`🏛️ Using database: ${churchInfo.databaseName} for church_id: ${churchInfo.churchId}`);
        
        // Get church database connection
        const churchDbPool = await getChurchDbConnection(churchInfo.databaseName);
        
        // Fetch before state
        const [beforeRows] = await churchDbPool.query(
            'SELECT * FROM baptism_records WHERE id = ?',
            [id]
        );
        
        if (beforeRows.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        
        const beforeRecord = beforeRows[0];
        
        await churchDbPool.query('DELETE FROM baptism_records WHERE id = ?', [id]);
        
        // Write history
        const requestId = req.requestId || generateRequestId();
        await writeSacramentHistory({
            historyTableName: 'baptism_history',
            churchId: churchInfo.churchId,
            recordId: parseInt(id),
            type: 'delete',
            description: `Deleted baptism record ${id} for ${beforeRecord.first_name} ${beforeRecord.last_name}`,
            before: beforeRecord,
            after: null,
            actorUserId: req.user?.id || null,
            source: 'ui',
            requestId: requestId,
            ipAddress: req.ip || null,
            databaseName: churchInfo.databaseName
        });
        
        res.json({ success: true });
    } catch (err) {
        console.error('delete baptism-record error:', err);
        res.status(500).json({ error: 'Could not delete baptism record' });
    }
});

// GET /api/unique-values?table=…&column=…
router.get('/unique-values', async (req, res) => {
    const { table, column, church_id } = req.query;
    if (!table || !column) {
        return res.status(400).json({ error: 'table and column query params required' });
    }
    try {
        // Dynamically resolve church database name
        const databaseName = await getChurchDatabaseName(church_id);
        
        // Get church database connection
        const churchDbPool = await getChurchDbConnection(databaseName);
        
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
    const { table, church_id } = req.query;
    
    // Default to baptism_records if no table specified
    const tableName = table || 'baptism_records';
    
    try {
        // Dynamically resolve church database name
        const databaseName = await getChurchDatabaseName(church_id);
        
        // Get church database connection
        const churchDbPool = await getChurchDbConnection(databaseName);
        
        // Validate column against whitelist for security
        const allowedColumns = ['clergy', 'priest', 'sponsors', 'parents', 'birthplace', 'place_of_birth'];
        if (!allowedColumns.includes(column)) {
            return res.status(400).json({ error: 'Invalid column specified' });
        }
        
        // Build query with proper filtering
        const sql = `SELECT DISTINCT \`${column}\` AS value FROM \`${tableName}\` WHERE \`${column}\` IS NOT NULL AND TRIM(\`${column}\`) != '' ORDER BY \`${column}\` ASC`;
        const [rows] = await churchDbPool.query(sql);
        
        // Filter out empty values and deduplicate
        const values = [...new Set(rows.map(r => r.value).filter(v => v && v.trim()))];
        
        res.json({ values });
    } catch (err) {
        console.error('fetch dropdown-options error:', err);
        res.status(500).json({ error: 'Could not fetch dropdown options' });
    }
});

module.exports = router;
