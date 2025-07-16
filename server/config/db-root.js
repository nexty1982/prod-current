// config/db-root.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const rootPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.ROOT_DB_USER || 'superadmin',
  password: process.env.ROOT_DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

module.exports = { rootPool };
