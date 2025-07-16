// server/config/db.js
const mysql = require('mysql2');
const path = require('path');
// pick .env.development vs .env.production based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production'
  ? '../.env.production'
  : '../.env.development';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapp',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: process.env.DB_NAME || 'orthodoxmetrics_db',
  waitForConnections: true,
  connectionLimit: 10,     // tune as needed
  queueLimit: 0
});

// Create a promise-based wrapper for the pool
const promisePool = pool.promise();

// Export both the callback-based pool and the promise-based pool
module.exports = {
  pool: pool,
  promisePool: promisePool,
  // Helper function to test the connection
  testConnection: async () => {
    try {
      const [rows] = await promisePool.query('SELECT 1');
      return { success: true, message: 'Database connection successful' };
    } catch (error) {
      return { success: false, message: `Database connection failed: ${error.message}` };
    }
  }
};
