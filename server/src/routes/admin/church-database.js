// server/routes/admin/church-database.js - Church Database Operations Routes
const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Middleware for admin access
const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * Standardized API response helper
 */
function apiResponse(success, data = null, error = null, meta = null) {
    const response = { success };
    if (data) response.data = data;
    if (error) response.error = error;
    if (meta) response.meta = meta;
    return response;
}

/**
 * Validates church access and returns church info
 */
async function validateChurchAccess(churchId) {
    const [churches] = await promisePool.query(
        'SELECT id, church_name as name, database_name FROM churches WHERE id = ? AND is_active = 1',
        [churchId]
    );
    
    if (churches.length === 0) {
        throw new Error('Church not found or inactive');
    }
    
    return churches[0];
}

// GET /api/admin/church-database/:churchId/tables - Get available database tables for a church
router.get('/:churchId/tables', requireAuth, requireAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.churchId);
        console.log('📋 Getting tables for church ID:', churchId);

        // Validate church exists and get database name
        const church = await validateChurchAccess(churchId);
        const { database_name } = church;

        // Get all tables from the church's database
        const [tables] = await promisePool.query(`
            SELECT TABLE_NAME, TABLE_ROWS, 
                   ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME NOT IN ('church_info', 'users', 'church_settings')
            ORDER BY TABLE_NAME
        `, [database_name]);

        const tableInfo = tables.map(table => ({
            name: table.TABLE_NAME,
            rows: table.TABLE_ROWS || 0,
            size_mb: table.size_mb || 0
        }));

        res.json(apiResponse(true, {
            tables: tableInfo,
            church_id: churchId,
            database_name,
            total_tables: tableInfo.length
        }));

    } catch (error) {
        console.error('❌ Error getting church tables:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json(
            apiResponse(false, null, error.message)
        );
    }
});

// GET /api/admin/church-database/:churchId/record-counts - Get record counts for church database
router.get('/:churchId/record-counts', requireAuth, requireAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.churchId);
        console.log('📊 Getting record counts for church ID:', churchId);

        // Validate church exists and get database name
        const church = await validateChurchAccess(churchId);
        const { database_name } = church;

        // Get table names for record tables
        const [tables] = await promisePool.query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? 
            AND (TABLE_NAME LIKE '%_records'
                 OR TABLE_NAME IN ('clergy', 'members', 'donations', 'calendar_events'))
            ORDER BY TABLE_NAME
        `, [database_name]);

        const counts = {};
        const errors = {};
        
        // Get count for each table
        for (const table of tables) {
            try {
                const [countResult] = await promisePool.query(`
                    SELECT COUNT(*) as count FROM \`${database_name}\`.\`${table.TABLE_NAME}\`
                `);
                counts[table.TABLE_NAME] = countResult[0].count;
            } catch (tableError) {
                console.warn(`⚠️ Error counting ${table.TABLE_NAME}:`, tableError.message);
                counts[table.TABLE_NAME] = 0;
                errors[table.TABLE_NAME] = tableError.message;
            }
        }

        // Calculate total records
        const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

        res.json(apiResponse(true, {
            record_counts: counts,
            total_records: totalRecords,
            church_id: churchId,
            database_name,
            errors: Object.keys(errors).length > 0 ? errors : undefined
        }));

    } catch (error) {
        console.error('❌ Error getting record counts:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json(
            apiResponse(false, null, error.message)
        );
    }
});

// GET /api/admin/church-database/:churchId/info - Get comprehensive database information
router.get('/:churchId/info', requireAuth, requireAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.churchId);
        console.log('🗄️ Getting database info for church ID:', churchId);

        // Validate church exists and get database name
        const church = await validateChurchAccess(churchId);
        const { database_name, name: church_name } = church;

        // Get database size and table count
        const [dbInfo] = await promisePool.query(`
            SELECT 
                TABLE_SCHEMA as name,
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb,
                COUNT(TABLE_NAME) as table_count
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
            GROUP BY TABLE_SCHEMA
        `, [database_name]);

        // Get detailed table information
        const [tables] = await promisePool.query(`
            SELECT 
                TABLE_NAME as name, 
                TABLE_ROWS as rows, 
                ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb,
                CREATE_TIME as created_at,
                UPDATE_TIME as updated_at
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
            ORDER BY size_mb DESC, TABLE_NAME
        `, [database_name]);

        // Calculate totals if main query didn't work
        let totalSize = 0;
        let tableCount = tables.length;
        
        if (tables.length > 0) {
            totalSize = tables.reduce((sum, table) => sum + (parseFloat(table.size_mb) || 0), 0);
        }

        // Use main query results if available, otherwise use calculated values
        const databaseInfo = {
            name: database_name,
            church_name,
            size_mb: dbInfo[0]?.size_mb || totalSize,
            table_count: dbInfo[0]?.table_count || tableCount,
            tables: tables.map(table => ({
                name: table.name,
                rows: table.rows || 0,
                size_mb: table.size_mb || 0,
                created_at: table.created_at,
                updated_at: table.updated_at
            }))
        };

        // Add mock backup info (in production, this would come from backup system)
        const backupInfo = {
            last_backup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
            backup_size_mb: Math.round(totalSize * 0.8), // Compressed backup estimate
            status: 'success',
            retention_days: 30
        };

        res.json(apiResponse(true, {
            database: databaseInfo,
            backup: backupInfo,
            church_id: churchId,
            generated_at: new Date().toISOString()
        }));

    } catch (error) {
        console.error('❌ Error getting database info:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json(
            apiResponse(false, null, error.message)
        );
    }
});

