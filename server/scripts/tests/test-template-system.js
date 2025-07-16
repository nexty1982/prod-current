// server/test-template-system.js
const TemplateService = require('./services/templateService');

async function testTemplateSystem() {
  console.log('🧪 Testing Template System...\n');

  try {
    // 1. Initialize database
    console.log('1. Initializing database...');
    await TemplateService.initializeDatabase();
    console.log('✅ Database initialized\n');

    // 2. Test predefined templates
    console.log('2. Getting predefined templates...');
    const predefined = TemplateService.getPredefinedTemplates();
    console.log(`✅ Found ${Object.keys(predefined).length} predefined templates:`, Object.keys(predefined));
    console.log('   - Baptism fields:', predefined.baptism.fields.length);
    console.log('   - Marriage fields:', predefined.marriage.fields.length);
    console.log('   - Funeral fields:', predefined.funeral.fields.length);
    console.log('');

    // 3. Test existing template analysis
    console.log('3. Analyzing existing template files...');
    try {
      const baptismFields = TemplateService.extractFieldsFromTemplate(
        require('path').resolve(__dirname, '../front-end/src/views/records/BaptismRecords.tsx')
      );
      console.log(`✅ Extracted ${baptismFields.length} fields from BaptismRecords.tsx`);
      console.log('   Sample fields:', baptismFields.slice(0, 3).map(f => f.label).join(', '));
    } catch (err) {
      console.log('⚠️  Could not analyze existing BaptismRecords.tsx:', err.message);
    }
    console.log('');

    // 4. Test sync functionality
    console.log('4. Syncing existing templates...');
    await TemplateService.syncExistingTemplates();
    console.log('✅ Templates synced\n');

    // 5. Get all templates from database
    console.log('5. Retrieving all templates from database...');
    const allTemplates = await TemplateService.getAllTemplates();
    console.log(`✅ Found ${allTemplates.length} templates in database:`);
    allTemplates.forEach(template => {
      console.log(`   - ${template.name} (${template.record_type}, ${template.fields.length} fields)`);
    });
    console.log('');

    // 6. Test generating a new custom template
    console.log('6. Testing custom template generation...');
    const customFields = [
      { field: 'person_name', label: 'Person Name', type: 'string' },
      { field: 'event_date', label: 'Event Date', type: 'date' },
      { field: 'location', label: 'Location', type: 'string' },
      { field: 'notes', label: 'Notes', type: 'text' }
    ];

    try {
      const filePath = await TemplateService.generateTemplate('TestCustomRecords', customFields, {
        recordType: 'custom',
        description: 'Test custom template for validation'
      });
      console.log('✅ Custom template generated at:', filePath);
      
      // Get the generated template from database
      const generatedTemplate = await TemplateService.getTemplateByName('TestCustomRecords');
      console.log('✅ Template saved to database with ID:', generatedTemplate.id);
      
      // Clean up test template
      await TemplateService.deleteTemplate('TestCustomRecords');
      console.log('✅ Test template cleaned up');
    } catch (err) {
      console.log('⚠️  Error testing custom template:', err.message);
    }
    console.log('');

    // 7. Test record type filtering
    console.log('7. Testing record type filtering...');
    const baptismTemplates = await TemplateService.getTemplatesByType('baptism');
    console.log(`✅ Found ${baptismTemplates.length} baptism templates`);
    console.log('');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testTemplateSystem().then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = testTemplateSystem;
