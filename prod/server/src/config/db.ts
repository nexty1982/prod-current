import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool for orthodoxmetrics_db
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'orthodoxmetrics_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection on startup
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected to orthodoxmetrics_db');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

export default pool;