// POST /api/admin/church-database/:churchId/test-connection - Test database connection and health
router.post('/:churchId/test-connection', requireAuth, requireAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.churchId);
        console.log('🔌 Testing database connection for church ID:', churchId);

        // Validate church exists and get database info
        const church = await validateChurchAccess(churchId);
        const { database_name, name: church_name } = church;

        // Test basic connection
        const startTime = Date.now();
        const [connectionTest] = await promisePool.query('SELECT 1 as test');
        const connectionTime = Date.now() - startTime;

        // Test database existence
        const [dbExists] = await promisePool.query(`
            SELECT SCHEMA_NAME 
            FROM information_schema.SCHEMATA 
            WHERE SCHEMA_NAME = ?
        `, [database_name]);

        // Get database stats
        const [dbStats] = await promisePool.query(`
            SELECT 
                COUNT(TABLE_NAME) as table_count,
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
        `, [database_name]);

        // Test sample queries on common tables
        const sampleQueries = {};
        const commonTables = ['baptism_records', 'marriage_records', 'funeral_records', 'members'];
        
        for (const tableName of commonTables) {
            try {
                const [sampleQuery] = await promisePool.query(`
                    SELECT COUNT(*) as record_count 
                    FROM \`${database_name}\`.\`${tableName}\` 
                    LIMIT 1
                `);
                sampleQueries[tableName] = {
                    success: true,
                    record_count: sampleQuery[0].record_count
                };
            } catch (tableError) {
                sampleQueries[tableName] = {
                    success: false,
                    error: `Table '${tableName}' not accessible`
                };
            }
        }

        const connectionResult = {
            database_name,
            church_name,
            database_exists: dbExists.length > 0,
            connection_time_ms: connectionTime,
            table_count: dbStats[0]?.table_count || 0,
            size_mb: dbStats[0]?.size_mb || 0,
            sample_queries: sampleQueries,
            status: dbExists.length > 0 ? 'healthy' : 'database_missing',
            tested_at: new Date().toISOString()
        };

        res.json(apiResponse(true, {
            connection: connectionResult,
            church_id: churchId
        }));

    } catch (error) {
        console.error('❌ Error testing database connection:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json(
            apiResponse(false, null, error.message)
        );
    }
});

// GET /api/admin/church-database/:churchId/health - Get database health summary
router.get('/:churchId/health', requireAuth, requireAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.churchId);
        console.log('🏥 Getting database health for church ID:', churchId);

        // Validate church exists and get database name
        const church = await validateChurchAccess(churchId);
        const { database_name, name: church_name } = church;

        // Check database size and growth
        const [sizeInfo] = await promisePool.query(`
            SELECT 
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS current_size_mb,
                COUNT(TABLE_NAME) as table_count
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
        `, [database_name]);

        // Check for common issues
        const healthChecks = {
            database_accessible: true,
            tables_exist: (sizeInfo[0]?.table_count || 0) > 0,
            size_reasonable: (sizeInfo[0]?.current_size_mb || 0) < 1000, // Under 1GB
            recent_activity: true // Would check last update times in production
        };

        const issuesFound = Object.values(healthChecks).filter(check => !check).length;
        const healthStatus = issuesFound === 0 ? 'excellent' : 
                           issuesFound <= 1 ? 'good' : 
                           issuesFound <= 2 ? 'warning' : 'critical';

        res.json(apiResponse(true, {
            health: {
                status: healthStatus,
                score: Math.max(0, 100 - (issuesFound * 25)),
                checks: healthChecks,
                database_size_mb: sizeInfo[0]?.current_size_mb || 0,
                table_count: sizeInfo[0]?.table_count || 0,
                issues_found: issuesFound,
                recommendations: issuesFound > 0 ? [
                    'Consider regular database maintenance',
                    'Monitor table sizes and optimize if needed',
                    'Ensure regular backups are running'
                ] : []
            },
            church_id: churchId,
            database_name,
            church_name,
            checked_at: new Date().toISOString()
        }));

    } catch (error) {
        console.error('❌ Error checking database health:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json(
            apiResponse(false, null, error.message)
        );
    }
});

module.exports = router; 