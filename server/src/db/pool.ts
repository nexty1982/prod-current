import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Main database pool
export const mainPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: 'orthodoxmetrics_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Auth database pool
export const authPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: 'orthodoxmetrics_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Logging database pool
export const loggingPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Summerof2025@!',
  database: 'om_logging_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Function to get church-specific database pool
export function getChurchPool(churchId: number | string) {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Summerof2025@!',
    database: `om_church_${churchId}`,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });
}

export default { mainPool, authPool, loggingPool, getChurchPool };
