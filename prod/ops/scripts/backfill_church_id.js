#!/usr/bin/env node

/**
 * Backfill church_id for tables that already have the column
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Summerof1982@!',
    database: 'orthodoxmetrics_db'
  });

  try {
    // Read the inventory
    const inventoryPath = path.join(__dirname, '../../audit/tenant_inventory.json');
    const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    
    // Filter tables that need backfilling
    const tablesToBackfill = inventory.filter(i => 
      i.action === 'add_church_id_via_user' && i.row_count > 0
    );
    
    console.log(`\n📋 Backfilling church_id for ${tablesToBackfill.length} tables with data...\n`);
    
    for (const table of tablesToBackfill) {
      console.log(`\n🔧 Backfilling table: ${table.table}`);
      console.log(`   - Using column: ${table.backfill_column}`);
      console.log(`   - Total rows: ${table.row_count}`);
      
      try {
        // Check if church_id column exists
        const [hasCol] = await connection.execute(`
          SELECT COUNT(*) as has_col
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
            AND TABLE_NAME = ?
            AND COLUMN_NAME = 'church_id'
        `, [table.table]);
        
        if (hasCol[0].has_col === 0) {
          console.log(`   ⏭️  Skipping - no church_id column`);
          continue;
        }
        
        // Perform the backfill
        const [result] = await connection.execute(`
          UPDATE \`${table.table}\` t
          JOIN users u ON u.id = t.\`${table.backfill_column}\`
          SET t.church_id = u.church_id
          WHERE t.church_id IS NULL 
            AND u.church_id IS NOT NULL
        `);
        
        console.log(`   ✓ Updated ${result.affectedRows} rows`);
        
        // Check remaining NULL values
        const [[{ nullCount }]] = await connection.execute(
          `SELECT COUNT(*) as nullCount FROM \`${table.table}\` WHERE church_id IS NULL`
        );
        
        if (nullCount > 0) {
          console.log(`   ⚠️  ${nullCount} rows still have NULL church_id (likely from superadmin)`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Summary of tables with church_id
    console.log('\n' + '='.repeat(60));
    console.log('📊 CHURCH_ID STATUS SUMMARY');
    console.log('='.repeat(60));
    
    const [summary] = await connection.execute(`
      SELECT 
        c.TABLE_NAME,
        t.TABLE_ROWS as total_rows,
        (SELECT COUNT(*) FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA='orthodoxmetrics_db' 
         AND TABLE_NAME=c.TABLE_NAME 
         AND COLUMN_NAME='church_id') as has_church_id
      FROM information_schema.COLUMNS c
      JOIN information_schema.TABLES t 
        ON c.TABLE_SCHEMA = t.TABLE_SCHEMA 
        AND c.TABLE_NAME = t.TABLE_NAME
      WHERE c.TABLE_SCHEMA = 'orthodoxmetrics_db'
        AND t.TABLE_TYPE = 'BASE TABLE'
        AND c.COLUMN_NAME = 'church_id'
      ORDER BY t.TABLE_ROWS DESC
      LIMIT 20
    `);
    
    console.log('\nTop tables with church_id column:');
    for (const row of summary) {
      console.log(`  ${row.TABLE_NAME}: ${row.total_rows} rows`);
    }
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
