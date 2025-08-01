#!/usr/bin/env node

/**
 * Browser Session Permission Test
 * 
 * This script allows you to copy your browser session cookies
 * to test permissions with your actual logged-in session.
 * 
 * Usage:
 * 1. Login to the app in your browser as superadmin
 * 2. Open browser dev tools (F12) 
 * 3. Go to Application/Storage tab > Cookies
 * 4. Copy the session cookie value
 * 5. Run: node scripts/browser-session-test.js --cookie "your-cookie-value"
 */

const axios = require('axios');
const fs = require('fs').promises;

class BrowserSessionTest {
  constructor(sessionCookie) {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    this.sessionCookie = sessionCookie;
    this.results = [];
  }

  async testWithSession(path, description) {
    const url = `${this.baseUrl}${path}`;
    
    try {
      console.log(`🔍 Testing: ${description}`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Cookie': this.sessionCookie,
          'User-Agent': 'OrthodoxMetrics-SessionTest/1.0'
        },
        withCredentials: true,
        validateStatus: () => true
      });

      const result = {
        path,
        description,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
        timestamp: new Date().toISOString()
      };

      // Analyze response
      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ ${response.status} - ${description}`);
        result.success = true;
      } else if (response.status === 401) {
        console.log(`🔒 ${response.status} - Authentication failed: ${description}`);
        console.log('   → Your session may have expired or cookies are invalid');
        result.success = false;
        result.issue = 'authentication';
      } else if (response.status === 403) {
        console.log(`🚫 ${response.status} - Permission denied: ${description}`);
        console.log('   → CRITICAL: Superadmin should have access to this!');
        result.success = false;
        result.issue = 'permission';
      } else if (response.status === 404) {
        console.log(`💥 ${response.status} - Not found: ${description}`);
        console.log('   → Route may not exist or be properly configured');
        result.success = false;
        result.issue = 'not_found';
      } else if (response.status >= 500) {
        console.log(`🔥 ${response.status} - Server error: ${description}`);
        console.log('   → Check application logs for details');
        result.success = false;
        result.issue = 'server_error';
      } else {
        console.log(`⚠️  ${response.status} - Unexpected status: ${description}`);
        result.success = false;
        result.issue = 'unexpected';
      }

      // Log additional details for HTML responses
      if (response.headers['content-type']?.includes('text/html')) {
        if (response.data.includes('login') || response.data.includes('sign-in')) {
          console.log('   → Response contains login form - session likely expired');
          result.containsLogin = true;
        }
        if (response.data.includes('Access Denied') || response.data.includes('Forbidden')) {
          console.log('   → Response contains access denied message');
          result.containsAccessDenied = true;
        }
      }

      this.results.push(result);
      console.log('');
      return result;

    } catch (error) {
      const result = {
        path,
        description,
        status: 'ERROR',
        error: error.message,
        success: false,
        issue: 'network_error',
        timestamp: new Date().toISOString()
      };

      console.log(`💥 ERROR - ${description}: ${error.message}`);
      this.results.push(result);
      console.log('');
      return result;
    }
  }

  async runFullTest() {
    console.log('🔐 Browser Session Permission Test');
    console.log('=' .repeat(50));
    console.log('');

    if (!this.sessionCookie) {
      console.log('❌ No session cookie provided!');
      console.log('');
      console.log('To get your session cookie:');
      console.log('1. Login to the app in your browser');
      console.log('2. Open Developer Tools (F12)');
      console.log('3. Go to Application > Cookies');
      console.log('4. Find the session cookie (usually "connect.sid" or similar)');
      console.log('5. Copy the entire value');
      console.log('6. Run: node scripts/browser-session-test.js --cookie "your-value"');
      process.exit(1);
    }

    // Test comprehensive routes
    const routes = [
      // Core pages
      { path: '/', desc: 'Home page' },
      { path: '/dashboard', desc: 'Dashboard' },
      
      // Admin routes (should all work for superadmin)
      { path: '/admin', desc: 'Admin home' },
      { path: '/admin/dashboard', desc: 'Admin dashboard' },
      { path: '/admin/users', desc: 'User management' },
      { path: '/admin/churches', desc: 'Church management' },
      { path: '/admin/template-manager', desc: 'Template manager' },
      { path: '/admin/record-template-manager', desc: 'Record template manager' },
      { path: '/admin/church-admin-panel', desc: 'Church admin panel' },
      { path: '/admin/ocr', desc: 'OCR system' },
      { path: '/admin/logs', desc: 'System logs' },
      { path: '/admin/settings', desc: 'System settings' },
      
      // Records management
      { path: '/records', desc: 'Records home' },
      { path: '/records/baptism', desc: 'Baptism records' },
      { path: '/records/marriage', desc: 'Marriage records' },
      { path: '/records/funeral', desc: 'Funeral records' },
      { path: '/baptism-records', desc: 'Legacy baptism records' },
      { path: '/marriage-records', desc: 'Legacy marriage records' },
      { path: '/funeral-records', desc: 'Legacy funeral records' },
      
      // API endpoints
      { path: '/api/auth/status', desc: 'Auth status API' },
      { path: '/api/templates', desc: 'Templates API' },
      { path: '/api/templates/global/available', desc: 'Global templates API' },
      { path: '/api/churches', desc: 'Churches API' },
      { path: '/api/admin/churches', desc: 'Admin churches API' },
      { path: '/api/users', desc: 'Users API' },
      { path: '/api/baptism-records', desc: 'Baptism records API' },
      { path: '/api/marriage-records', desc: 'Marriage records API' },
      { path: '/api/funeral-records', desc: 'Funeral records API' },
      { path: '/api/admin/logs', desc: 'Admin logs API' },
    ];

    for (const route of routes) {
      await this.testWithSession(route.path, route.desc);
      await new Promise(resolve => setTimeout(resolve, 300)); // Slow down requests
    }

    this.generateReport();
  }

  generateReport() {
    console.log('📊 DETAILED REPORT');
    console.log('=' .repeat(50));
    
    const total = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    // Categorize issues
    const authIssues = this.results.filter(r => r.issue === 'authentication').length;
    const permissionIssues = this.results.filter(r => r.issue === 'permission').length;
    const notFoundIssues = this.results.filter(r => r.issue === 'not_found').length;
    const serverErrorIssues = this.results.filter(r => r.issue === 'server_error').length;
    const networkIssues = this.results.filter(r => r.issue === 'network_error').length;

    console.log(`Total routes tested: ${total}`);
    console.log(`Successful: ${successful} (${((successful / total) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${failed}`);
    console.log('');
    
    console.log('Issue Breakdown:');
    console.log(`• Authentication failures: ${authIssues}`);
    console.log(`• Permission denied: ${permissionIssues}`);
    console.log(`• Routes not found: ${notFoundIssues}`);
    console.log(`• Server errors: ${serverErrorIssues}`);
    console.log(`• Network errors: ${networkIssues}`);
    console.log('');

    // Critical issues that need immediate attention
    if (permissionIssues > 0) {
      console.log('🚨 CRITICAL PERMISSION ISSUES:');
      this.results.filter(r => r.issue === 'permission').forEach(r => {
        console.log(`   ❌ ${r.status} - ${r.path} (${r.description})`);
      });
      console.log('   → These routes should be accessible to superadmin!');
      console.log('');
    }

    if (authIssues > 0) {
      console.log('🔒 AUTHENTICATION ISSUES:');
      this.results.filter(r => r.issue === 'authentication').forEach(r => {
        console.log(`   ❌ ${r.status} - ${r.path} (${r.description})`);
      });
      console.log('   → Check if session is valid and not expired');
      console.log('');
    }

    if (serverErrorIssues > 0) {
      console.log('🔥 SERVER ERRORS:');
      this.results.filter(r => r.issue === 'server_error').forEach(r => {
        console.log(`   ❌ ${r.status} - ${r.path} (${r.description})`);
      });
      console.log('   → Check application logs for stack traces');
      console.log('');
    }

    // Recommendations
    console.log('💡 NEXT STEPS:');
    console.log('-'.repeat(30));
    
    if (permissionIssues > 0) {
      console.log('1. Check user role in database:');
      console.log('   SELECT id, email, role, is_active FROM users WHERE email = "superadmin@orthodoxmetrics.com"');
      console.log('2. Verify user has superadmin role and is_active = 1');
      console.log('3. Check route middleware and permission checks');
    }
    
    if (authIssues > 0) {
      console.log('1. Login again in your browser to refresh session');
      console.log('2. Get a fresh session cookie and re-run this test');
      console.log('3. Check session configuration in the application');
    }
    
    if (notFoundIssues > 0) {
      console.log('1. Check if routes are properly defined in app routing');
      console.log('2. Verify frontend build is up to date');
      console.log('3. Check if any routes have been moved or renamed');
    }

    console.log('');
    console.log('✅ Test complete!');
    
    // Save detailed results
    this.saveResults();
  }

  async saveResults() {
    try {
      const reportPath = `./logs/session-test-${Date.now()}.json`;
      await fs.mkdir('./logs', { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        baseUrl: this.baseUrl,
        results: this.results,
        summary: {
          total: this.results.length,
          successful: this.results.filter(r => r.success).length,
          failed: this.results.filter(r => !r.success).length,
          issues: {
            authentication: this.results.filter(r => r.issue === 'authentication').length,
            permission: this.results.filter(r => r.issue === 'permission').length,
            not_found: this.results.filter(r => r.issue === 'not_found').length,
            server_error: this.results.filter(r => r.issue === 'server_error').length,
            network_error: this.results.filter(r => r.issue === 'network_error').length,
          }
        }
      }, null, 2));
      
      console.log(`📄 Detailed results saved to: ${reportPath}`);
    } catch (error) {
      console.log('⚠️  Could not save detailed results:', error.message);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let sessionCookie = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--cookie' && args[i + 1]) {
    sessionCookie = args[i + 1];
    break;
  }
}

// Run the test
if (require.main === module) {
  const tester = new BrowserSessionTest(sessionCookie);
  tester.runFullTest().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = BrowserSessionTest;
