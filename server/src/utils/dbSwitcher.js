// utils/dbSwitcher.js
const mysql = require('mysql2/promise');
const path = require('path');

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production'
  ? '../.env.production'
  : '../.env.development';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

const dbPool = {}; // cache for database connections

/**
 * Get a MariaDB connection pool for a specific church database
 * @param {string} dbName - The name of the church database
 * @returns {Promise<mysql.Pool>} - The database connection pool
 */
async function getChurchDbConnection(dbName) {
  if (!dbPool[dbName]) {
    try {
      dbPool[dbName] = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'orthodoxapps',
        password: process.env.DB_PASSWORD || 'Summerof1982@!',
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      
      // Test the connection
      const connection = await dbPool[dbName].getConnection();
      connection.release();
      
      console.log(`Successfully connected to church database: ${dbName}`);
    } catch (error) {
      console.error(`Failed to connect to church database ${dbName}:`, error);
      throw error;
    }
  }
  return dbPool[dbName];
}

/**
 * Close all database connections (useful for cleanup)
 */
async function closeAllConnections() {
  for (const dbName in dbPool) {
    try {
      await dbPool[dbName].end();
      console.log(`Closed connection to database: ${dbName}`);
    } catch (error) {
      console.error(`Error closing connection to ${dbName}:`, error);
    }
  }
  // Clear the cache
  Object.keys(dbPool).forEach(key => delete dbPool[key]);
}

module.exports = { 
  getChurchDbConnection,
  closeAllConnections
};