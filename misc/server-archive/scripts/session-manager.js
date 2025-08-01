#!/usr/bin/env node

const mysql = require('mysql2/promise');
const readline = require('readline');
const path = require('path');

// Import database config
const { promisePool } = require('../config/db.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class SessionManager {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      // Use the existing pool connection
      this.connection = promisePool;
      console.log('✅ Connected to MySQL database');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }
  }

  async disconnect() {
    // Note: We don't need to close the pool connection manually
    console.log('🔌 Database connection ready to close');
  }

  async listSessions() {
    try {
      // Use the same query as the web interface for consistency
      const [rows] = await this.connection.execute(`
        SELECT DISTINCT
          COALESCE(s.session_id, CONCAT('logged_out_', al.id)) as session_id,
          al.user_id,
          u.email,
          u.first_name,
          u.last_name,
          u.role,
          c.name as church_name,
          al.ip_address,
          al.user_agent,
          al.created_at as login_time,
          CASE 
            WHEN s.session_id IS NOT NULL AND s.expires > UNIX_TIMESTAMP() THEN 1 
            ELSE 0 
          END as is_active,
          CASE 
            WHEN s.session_id IS NOT NULL AND s.expires > UNIX_TIMESTAMP() 
            THEN ROUND((s.expires - UNIX_TIMESTAMP()) / 60)
            ELSE 0 
          END as minutes_until_expiry,
          CASE 
            WHEN s.session_id IS NOT NULL THEN FROM_UNIXTIME(s.expires)
            ELSE NULL
          END as expires,
          s.expires as raw_expires,
          CHAR_LENGTH(s.data) as data_size
        FROM activity_log al
        JOIN users u ON al.user_id = u.id
        LEFT JOIN churches c ON u.church_id = c.id
        LEFT JOIN sessions s ON JSON_EXTRACT(s.data, '$.user.id') = al.user_id
        WHERE al.action = 'login'
        ORDER BY al.created_at DESC
        LIMIT 50
      `);

      console.log('\n📋 Current Sessions (Web Interface View):');
      console.log('=' .repeat(80));
      console.log(`Total sessions: ${rows.length}`);
      
      const activeSessions = rows.filter(row => row.is_active);
      const expiredSessions = rows.filter(row => !row.is_active);
      
      console.log(`Active sessions: ${activeSessions.length}`);
      console.log(`Expired/Logged out sessions: ${expiredSessions.length}`);
      console.log('=' .repeat(80));

      if (rows.length === 0) {
        console.log('🎉 No sessions found!');
        return rows;
      }

      rows.forEach((row, index) => {
        const sessionId = row.session_id;
        const isActive = row.is_active === 1;
        const expires = row.expires ? new Date(row.expires) : null;
        
        console.log(`\n${index + 1}. ${isActive ? '✅ ACTIVE' : '❌ INACTIVE'} Session: ${sessionId.substring(0, 20)}...`);
        
        if (expires) {
          console.log(`   📅 Expires: ${expires.toLocaleString()}`);
          console.log(`   ⏰ Minutes until expiry: ${row.minutes_until_expiry}`);
        } else {
          console.log(`   📅 Expires: N/A (logged out)`);
        }
        
        console.log(`   👤 User: ${row.email} (${row.first_name} ${row.last_name})`);
        console.log(`   🏛️ Church: ${row.church_name || 'N/A'}`);
        console.log(`   🔑 Role: ${row.role}`);
        console.log(`   🌐 IP: ${row.ip_address}`);
        console.log(`   📱 User Agent: ${row.user_agent ? row.user_agent.substring(0, 50) + '...' : 'N/A'}`);
        console.log(`   � Login Time: ${new Date(row.login_time).toLocaleString()}`);
        
        if (row.data_size) {
          console.log(`   � Session Data: ${row.data_size} bytes`);
        }
      });

      // Also show raw sessions table
      console.log('\n� Raw Sessions Table:');
      console.log('-'.repeat(50));
      
      const [rawSessions] = await this.connection.execute(`
        SELECT session_id, expires, CHAR_LENGTH(data) as data_size,
               JSON_EXTRACT(data, '$.user.id') as user_id,
               JSON_EXTRACT(data, '$.user.email') as user_email
        FROM sessions 
        ORDER BY expires DESC
      `);
      
      console.log(`Raw sessions count: ${rawSessions.length}`);
      rawSessions.forEach((row, index) => {
        const expires = new Date(row.expires * 1000); // Convert Unix timestamp to JS timestamp
        const isExpired = expires < new Date();
        const userEmail = row.user_email ? JSON.parse(row.user_email) : 'Not logged in';
        
        console.log(`${index + 1}. ${row.session_id.substring(0, 15)}... | ${expires.toLocaleString()} | ${isExpired ? 'EXPIRED' : 'ACTIVE'} | ${userEmail}`);
      });

      return rows;
    } catch (error) {
      console.error('❌ Error listing sessions:', error.message);
      console.error('Stack trace:', error.stack);
      return [];
    }
  }

  async killAllSessions() {
    try {
      const [result] = await this.connection.execute('DELETE FROM sessions');
      
      console.log(`\n🔥 KILLED ALL SESSIONS!`);
      console.log(`   Sessions terminated: ${result.affectedRows}`);
      
      // Log this action
      await this.logActivity('SYSTEM', 'kill_all_sessions', {
        sessions_terminated: result.affectedRows,
        timestamp: new Date().toISOString(),
        action_type: 'bulk_session_termination'
      });

      return result.affectedRows;
    } catch (error) {
      console.error('❌ Error killing sessions:', error.message);
      return 0;
    }
  }

  async logActivity(userId, action, details) {
    try {
      await this.connection.execute(
        'INSERT INTO activity_log (user_id, action, changes, timestamp) VALUES (?, ?, ?, NOW())',
        [userId, action, JSON.stringify(details)]
      );
    } catch (error) {
      console.error('⚠️ Warning: Could not log activity:', error.message);
    }
  }

  async showMenu() {
    console.log('\n🎛️  Session Manager Menu:');
    console.log('1. List all sessions');
    console.log('2. Kill all sessions');
    console.log('3. Refresh view');
    console.log('4. Exit');
    console.log('-'.repeat(30));
  }

  async promptUser(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async run() {
    console.log('🔐 Orthodox Metrics Session Manager');
    console.log('=' .repeat(40));
    
    await this.connect();

    try {
      while (true) {
        await this.showMenu();
        const choice = await this.promptUser('Choose an option (1-4): ');

        switch (choice) {
          case '1':
            await this.listSessions();
            break;

          case '2':
            console.log('\n⚠️  WARNING: This will terminate ALL active sessions!');
            console.log('   All users will be logged out immediately.');
            const confirm = await this.promptUser('Are you sure? Type "YES" to confirm: ');
            
            if (confirm === 'YES') {
              const terminated = await this.killAllSessions();
              if (terminated > 0) {
                console.log('\n✅ All sessions have been terminated successfully!');
              } else {
                console.log('\n⚠️  No sessions were found to terminate.');
              }
            } else {
              console.log('❌ Operation cancelled.');
            }
            break;

          case '3':
            console.log('\n🔄 Refreshing...');
            await this.listSessions();
            break;

          case '4':
            console.log('\n👋 Goodbye!');
            await this.disconnect();
            rl.close();
            process.exit(0);
            break;

          default:
            console.log('❌ Invalid choice. Please select 1-4.');
            break;
        }

        // Pause before showing menu again
        await this.promptUser('\n📥 Press Enter to continue...');
      }
    } catch (error) {
      console.error('💥 Fatal error:', error.message);
      await this.disconnect();
      rl.close();
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  rl.close();
  process.exit(0);
});

// Run the session manager
const sessionManager = new SessionManager();
sessionManager.run().catch(console.error);
