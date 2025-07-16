// server/config/session.js - UPDATED VERSION
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
  user: process.env.DB_USER || 'orthodoxapp',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: process.env.DB_NAME || 'orthodoxmetrics_db',
  connectTimeout: 30000, // Increased to 30 seconds
  acquireTimeout: 30000,
  waitForConnections: true,
  connectionLimit: 20, // Increased pool size
  queueLimit: 0,
  reconnect: true,
  // Session store specific options
  expiration: 24 * 60 * 60 * 1000, // 1 day in milliseconds
  checkExpirationInterval: 15 * 60 * 1000, // Check every 15 minutes
  createDatabaseTable: true,
  endConnectionOnClose: true,
  charset: 'utf8mb4',
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
  key: process.env.SESSION_KEY || 'orthodox.sid',
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-for-development',
  store,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: false,
    //secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // SECURITY FIX: Prevent XSS attacks
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    sameSite: 'lax'
    //sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Consistent setting
    //domain: process.env.NODE_ENV === 'production' ? '.orthodoxmetrics.com' : undefined
  },
  // Add session name for better identification
  name: 'orthodox.sid'
});
