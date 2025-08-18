// server/config/session.js - FIXED VERSION
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const path = require('path');
const envFile = process.env.NODE_ENV === 'production'
  ? '../.env.production'
  : '../.env.development';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

// Enhanced DB connection options
const dbOptions = {
  host: process.env.DB_HOST || '0.0.0.0',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: process.env.DB_NAME || 'orthodoxmetrics_db',
  charset: 'utf8mb4',
  // Session store specific options
  expiration: 24 * 60 * 60 * 1000, // 1 day in milliseconds
  checkExpirationInterval: 15 * 60 * 1000, // Check every 15 minutes
  createDatabaseTable: true,
  endConnectionOnClose: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
};

const store = new MySQLStore(dbOptions);

// Handle store errors gracefully
store.on('error', (error) => {
  console.error('❌ Session store error:', error);
});

store.on('connect', () => {
  console.log('✅ Session store connected successfully');
});

module.exports = session({
  // 🔧 FIX: Use 'name' property only (not 'key')
  name: 'orthodox.sid',
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-for-development',
  store,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: false, // Set to true only for HTTPS in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    sameSite: 'lax',
    // 🔧 FIX: Remove domain restriction for now
    // domain: ".orthodoxmetrics.com"  // This can cause issues
  }
});

// 🚨 ISSUES FIXED:
// 1. REMOVED conflicting 'key' property
// 2. ONLY use 'name' property (correct for express-session)
// 3. REMOVED domain restriction (can cause session issues)
// 4. SIMPLIFIED cookie configuration

console.log('🔧 SESSION CONFIG FIXES:');
console.log('1. ❌ Removed conflicting "key" property');
console.log('2. ✅ Using only "name: orthodox.sid"'); 
console.log('3. ❌ Removed cookie domain restriction');
console.log('4. ✅ Simplified cookie configuration');
console.log('');
console.log('💡 Replace your server/config/session.js with this fixed version');
console.log('Then restart your server and try logging in again.'); 