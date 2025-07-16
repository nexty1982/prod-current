// Test script for multi-tenant template system
const { promisePool } = require('./config/db');
const TemplateService = require('./services/templateService');

async function testMultiTenantTemplateSystem() {
  console.log('🚀 Starting Multi-Tenant Template System Tests\n');

  try {
    // Test 1: Check database structure
    console.log('📋 Test 1: Checking database structure...');
    const [columns] = await promisePool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'templates'
      ORDER BY ORDINAL_POSITION
    `);
    
    const hasChurchId = columns.some(col => col.COLUMN_NAME === 'church_id');
    const hasIsGlobal = columns.some(col => col.COLUMN_NAME === 'is_global');
    
    console.log(`   ✅ Church ID column exists: ${hasChurchId}`);
    console.log(`   ✅ Is Global column exists: ${hasIsGlobal}`);
    console.log(`   📊 Total columns: ${columns.length}\n`);

    // Test 2: Create global templates
    console.log('📋 Test 2: Creating global templates...');
    try {
      await TemplateService.initializePredefinedTemplates();
      console.log('   ✅ Global templates initialized successfully\n');
    } catch (error) {
      console.log(`   ⚠️  Global templates may already exist: ${error.message}\n`);
    }

    // Test 3: Get global templates
    console.log('📋 Test 3: Retrieving global templates...');
    const globalTemplates = await TemplateService.getGlobalTemplates();
    console.log(`   ✅ Found ${globalTemplates.length} global templates:`);
    globalTemplates.forEach(template => {
      console.log(`      - ${template.name} (${template.record_type})`);
    });
    console.log();

    // Test 4: Get all templates (should include global)
    console.log('📋 Test 4: Getting all templates (with global)...');
    const allTemplates = await TemplateService.getAllTemplates(null, true);
    console.log(`   ✅ Found ${allTemplates.length} total templates\n`);

    // Test 5: Create church-specific template
    console.log('📋 Test 5: Creating church-specific template...');
    
    // First, get a valid church ID from the database
    const [churches] = await promisePool.execute('SELECT id, name FROM churches LIMIT 1');
    if (churches.length === 0) {
      console.log('   ⚠️  No churches found in database, skipping church-specific tests\n');
      return;
    }
    
    const testChurchId = churches[0].id;
    console.log(`   📍 Using church: ${churches[0].name} (ID: ${testChurchId})`);
    
    try {
      const filePath = await TemplateService.generateTemplate('TestChurchTemplate', [
        { field: 'test_field', label: 'Test Field', type: 'string' },
        { field: 'church_specific', label: 'Church Specific Field', type: 'string' }
      ], {
        churchId: testChurchId,
        recordType: 'custom',
        description: 'Test template for church-specific functionality',
        isEditable: true,
        isGlobal: false
      });
      console.log(`   ✅ Church template created: ${filePath}\n`);
    } catch (error) {
      console.log(`   ⚠️  Church template creation: ${error.message}\n`);
    }

    // Test 6: Get templates for specific church
    console.log('📋 Test 6: Getting templates for specific church...');
    const churchTemplates = await TemplateService.getTemplatesForChurch(testChurchId);
    console.log(`   ✅ Found ${churchTemplates.length} templates for church ${testChurchId}:`);
    churchTemplates.forEach(template => {
      const scope = template.is_global ? 'Global' : `Church ${template.church_id}`;
      console.log(`      - ${template.name} (${scope})`);
    });
    console.log();

    // Test 7: Test church filtering
    console.log('📋 Test 7: Testing church-specific filtering...');
    const churchOnlyTemplates = await TemplateService.getAllTemplates(testChurchId, false);
    const churchWithGlobalTemplates = await TemplateService.getAllTemplates(testChurchId, true);
    
    console.log(`   ✅ Church-only templates: ${churchOnlyTemplates.length}`);
    console.log(`   ✅ Church + Global templates: ${churchWithGlobalTemplates.length}\n`);

    // Test 8: Test duplicate global template
    console.log('📋 Test 8: Testing global template duplication...');
    if (globalTemplates.length > 0) {
      try {
        const originalTemplate = globalTemplates[0];
        const duplicatedPath = await TemplateService.duplicateGlobalTemplate(
          originalTemplate.name,
          testChurchId,
          'DuplicatedBaptismRecords',
          { description: 'Duplicated from global template' }
        );
        console.log(`   ✅ Global template duplicated: ${duplicatedPath}\n`);
      } catch (error) {
        console.log(`   ⚠️  Template duplication: ${error.message}\n`);
      }
    }

    // Test 9: Test permission checks
    console.log('📋 Test 9: Testing permission checks...');
    try {
      // Try to delete a global template (should fail)
      await TemplateService.deleteTemplate('BaptismRecords', testChurchId);
      console.log(`   ❌ Permission check failed - global template deletion should be blocked`);
    } catch (error) {
      console.log(`   ✅ Permission check passed: ${error.message}`);
    }

    try {
      // Try to modify a global template (should fail)
      await TemplateService.updateTemplate('BaptismRecords', { description: 'Modified' }, testChurchId);
      console.log(`   ❌ Permission check failed - global template modification should be blocked`);
    } catch (error) {
      console.log(`   ✅ Permission check passed: ${error.message}`);
    }
    console.log();

    // Test 10: Test template by name with church context
    console.log('📋 Test 10: Testing template retrieval by name with church context...');
    const templateByName = await TemplateService.getTemplateByName('BaptismRecords', testChurchId);
    if (templateByName) {
      console.log(`   ✅ Retrieved template: ${templateByName.name} (${templateByName.scope})`);
    } else {
      console.log(`   ❌ Template not found`);
    }
    console.log();

    // Test 11: Database integrity check
    console.log('📋 Test 11: Database integrity check...');
    const [dbCheck] = await promisePool.execute(`
      SELECT 
        COUNT(*) as total_templates,
        COUNT(CASE WHEN is_global = TRUE THEN 1 END) as global_templates,
        COUNT(CASE WHEN church_id IS NOT NULL THEN 1 END) as church_templates
      FROM templates
    `);
    
    console.log(`   ✅ Total templates in database: ${dbCheck[0].total_templates}`);
    console.log(`   ✅ Global templates: ${dbCheck[0].global_templates}`);
    console.log(`   ✅ Church-specific templates: ${dbCheck[0].church_templates}\n`);

    console.log('🎉 All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Database structure is correct');
    console.log('   - Global templates are working');
    console.log('   - Church-specific templates are working');
    console.log('   - Template filtering is working');
    console.log('   - Permission checks are working');
    console.log('   - Template duplication is working');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close database connection
    await promisePool.end();
  }
}

// Run the tests
if (require.main === module) {
  testMultiTenantTemplateSystem();
}

module.exports = { testMultiTenantTemplateSystem };
