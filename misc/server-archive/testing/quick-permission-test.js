#!/usr/bin/env node

/**
 * Quick Permission Test for Orthodox Metrics
 * 
 * Tests current authentication status and permissions
 * for common routes that superadmin should have access to.
 */

const axios = require('axios');

class QuickPermissionTest {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    this.results = [];
  }

  async testRoute(path, description, expectedStatus = 200) {
    const url = `${this.baseUrl}${path}`;
    
    try {
      console.log(`Testing: ${description}`);
      console.log(`URL: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        withCredentials: true,
        // Don't throw on error status codes
        validateStatus: () => true
      });

      const result = {
        path,
        description,
        url,
        status: response.status,
        statusText: response.statusText,
        expected: expectedStatus,
        success: response.status === expectedStatus,
        headers: response.headers,
        timestamp: new Date().toISOString()
      };

      if (result.success) {
        console.log(`✅ ${response.status} - ${description}`);
      } else {
        console.log(`❌ ${response.status} - ${description} (Expected ${expectedStatus})`);
        
        // Log additional info for failures
        if (response.status === 403) {
          console.log('   🚫 Permission denied - check user role and permissions');
        } else if (response.status === 401) {
          console.log('   🔒 Authentication required - check login status');
        } else if (response.status === 404) {
          console.log('   💥 Route not found - check if endpoint exists');
        } else if (response.status >= 500) {
          console.log('   🔥 Server error - check application logs');
        }
        
        // Log response data if it contains useful info
        if (response.data && typeof response.data === 'string' && response.data.length < 500) {
          console.log(`   Response: ${response.data.substring(0, 200)}...`);
        }
      }

      this.results.push(result);
      console.log(''); // Empty line for readability
      
      return result;

    } catch (error) {
      const result = {
        path,
        description,
        url,
        status: 'ERROR',
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      };

      console.log(`💥 ERROR - ${description}: ${error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('   🔌 Connection refused - is the server running?');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('   ⏰ Request timeout - server may be overloaded');
      }
      
      this.results.push(result);
      console.log('');
      
      return result;
    }
  }

  async runQuickTest() {
    console.log('🚀 Quick Permission Test for Orthodox Metrics');
    console.log('=' .repeat(50));
    console.log('');

    // Test core routes that superadmin should always have access to
    const tests = [
      { path: '/', desc: 'Home page', status: 200 },
      { path: '/dashboard', desc: 'Main dashboard', status: 200 },
      { path: '/admin', desc: 'Admin area', status: 200 },
      { path: '/admin/dashboard', desc: 'Admin dashboard', status: 200 },
      { path: '/admin/users', desc: 'User management', status: 200 },
      { path: '/admin/churches', desc: 'Church management', status: 200 },
      { path: '/admin/template-manager', desc: 'Template manager', status: 200 },
      { path: '/api/auth/status', desc: 'Auth status API', status: 200 },
      { path: '/api/templates', desc: 'Templates API', status: 200 },
      { path: '/api/churches', desc: 'Churches API', status: 200 },
      { path: '/api/users', desc: 'Users API', status: 200 },
    ];

    for (const test of tests) {
      await this.testRoute(test.path, test.desc, test.status);
      
      // Small delay to avoid overwhelming server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.printSummary();
  }

  printSummary() {
    console.log('📊 SUMMARY');
    console.log('=' .repeat(50));
    
    const total = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const permissionDenied = this.results.filter(r => r.status === 403).length;
    const authRequired = this.results.filter(r => r.status === 401).length;
    const notFound = this.results.filter(r => r.status === 404).length;
    const serverErrors = this.results.filter(r => r.status >= 500).length;

    console.log(`Total tests: ${total}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success rate: ${((successful / total) * 100).toFixed(1)}%`);
    console.log('');
    
    if (permissionDenied > 0) {
      console.log(`🚫 Permission denied: ${permissionDenied} (CRITICAL - superadmin should have access)`);
      this.results.filter(r => r.status === 403).forEach(r => {
        console.log(`   - ${r.path} (${r.description})`);
      });
      console.log('');
    }
    
    if (authRequired > 0) {
      console.log(`🔒 Authentication required: ${authRequired}`);
      this.results.filter(r => r.status === 401).forEach(r => {
        console.log(`   - ${r.path} (${r.description})`);
      });
      console.log('');
    }
    
    if (notFound > 0) {
      console.log(`💥 Not found: ${notFound}`);
      this.results.filter(r => r.status === 404).forEach(r => {
        console.log(`   - ${r.path} (${r.description})`);
      });
      console.log('');
    }
    
    if (serverErrors > 0) {
      console.log(`🔥 Server errors: ${serverErrors}`);
      this.results.filter(r => r.status >= 500).forEach(r => {
        console.log(`   - ${r.path} (${r.description})`);
      });
      console.log('');
    }

    // Recommendations
    console.log('💡 RECOMMENDATIONS');
    console.log('-'.repeat(30));
    
    if (permissionDenied > 0) {
      console.log('• Check user role and permissions in database');
      console.log('• Verify session is properly authenticated');
      console.log('• Check if user account is active and not locked');
    }
    
    if (authRequired > 0) {
      console.log('• Login to the application in your browser first');
      console.log('• Check if session cookies are being sent properly');
      console.log('• Verify authentication middleware is working');
    }
    
    if (notFound > 0) {
      console.log('• Check if routes are properly defined in the application');
      console.log('• Verify server is running the latest version');
    }
    
    if (serverErrors > 0) {
      console.log('• Check application logs for detailed error information');
      console.log('• Verify database connections are working');
      console.log('• Check for any missing dependencies or configuration');
    }

    console.log('');
    console.log('✅ Quick test complete!');
  }
}

// Run the test
if (require.main === module) {
  const tester = new QuickPermissionTest();
  tester.runQuickTest().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = QuickPermissionTest;
