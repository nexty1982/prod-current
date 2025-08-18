// server/debug/test-session-persistence.js
const mysql = require('mysql2/promise');

async function testSessionPersistence() {
  console.log('🔍 Session Persistence Diagnostic');
  console.log('==================================');

  try {
    // Connect to database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'orthodoxapps',
      password: process.env.DB_PASSWORD || 'Summerof1982@!',
      database: process.env.DB_NAME || 'orthodoxmetrics_db',
    });

    console.log('✅ Database connected');

    // Check sessions table
    const [sessions] = await connection.execute(`
      SELECT 
        session_id, 
        FROM_UNIXTIME(expires) as expires_readable,
        CASE WHEN FROM_UNIXTIME(expires) > NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END as status,
        CHAR_LENGTH(data) as data_size,
        data
      FROM sessions 
      ORDER BY expires DESC 
      LIMIT 10
    `);

    console.log(`\n📊 Recent Sessions (${sessions.length} found):`);
    sessions.forEach(session => {
      console.log(`   ID: ${session.session_id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Expires: ${session.expires_readable}`);
      console.log(`   Data Size: ${session.data_size} bytes`);
      
      // Try to parse session data
      try {
        const sessionData = JSON.parse(session.data);
        if (sessionData.user) {
          console.log(`   User: ${sessionData.user.email} (${sessionData.user.role})`);
        } else {
          console.log(`   User: No user data in session`);
        }
      } catch (parseErr) {
        console.log(`   User: Cannot parse session data`);
      }
      console.log('   ---');
    });

    // Look for the specific session from the logs
    const loginSessionId = '7cCukbYpb-zdYa0b_oA1MXR-hQmgDre9';
    console.log(`\n🔍 Looking for login session: ${loginSessionId}`);
    
    const [specificSession] = await connection.execute(
      'SELECT * FROM sessions WHERE session_id = ?',
      [loginSessionId]
    );

    if (specificSession.length > 0) {
      console.log('✅ Login session found in database');
      const sessionData = JSON.parse(specificSession[0].data);
      console.log('   User data:', sessionData.user);
    } else {
      console.log('❌ Login session NOT found in database');
    }

    await connection.end();

  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

// Set environment
process.env.NODE_ENV = 'production';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'orthodoxapps';
process.env.DB_PASSWORD = 'Summerof1982@!';
process.env.DB_NAME = 'orthodoxmetrics_db';

testSessionPersistence(); 