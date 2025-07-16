#!/usr/bin/env node

/**
 * Diagnostic Script for Churches API 500 Error
 * 
 * This script specifically investigates the 500 error on /api/churches
 * and provides detailed debugging information.
 */

const axios = require('axios');

class ChurchesApiDiagnostic {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3001';
  }

  async diagnoseChurchesApi() {
    console.log('🔍 Diagnosing Churches API 500 Error');
    console.log('=' .repeat(50));
    console.log('');

    const url = `${this.baseUrl}/api/churches`;
    
    try {
      console.log(`Testing: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true // Don't throw on error status
      });

      console.log(`Status: ${response.status}`);
      console.log(`Status Text: ${response.statusText}`);
      console.log(`Content-Type: ${response.headers['content-type']}`);
      console.log('');

      if (response.status === 500) {
        console.log('🔥 SERVER ERROR DETAILS:');
        console.log('-'.repeat(30));
        
        // Log the full response data for 500 errors
        if (response.data) {
          console.log('Response Data:', JSON.stringify(response.data, null, 2));
        }
        
        // Check if it's a database connection error
        if (typeof response.data === 'string') {
          if (response.data.includes('ECONNREFUSED')) {
            console.log('❌ Database connection refused');
            console.log('💡 Check if MySQL/MariaDB is running');
            console.log('💡 Verify database connection settings in .env');
          } else if (response.data.includes('ER_ACCESS_DENIED')) {
            console.log('❌ Database access denied');
            console.log('💡 Check database credentials in .env');
          } else if (response.data.includes('Unknown database')) {
            console.log('❌ Database does not exist');
            console.log('💡 Create the database or check database name in .env');
          } else if (response.data.includes('Table') && response.data.includes("doesn't exist")) {
            console.log('❌ Churches table does not exist');
            console.log('💡 Run database migrations to create the churches table');
          } else {
            console.log('❌ Unknown server error');
            console.log('Raw response:', response.data.substring(0, 500) + '...');
          }
        }
        
      } else if (response.status === 200) {
        console.log('✅ Churches API is working correctly');
        if (response.data && response.data.length) {
          console.log(`Found ${response.data.length} churches`);
        }
      } else {
        console.log(`⚠️  Unexpected status: ${response.status}`);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
      }

    } catch (error) {
      console.log('💥 REQUEST ERROR:');
      console.log('-'.repeat(30));
      
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Connection refused');
        console.log('💡 Is the server running on port 3001?');
        console.log('💡 Check if the application is started');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('❌ Request timeout');
        console.log('💡 Server may be overloaded or stuck');
      } else {
        console.log('❌ Network error:', error.message);
      }
    }

    console.log('');
    console.log('🔧 TROUBLESHOOTING STEPS:');
    console.log('-'.repeat(30));
    console.log('1. Check server logs for detailed error messages');
    console.log('2. Verify database connection and credentials');
    console.log('3. Ensure churches table exists in the database');
    console.log('4. Test database connection manually');
    console.log('5. Check if authentication middleware is causing issues');
  }

  async testDatabaseConnection() {
    console.log('\n🗄️  Testing Database Connection Separately');
    console.log('=' .repeat(50));
    
    try {
      // Try to require the database connection directly
      const { promisePool } = require('../config/db');
      
      console.log('✅ Database module loaded successfully');
      
      // Test basic query
      const [result] = await promisePool.query('SELECT 1 as test');
      console.log('✅ Database connection successful');
      console.log('Test query result:', result);
      
      // Check if churches table exists
      const [tables] = await promisePool.query(
        "SHOW TABLES LIKE 'churches'"
      );
      
      if (tables.length > 0) {
        console.log('✅ Churches table exists');
        
        // Get table structure
        const [structure] = await promisePool.query(
          'DESCRIBE churches'
        );
        console.log('✅ Churches table structure:');
        structure.forEach(col => {
          console.log(`   ${col.Field}: ${col.Type}`);
        });
        
        // Count records
        const [count] = await promisePool.query(
          'SELECT COUNT(*) as total FROM churches'
        );
        console.log(`✅ Churches table has ${count[0].total} records`);
        
      } else {
        console.log('❌ Churches table does not exist');
        console.log('💡 You need to run database migrations');
      }
      
    } catch (error) {
      console.log('❌ Database test failed:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('💡 MySQL/MariaDB is not running');
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log('💡 Check database credentials in .env file');
      } else if (error.code === 'ER_BAD_DB_ERROR') {
        console.log('💡 Database does not exist - create it first');
      }
    }
  }

  async run() {
    await this.diagnoseChurchesApi();
    await this.testDatabaseConnection();
    
    console.log('\n✅ Diagnostic complete!');
    console.log('Check the output above for specific issues and solutions.');
  }
}

// Run if called directly
if (require.main === module) {
  const diagnostic = new ChurchesApiDiagnostic();
  diagnostic.run().catch(error => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  });
}

module.exports = ChurchesApiDiagnostic;
