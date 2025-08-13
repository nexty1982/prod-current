#!/usr/bin/env node

/**
 * Safely apply church_id columns to tables
 * Handles existing columns and FK constraints
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
        // Step 1: Check if church_id column already exists
        const [existingCol] = await connection.execute(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
            AND TABLE_NAME = ?
            AND COLUMN_NAME = 'church_id'
        `, [table.table]);
        
        if (existingCol.length > 0) {
          console.log(`   ℹ️  church_id column already exists`);
          
          // Check if it needs fixing (wrong data type)
          if (existingCol[0].DATA_TYPE !== 'int') {
            console.log(`   ⚠️  Wrong data type: ${existingCol[0].DATA_TYPE}, fixing...`);
            
            // Drop any existing FK first
            const [fks] = await connection.execute(`
              SELECT CONSTRAINT_NAME
              FROM information_schema.KEY_COLUMN_USAGE
              WHERE TABLE_SCHEMA = 'orthodoxmetrics_db'
                AND TABLE_NAME = ?
                AND COLUMN_NAME = 'church_id'
                AND REFERENCED_TABLE_NAME IS NOT NULL
            `, [table.table]);
            
            for (const fk of fks) {
              console.log(`   - Dropping FK: ${fk.CONSTRAINT_NAME}`);
              await connection.execute(`ALTER TABLE \`${table.table}\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
            }
            
            // Drop the column
            console.log(`   - Dropping incorrect church_id column`);
            await connection.execute(`ALTER TABLE \`${table.table}\` DROP COLUMN church_id`);
          }
        }
        
        // Step 2: Add church_id column if it doesn't exist
        const [checkAgain] = await connection.execute(`
          SELECT COUNT(*) as has_col
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
            AND TABLE_NAME = ?
            AND COLUMN_NAME = 'church_id'
        `, [table.table]);
        
        if (checkAgain[0].has_col === 0) {
          console.log(`   ✓ Adding church_id column...`);
          await connection.execute(`
            ALTER TABLE \`${table.table}\` 
            ADD COLUMN church_id INT(11) NULL AFTER id
          `);
        }
        
        // Step 3: Add index if missing
        const [indexes] = await connection.execute(`
          SELECT COUNT(*) as has_idx
          FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = 'orthodoxmetrics_db'
            AND TABLE_NAME = ?
            AND INDEX_NAME = ?
        `, [table.table, `idx_${table.table}_church`]);
        
        if (indexes[0].has_idx === 0) {
          console.log(`   ✓ Adding index...`);
          await connection.execute(`
            CREATE INDEX \`idx_${table.table}_church\` 
            ON \`${table.table}\` (church_id)
          `);
        }
        
        // Step 4: Add FK constraint if missing
        const [fkCheck] = await connection.execute(`
          SELECT COUNT(*) as has_fk
          FROM information_schema.REFERENTIAL_CONSTRAINTS
          WHERE CONSTRAINT_SCHEMA = 'orthodoxmetrics_db'
            AND TABLE_NAME = ?
            AND CONSTRAINT_NAME = ?
        `, [table.table, `fk_${table.table}_church`]);
        
        if (fkCheck[0].has_fk === 0) {
          console.log(`   ✓ Adding foreign key constraint...`);
          await connection.execute(`
            ALTER TABLE \`${table.table}\`
            ADD CONSTRAINT \`fk_${table.table}_church\`
            FOREIGN KEY (church_id) REFERENCES churches(id)
            ON DELETE RESTRICT ON UPDATE CASCADE
          `);
        }
        
        // Step 5: Backfill church_id from user column
        if (table.row_count > 0 && table.backfill_column) {
          console.log(`   ✓ Backfilling church_id from ${table.backfill_column}...`);
          
          const [updateResult] = await connection.execute(`
            UPDATE \`${table.table}\` t
            JOIN users u ON u.id = t.\`${table.backfill_column}\`
            SET t.church_id = u.church_id
            WHERE t.church_id IS NULL 
              AND u.church_id IS NOT NULL
          `);
          
          console.log(`   ✓ Updated ${updateResult.affectedRows} rows with church_id`);
          
          // Check how many rows were updated
          const [[{ updated }]] = await connection.execute(
            `SELECT COUNT(*) as updated FROM \`${table.table}\` WHERE church_id IS NOT NULL`
          );
          
          if (updated < table.row_count) {
            const warning = `${table.table}: Only ${updated}/${table.row_count} rows have church_id`;
            results.warnings.push(warning);
            console.log(`   ⚠️  ${warning}`);
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
    
    // Save results
    const resultsPath = path.join(__dirname, '../../audit/church_id_application_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      processed: tablesToUpdate.length,
      results,
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
