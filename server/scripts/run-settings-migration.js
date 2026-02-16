#!/usr/bin/env node
/**
 * Run Settings Console Database Migration
 * Executes the SQL migration file using the app database connection
 */

const fs = require('fs');
const path = require('path');
const { promisePool } = require('../dist/config/db');

async function runMigration() {
    const migrationPath = path.join(__dirname, '../database/migrations/2026-02-12_settings-console-tables.sql');
    
    console.log('📋 Reading migration file...');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons and filter out comments and empty statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    console.log(`🔧 Found ${statements.length} SQL statements to execute\n`);
    
    let executed = 0;
    let skipped = 0;
    
    for (const statement of statements) {
        // Skip USE statements and comments
        if (statement.toUpperCase().startsWith('USE ') || 
            statement.startsWith('--') || 
            statement.startsWith('/*')) {
            skipped++;
            continue;
        }
        
        try {
            await promisePool.query(statement);
            executed++;
            
            // Log table creation
            if (statement.toUpperCase().includes('CREATE TABLE')) {
                const match = statement.match(/CREATE TABLE.*?`?(\w+)`?/i);
                if (match) {
                    console.log(`✅ Created table: ${match[1]}`);
                }
            } else if (statement.toUpperCase().includes('INSERT')) {
                const match = statement.match(/INSERT.*?INTO\s+`?(\w+)`?/i);
                if (match) {
                    console.log(`✅ Inserted seed data into: ${match[1]}`);
                }
            } else if (statement.toUpperCase().includes('UPDATE')) {
                console.log(`✅ Updated enum values`);
            }
        } catch (err) {
            // Ignore "table already exists" errors
            if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log(`ℹ️  Table already exists (skipped)`);
                skipped++;
            } else if (err.code === 'ER_DUP_ENTRY') {
                console.log(`ℹ️  Duplicate entry (skipped)`);
                skipped++;
            } else {
                console.error(`❌ Error executing statement:`, err.message);
                console.error(`Statement: ${statement.substring(0, 100)}...`);
            }
        }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   Executed: ${executed}`);
    console.log(`   Skipped: ${skipped}`);
    
    // Verify tables exist
    console.log(`\n🔍 Verifying tables...`);
    const [tables] = await promisePool.query(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
        AND TABLE_NAME IN ('settings_registry', 'settings_overrides', 'settings_audit')
        ORDER BY TABLE_NAME
    `);
    
    console.log(`✅ Found ${tables.length} settings tables:`);
    tables.forEach(t => console.log(`   - ${t.TABLE_NAME}`));
    
    // Count seed data
    const [regCount] = await promisePool.query(`SELECT COUNT(*) as cnt FROM settings_registry`);
    console.log(`\n📦 Settings registry contains ${regCount[0].cnt} entries`);
    
    console.log(`\n✅ Migration complete!`);
    process.exit(0);
}

runMigration().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
