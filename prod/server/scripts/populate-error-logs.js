// Script to populate test data in omai_error_tracking_db
const mysql = require('mysql2/promise');

async function populateErrorLogs() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'omai_error_tracking_db'
  });

  try {
    console.log('🔄 Populating test error logs...');

    // Sample error data
    const errors = [
      {
        hash: 'ERR001_' + Date.now(),
        type: 'frontend',
        source: 'React Component',
        message: 'Cannot read property "map" of undefined',
        severity: 'high',
        log_level: 'ERROR',
        source_component: 'UserList',
      },
      {
        hash: 'ERR002_' + Date.now(),
        type: 'backend',
        source: 'API Gateway',
        message: 'Database connection timeout',
        severity: 'critical',
        log_level: 'ERROR',
        source_component: 'system',
      },
      {
        hash: 'ERR003_' + Date.now(),
        type: 'api',
        source: 'Authentication Service',
        message: 'Invalid JWT token',
        severity: 'medium',
        log_level: 'WARN',
        source_component: 'auth',
      },
      {
        hash: 'ERR004_' + Date.now(),
        type: 'backend',
        source: 'File Upload Service',
        message: 'File size exceeds maximum limit',
        severity: 'low',
        log_level: 'INFO',
        source_component: 'upload',
      },
      {
        hash: 'ERR005_' + Date.now(),
        type: 'db',
        source: 'MySQL',
        message: 'Deadlock found when trying to get lock',
        severity: 'high',
        log_level: 'ERROR',
        source_component: 'database',
      },
      {
        hash: 'ERR006_' + Date.now(),
        type: 'frontend',
        source: 'Menu Configuration',
        message: 'Failed to load menu items',
        severity: 'medium',
        log_level: 'ERROR',
        source_component: 'menu',
      },
      {
        hash: 'ERR007_' + Date.now(),
        type: 'backend',
        source: 'Session Manager',
        message: 'Session expired for user',
        severity: 'low',
        log_level: 'INFO',
        source_component: 'system',
      },
      {
        hash: 'ERR008_' + Date.now(),
        type: 'api',
        source: 'OMAI Logger',
        message: 'WebSocket connection failed',
        severity: 'medium',
        log_level: 'WARN',
        source_component: 'logger',
      }
    ];

    // Insert errors
    for (const error of errors) {
      const now = new Date();
      const firstSeen = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000); // Random time in last 24 hours
      
      const [result] = await connection.execute(
        `INSERT INTO errors (
          hash, type, source, message, first_seen, last_seen,
          occurrences, status, severity, log_level, source_component
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          error.hash,
          error.type,
          error.source,
          error.message,
          firstSeen,
          now,
          Math.floor(Math.random() * 50) + 1, // Random occurrences
          'pending',
          error.severity,
          error.log_level,
          error.source_component
        ]
      );

      // Add some error events
      const eventCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < eventCount; i++) {
        await connection.execute(
          `INSERT INTO error_events (
            error_id, occurred_at, user_agent, session_id, additional_context
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            result.insertId,
            new Date(firstSeen.getTime() + Math.random() * (now.getTime() - firstSeen.getTime())),
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'session_' + Math.random().toString(36).substr(2, 9),
            JSON.stringify({
              user: 'test_user_' + Math.floor(Math.random() * 10),
              church_id: Math.floor(Math.random() * 5) + 1,
              ip_address: '192.168.1.' + Math.floor(Math.random() * 255)
            })
          ]
        );
      }
    }

    console.log(`✅ Inserted ${errors.length} test errors`);

    // Display summary
    const [summary] = await connection.execute(`
      SELECT 
        COUNT(*) as total_errors,
        COUNT(DISTINCT type) as error_types,
        COUNT(DISTINCT severity) as severity_levels
      FROM errors
    `);

    console.log('\n📊 Database Summary:');
    console.log(`   Total Errors: ${summary[0].total_errors}`);
    console.log(`   Error Types: ${summary[0].error_types}`);
    console.log(`   Severity Levels: ${summary[0].severity_levels}`);

    const [distribution] = await connection.execute(`
      SELECT 
        severity,
        COUNT(*) as count
      FROM errors
      GROUP BY severity
    `);

    console.log('\n📈 Severity Distribution:');
    distribution.forEach(row => {
      console.log(`   ${row.severity}: ${row.count} errors`);
    });

  } catch (error) {
    console.error('❌ Error populating logs:', error);
  } finally {
    await connection.end();
  }
}

// Run the script
populateErrorLogs().then(() => {
  console.log('\n✅ Test data population complete!');
  console.log('📝 You can now check the OMAI Logger interface');
}).catch(console.error);
