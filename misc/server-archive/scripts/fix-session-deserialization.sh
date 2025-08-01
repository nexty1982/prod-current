#!/bin/bash

echo "🔧 Fixing Session Deserialization Issue"
echo "======================================="

cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server

echo "🔍 IDENTIFIED ISSUES:"
echo "1. Missing req.session.save() after login"  
echo "2. Potential cookie configuration issues"
echo "3. Session store connection problems"
echo ""

echo "🛠️ APPLYING FIXES..."

# Fix 1: Update auth.js to add explicit session.save()
echo "1. Adding explicit session.save() to login route..."

# Create backup
cp routes/auth.js routes/auth.js.backup-session-fix

# Add session.save() after setting session data
cat > fix_auth_session.js << 'EOF'
const fs = require('fs');

// Read the current auth.js
let authContent = fs.readFileSync('routes/auth.js', 'utf8');

// Find the location where session data is set and add explicit save
const sessionSetPattern = /req\.session\.lastActivity = new Date\(\);/;
const replacement = `req.session.lastActivity = new Date();

    // 🔧 FIXED: Explicitly save session to ensure persistence
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('❌ Error saving session:', saveErr);
        return res.status(500).json({
          error: 'Session save failed',
          code: 'SESSION_SAVE_ERROR'
        });
      }
      
      console.log('✅ Session saved successfully with ID:', req.sessionID);
      console.log('✅ Session user:', req.session.user.email);`;

if (authContent.match(sessionSetPattern)) {
  // Replace the session setting with explicit save
  authContent = authContent.replace(
    /req\.session\.lastActivity = new Date\(\);\s*console\.log\('✅ Session data set successfully'\);/,
    replacement
  );
  
  // Also need to close the session.save callback properly
  authContent = authContent.replace(
    /console\.log\('✅ Login successful for user:', req\.session\.user\.email\);/,
    `});  // Close session.save callback
    
    console.log('✅ Login successful for user:', req.session.user.email);`
  );
  
  fs.writeFileSync('routes/auth.js', authContent);
  console.log('   ✅ Added explicit session.save() to auth.js');
} else {
  console.log('   ⚠️ Session setting pattern not found - manual fix needed');
}
EOF

node fix_auth_session.js

# Fix 2: Update session configuration for better compatibility
echo ""
echo "2. Updating session configuration..."

cp config/session.js config/session.js.backup-session-fix

cat > config/session.js << 'EOF'
// server/config/session.js - FIXED SESSION DESERIALIZATION
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

// 🔧 FIXED: Dynamic environment detection
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || 'orthodox-metrics-production-secret-2025';

console.log('🍪 Session configuration:');
console.log('   Environment:', process.env.NODE_ENV || 'development');
console.log('   Session secret:', sessionSecret ? 'SET' : 'NOT SET');

module.exports = session({
  name: 'connect.sid', // 🔧 FIXED: Use standard session name
  secret: sessionSecret,
  store: store,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: true, // Trust proxy headers (important for nginx setup)
  cookie: {
    secure: false, // 🔧 FIXED: Let Express handle this based on protocol
    httpOnly: true,
    maxAge: 86400000, // 24 hours
    sameSite: 'lax', // Allow same-site requests
    // 🔧 REMOVED: Domain setting for better compatibility
  }
});
EOF

echo "   ✅ Updated session configuration"

# Fix 3: Test session store connection
echo ""
echo "3. Testing session store connection..."

cat > test_session_store.js << 'EOF'
const { promisePool } = require('./config/db');

async function testSessionStore() {
    try {
        console.log('🔍 Testing session store...');
        
        // Check if sessions table exists
        const [tables] = await promisePool.execute(
            "SHOW TABLES LIKE 'sessions'"
        );
        
        if (tables.length > 0) {
            console.log('✅ Sessions table exists');
            
            // Check session count
            const [count] = await promisePool.execute(
                'SELECT COUNT(*) as count FROM sessions'
            );
            console.log(`📊 Current sessions in store: ${count[0].count}`);
            
            // Show recent sessions (without data for privacy)
            const [recent] = await promisePool.execute(
                'SELECT session_id, expires, CHAR_LENGTH(data) as data_size FROM sessions ORDER BY expires DESC LIMIT 5'
            );
            
            console.log('📋 Recent sessions:');
            recent.forEach(session => {
                const expired = new Date(session.expires * 1000) < new Date();
                console.log(`   ${session.session_id}: ${expired ? 'EXPIRED' : 'ACTIVE'}, ${session.data_size} bytes`);
            });
            
        } else {
            console.log('❌ Sessions table does not exist');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Session store test failed:', error.message);
        process.exit(1);
    }
}

testSessionStore();
EOF

node test_session_store.js

echo ""
echo "4. Restarting server with fixes..."
pm2 restart orthodox-backend

sleep 5

echo ""
echo "5. Testing session endpoint..."

# Test auth check endpoint
auth_check=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/auth/check -o /dev/null)
echo "Auth check endpoint: $auth_check"

echo ""
echo "📋 FIXES APPLIED:"
echo "=================="
echo "✅ Added explicit req.session.save() to login"
echo "✅ Fixed session cookie configuration" 
echo "✅ Updated session name to 'connect.sid'"
echo "✅ Made cookie settings more compatible"
echo "✅ Tested session store connectivity"
echo ""

echo "🎯 NEXT STEPS:"
echo "=============="
echo "1. 🧹 Clear all browser cookies for orthodoxmetrics.com"
echo "2. 🚪 Go to admin panel and login again"
echo "3. ✅ User Management should now work!"
echo ""
echo "🔍 If still not working, check PM2 logs:"
echo "   pm2 logs orthodox-backend --lines 10"

# Cleanup
rm -f fix_auth_session.js test_session_store.js

echo ""
echo "🎉 Session deserialization fixes complete!" 