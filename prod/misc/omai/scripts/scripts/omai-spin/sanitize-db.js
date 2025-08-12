#!/usr/bin/env node

/**
 * OMAI-Spin Database Sanitization Script
 * 
 * Sanitizes sensitive data when migrating production databases to development.
 * Replaces real emails, domains, API keys, and other sensitive information
 * with development-safe values while maintaining data relationships.
 * 
 * Usage:
 *   node sanitize-db.js --session-id=123 --source-db=orthodoxmetrics_db --target-db=orthodoxmetrics_db
 *   node sanitize-db.js --config=sanitize-config.json
 *   node sanitize-db.js --help
 * 
 * Features:
 * - Email masking (user@domain.com → user-dev@devtest.local)
 * - Domain replacement (orthodoxmetrics.com → orthodoxmetrics_db.com)
 * - API key redaction (real_key_123 → [REDACTED_DEV])
 * - URL sanitization (https:// → http://)
 * - Phone number masking
 * - Address generalization
 * - Password hash replacement
 * - Comprehensive logging to tracking database
 * 
 * Author: OMAI Development Team
 * Version: 1.0.0
 * Date: 2025-01-30
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class DatabaseSanitizer {
    constructor(config = {}) {
        this.config = {
            // Database connections
            sourceHost: config.sourceHost || 'localhost',
            sourceUser: config.sourceUser || 'root',
            sourcePassword: config.sourcePassword || '',
            targetHost: config.targetHost || 'localhost',
            targetUser: config.targetUser || 'root',
            targetPassword: config.targetPassword || '',
            trackingHost: config.trackingHost || 'localhost',
            trackingUser: config.trackingUser || 'root',
            trackingPassword: config.trackingPassword || '',
            trackingDatabase: config.trackingDatabase || 'omai_spin_db',
            
            // Sanitization settings
            devDomain: config.devDomain || 'devtest.local',
            devUrlPrefix: config.devUrlPrefix || 'http://orthodoxmetrics_db.com',
            prodUrlPrefix: config.prodUrlPrefix || 'https://orthodoxmetrics.com',
            testPhoneNumber: config.testPhoneNumber || '(555) 123-4567',
            testAddress: config.testAddress || '123 Test St, Dev City, ST 12345',
            
            // Safety settings
            dryRun: config.dryRun || false,
            backupBeforeSanitize: config.backupBeforeSanitize !== false,
            maxRecordsPerTable: config.maxRecordsPerTable || 10000,
            
            ...config
        };
        
        this.sourceConnection = null;
        this.targetConnection = null;
        this.trackingConnection = null;
        this.sessionId = null;
        this.sanitizationStats = {
            tablesProcessed: 0,
            recordsAffected: 0,
            emailsReplaced: 0,
            domainsReplaced: 0,
            keysRedacted: 0,
            urlsReplaced: 0
        };
    }

    /**
     * Initialize database connections
     */
    async initialize(sessionId) {
        this.sessionId = sessionId;
        
        try {
            // Connect to tracking database
            this.trackingConnection = await mysql.createConnection({
                host: this.config.trackingHost,
                user: this.config.trackingUser,
                password: this.config.trackingPassword,
                database: this.config.trackingDatabase,
                charset: 'utf8mb4'
            });
            
            await this.logOperation('info', 'initialize', 'Database sanitizer initialized', {
                sessionId: this.sessionId,
                dryRun: this.config.dryRun
            });
            
            console.log('✅ Database sanitizer initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize database sanitizer:', error);
            throw error;
        }
    }

    /**
     * Sanitize a specific database
     */
    async sanitizeDatabase(sourceDb, targetDb) {
        const startTime = Date.now();
        
        try {
            await this.logOperation('info', 'sanitize_start', `Starting sanitization: ${sourceDb} → ${targetDb}`);
            
            // Connect to source and target databases
            this.sourceConnection = await mysql.createConnection({
                host: this.config.sourceHost,
                user: this.config.sourceUser,
                password: this.config.sourcePassword,
                database: sourceDb,
                charset: 'utf8mb4'
            });
            
            this.targetConnection = await mysql.createConnection({
                host: this.config.targetHost,
                user: this.config.targetUser,
                password: this.config.targetPassword,
                database: targetDb,
                charset: 'utf8mb4'
            });

            // Get list of tables to sanitize
            const tables = await this.getTableList(sourceDb);
            console.log(`📋 Found ${tables.length} tables to process`);

            // Process each table
            for (const table of tables) {
                await this.sanitizeTable(sourceDb, targetDb, table);
            }

            // Log completion
            const duration = Date.now() - startTime;
            await this.logDatabaseOperation('sanitize', sourceDb, targetDb, 'completed', {
                duration_ms: duration,
                stats: this.sanitizationStats
            });

            console.log('🎉 Database sanitization completed successfully');
            console.log('📊 Statistics:', this.sanitizationStats);

            return this.sanitizationStats;

        } catch (error) {
            await this.logOperation('error', 'sanitize_error', `Sanitization failed: ${error.message}`, {
                sourceDb, targetDb, error: error.message
            });
            throw error;
        } finally {
            // Close connections
            if (this.sourceConnection) await this.sourceConnection.end();
            if (this.targetConnection) await this.targetConnection.end();
        }
    }

    /**
     * Get list of tables in database
     */
    async getTableList(database) {
        const [rows] = await this.sourceConnection.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `, [database]);
        
        return rows.map(row => row.TABLE_NAME);
    }

    /**
     * Sanitize a specific table
     */
    async sanitizeTable(sourceDb, targetDb, tableName) {
        try {
            console.log(`🔄 Processing table: ${tableName}`);
            
            // Get table structure
            const columns = await this.getTableColumns(tableName);
            const sensitiveColumns = this.identifySensitiveColumns(columns);
            
            if (sensitiveColumns.length === 0) {
                console.log(`⏭️  Skipping ${tableName} (no sensitive columns detected)`);
                return;
            }

            console.log(`🔒 Found ${sensitiveColumns.length} sensitive columns in ${tableName}:`, 
                       sensitiveColumns.map(col => col.name).join(', '));

            // Get record count
            const [countResult] = await this.sourceConnection.execute(`
                SELECT COUNT(*) as count FROM \`${tableName}\`
            `);
            const totalRecords = countResult[0].count;

            if (totalRecords > this.config.maxRecordsPerTable) {
                console.warn(`⚠️  Warning: ${tableName} has ${totalRecords} records (exceeds limit of ${this.config.maxRecordsPerTable})`);
            }

            // Process records in batches
            const batchSize = 1000;
            let processedRecords = 0;
            let affectedRecords = 0;

            for (let offset = 0; offset < totalRecords; offset += batchSize) {
                const [rows] = await this.targetConnection.execute(`
                    SELECT * FROM \`${tableName}\` 
                    LIMIT ${batchSize} OFFSET ${offset}
                `);

                for (const row of rows) {
                    const sanitizedRow = await this.sanitizeRow(row, sensitiveColumns, tableName);
                    if (sanitizedRow.modified) {
                        await this.updateSanitizedRow(tableName, sanitizedRow.data, row);
                        affectedRecords++;
                    }
                    processedRecords++;
                }

                // Progress update
                if (processedRecords % 5000 === 0) {
                    console.log(`   Progress: ${processedRecords}/${totalRecords} records processed`);
                }
            }

            this.sanitizationStats.tablesProcessed++;
            this.sanitizationStats.recordsAffected += affectedRecords;

            await this.logSanitization(sourceDb, tableName, 'table_complete', sensitiveColumns.length, affectedRecords);
            console.log(`✅ Completed ${tableName}: ${affectedRecords}/${processedRecords} records sanitized`);

        } catch (error) {
            await this.logOperation('error', 'sanitize_table', `Failed to sanitize table ${tableName}: ${error.message}`);
            console.error(`❌ Error processing table ${tableName}:`, error);
            throw error;
        }
    }

    /**
     * Get table column information
     */
    async getTableColumns(tableName) {
        const [rows] = await this.sourceConnection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, CHARACTER_MAXIMUM_LENGTH
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        `, [tableName]);
        
        return rows.map(row => ({
            name: row.COLUMN_NAME,
            type: row.DATA_TYPE,
            nullable: row.IS_NULLABLE === 'YES',
            default: row.COLUMN_DEFAULT,
            maxLength: row.CHARACTER_MAXIMUM_LENGTH
        }));
    }

    /**
     * Identify columns that contain sensitive data
     */
    identifySensitiveColumns(columns) {
        const sensitivePatterns = [
            // Email patterns
            { pattern: /email/i, type: 'email' },
            { pattern: /mail/i, type: 'email' },
            { pattern: /@/i, type: 'email' },
            
            // API/Key patterns
            { pattern: /key/i, type: 'api_key' },
            { pattern: /token/i, type: 'api_key' },
            { pattern: /secret/i, type: 'api_key' },
            { pattern: /api/i, type: 'api_key' },
            
            // URL/Domain patterns
            { pattern: /url/i, type: 'url' },
            { pattern: /domain/i, type: 'domain' },
            { pattern: /website/i, type: 'url' },
            { pattern: /link/i, type: 'url' },
            
            // Contact patterns
            { pattern: /phone/i, type: 'phone' },
            { pattern: /mobile/i, type: 'phone' },
            { pattern: /address/i, type: 'address' },
            { pattern: /street/i, type: 'address' },
            { pattern: /city/i, type: 'address' },
            { pattern: /zip/i, type: 'address' },
            
            // Password patterns
            { pattern: /password/i, type: 'password' },
            { pattern: /hash/i, type: 'password' },
            { pattern: /salt/i, type: 'password' }
        ];

        return columns.filter(column => {
            return sensitivePatterns.some(pattern => {
                if (pattern.pattern.test(column.name)) {
                    column.sensitiveType = pattern.type;
                    return true;
                }
                return false;
            });
        });
    }

    /**
     * Sanitize a single row
     */
    async sanitizeRow(row, sensitiveColumns, tableName) {
        let modified = false;
        const sanitizedRow = { ...row };
        const changes = [];

        for (const column of sensitiveColumns) {
            const originalValue = row[column.name];
            if (originalValue === null || originalValue === '') continue;

            const sanitizedValue = await this.sanitizeValue(originalValue, column.sensitiveType, column.name);
            
            if (sanitizedValue !== originalValue) {
                sanitizedRow[column.name] = sanitizedValue;
                modified = true;
                changes.push({
                    column: column.name,
                    type: column.sensitiveType,
                    original: this.truncateForLog(originalValue),
                    sanitized: this.truncateForLog(sanitizedValue)
                });
            }
        }

        if (changes.length > 0) {
            await this.logSanitization(tableName, column.name, column.sensitiveType, 1, 1, {
                changes: changes
            });
        }

        return { data: sanitizedRow, modified };
    }

    /**
     * Sanitize a specific value based on its type
     */
    async sanitizeValue(value, type, columnName) {
        if (typeof value !== 'string') {
            value = String(value);
        }

        switch (type) {
            case 'email':
                return this.sanitizeEmail(value);
            
            case 'api_key':
                return this.sanitizeApiKey(value);
            
            case 'url':
                return this.sanitizeUrl(value);
            
            case 'domain':
                return this.sanitizeDomain(value);
            
            case 'phone':
                return this.sanitizePhone(value);
            
            case 'address':
                return this.sanitizeAddress(value);
            
            case 'password':
                return this.sanitizePassword(value);
            
            default:
                return value;
        }
    }

    /**
     * Sanitize email addresses
     */
    sanitizeEmail(email) {
        if (!email || !email.includes('@')) return email;
        
        const emailRegex = /^([^@]+)@([^@]+)$/;
        const match = email.match(emailRegex);
        
        if (match) {
            const [, localPart, domain] = match;
            const sanitizedLocal = localPart.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const sanitizedEmail = `${sanitizedLocal}-dev@${this.config.devDomain}`;
            this.sanitizationStats.emailsReplaced++;
            return sanitizedEmail;
        }
        
        return email;
    }

    /**
     * Sanitize API keys and tokens
     */
    sanitizeApiKey(key) {
        if (!key || key.length < 8) return key;
        
        // Check if it looks like an API key
        if (/^[A-Za-z0-9+/=_-]{16,}$/.test(key) || key.includes('sk_') || key.includes('pk_')) {
            this.sanitizationStats.keysRedacted++;
            return '[REDACTED_DEV_KEY]';
        }
        
        return key;
    }

    /**
     * Sanitize URLs
     */
    sanitizeUrl(url) {
        if (!url || typeof url !== 'string') return url;
        
        let sanitized = url;
        
        // Replace production domain with dev domain
        if (url.includes(this.config.prodUrlPrefix)) {
            sanitized = url.replace(this.config.prodUrlPrefix, this.config.devUrlPrefix);
            this.sanitizationStats.urlsReplaced++;
        }
        
        // Replace https with http for dev
        if (sanitized.startsWith('https://')) {
            sanitized = sanitized.replace('https://', 'http://');
        }
        
        return sanitized;
    }

    /**
     * Sanitize domain names
     */
    sanitizeDomain(domain) {
        if (!domain) return domain;
        
        if (domain.includes('orthodoxmetrics.com')) {
            this.sanitizationStats.domainsReplaced++;
            return domain.replace('orthodoxmetrics.com', 'orthodoxmetrics_db.com');
        }
        
        return domain;
    }

    /**
     * Sanitize phone numbers
     */
    sanitizePhone(phone) {
        if (!phone) return phone;
        
        // Replace with test phone number if it looks like a real phone
        const phoneRegex = /^\+?[\d\s\-\(\)\.]{10,}$/;
        if (phoneRegex.test(phone)) {
            return this.config.testPhoneNumber;
        }
        
        return phone;
    }

    /**
     * Sanitize addresses
     */
    sanitizeAddress(address) {
        if (!address || address.length < 10) return address;
        
        // Replace with test address if it looks like a real address
        const addressRegex = /\d+.*\w+.*\w+/;
        if (addressRegex.test(address)) {
            return this.config.testAddress;
        }
        
        return address;
    }

    /**
     * Sanitize password hashes
     */
    sanitizePassword(password) {
        if (!password) return password;
        
        // Generate a consistent dev password hash
        const devPassword = 'dev_password_123';
        return crypto.createHash('sha256').update(devPassword).digest('hex');
    }

    /**
     * Update sanitized row in target database
     */
    async updateSanitizedRow(tableName, sanitizedData, originalRow) {
        if (this.config.dryRun) {
            console.log(`[DRY RUN] Would update row in ${tableName}`);
            return;
        }

        try {
            // Find primary key or unique identifier
            const primaryKey = await this.findPrimaryKey(tableName);
            
            if (!primaryKey) {
                console.warn(`⚠️  Warning: No primary key found for ${tableName}, skipping update`);
                return;
            }

            // Build SET clause
            const setClause = Object.keys(sanitizedData)
                .filter(key => key !== primaryKey)
                .map(key => `\`${key}\` = ?`)
                .join(', ');

            const setValues = Object.keys(sanitizedData)
                .filter(key => key !== primaryKey)
                .map(key => sanitizedData[key]);

            // Build WHERE clause
            const whereValue = originalRow[primaryKey];

            const query = `UPDATE \`${tableName}\` SET ${setClause} WHERE \`${primaryKey}\` = ?`;
            await this.targetConnection.execute(query, [...setValues, whereValue]);

        } catch (error) {
            console.error(`❌ Failed to update row in ${tableName}:`, error);
            throw error;
        }
    }

    /**
     * Find primary key for a table
     */
    async findPrimaryKey(tableName) {
        const [rows] = await this.targetConnection.execute(`
            SELECT COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = ? 
            AND CONSTRAINT_NAME = 'PRIMARY'
            LIMIT 1
        `, [tableName]);
        
        return rows.length > 0 ? rows[0].COLUMN_NAME : null;
    }

    /**
     * Truncate value for logging
     */
    truncateForLog(value, maxLength = 50) {
        if (!value) return value;
        const str = String(value);
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    }

    /**
     * Log operation to tracking database
     */
    async logOperation(level, operation, message, details = null) {
        if (!this.trackingConnection) return;

        try {
            await this.trackingConnection.execute(`
                INSERT INTO agent_logs (session_id, log_level, component, operation, message, details)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [this.sessionId, level, 'db_sanitizer', operation, message, JSON.stringify(details)]);
        } catch (error) {
            console.error('Failed to log to tracking database:', error);
        }
    }

    /**
     * Log database operation
     */
    async logDatabaseOperation(type, sourceDb, targetDb, status, details = null) {
        if (!this.trackingConnection) return;

        try {
            await this.trackingConnection.execute(`
                INSERT INTO database_operations 
                (session_id, operation_type, source_database, target_database, operation_status, sanitization_rules_applied)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [this.sessionId, type, sourceDb, targetDb, status, JSON.stringify(details)]);
        } catch (error) {
            console.error('Failed to log database operation:', error);
        }
    }

    /**
     * Log sanitization action
     */
    async logSanitization(database, table, type, pattern = null, recordsAffected = 0, details = null) {
        if (!this.trackingConnection) return;

        try {
            await this.trackingConnection.execute(`
                INSERT INTO sanitization_log 
                (session_id, database_name, table_name, column_name, sanitization_type, records_affected)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [this.sessionId, database, table, pattern || 'multiple', type, recordsAffected]);
        } catch (error) {
            console.error('Failed to log sanitization:', error);
        }
    }

    /**
     * Close all connections
     */
    async cleanup() {
        try {
            if (this.trackingConnection) {
                await this.trackingConnection.end();
            }
            console.log('✅ Database sanitizer cleaned up successfully');
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
OMAI-Spin Database Sanitization Tool

Usage:
  node sanitize-db.js --session-id=123 --source-db=prod_db --target-db=dev_db
  node sanitize-db.js --config=config.json
  node sanitize-db.js --help

Options:
  --session-id     Session ID for tracking (required)
  --source-db      Source database name (required)
  --target-db      Target database name (required)
  --config         JSON config file path
  --dry-run        Preview changes without applying them
  --help           Show this help message

Examples:
  node sanitize-db.js --session-id=456 --source-db=orthodoxmetrics_db --target-db=orthodoxmetrics_db
  node sanitize-db.js --config=sanitize-config.json --dry-run
        `);
        process.exit(0);
    }

    try {
        // Parse command line arguments
        const config = {};
        let sessionId = null;
        let sourceDb = null;
        let targetDb = null;

        for (const arg of args) {
            if (arg.startsWith('--session-id=')) {
                sessionId = parseInt(arg.split('=')[1]);
            } else if (arg.startsWith('--source-db=')) {
                sourceDb = arg.split('=')[1];
            } else if (arg.startsWith('--target-db=')) {
                targetDb = arg.split('=')[1];
            } else if (arg.startsWith('--config=')) {
                const configPath = arg.split('=')[1];
                const configData = JSON.parse(await fs.readFile(configPath, 'utf8'));
                Object.assign(config, configData);
            } else if (arg === '--dry-run') {
                config.dryRun = true;
            }
        }

        if (!sessionId || !sourceDb || !targetDb) {
            console.error('❌ Error: --session-id, --source-db, and --target-db are required');
            process.exit(1);
        }

        // Initialize sanitizer
        const sanitizer = new DatabaseSanitizer(config);
        await sanitizer.initialize(sessionId);

        // Run sanitization
        console.log(`🚀 Starting database sanitization...`);
        console.log(`📋 Source: ${sourceDb}`);
        console.log(`📋 Target: ${targetDb}`);
        console.log(`📋 Session: ${sessionId}`);
        console.log(`📋 Dry Run: ${config.dryRun ? 'Yes' : 'No'}`);
        console.log('');

        const stats = await sanitizer.sanitizeDatabase(sourceDb, targetDb);
        
        console.log('\n🎉 Sanitization completed successfully!');
        console.log('📊 Final Statistics:');
        console.log(`   Tables processed: ${stats.tablesProcessed}`);
        console.log(`   Records affected: ${stats.recordsAffected}`);
        console.log(`   Emails replaced: ${stats.emailsReplaced}`);
        console.log(`   Domains replaced: ${stats.domainsReplaced}`);
        console.log(`   Keys redacted: ${stats.keysRedacted}`);
        console.log(`   URLs replaced: ${stats.urlsReplaced}`);

        await sanitizer.cleanup();
        process.exit(0);

    } catch (error) {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    }
}

// Export for use as module
module.exports = DatabaseSanitizer;

// Run as CLI if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}