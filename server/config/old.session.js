// server/config/session.js
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const path = require('path');
// pick the correct .env
const envFile = process.env.NODE_ENV === 'production'
  ? '../.env.production'
  : '../.env.development';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

// DB connection options
const dbOptions = {
  host: process.env.DB_HOST || '0.0.0.0',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'orthodoxapp',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: process.env.DB_NAME || 'orthodoxmetrics_db',
  connectTimeout: 10000, // 10 seconds
  waitForConnections: true,
  connectionLimit: 10
};

const store = new MySQLStore(dbOptions);

console.log('🔧 Session configuration:');
console.log('   SESSION_SECRET:', process.env.SESSION_SECRET ? '***set***' : 'MISSING');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   Store configured:', !!store);

module.exports = session({
  key: process.env.SESSION_KEY || 'ssppoc.sid',
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-for-development',
  store,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: true,        // Required for HTTPS/SSL
    httpOnly: true,      // Security best practice
    maxAge: 1000 * 60 * 60 * 24,      // 1 day
    sameSite: 'none',    // Required for cross-origin requests over HTTPS
  }
});