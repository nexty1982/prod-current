#!/usr/bin/env node

/**
 * Comprehensive API Route Tester
 * 
 * Tests all API routes to identify which ones are working and which have issues
 */

const axios = require('axios');

class ApiRouteTester {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    this.results = [];
  }

  async testRoute(method, path, description, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const expectedStatus = options.expectedStatus || 200;
    
    try {
      console.log(`🔍 ${method} ${path}`);
      console.log(`    ${description}`);
      
      let response;
      const axiosConfig = {
        timeout: 10000,
        validateStatus: () => true, // Don't throw on any status
        ...options.config
      };

      if (method === 'GET') {
        response = await axios.get(url, axiosConfig);
      } else if (method === 'POST') {
        response = await axios.post(url, options.data || {}, axiosConfig);
      }

      const result = {
        method,
        path,
        description,
        url,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers['content-type'],
        success: response.status === expectedStatus || (response.status >= 200 && response.status < 300),
        timestamp: new Date().toISOString()
      };

      if (result.success) {
        console.log(`    ✅ ${response.status} - Success`);
      } else {
        console.log(`    ❌ ${response.status} - ${response.statusText}`);
        
        if (response.status === 401) {
          console.log(`    🔒 Authentication required`);
        } else if (response.status === 403) {
          console.log(`    🚫 Permission denied`);
        } else if (response.status === 404) {
          console.log(`    💥 Route not found`);
        } else if (response.status >= 500) {
          console.log(`    🔥 Server error`);
          if (response.data) {
            console.log(`    Error: ${JSON.stringify(response.data)}`);
          }
        }
      }

      this.results.push(result);
      console.log('');
      return result;

    } catch (error) {
      const result = {
        method,
        path,
        description,
        url,
        status: 'ERROR',
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      };

      console.log(`    💥 ERROR: ${error.message}`);
      this.results.push(result);
      console.log('');
      return result;
    }
  }

  async testAllApiRoutes() {
    console.log('🔍 Comprehensive API Route Testing');
    console.log('=' .repeat(50));
    console.log('');

    // Authentication routes
    console.log('📋 Authentication Routes');
    console.log('-'.repeat(30));
    await this.testRoute('GET', '/api/auth/check', 'Check authentication status');
    
    // Admin routes
    console.log('📋 Admin Routes');
    console.log('-'.repeat(30));
    await this.testRoute('GET', '/api/admin/users', 'Get admin users');
    await this.testRoute('GET', '/api/admin/churches', 'Get admin churches');
    await this.testRoute('GET', '/api/admin/logs', 'Get admin logs');
    
    // Church management routes
    console.log('📋 Church Management Routes');
    console.log('-'.repeat(30));
    await this.testRoute('GET', '/api/churches', 'Get all churches');
    
    // Template routes
    console.log('📋 Template Routes');
    console.log('-'.repeat(30));
    await this.testRoute('GET', '/api/templates', 'Get all templates');
    await this.testRoute('GET', '/api/templates/global/available', 'Get global templates');
    await this.testRoute('GET', '/api/templates/types/record-types', 'Get record types');
    
    // Record routes
    console.log('📋 Record Management Routes');
    console.log('-'.repeat(30));
    await this.testRoute('GET', '/api/baptism-records', 'Get baptism records');
    await this.testRoute('GET', '/api/marriage-records', 'Get marriage records');
    await this.testRoute('GET', '/api/funeral-records', 'Get funeral records');
    
    // Other API routes
    console.log('📋 Other API Routes');
    console.log('-'.repeat(30));
    await this.testRoute('GET', '/api/liturgical-calendar', 'Get liturgical calendar');
    await this.testRoute('GET', '/api/unique-values', 'Get unique values');
    await this.testRoute('GET', '/api/notes', 'Get notes');
    
    this.printSummary();
  }

  printSummary() {
    console.log('📊 API ROUTE TEST SUMMARY');
    console.log('=' .repeat(50));
    
    const total = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    const authRequired = this.results.filter(r => r.status === 401).length;
    const permissionDenied = this.results.filter(r => r.status === 403).length;
    const notFound = this.results.filter(r => r.status === 404).length;
    const serverErrors = this.results.filter(r => r.status >= 500).length;
    const networkErrors = this.results.filter(r => r.status === 'ERROR').length;

    console.log(`Total routes tested: ${total}`);
    console.log(`Successful: ${successful} (${((successful / total) * 100).toFixed(1)}%)`);
    console.log(`Authentication required (401): ${authRequired}`);
    console.log(`Permission denied (403): ${permissionDenied}`);
    console.log(`Not found (404): ${notFound}`);
    console.log(`Server errors (500+): ${serverErrors}`);
    console.log(`Network errors: ${networkErrors}`);
    console.log('');

    if (authRequired > 0) {
      console.log('🔒 AUTHENTICATION REQUIRED:');
      this.results.filter(r => r.status === 401).forEach(r => {
        console.log(`   ${r.method} ${r.path} - ${r.description}`);
      });
      console.log('   💡 These routes require login - try browser session test');
      console.log('');
    }

    if (notFound > 0) {
      console.log('💥 ROUTES NOT FOUND:');
      this.results.filter(r => r.status === 404).forEach(r => {
        console.log(`   ${r.method} ${r.path} - ${r.description}`);
      });
      console.log('   💡 Check route definitions and middleware');
      console.log('');
    }

    if (serverErrors > 0) {
      console.log('🔥 SERVER ERRORS:');
      this.results.filter(r => r.status >= 500).forEach(r => {
        console.log(`   ${r.method} ${r.path} - ${r.description}`);
      });
      console.log('   💡 Check server logs and database connectivity');
      console.log('');
    }

    if (permissionDenied > 0) {
      console.log('🚫 PERMISSION DENIED (CRITICAL):');
      this.results.filter(r => r.status === 403).forEach(r => {
        console.log(`   ${r.method} ${r.path} - ${r.description}`);
      });
      console.log('   💡 These should be accessible to superadmin!');
      console.log('');
    }

    console.log('💡 NEXT STEPS:');
    console.log('-'.repeat(30));
    if (authRequired > 0) {
      console.log('1. For 401 errors: Run browser session test with login cookies');
      console.log('   npm run check:session -- --cookie "your-session-cookie"');
    }
    if (serverErrors > 0) {
      console.log('2. For 500 errors: Run specific diagnostic scripts');
      console.log('   npm run debug:churches');
    }
    if (notFound > 0) {
      console.log('3. For 404 errors: Check route definitions in server/routes/');
    }
    
    console.log('');
    console.log('✅ API route testing complete!');
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new ApiRouteTester();
  tester.testAllApiRoutes().catch(error => {
    console.error('❌ API route testing failed:', error);
    process.exit(1);
  });
}

module.exports = ApiRouteTester;
