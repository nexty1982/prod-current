#!/usr/bin/env node

/**
 * Apply church_id columns to tables that need them
 * Based on the inventory generated earlier
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Summerof1982@!',
    database: 'orthodoxmetrics_db',
    multipleStatements: true
  });

  try {
    // Read the inventory
    const inventoryPath = path.join(__dirname, '../../audit/tenant_inventory.json');
    const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    
    // Filter tables that need church_id via user join
    const tablesToUpdate = inventory.filter(i => i.action === 'add_church_id_via_user');
    
    console.log(`\n📋 Processing ${tablesToUpdate.length} tables that need church_id...\n`);
    
    const results = {
      success: [],
      failed: [],
      warnings: []
    };
    
    for (const table of tablesToUpdate) {
      console.log(`\n🔧 Processing table: ${table.table}`);
      console.log(`   - Backfill via: ${table.backfill_column}`);
      console.log(`   - Row count: ${table.row_count}`);
      
      try {
        // Step 1: Add church_id column and FK
        console.log(`   ✓ Adding church_id column and FK...`);
        await connection.execute(`CALL omx_add_church_fk(?, 1)`, [table.table]);
        
        // Step 2: Backfill church_id from user column
        if (table.row_count > 0 && table.backfill_column) {
          console.log(`   ✓ Backfilling church_id from ${table.backfill_column}...`);
          await connection.execute(`CALL omx_backfill_church_via_user(?, ?)`, 
            [table.table, table.backfill_column]);
          
          // Check how many rows were updated
          const [[{ updated }]] = await connection.execute(
            `SELECT COUNT(*) as updated FROM \`${table.table}\` WHERE church_id IS NOT NULL`
          );
          console.log(`   ✓ Updated ${updated} rows with church_id`);
          
          if (updated < table.row_count) {
            const warning = `${table.table}: Only ${updated}/${table.row_count} rows have church_id`;
            results.warnings.push(warning);
            console.log(`   ⚠️  ${warning}`);
          }
        }
        
        // Step 3: Add scoped unique constraints if needed
        if (table.candidate_uniques && table.candidate_uniques.length > 0) {
          for (const uniqueCol of table.candidate_uniques) {
            // Skip certain columns that shouldn't be scoped
            if (['email', 'slug', 'uuid'].includes(uniqueCol)) {
              console.log(`   ⏭️  Skipping global unique: ${uniqueCol}`);
              continue;
            }
            
            try {
              console.log(`   ✓ Adding scoped unique for: ${uniqueCol}`);
              await connection.execute(`CALL omx_add_scoped_unique(?, ?, ?)`,
                [table.table, uniqueCol, uniqueCol]);
            } catch (err) {
              console.log(`   ⚠️  Could not add scoped unique for ${uniqueCol}: ${err.message}`);
            }
          }
        }
        
        results.success.push(table.table);
        console.log(`   ✅ Successfully processed ${table.table}`);
        
      } catch (error) {
        console.error(`   ❌ Error processing ${table.table}: ${error.message}`);
        results.failed.push({
          table: table.table,
          error: error.message
        });
      }
    }
    
    // Generate report of unassigned rows
    console.log('\n📊 Checking for unassigned rows...');
    await connection.execute(`CALL omx_report_unassigned()`);
    const [unassigned] = await connection.execute(`
      SELECT t.TABLE_NAME, COUNT(*) as null_count
      FROM information_schema.COLUMNS c
      JOIN information_schema.TABLES t ON c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME
      WHERE c.TABLE_SCHEMA = 'orthodoxmetrics_db' 
        AND c.COLUMN_NAME = 'church_id'
        AND t.TABLE_TYPE = 'BASE TABLE'
      GROUP BY t.TABLE_NAME
      HAVING null_count > 0
    `);
    
    // Save results
    const resultsPath = path.join(__dirname, '../../audit/church_id_application_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      processed: tablesToUpdate.length,
      results,
      unassigned: unassigned || []
    }, null, 2));
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully processed: ${results.success.length} tables`);
    console.log(`❌ Failed: ${results.failed.length} tables`);
    console.log(`⚠️  Warnings: ${results.warnings.length}`);
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed tables:');
      results.failed.forEach(f => console.log(`   - ${f.table}: ${f.error}`));
    }
    
    if (results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      results.warnings.forEach(w => console.log(`   - ${w}`));
    }
    
    console.log(`\n📄 Full results saved to: ${resultsPath}`);
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
