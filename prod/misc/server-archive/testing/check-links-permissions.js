#!/usr/bin/env node

/**
 * Orthodox Metrics Link Checker & Permission Validator
 * 
 * This script crawls the application to identify:
 * - Broken links (404s, 500s)
 * - Permission errors (403s) that shouldn't occur for superadmin
 * - Missing routes or endpoints
 * - Authentication issues
 * 
 * Run with: node scripts/check-links-permissions.js
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

class LinkPermissionChecker {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3001';
    this.loginUrl = options.loginUrl || `${this.baseUrl}/api/auth/login`;
    this.credentials = options.credentials || {
      email: 'superadmin@orthodoxmetrics.com',
      password: 'admin123'
    };
    this.sessionCookie = null;
    this.checkedUrls = new Set();
    this.results = {
      total: 0,
      successful: 0,
      broken: [],
      permission_denied: [],
      authentication_required: [],
      server_errors: [],
      redirects: []
    };
    this.timeout = 10000; // 10 second timeout
  }

  /**
   * Initialize session by logging in as superadmin
   */
  async initialize() {
    console.log('🔐 Logging in as superadmin...');
    
    try {
      const response = await axios.post(this.loginUrl, this.credentials, {
        timeout: this.timeout,
        withCredentials: true
      });

      // Extract session cookie
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        this.sessionCookie = cookies.join('; ');
        console.log('✅ Successfully logged in as superadmin');
        return true;
      } else {
        console.error('❌ No session cookie received');
        return false;
      }
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return false;
    }
  }

  /**
   * Get axios instance with authentication
   */
  getAxiosInstance() {
    return axios.create({
      timeout: this.timeout,
      headers: {
        'Cookie': this.sessionCookie,
        'User-Agent': 'OrthodoxMetrics-LinkChecker/1.0'
      },
      withCredentials: true,
      // Don't throw on HTTP error codes - we want to handle them
      validateStatus: () => true
    });
  }

  /**
   * Check a single URL
   */
  async checkUrl(url, source = 'manual') {
    if (this.checkedUrls.has(url)) {
      return null; // Already checked
    }

    this.checkedUrls.add(url);
    this.results.total++;

    const axiosInstance = this.getAxiosInstance();
    
    try {
      console.log(`🔍 Checking: ${url}`);
      const response = await axiosInstance.get(url);
      
      const result = {
        url,
        source,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers['content-type'],
        timestamp: new Date().toISOString()
      };

      if (response.status >= 200 && response.status < 300) {
        this.results.successful++;
        console.log(`✅ ${response.status} - ${url}`);
        
        // If it's an HTML page, extract more links
        if (response.headers['content-type']?.includes('text/html')) {
          await this.extractLinksFromHtml(response.data, url);
        }
        
      } else if (response.status >= 300 && response.status < 400) {
        this.results.redirects.push({
          ...result,
          redirectLocation: response.headers.location
        });
        console.log(`🔄 ${response.status} - ${url} → ${response.headers.location}`);
        
      } else if (response.status === 401) {
        this.results.authentication_required.push(result);
        console.log(`🔒 ${response.status} - Authentication required: ${url}`);
        
      } else if (response.status === 403) {
        this.results.permission_denied.push(result);
        console.log(`🚫 ${response.status} - Permission denied for superadmin: ${url}`);
        
      } else if (response.status === 404) {
        this.results.broken.push({...result, error: 'Not Found'});
        console.log(`💥 ${response.status} - Not Found: ${url}`);
        
      } else if (response.status >= 500) {
        this.results.server_errors.push({
          ...result,
          error: response.data || 'Server Error'
        });
        console.log(`🔥 ${response.status} - Server Error: ${url}`);
        
      } else {
        this.results.broken.push({...result, error: 'Unexpected Status'});
        console.log(`⚠️  ${response.status} - Unexpected: ${url}`);
      }

      return result;

    } catch (error) {
      const result = {
        url,
        source,
        status: 'ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      };

      if (error.code === 'ECONNREFUSED') {
        result.error = 'Connection refused - server not running?';
      } else if (error.code === 'ETIMEDOUT') {
        result.error = 'Request timeout';
      }

      this.results.broken.push(result);
      console.log(`💥 ERROR - ${url}: ${result.error}`);
      return result;
    }
  }

  /**
   * Extract links from HTML content
   */
  async extractLinksFromHtml(html, baseUrl) {
    try {
      const $ = cheerio.load(html);
      const links = new Set();

      // Extract various types of links
      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href) links.add(href);
      });

      $('form[action]').each((i, elem) => {
        const action = $(elem).attr('action');
        if (action) links.add(action);
      });

      $('link[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href) links.add(href);
      });

      $('script[src]').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src) links.add(src);
      });

      // Convert relative URLs to absolute and filter
      for (const link of links) {
        const absoluteUrl = this.resolveUrl(link, baseUrl);
        if (this.shouldCheckUrl(absoluteUrl)) {
          // Don't await here to avoid blocking - just add to queue
          setTimeout(() => this.checkUrl(absoluteUrl, baseUrl), 100);
        }
      }

    } catch (error) {
      console.error(`Error parsing HTML from ${baseUrl}:`, error.message);
    }
  }

  /**
   * Resolve relative URLs to absolute
   */
  resolveUrl(url, base) {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      if (url.startsWith('//')) {
        return 'http:' + url;
      }
      if (url.startsWith('/')) {
        const baseObj = new URL(base);
        return `${baseObj.protocol}//${baseObj.host}${url}`;
      }
      return new URL(url, base).href;
    } catch (error) {
      return null;
    }
  }

  /**
   * Determine if we should check this URL
   */
  shouldCheckUrl(url) {
    if (!url) return false;
    
    // Only check URLs on our domain
    if (!url.startsWith(this.baseUrl)) return false;
    
    // Skip certain file types
    const skipExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.css', '.js', '.woff', '.woff2', '.ttf'];
    if (skipExtensions.some(ext => url.toLowerCase().includes(ext))) return false;
    
    // Skip anchor links
    if (url.includes('#')) return false;
    
    // Skip query parameters that might cause issues
    if (url.includes('logout')) return false;
    
    return true;
  }

  /**
   * Check all core application routes
   */
  async checkCoreRoutes() {
    console.log('\n🌐 Checking core application routes...\n');

    const coreRoutes = [
      // Authentication & Dashboard
      '/',
      '/dashboard',
      '/admin',
      '/admin/dashboard',
      
      // User Management
      '/admin/users',
      '/admin/user-management',
      
      // Church Management
      '/admin/churches',
      '/admin/church-management',
      '/admin/church-admin-panel',
      
      // Template System
      '/admin/template-manager',
      '/admin/record-template-manager',
      
      // Records Management
      '/records',
      '/records/baptism',
      '/records/marriage', 
      '/records/funeral',
      '/baptism-records',
      '/marriage-records',
      '/funeral-records',
      
      // API Endpoints
      '/api/auth/status',
      '/api/templates',
      '/api/templates/global/available',
      '/api/churches',
      '/api/admin/churches',
      '/api/users',
      '/api/baptism-records/test',
      '/api/marriage-records/test',
      '/api/funeral-records/test',
      
      // OCR System
      '/admin/ocr',
      '/admin/ocr-jobs',
      '/ocr',
      
      // Settings & Configuration
      '/admin/settings',
      '/admin/logs',
      '/settings',
      
      // Calendar System
      '/calendar',
      '/admin/calendar',
      
      // Reports
      '/reports',
      '/admin/reports'
    ];

    for (const route of coreRoutes) {
      const fullUrl = route.startsWith('http') ? route : `${this.baseUrl}${route}`;
      await this.checkUrl(fullUrl, 'core-routes');
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Check API endpoints with different HTTP methods
   */
  async checkApiEndpoints() {
    console.log('\n🔌 Checking API endpoints...\n');

    const apiEndpoints = [
      { method: 'GET', path: '/api/auth/status' },
      { method: 'GET', path: '/api/templates' },
      { method: 'GET', path: '/api/templates/global/available' },
      { method: 'GET', path: '/api/churches' },
      { method: 'GET', path: '/api/admin/churches' },
      { method: 'GET', path: '/api/users' },
      { method: 'GET', path: '/api/baptism-records' },
      { method: 'GET', path: '/api/marriage-records' },
      { method: 'GET', path: '/api/funeral-records' },
      { method: 'GET', path: '/api/admin/logs' },
      { method: 'POST', path: '/api/templates/generate', data: { test: true } },
    ];

    const axiosInstance = this.getAxiosInstance();

    for (const endpoint of apiEndpoints) {
      const url = `${this.baseUrl}${endpoint.path}`;
      
      try {
        console.log(`🔍 ${endpoint.method} ${url}`);
        
        let response;
        if (endpoint.method === 'GET') {
          response = await axiosInstance.get(url);
        } else if (endpoint.method === 'POST') {
          response = await axiosInstance.post(url, endpoint.data || {});
        }

        const result = {
          url,
          method: endpoint.method,
          status: response.status,
          statusText: response.statusText,
          timestamp: new Date().toISOString()
        };

        if (response.status >= 200 && response.status < 300) {
          this.results.successful++;
          console.log(`✅ ${response.status} - ${endpoint.method} ${url}`);
        } else if (response.status === 403) {
          this.results.permission_denied.push(result);
          console.log(`🚫 ${response.status} - Permission denied: ${endpoint.method} ${url}`);
        } else {
          this.results.broken.push(result);
          console.log(`💥 ${response.status} - ${endpoint.method} ${url}`);
        }

      } catch (error) {
        this.results.broken.push({
          url,
          method: endpoint.method,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        console.log(`💥 ERROR - ${endpoint.method} ${url}: ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  /**
   * Generate detailed report
   */
  generateReport() {
    const report = {
      summary: {
        total_checked: this.results.total,
        successful: this.results.successful,
        broken_count: this.results.broken.length,
        permission_denied_count: this.results.permission_denied.length,
        auth_required_count: this.results.authentication_required.length,
        server_errors_count: this.results.server_errors.length,
        redirects_count: this.results.redirects.length,
        success_rate: `${((this.results.successful / this.results.total) * 100).toFixed(1)}%`
      },
      issues: {
        permission_denied: this.results.permission_denied,
        broken_links: this.results.broken,
        server_errors: this.results.server_errors,
        authentication_required: this.results.authentication_required
      },
      redirects: this.results.redirects,
      timestamp: new Date().toISOString()
    };

    return report;
  }

  /**
   * Print summary to console
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 LINK & PERMISSION CHECK SUMMARY');
    console.log('='.repeat(60));
    
    const report = this.generateReport();
    
    console.log(`Total URLs checked: ${report.summary.total_checked}`);
    console.log(`Successful: ${report.summary.successful} (${report.summary.success_rate})`);
    console.log(`Broken links: ${report.summary.broken_count}`);
    console.log(`Permission denied: ${report.summary.permission_denied_count}`);
    console.log(`Auth required: ${report.summary.auth_required_count}`);
    console.log(`Server errors: ${report.summary.server_errors_count}`);
    console.log(`Redirects: ${report.summary.redirects_count}`);

    if (report.summary.permission_denied_count > 0) {
      console.log('\n🚫 PERMISSION DENIED (Should not happen for superadmin):');
      report.issues.permission_denied.forEach(item => {
        console.log(`   - ${item.status} ${item.url}`);
      });
    }

    if (report.summary.broken_count > 0) {
      console.log('\n💥 BROKEN LINKS:');
      report.issues.broken_links.slice(0, 10).forEach(item => {
        console.log(`   - ${item.status} ${item.url} (${item.error || item.statusText})`);
      });
      if (report.issues.broken_links.length > 10) {
        console.log(`   ... and ${report.issues.broken_links.length - 10} more`);
      }
    }

    if (report.summary.server_errors_count > 0) {
      console.log('\n🔥 SERVER ERRORS:');
      report.issues.server_errors.forEach(item => {
        console.log(`   - ${item.status} ${item.url}`);
      });
    }

    console.log('\n✅ Check complete!');
  }

  /**
   * Save detailed report to file
   */
  async saveReport() {
    const report = this.generateReport();
    const reportPath = path.join(__dirname, `../logs/link-check-${Date.now()}.json`);
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.error('Error saving report:', error.message);
    }
  }

  /**
   * Run the complete check
   */
  async run() {
    console.log('🚀 Starting Orthodox Metrics Link & Permission Check\n');
    
    // Initialize session
    const loginSuccess = await this.initialize();
    if (!loginSuccess) {
      console.error('❌ Cannot proceed without authentication');
      process.exit(1);
    }

    // Run checks
    await this.checkCoreRoutes();
    await this.checkApiEndpoints();
    
    // Wait a moment for any async link checking to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate and display results
    this.printSummary();
    await this.saveReport();
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new LinkPermissionChecker({
    baseUrl: process.env.BASE_URL || 'http://localhost:3001',
    credentials: {
      email: process.env.ADMIN_EMAIL || 'superadmin@orthodoxmetrics.com',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    }
  });

  checker.run().catch(error => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });
}

module.exports = LinkPermissionChecker;
