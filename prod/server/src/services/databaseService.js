const { getAppPool } = require('../../config/db-compat');
/**
 * Database Service Layer - Proper Architecture Separation
 * 
 * This service implements the correct database separation:
 * - orthodoxmetrics_db: All platform data (users, churches, OCR, settings)
 * - Church-specific DBs: Only record data (baptism, marriage, funeral)
 */

const { promisePool } = require('../../config/db-compat'); // orthodoxmetrics_db connection
const mysql = require('mysql2/promise');

// Cache for church database connections
const churchDbConnections = new Map();

/**
 * Get the main platform database connection (orthodoxmetrics_db)
 * Use this for ALL non-record operations
 */
function getPlatformDb() {
    return promisePool;
}

/**
 * Get database connection (alias for getPlatformDb for backward compatibility)
 * @returns {Object} - Platform database connection
 */
function getDatabase() {
    return promisePool;
}

/**
 * Get the church's record database name for a given user
 * @param {number} userId - User ID to look up
 * @returns {Promise<string>} - Database name (e.g., 'ssppoc_records_db')
 */
async function getChurchRecordDatabase(userId) {
    try {
        const [result] = await getAppPool().query(`
            SELECT c.database_name 
            FROM orthodoxmetrics_auth_db.users u 
            JOIN churches c ON u.church_id = c.id 
            WHERE u.id = ?
        `, [userId]);
        
        if (result.length === 0) {
            throw new Error(`No church database found for user ID: ${userId}`);
        }
        
        return result[0].database_name;
    } catch (error) {
        console.error('❌ Error getting church record database:', error);
        throw error;
    }
}

/**
 * Get the church's record database name by church ID
 * @param {number} churchId - Church ID to look up
 * @returns {Promise<string>} - Database name (e.g., 'ssppoc_records_db')
 */
async function getChurchRecordDatabaseByChurchId(churchId) {
    try {
        const [result] = await getAppPool().query(`
            SELECT database_name 
            FROM churches 
            WHERE id = ?
        `, [churchId]);
        
        if (result.length === 0) {
            throw new Error(`No church found with ID: ${churchId}`);
        }
        
        if (!result[0].database_name) {
            throw new Error(`No database configured for church ID: ${churchId}`);
        }
        
        return result[0].database_name;
    } catch (error) {
        console.error('❌ Error getting church record database by church ID:', error);
        throw error;
    }
}

/**
 * Get a connection to a church's record database
 * Use this ONLY for record operations (baptism, marriage, funeral)
 * @param {number} churchId - Church ID
 * @returns {Promise<mysql.Connection>} - Database connection to church records DB
 */
async function getChurchRecordConnection(churchId) {
    try {
        const databaseName = await getChurchRecordDatabaseByChurchId(churchId);
        
        // Check if we already have a connection cached
        if (churchDbConnections.has(databaseName)) {
            return churchDbConnections.get(databaseName);
        }
        
        // Create new connection to the church's record database
        const connection = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: databaseName,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        
        // Cache the connection
        churchDbConnections.set(databaseName, connection);
        
        console.log(`✅ Connected to church record database: ${databaseName}`);
        return connection;
        
    } catch (error) {
        console.error('❌ Error connecting to church record database:', error);
        throw error;
    }
}

/**
 * Get OCR database connection
 * OCR data is stored in orthodoxmetrics_ocr_db (separate from platform DB)
 */
function getOcrDb() {
    const { getOcrDbPool } = require('../utils/dbConnections');
    return getOcrDbPool();
}

/**
 * Execute a query on the church's record database
 * @param {number} churchId - Church ID
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} - Query results
 */
async function queryChurchRecords(churchId, query, params = []) {
    const connection = await getChurchRecordConnection(churchId);
    return getAppPool().query(query, params);
}

/**
 * Execute a query on the platform database (orthodoxmetrics_db)
 * Use this for users, churches, settings, etc.
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} - Query results
 */
async function queryPlatform(query, params = []) {
    return getAppPool().query(query, params);
}

/**
 * Get church metadata (from orthodoxmetrics_db)
 * @param {number} churchId - Church ID
 * @returns {Promise<Object>} - Church metadata
 */
async function getChurchMetadata(churchId) {
    const [result] = await queryPlatform(`
        SELECT 
            id,
            name,
            email,
            phone,
            address,
            city,
            state_province,
            postal_code,
            country,
            preferred_language,
            timezone,
            currency,
            tax_id,
            website,
            description_multilang,
            settings,
            is_active,
            database_name,
            setup_complete,
            created_at,
            updated_at
        FROM churches 
        WHERE id = ?
    `, [churchId]);
    
    if (result.length === 0) {
        throw new Error(`Church not found with ID: ${churchId}`);
    }
    
    return result[0];
}

/**
 * Check if a path should use church record database
 * @param {string} path - Request path
 * @returns {boolean} - True if should use church records DB
 */
function isRecordPath(path) {
    const recordPaths = [
        '/saints-peter-and-paul-Records',
        '/church/:id/records',
        '/api/records',
        '/api/baptism',
        '/api/marriage', 
        '/api/funeral'
    ];
    
    return recordPaths.some(recordPath => 
        path.includes('records') || 
        path.includes('baptism') || 
        path.includes('marriage') || 
        path.includes('funeral')
    );
}

module.exports = {
    // Main database functions
    getPlatformDb,
    getDatabase, // Added for backward compatibility
    getOcrDb,
    
    // Church record database functions
    getChurchRecordDatabase,
    getChurchRecordDatabaseByChurchId,
    getChurchRecordConnection,
    queryChurchRecords,
    
    // Platform database functions
    queryPlatform,
    getChurchMetadata,
    
    // Utility functions
    isRecordPath
};
