const path = require('path');
const DatabaseService = require('../services/databaseService');

/**
 * Check Activity Log Table Structure
 * Identify the correct columns for activity_log table
 */

async function checkActivityLogStructure() {
    console.log('🔍 CHECKING ACTIVITY_LOG TABLE STRUCTURE');
    console.log('========================================');

    try {
        // Get table structure
        console.log('\n1. Getting activity_log table structure...');
        const structureResult = await DatabaseService.queryPlatform('DESCRIBE activity_log');
        const structureData = structureResult[0]; // Correct access to data rows
        
        console.log('✅ Activity_log table structure:');
        structureData.forEach((field, index) => {
            const required = field.Null === 'NO' && field.Default === null && field.Extra !== 'auto_increment';
            const status = required ? '❗ REQUIRED' : '✅ Optional';
            console.log(`   ${index + 1}. ${field.Field} (${field.Type}) - ${status}`);
            console.log(`      Null: ${field.Null}, Default: ${field.Default}, Extra: ${field.Extra}`);
        });

        // Check existing activity_log entries to see what data they have
        console.log('\n2. Checking existing activity_log data patterns...');
        const activitiesResult = await DatabaseService.queryPlatform('SELECT * FROM activity_log LIMIT 2');
        const activitiesData = activitiesResult[0];
        
        if (activitiesData.length > 0) {
            console.log('✅ Sample activity_log data:');
            console.log('   Fields available:', Object.keys(activitiesData[0]));
            activitiesData.forEach((activity, index) => {
                console.log(`   Activity ${index + 1}:`);
                Object.entries(activity).forEach(([key, value]) => {
                    console.log(`      ${key}: ${value}`);
                });
            });
        } else {
            console.log('ℹ️ No existing activity_log entries found');
        }

        return structureData;

    } catch (error) {
        console.error('❌ Error checking activity_log structure:', error);
        return null;
    }
}

// Run the check
checkActivityLogStructure()
    .then((structure) => {
        if (structure) {
            console.log('\n✅ Activity_log structure check completed');
            process.exit(0);
        } else {
            console.log('\n❌ Activity_log structure check failed');
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
