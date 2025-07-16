#!/usr/bin/env node

/**
 * Phase 1: Database Schema & Core Infrastructure - COMPLETION SCRIPT
 * Final step: Verify all Phase 1 components and update todo.md
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function completePhase1() {
  try {
    console.log('🏁 PHASE 1 - COMPLETION: Verifying all components...');
    console.log('================================================================================');
    
    const results = {
      databases: { verified: false, details: {} },
      tables: { created: false, count: 0 },
      interfaces: { created: false, files: [] },
      utilities: { created: false, files: [] },
      sampleData: { created: false, count: 0 }
    };
    
    // 1. Verify database connections
    console.log('🔍 Step 1: Verifying database connections...');
    try {
      const databases = [
        { name: 'orthodoxmetrics_db', tested: false },
        { name: 'ssppoc_records_db', tested: false },
        { name: 'saints_peter_and_paul_orthodox_church_db', tested: false }
      ];
      
      for (const db of databases) {
        try {
          const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'orthodoxapps',
            password: 'Summerof1982@!',
            database: db.name
          });
          
          await connection.execute('SELECT 1');
          await connection.end();
          
          db.tested = true;
          console.log(`   ✅ ${db.name}: Connected`);
        } catch (error) {
          console.log(`   ❌ ${db.name}: ${error.message}`);
        }
      }
      
      results.databases.verified = databases.every(db => db.tested);
      results.databases.details = databases;
      
    } catch (error) {
      console.log(`   ❌ Database verification failed: ${error.message}`);
    }
    
    // 2. Verify OCR tables in Records DB
    console.log('\n🔍 Step 2: Verifying OCR tables...');
    try {
      const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'orthodoxapps',
        password: 'Summerof1982@!',
        database: 'ssppoc_records_db'
      });
      
      const requiredTables = [
        'ocr_field_configurations',
        'ocr_processing_log',
        'ocr_review_queue', 
        'ocr_job_transfers'
      ];
      
      let tablesFound = 0;
      
      for (const tableName of requiredTables) {
        const [rows] = await connection.query(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = 'ssppoc_records_db' AND table_name = ?`,
          [tableName]
        );
        
        if (rows[0].count > 0) {
          console.log(`   ✅ ${tableName}: Exists`);
          tablesFound++;
        } else {
          console.log(`   ❌ ${tableName}: Missing`);
        }
      }
      
      results.tables.created = tablesFound === requiredTables.length;
      results.tables.count = tablesFound;
      
      await connection.end();
      
    } catch (error) {
      console.log(`   ❌ Table verification failed: ${error.message}`);
    }
    
    // 3. Verify TypeScript interfaces
    console.log('\n🔍 Step 3: Verifying TypeScript interfaces...');
    try {
      const typesDir = path.join(__dirname, '..', 'types');
      const expectedFiles = ['ocrTypes.ts', 'ocrUtils.ts'];
      
      for (const fileName of expectedFiles) {
        const filePath = path.join(typesDir, fileName);
        try {
          await fs.access(filePath);
          console.log(`   ✅ ${fileName}: Created`);
          results.interfaces.files.push(fileName);
        } catch {
          console.log(`   ❌ ${fileName}: Missing`);
        }
      }
      
      results.interfaces.created = results.interfaces.files.length === expectedFiles.length;
      
    } catch (error) {
      console.log(`   ❌ Interface verification failed: ${error.message}`);
    }
    
    // 4. Verify database utilities
    console.log('\n🔍 Step 4: Verifying database utilities...');
    try {
      const utilsDir = path.join(__dirname, '..', 'utils');
      const servicesDir = path.join(__dirname, '..', 'services');
      
      const expectedFiles = [
        { dir: utilsDir, file: 'dbConnections.ts' },
        { dir: servicesDir, file: 'fieldConfigService.ts' }
      ];
      
      for (const { dir, file } of expectedFiles) {
        const filePath = path.join(dir, file);
        try {
          await fs.access(filePath);
          console.log(`   ✅ ${file}: Created`);
          results.utilities.files.push(file);
        } catch {
          console.log(`   ❌ ${file}: Missing`);
        }
      }
      
      results.utilities.created = results.utilities.files.length === expectedFiles.length;
      
    } catch (error) {
      console.log(`   ❌ Utilities verification failed: ${error.message}`);
    }
    
    // 5. Verify sample data
    console.log('\n🔍 Step 5: Verifying sample field configuration...');
    try {
      const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'orthodoxapps',
        password: 'Summerof1982@!',
        database: 'ssppoc_records_db'
      });
      
      const [rows] = await connection.query(
        'SELECT COUNT(*) as count FROM ocr_field_configurations WHERE church_id = 14'
      );
      
      results.sampleData.count = rows[0].count;
      results.sampleData.created = rows[0].count > 0;
      
      if (results.sampleData.created) {
        console.log(`   ✅ Sample field configurations: ${rows[0].count} found`);
      } else {
        console.log('   ❌ No sample field configurations found');
      }
      
      await connection.end();
      
    } catch (error) {
      console.log(`   ❌ Sample data verification failed: ${error.message}`);
    }
    
    // 6. Generate Phase 1 completion report
    console.log('\n📊 PHASE 1 COMPLETION REPORT:');
    console.log('================================================================================');
    
    const overallSuccess = results.databases.verified && 
                          results.tables.created && 
                          results.interfaces.created && 
                          results.utilities.created;
    
    console.log(`🔌 Database Connections: ${results.databases.verified ? '✅ ALL WORKING' : '❌ FAILED'}`);
    console.log(`🗄️  OCR Tables Created: ${results.tables.created ? '✅ ALL CREATED' : '❌ INCOMPLETE'} (${results.tables.count}/4)`);
    console.log(`📝 TypeScript Interfaces: ${results.interfaces.created ? '✅ CREATED' : '❌ MISSING'} (${results.interfaces.files.length}/2)`);
    console.log(`🔧 Database Utilities: ${results.utilities.created ? '✅ CREATED' : '❌ MISSING'} (${results.utilities.files.length}/2)`);
    console.log(`🌱 Sample Data: ${results.sampleData.created ? '✅ CREATED' : '❌ MISSING'} (${results.sampleData.count} configs)`);
    
    if (overallSuccess) {
      console.log('\n🎉 PHASE 1 COMPLETE! ✅✅✅✅✅');
      console.log('🚀 Ready to proceed to Phase 2: OCR Transfer & Field Mapping Services');
      
      // Update todo.md to mark Phase 1 as complete
      try {
        const todoPath = path.join(__dirname, '..', '..', 'todo.md');
        let todoContent = await fs.readFile(todoPath, 'utf8');
        
        // Mark Phase 1 tasks as complete
        const phase1Updates = [
          { from: '- [ ] Verify `ssppoc_records_db` database exists and is accessible', to: '- [✅] Verify `ssppoc_records_db` database exists and is accessible' },
          { from: '- [ ] Create `ocr_field_configurations` table schema in `ssppoc_records_db`', to: '- [✅] Create `ocr_field_configurations` table schema in `ssppoc_records_db`' },
          { from: '- [ ] Create `ocr_processing_log` table schema in `ssppoc_records_db`', to: '- [✅] Create `ocr_processing_log` table schema in `ssppoc_records_db`' },
          { from: '- [ ] Create `ocr_review_queue` table in `ssppoc_records_db`', to: '- [✅] Create `ocr_review_queue` table in `ssppoc_records_db`' },
          { from: '- [ ] Create `ocr_job_transfers` tracking table in `ssppoc_records_db`', to: '- [✅] Create `ocr_job_transfers` tracking table in `ssppoc_records_db`' },
          { from: '- [ ] Define TypeScript interface for `FieldConfig`', to: '- [✅] Define TypeScript interface for `FieldConfig`' },
          { from: '- [ ] Define TypeScript interfaces for OCR mapping types', to: '- [✅] Define TypeScript interfaces for OCR mapping types' },
          { from: '- [ ] Create database migration scripts for Records DB', to: '- [✅] Create database migration scripts for Records DB' },
          { from: '- [ ] Set up cross-database connection utilities (orthodoxmetrics_db ↔ ssppoc_records_db)', to: '- [✅] Set up cross-database connection utilities (orthodoxmetrics_db ↔ ssppoc_records_db)' }
        ];
        
        phase1Updates.forEach(update => {
          todoContent = todoContent.replace(update.from, update.to);
        });
        
        // Add Phase 1 completion summary
        const phase1Summary = `
**🎉 PHASE 1: COMPLETE - Database Schema & Core Infrastructure!** 🚀
- [✅] All 3 databases verified and accessible
- [✅] 4/4 OCR tables created in ssppoc_records_db
- [✅] TypeScript interfaces and utilities created
- [✅] Sample field configuration for church 14 (baptism records)
- [✅] Cross-database connection utilities implemented
- [✅] Field configuration service created
- [✅] **READY FOR PHASE 2!** 🎯

`;
        
        // Insert after the Phase 1 section
        todoContent = todoContent.replace(
          '**PHASE 1: Database Schema & Core Infrastructure**',
          '**PHASE 1: Database Schema & Core Infrastructure**' + phase1Summary
        );
        
        await fs.writeFile(todoPath, todoContent);
        console.log('📝 Updated todo.md with Phase 1 completion status');
        
      } catch (error) {
        console.log(`⚠️  Could not update todo.md: ${error.message}`);
      }
      
    } else {
      console.log('\n❌ PHASE 1 INCOMPLETE - Some components failed');
      console.log('📋 Review the errors above and re-run the failed scripts');
    }
    
    console.log('\n📁 Generated Files Summary:');
    console.log('   Database Schema:');
    console.log('   - server/scripts/phase1-*.js (4 setup scripts)');
    console.log('   TypeScript Interfaces:');
    console.log('   - server/types/ocrTypes.ts');
    console.log('   - server/types/ocrUtils.ts');
    console.log('   Database Utilities:');
    console.log('   - server/utils/dbConnections.ts');
    console.log('   - server/services/fieldConfigService.ts');
    
    console.log('\n🎯 Next Steps:');
    if (overallSuccess) {
      console.log('   Run: node server/scripts/phase2-create-transfer-service.js');
    } else {
      console.log('   Fix any failed components above');
      console.log('   Re-run the individual phase1-*.js scripts as needed');
    }
    
    console.log('================================================================================');
    
  } catch (error) {
    console.error('❌ Phase 1 completion check failed:', error.message);
    process.exit(1);
  }
}

// Run completion check
completePhase1().catch(console.error);
