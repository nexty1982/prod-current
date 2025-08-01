#!/usr/bin/env node

/**
 * Orthodox Metrics - Unified Testing Suite
 * Consolidates: test-ocr-*.js, debug-ocr-*.js, test-api-*.js
 * Provides: Comprehensive testing with different levels
 */

const path = require('path');
const fs = require('fs').promises;
const mysql = require('mysql2/promise');
const axios = require('axios');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorLog(message, color = 'white') {
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

class OrthodoxTestSuite {
  constructor(options = {}) {
    this.options = {
      level: 'basic', // basic, full, debug
      skipOcr: false,
      skipApi: false,
      skipDatabase: false,
      baseUrl: 'http://localhost:3000',
      ...options
    };
    
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
  }

  async runTest(testName, testFunction, required = true) {
    colorLog(`\n🧪 Testing: ${testName}`, 'cyan');
    colorLog('─'.repeat(50), 'blue');
    
    try {
      const result = await testFunction();
      
      if (result.success) {
        colorLog(`✅ PASS: ${testName}`, 'green');
        if (result.details) {
          colorLog(`   ${result.details}`, 'blue');
        }
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'PASS', details: result.details });
      } else {
        throw new Error(result.error || 'Test failed');
      }
      
    } catch (error) {
      const message = `❌ FAIL: ${testName} - ${error.message}`;
      colorLog(message, 'red');
      
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAIL', error: error.message });
      
      if (required && this.options.level !== 'debug') {
        throw new Error(`Required test failed: ${testName}`);
      }
    }
  }

  async testDatabaseConnection() {
    return this.runTest('Database Connection', async () => {
      const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'orthodoxmetrics',
        port: process.env.DB_PORT || 3306
      };

      const connection = await mysql.createConnection(config);
      
      // Test basic query
      const [rows] = await connection.execute('SELECT 1 as test');
      await connection.end();
      
      if (rows[0].test === 1) {
        return { 
          success: true, 
          details: `Connected to ${config.host}:${config.port}/${config.database}` 
        };
      } else {
        return { success: false, error: 'Invalid query result' };
      }
    });
  }

  async testDatabaseTables() {
    return this.runTest('Database Tables', async () => {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'orthodoxmetrics'
      });

      const requiredTables = [
        'church_info',
        'users', 
        'baptism_records',
        'marriage_records',
        'funeral_records'
      ];

      const [tables] = await connection.execute('SHOW TABLES');
      const existingTables = tables.map(row => Object.values(row)[0]);
      
      await connection.end();

      const missingTables = requiredTables.filter(table => 
        !existingTables.includes(table)
      );

      if (missingTables.length === 0) {
        return { 
          success: true, 
          details: `Found ${existingTables.length} tables including all required ones` 
        };
      } else {
        return { 
          success: false, 
          error: `Missing tables: ${missingTables.join(', ')}` 
        };
      }
    });
  }

  async testApiHealthEndpoint() {
    return this.runTest('API Health Endpoint', async () => {
      try {
        const response = await axios.get(`${this.options.baseUrl}/api/health`, {
          timeout: 5000
        });

        if (response.status === 200 && response.data.status === 'OK') {
          return { 
            success: true, 
            details: `Server responding at ${this.options.baseUrl}` 
          };
        } else {
          return { 
            success: false, 
            error: `Unexpected response: ${response.status}` 
          };
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          return { 
            success: false, 
            error: `Server not running at ${this.options.baseUrl}` 
          };
        }
        throw error;
      }
    });
  }

  async testOcrEndpoint() {
    if (this.options.skipOcr) {
      this.results.skipped++;
      colorLog('⏭️  Skipping OCR tests', 'yellow');
      return;
    }

    return this.runTest('OCR Processing Endpoint', async () => {
      // Create a simple test image (1x1 pixel PNG)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0x57, 0x63, 0xF8, 0x0F, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x5C, 0xCD, 0x90, 0x0A, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
      ]);

      const FormData = require('form-data');
      const form = new FormData();
      form.append('image', testImageBuffer, 'test.png');
      form.append('record_type', 'baptism');

      try {
        const response = await axios.post(
          `${this.options.baseUrl}/api/ocr/process`,
          form,
          {
            headers: form.getHeaders(),
            timeout: 30000
          }
        );

        if (response.status === 200 && response.data.job_id) {
          return { 
            success: true, 
            details: `OCR job created: ${response.data.job_id}` 
          };
        } else {
          return { 
            success: false, 
            error: `Unexpected OCR response: ${response.status}` 
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: `OCR endpoint failed: ${error.message}` 
        };
      }
    }, false); // Non-required for basic tests
  }

  async testGoogleVisionApi() {
    if (this.options.skipOcr) {
      this.results.skipped++;
      return;
    }

    return this.runTest('Google Vision API', async () => {
      try {
        const vision = require('@google-cloud/vision');
        const client = new vision.ImageAnnotatorClient();

        // Test with a simple image
        const testImage = {
          image: {
            content: Buffer.from([
              // Minimal valid image data
              0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
            ]).toString('base64')
          }
        };

        const [result] = await client.textDetection(testImage);
        
        return { 
          success: true, 
          details: 'Google Vision API credentials valid' 
        };
      } catch (error) {
        if (error.code === 3) { // INVALID_ARGUMENT is expected with minimal test data
          return { 
            success: true, 
            details: 'Google Vision API accessible (invalid test data expected)' 
          };
        }
        return { 
          success: false, 
          error: `Google Vision API error: ${error.message}` 
        };
      }
    }, false);
  }

  async runBasicTests() {
    colorLog('\n🎯 Running Basic Tests...', 'cyan');
    
    await this.testDatabaseConnection();
    await this.testDatabaseTables();
    
    if (!this.options.skipApi) {
      await this.testApiHealthEndpoint();
    }
  }

  async runFullTests() {
    colorLog('\n🎯 Running Full Test Suite...', 'cyan');
    
    await this.runBasicTests();
    await this.testOcrEndpoint();
    await this.testGoogleVisionApi();
  }

  async runDebugTests() {
    colorLog('\n🎯 Running Debug Tests...', 'cyan');
    
    await this.runFullTests();
    
    // Additional debug tests would go here
    colorLog('\n🔍 Debug Information:', 'blue');
    colorLog(`   Node.js Version: ${process.version}`, 'white');
    colorLog(`   Environment: ${process.env.NODE_ENV || 'development'}`, 'white');
    colorLog(`   Base URL: ${this.options.baseUrl}`, 'white');
  }

  generateReport() {
    const total = this.results.passed + this.results.failed + this.results.skipped;
    const passRate = total > 0 ? (this.results.passed / total * 100).toFixed(1) : 0;
    
    colorLog('\n📊 TEST RESULTS', 'cyan');
    colorLog('═'.repeat(60), 'blue');
    
    colorLog(`✅ Passed: ${this.results.passed}`, 'green');
    colorLog(`❌ Failed: ${this.results.failed}`, 'red');
    colorLog(`⏭️  Skipped: ${this.results.skipped}`, 'yellow');
    colorLog(`📈 Pass Rate: ${passRate}%`, this.results.failed === 0 ? 'green' : 'yellow');
    
    if (this.results.failed > 0) {
      colorLog('\n❌ FAILED TESTS:', 'red');
      this.results.tests
        .filter(test => test.status === 'FAIL')
        .forEach(test => {
          colorLog(`   ${test.name}: ${test.error}`, 'red');
        });
    }
    
    return this.results.failed === 0;
  }

  async run() {
    const startTime = Date.now();
    
    colorLog('🧪 Orthodox Metrics - Test Suite', 'cyan');
    colorLog('═'.repeat(60), 'blue');
    colorLog(`Test Level: ${this.options.level}`, 'blue');
    
    try {
      switch (this.options.level) {
        case 'basic':
          await this.runBasicTests();
          break;
        case 'full':
          await this.runFullTests();
          break;
        case 'debug':
          await this.runDebugTests();
          break;
        default:
          throw new Error(`Unknown test level: ${this.options.level}`);
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const success = this.generateReport();
      
      colorLog(`\n⏱️  Test Duration: ${duration}s`, 'blue');
      
      if (success) {
        colorLog('🎉 ALL TESTS PASSED!', 'green');
        process.exit(0);
      } else {
        colorLog('💥 SOME TESTS FAILED!', 'red');
        process.exit(1);
      }
      
    } catch (error) {
      colorLog(`\n💥 TEST SUITE FAILED: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--level':
        options.level = args[++i];
        break;
      case '--skip-ocr':
        options.skipOcr = true;
        break;
      case '--skip-api':
        options.skipApi = true;
        break;
      case '--skip-database':
        options.skipDatabase = true;
        break;
      case '--base-url':
        options.baseUrl = args[++i];
        break;
      case '--help':
        console.log(`
Orthodox Metrics Test Suite

Usage: node unified-tests.js [options]

Options:
  --level <basic|full|debug>    Test level (default: basic)
  --skip-ocr                    Skip OCR tests
  --skip-api                    Skip API tests
  --skip-database              Skip database tests
  --base-url <url>             Base URL for API tests (default: http://localhost:3000)
  --help                       Show this help message

Test Levels:
  basic   - Essential connectivity and core functionality
  full    - Comprehensive testing including OCR pipeline
  debug   - Full tests plus detailed diagnostic information

Examples:
  node unified-tests.js                        # Basic tests
  node unified-tests.js --level full           # Full test suite
  node unified-tests.js --level debug          # Debug mode
  node unified-tests.js --skip-ocr             # Skip OCR tests
        `);
        process.exit(0);
    }
  }
  
  const testSuite = new OrthodoxTestSuite(options);
  await testSuite.run();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = OrthodoxTestSuite;
