/**
 * Role Migration Validation Script
 * 
 * This script validates the role simplification migration to ensure:
 * 1. All roles are canonical
 * 2. Role distribution is reasonable
 * 3. Legacy role mapping works correctly
 * 4. Permission checks function properly
 */

const mysql = require('mysql2/promise');
const { 
  normalizeLegacyRole, 
  isCanonicalRole, 
  hasRole, 
  getRoleInfo,
  CANONICAL_ROLES,
  legacyRoleMap
} = require('../utils/roles');

async function validateRoleMigration() {
  console.log('🔄 Starting Role Migration Validation...\n');

  // Database connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'orthodapps',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'orthodoxmetrics_db'
  });

  try {
    // Test 1: Verify all user roles are canonical
    console.log('🧪 Test 1: Canonical Role Validation');
    const [users] = await connection.execute(
      'SELECT DISTINCT role FROM orthodoxmetrics_db.users ORDER BY role'
    );
    
    const userRoles = users.map(u => u.role);
    const invalidRoles = userRoles.filter(role => !isCanonicalRole(role));
    
    if (invalidRoles.length > 0) {
      console.error('❌ Invalid roles found:', invalidRoles);
      console.log('   Expected canonical roles:', CANONICAL_ROLES);
      return false;
    } else {
      console.log('✅ All user roles are canonical');
      console.log('   Found roles:', userRoles);
    }

    // Test 2: Role distribution analysis
    console.log('\n🧪 Test 2: Role Distribution Analysis');
    const [roleStats] = await connection.execute(`
      SELECT role, COUNT(*) as count 
      FROM orthodoxmetrics_db.users 
      GROUP BY role 
      ORDER BY 
        CASE role
          WHEN 'super_admin' THEN 8
          WHEN 'admin' THEN 7
          WHEN 'church_admin' THEN 6
          WHEN 'priest' THEN 5
          WHEN 'deacon' THEN 4
          WHEN 'editor' THEN 3
          WHEN 'viewer' THEN 2
          WHEN 'guest' THEN 1
          ELSE 0
        END DESC
    `);
    
    console.log('📊 Role Distribution:');
    roleStats.forEach(stat => {
      const roleInfo = getRoleInfo(stat.role);
      console.log(`   ${stat.role}: ${stat.count} users (${roleInfo.description})`);
    });

    // Test 3: Super admin validation
    console.log('\n🧪 Test 3: Super Admin Validation');
    const [superAdmins] = await connection.execute(
      'SELECT COUNT(*) as count FROM orthodoxmetrics_db.users WHERE role = "super_admin"'
    );
    
    const superAdminCount = superAdmins[0].count;
    if (superAdminCount > 3) {
      console.warn(`⚠️  Warning: ${superAdminCount} super_admin accounts (recommend ≤3)`);
    } else {
      console.log(`✅ Super admin count is appropriate: ${superAdminCount}`);
    }

    // Test 4: Legacy role mapping validation
    console.log('\n🧪 Test 4: Legacy Role Mapping Validation');
    const testMappings = [
      { legacy: 'manager', expected: 'church_admin' },
      { legacy: 'user', expected: 'editor' },
      { legacy: 'secretary', expected: 'editor' },
      { legacy: 'treasurer', expected: 'editor' },
      { legacy: 'dev_admin', expected: 'admin' },
      { legacy: 'volunteer', expected: 'editor' },
      { legacy: 'owner', expected: 'church_admin' },
      { legacy: 'member', expected: 'editor' }
    ];

    let mappingErrors = 0;
    testMappings.forEach(test => {
      const result = normalizeLegacyRole(test.legacy);
      if (result === test.expected) {
        console.log(`✅ ${test.legacy} → ${result}`);
      } else {
        console.error(`❌ ${test.legacy} → ${result} (expected: ${test.expected})`);
        mappingErrors++;
      }
    });

    if (mappingErrors > 0) {
      console.error(`❌ ${mappingErrors} legacy role mapping errors found`);
      return false;
    }

    // Test 5: Permission hierarchy validation
    console.log('\n🧪 Test 5: Permission Hierarchy Validation');
    const testUser = { role: 'church_admin' };
    const permissionTests = [
      { role: 'viewer', shouldHave: true, description: 'church_admin should have viewer permissions' },
      { role: 'editor', shouldHave: true, description: 'church_admin should have editor permissions' },
      { role: 'deacon', shouldHave: true, description: 'church_admin should have deacon permissions' },
      { role: 'priest', shouldHave: true, description: 'church_admin should have priest permissions' },
      { role: 'admin', shouldHave: false, description: 'church_admin should NOT have admin permissions' },
      { role: 'super_admin', shouldHave: false, description: 'church_admin should NOT have super_admin permissions' }
    ];

    let permissionErrors = 0;
    permissionTests.forEach(test => {
      const result = hasRole(testUser, test.role);
      if (result === test.shouldHave) {
        console.log(`✅ ${test.description}`);
      } else {
        console.error(`❌ ${test.description} - FAILED`);
        permissionErrors++;
      }
    });

    if (permissionErrors > 0) {
      console.error(`❌ ${permissionErrors} permission hierarchy errors found`);
      return false;
    }

    // Test 6: Database integrity checks
    console.log('\n🧪 Test 6: Database Integrity Checks');
    
    // Check for orphaned role references in other tables
    const tablesToCheck = [
      { table: 'church_admin_panel', column: 'role' },
      { table: 'kanban_board_members', column: 'role' }
    ];

    for (const tableCheck of tablesToCheck) {
      try {
        const [tableRoles] = await connection.execute(
          `SELECT DISTINCT ${tableCheck.column} as role FROM ${tableCheck.table} WHERE ${tableCheck.column} IS NOT NULL`
        );
        
        const invalidTableRoles = tableRoles
          .map(r => r.role)
          .filter(role => !isCanonicalRole(role));
        
        if (invalidTableRoles.length > 0) {
          console.error(`❌ Invalid roles in ${tableCheck.table}:`, invalidTableRoles);
        } else {
          console.log(`✅ ${tableCheck.table} roles are canonical`);
        }
      } catch (error) {
        console.log(`⚠️  Skipping ${tableCheck.table} (table may not exist)`);
      }
    }

    // Test 7: Profile attributes check
    console.log('\n🧪 Test 7: Profile Attributes Validation');
    try {
      const [profileCheck] = await connection.execute(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(profile_attributes) as users_with_attributes,
          COUNT(CASE WHEN JSON_VALID(profile_attributes) THEN 1 END) as valid_json_count
        FROM orthodoxmetrics_db.users
      `);
      
      const stats = profileCheck[0];
      console.log(`✅ Total users: ${stats.total_users}`);
      console.log(`✅ Users with profile attributes: ${stats.users_with_attributes}`);
      console.log(`✅ Valid JSON attributes: ${stats.valid_json_count}`);
      
      if (stats.users_with_attributes !== stats.valid_json_count) {
        console.warn('⚠️  Some users have invalid JSON in profile_attributes');
      }
    } catch (error) {
      console.log('⚠️  Profile attributes column may not exist yet (pre-migration)');
    }

    // Test 8: Migration backup verification
    console.log('\n🧪 Test 8: Migration Backup Verification');
    try {
      const [backupCheck] = await connection.execute(
        'SELECT COUNT(*) as backup_count FROM role_migration_backup'
      );
      
      const backupCount = backupCheck[0].backup_count;
      if (backupCount > 0) {
        console.log(`✅ Migration backup contains ${backupCount} role records`);
        
        // Show sample of backed up roles
        const [backupSample] = await connection.execute(`
          SELECT original_role, COUNT(*) as count 
          FROM role_migration_backup 
          GROUP BY original_role 
          ORDER BY count DESC 
          LIMIT 10
        `);
        
        console.log('📋 Backup role distribution:');
        backupSample.forEach(sample => {
          console.log(`   ${sample.original_role}: ${sample.count} users`);
        });
      } else {
        console.log('⚠️  No migration backup found (pre-migration state)');
      }
    } catch (error) {
      console.log('⚠️  Migration backup table not found (pre-migration state)');
    }

    console.log('\n🎉 Role Migration Validation Complete!');
    return true;

  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  } finally {
    await connection.end();
  }
}

// Additional utility functions for manual testing
function testLegacyRoleMapping() {
  console.log('\n🧪 Legacy Role Mapping Test');
  console.log('Available legacy mappings:');
  
  Object.entries(legacyRoleMap).forEach(([legacy, canonical]) => {
    console.log(`  ${legacy} → ${canonical}`);
  });
}

function testRoleHierarchy() {
  console.log('\n🧪 Role Hierarchy Test');
  console.log('Testing role inheritance:');
  
  const testCases = [
    { user: { role: 'super_admin' }, test: 'admin', expected: true },
    { user: { role: 'admin' }, test: 'church_admin', expected: true },
    { user: { role: 'church_admin' }, test: 'priest', expected: true },
    { user: { role: 'priest' }, test: 'deacon', expected: true },
    { user: { role: 'deacon' }, test: 'editor', expected: true },
    { user: { role: 'editor' }, test: 'viewer', expected: true },
    { user: { role: 'viewer' }, test: 'guest', expected: true },
    { user: { role: 'viewer' }, test: 'admin', expected: false },
    { user: { role: 'editor' }, test: 'priest', expected: false }
  ];
  
  testCases.forEach(testCase => {
    const result = hasRole(testCase.user, testCase.test);
    const status = result === testCase.expected ? '✅' : '❌';
    console.log(`  ${status} ${testCase.user.role} hasRole(${testCase.test}): ${result}`);
  });
}

// Export functions for use in other scripts
module.exports = {
  validateRoleMigration,
  testLegacyRoleMapping,
  testRoleHierarchy
};

// Run validation if called directly
if (require.main === module) {
  require('dotenv').config();
  
  validateRoleMigration()
    .then(success => {
      if (success) {
        console.log('\n✅ All validation tests passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Some validation tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Validation script error:', error);
      process.exit(1);
    });
}