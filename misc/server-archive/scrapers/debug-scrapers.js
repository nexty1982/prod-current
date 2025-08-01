#!/usr/bin/env node

// 📁 server/scrapers/debug-scrapers.js
// Comprehensive diagnostic tool for scraper issues

const mysql = require('mysql2/promise');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ScraperDiagnostics {
    constructor() {
        this.issues = [];
        this.fixes = [];
        this.dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'orthodoxapps',
            password: process.env.DB_PASSWORD || 'Summerof1982@!',
            database: process.env.DB_NAME || 'orthodoxmetrics'
        };
    }

    async runDiagnostics() {
        console.log('🔍 Running Scraper Diagnostics...\n');

        await this.checkEnvironmentVariables();
        await this.checkDatabaseConnection();
        await this.checkDatabaseSchema();
        await this.checkDependencies();
        await this.checkNetworkConnectivity();
        await this.checkFilePermissions();

        this.generateReport();
    }

    async checkEnvironmentVariables() {
        console.log('📋 Checking Environment Variables...');
        
        const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
        const missingVars = [];

        for (const varName of requiredEnvVars) {
            if (!process.env[varName]) {
                missingVars.push(varName);
            } else {
                console.log(`   ✓ ${varName}: ${varName === 'DB_PASSWORD' ? '[HIDDEN]' : process.env[varName]}`);
            }
        }

        if (missingVars.length > 0) {
            this.issues.push({
                category: 'Environment',
                issue: `Missing environment variables: ${missingVars.join(', ')}`,
                severity: 'HIGH',
                fix: 'Create .env file with database credentials'
            });
            console.log(`   ❌ Missing: ${missingVars.join(', ')}`);
        } else {
            console.log('   ✅ All environment variables present');
        }
        console.log('');
    }

    async checkDatabaseConnection() {
        console.log('🗄️  Checking Database Connection...');
        
        try {
            console.log(`   Attempting connection to ${this.dbConfig.host}:3306 as ${this.dbConfig.user}`);
            
            const connection = await mysql.createConnection(this.dbConfig);
            await connection.ping();
            console.log('   ✅ Database connection successful');
            await connection.end();
            
        } catch (error) {
            this.issues.push({
                category: 'Database',
                issue: `Connection failed: ${error.message}`,
                severity: 'CRITICAL',
                fix: this.getDatabaseConnectionFix(error)
            });
            console.log(`   ❌ Connection failed: ${error.message}`);
        }
        console.log('');
    }

    async checkDatabaseSchema() {
        console.log('🏗️  Checking Database Schema...');
        
        try {
            const connection = await mysql.createConnection(this.dbConfig);
            
            // Check for required tables
            const requiredTables = [
                'orthodox_churches',
                'scraping_sessions', 
                'scraping_errors',
                'url_validations'
            ];

            for (const tableName of requiredTables) {
                try {
                    const [rows] = await connection.execute(
                        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
                        [this.dbConfig.database, tableName]
                    );
                    
                    if (rows[0].count > 0) {
                        console.log(`   ✓ Table ${tableName} exists`);
                    } else {
                        this.issues.push({
                            category: 'Database Schema',
                            issue: `Missing table: ${tableName}`,
                            severity: 'HIGH',
                            fix: 'Run database setup script to create missing tables'
                        });
                        console.log(`   ❌ Missing table: ${tableName}`);
                    }
                } catch (tableError) {
                    console.log(`   ❌ Error checking table ${tableName}: ${tableError.message}`);
                }
            }
            
            await connection.end();
            
        } catch (error) {
            console.log(`   ⚠️  Could not check schema (connection issue): ${error.message}`);
        }
        console.log('');
    }

    async checkDependencies() {
        console.log('📦 Checking Dependencies...');
        
        const requiredPackages = [
            'axios',
            'cheerio', 
            'puppeteer',
            'mysql2',
            'winston',
            'json2csv'
        ];

        for (const pkg of requiredPackages) {
            try {
                require.resolve(pkg);
                console.log(`   ✓ ${pkg} is installed`);
            } catch (error) {
                this.issues.push({
                    category: 'Dependencies',
                    issue: `Missing package: ${pkg}`,
                    severity: 'HIGH',
                    fix: `Install with: npm install ${pkg}`
                });
                console.log(`   ❌ Missing package: ${pkg}`);
            }
        }
        console.log('');
    }

    async checkNetworkConnectivity() {
        console.log('🌐 Checking Network Connectivity...');
        
        const testUrls = [
            'https://www.oca.org',
            'https://www.goarch.org',
            'https://www.antiochian.org'
        ];

        for (const url of testUrls) {
            try {
                const response = await axios.get(url, { timeout: 10000 });
                console.log(`   ✓ ${url} - Status: ${response.status}`);
            } catch (error) {
                this.issues.push({
                    category: 'Network',
                    issue: `Cannot reach ${url}: ${error.message}`,
                    severity: 'MEDIUM',
                    fix: 'Check internet connectivity and firewall settings'
                });
                console.log(`   ❌ ${url} - Error: ${error.message}`);
            }
        }
        console.log('');
    }

    async checkFilePermissions() {
        console.log('📁 Checking File Permissions...');
        
        const testDirs = [
            path.join(__dirname, '../data/churches'),
            path.join(__dirname, '../logs'),
            path.join(__dirname, '../uploads')
        ];

        for (const dir of testDirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
                await fs.writeFile(path.join(dir, 'test.tmp'), 'test');
                await fs.unlink(path.join(dir, 'test.tmp'));
                console.log(`   ✓ ${dir} - Read/Write OK`);
            } catch (error) {
                this.issues.push({
                    category: 'File Permissions',
                    issue: `Cannot write to ${dir}: ${error.message}`,
                    severity: 'MEDIUM',
                    fix: 'Check directory permissions and create missing directories'
                });
                console.log(`   ❌ ${dir} - Error: ${error.message}`);
            }
        }
        console.log('');
    }

    getDatabaseConnectionFix(error) {
        if (error.message.includes('Access denied')) {
            return 'Fix database credentials in .env file or grant proper permissions to user';
        } else if (error.message.includes('ECONNREFUSED')) {
            return 'Start MySQL server or check if it\'s running on the correct port';
        } else if (error.message.includes('ENOTFOUND')) {
            return 'Check database host address and network connectivity';
        } else {
            return 'Check database configuration and server status';
        }
    }

    generateReport() {
        console.log('📊 DIAGNOSTIC REPORT');
        console.log('='.repeat(50));
        
        if (this.issues.length === 0) {
            console.log('✅ No issues found! Your scraper system should be working properly.');
            console.log('\nTo test the scrapers, run:');
            console.log('   cd server/scrapers');
            console.log('   node test-scraper.js --quick');
            return;
        }

        // Group issues by severity
        const critical = this.issues.filter(i => i.severity === 'CRITICAL');
        const high = this.issues.filter(i => i.severity === 'HIGH');
        const medium = this.issues.filter(i => i.severity === 'MEDIUM');

        if (critical.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES (Must fix first):');
            critical.forEach((issue, i) => {
                console.log(`${i + 1}. ${issue.issue}`);
                console.log(`   Fix: ${issue.fix}\n`);
            });
        }

        if (high.length > 0) {
            console.log('\n⚠️  HIGH PRIORITY ISSUES:');
            high.forEach((issue, i) => {
                console.log(`${i + 1}. ${issue.issue}`);
                console.log(`   Fix: ${issue.fix}\n`);
            });
        }

        if (medium.length > 0) {
            console.log('\n📋 MEDIUM PRIORITY ISSUES:');
            medium.forEach((issue, i) => {
                console.log(`${i + 1}. ${issue.issue}`);
                console.log(`   Fix: ${issue.fix}\n`);
            });
        }

        this.generateFixScript();
    }

    generateFixScript() {
        console.log('🔧 AUTOMATED FIX SCRIPT');
        console.log('='.repeat(50));
        
        const hasDbIssues = this.issues.some(i => i.category === 'Database' || i.category === 'Database Schema');
        const hasDependencyIssues = this.issues.some(i => i.category === 'Dependencies');
        
        console.log('Run these commands to fix common issues:\n');
        
        if (hasDependencyIssues) {
            console.log('# Install missing dependencies:');
            console.log('npm install axios cheerio puppeteer mysql2 winston json2csv\n');
        }
        
        if (hasDbIssues) {
            console.log('# Fix database issues:');
            console.log('# 1. Update .env file with correct credentials');
            console.log('# 2. Run database setup:');
            console.log('node setup-database.js\n');
        }
        
        console.log('# Test the fixes:');
        console.log('node debug-scrapers.js');
        console.log('node test-scraper.js --quick');
    }
}

// Run diagnostics if called directly
if (require.main === module) {
    const diagnostics = new ScraperDiagnostics();
    diagnostics.runDiagnostics().catch(console.error);
}

module.exports = ScraperDiagnostics; 