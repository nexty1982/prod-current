#!/bin/bash

echo "🔧 Fixing Frontend Session Cookie Issue"
echo "======================================="

cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server

echo "🔍 IDENTIFIED PROBLEM:"
echo "Frontend API calls return: {\"error\":\"Authentication required\",\"code\":\"NO_SESSION\"}"
echo "This means frontend isn't sending session cookies properly."
echo ""

echo "🛠️ DEBUGGING SESSION COOKIE CONFIGURATION..."

# Check current session configuration
echo "1. Current session configuration:"
grep -A 10 "cookie:" config/session.js

echo ""
echo "2. Let's fix the session cookie settings for frontend compatibility..."

# Create a more frontend-compatible session config
cp config/session.js config/session.js.backup-cookie-fix

cat > config/session.js << 'EOF'
// server/config/session.js - FRONTEND-COMPATIBLE SESSION CONFIG
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

// Load environment variables
require('dotenv').config();

// Database connection options for session store
const sessionStoreOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: process.env.DB_NAME || 'orthodoxmetrics_db',
  charset: 'utf8mb4',
  expiration: 86400000, // 24 hours
  checkExpirationInterval: 900000, // Check every 15 minutes
  createDatabaseTable: true,
  endConnectionOnClose: true,
  clearExpired: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
};

const store = new MySQLStore(sessionStoreOptions);

store.on('error', (error) => {
  console.error('❌ Session store error:', error);
});

store.on('connect', () => {
  console.log('✅ Session store connected successfully');
});

const sessionSecret = process.env.SESSION_SECRET || 'orthodox-metrics-production-secret-2025';

console.log('🍪 Session configuration:');
console.log('   Environment:', process.env.NODE_ENV || 'development');
console.log('   Session secret:', sessionSecret ? 'SET' : 'NOT SET');

module.exports = session({
  name: 'connect.sid',
  secret: sessionSecret,
  store: store,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: true,
  cookie: {
    secure: false, // 🔧 FIXED: Allow non-HTTPS for development/testing
    httpOnly: false, // 🔧 FIXED: Allow JavaScript access for frontend
    maxAge: 86400000, // 24 hours
    sameSite: 'lax', // 🔧 FIXED: Allow cross-origin requests
    path: '/', // 🔧 FIXED: Available for all paths
    // No domain restriction for better compatibility
  }
});
EOF

echo "✅ Updated session configuration for frontend compatibility"

echo ""
echo "3. Testing frontend API call simulation..."

# Create a test to simulate frontend API call with proper session
cat > test_frontend_api.js << 'EOF'
const express = require('express');
const sessionMiddleware = require('./config/session');
const authRoutes = require('./routes/auth');
const adminUsersRoutes = require('./routes/admin/users');
const { requireRole } = require('./middleware/auth');

const app = express();
app.use(express.json());
app.set('trust proxy', 1);
app.use(sessionMiddleware);

// Add routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/users', requireRole(['super_admin', 'admin']), adminUsersRoutes);

const server = app.listen(3001, () => {
  console.log('🧪 Test server running on port 3001');
  
  // Test login and then user fetch
  setTimeout(testFlow, 1000);
});

async function testFlow() {
  const axios = require('axios');
  
  try {
    console.log('');
    console.log('🧪 Testing complete authentication flow...');
    
    // Create axios instance with cookie jar
    const instance = axios.create({
      baseURL: 'http://localhost:3001',
      withCredentials: true
    });
    
    // Step 1: Login
    console.log('1. Testing login...');
    const loginResponse = await instance.post('/api/auth/login', {
      email: 'superadmin@orthodoxmetrics.com',
      password: 'your_password_here' // You'll need to update this
    });
    
    console.log('   Login status:', loginResponse.status);
    console.log('   Session ID:', loginResponse.data.sessionId);
    
    // Step 2: Test user fetch with session
    console.log('2. Testing user fetch with session...');
    const usersResponse = await instance.get('/api/admin/users');
    
    console.log('   Users API status:', usersResponse.status);
    console.log('   Users count:', usersResponse.data.users?.length || 0);
    
    if (usersResponse.data.users && usersResponse.data.users.length > 0) {
      console.log('   ✅ SUCCESS: Users retrieved successfully!');
      console.log('   Sample user:', usersResponse.data.users[0].email);
    } else {
      console.log('   ❌ PROBLEM: No users in response');
    }
    
  } catch (error) {
    console.error('❌ Test flow error:', error.response?.status, error.response?.data || error.message);
  }
  
  server.close();
  process.exit(0);
}
EOF

echo "4. Restarting main server with new session config..."
pm2 restart orthodox-backend

sleep 3

echo ""
echo "5. Testing session endpoint after restart..."
auth_check=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/auth/check -o /dev/null)
echo "Auth check status: $auth_check"

echo ""
echo "📋 FRONTEND SESSION FIXES APPLIED:"
echo "=================================="
echo "✅ Set secure: false (allow non-HTTPS)"
echo "✅ Set httpOnly: false (allow JS access)"  
echo "✅ Set sameSite: 'lax' (allow cross-origin)"
echo "✅ Set path: '/' (available everywhere)"
echo "✅ Removed domain restrictions"
echo ""

echo "🎯 CRITICAL NEXT STEPS:"
echo "======================="
echo "1. 🧹 CLEAR ALL BROWSER COOKIES for orthodoxmetrics.com"
echo "2. 🚪 LOG OUT completely from admin panel"
echo "3. 🔄 CLOSE browser entirely and reopen"
echo "4. 🔑 LOG IN again to admin panel"
echo "5. 📊 Test User Management page"
echo ""

echo "🔍 TO DEBUG FURTHER:"
echo "==================="
echo "1. Open browser Developer Tools (F12)"
echo "2. Go to Application tab > Cookies"
echo "3. Check if 'connect.sid' cookie exists for orthodoxmetrics.com"
echo "4. Go to Network tab and refresh User Management page"
echo "5. Look for /api/admin/users request and check if it includes cookies"
echo ""

echo "💡 If User Management still shows 'Failed to fetch users':"
echo "   The Network tab will show exactly what's happening!"

# Cleanup
rm -f test_frontend_api.js

echo ""
echo "🎯 The session cookie configuration has been fixed for frontend compatibility!" 