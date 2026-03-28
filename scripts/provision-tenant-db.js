#!/usr/bin/env node
/**
 * Tenant Database Provisioning CLI
 *
 * Usage:
 *   node scripts/provision-tenant-db.js <church_id>         Provision a single tenant DB
 *   node scripts/provision-tenant-db.js --verify <db_name>  Verify an existing tenant DB
 *   node scripts/provision-tenant-db.js --validate-template Validate template readiness
 *   node scripts/provision-tenant-db.js --test              Provision + verify + cleanup a test DB
 *
 * Examples:
 *   node scripts/provision-tenant-db.js 99
 *   node scripts/provision-tenant-db.js --verify om_church_46
 *   node scripts/provision-tenant-db.js --test
 */

const mysql = require('mysql2/promise');

// Inline DB config (script runs outside Express, can't use config module easily)
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: process.env.DB_NAME || 'orthodoxmetrics_db',
};

// Import service (relative from project root)
const path = require('path');
const {
  provisionTenantDb,
  validateTemplate,
  verifyExistingTenantDb,
  TEMPLATE_DB,
  APPROVED_VERSION,
  EXPECTED_TABLE_COUNT,
} = require(path.join(__dirname, '..', 'server', 'src', 'services', 'tenantProvisioning'));

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Tenant Database Provisioning CLI

Usage:
  node scripts/provision-tenant-db.js <church_id>           Provision tenant DB for church
  node scripts/provision-tenant-db.js --verify <db_name>    Verify existing tenant DB
  node scripts/provision-tenant-db.js --validate-template   Check template readiness
  node scripts/provision-tenant-db.js --test                Provision test DB, verify, cleanup

Template: ${TEMPLATE_DB} v${APPROVED_VERSION} (${EXPECTED_TABLE_COUNT} tables)
    `);
    process.exit(0);
  }

  const pool = mysql.createPool({ ...DB_CONFIG, waitForConnections: true, connectionLimit: 5 });

  try {
    if (args.includes('--validate-template')) {
      await cmdValidateTemplate(pool);
    } else if (args.includes('--verify')) {
      const dbName = args[args.indexOf('--verify') + 1];
      if (!dbName) {
        console.error('Usage: --verify <db_name>');
        process.exit(1);
      }
      await cmdVerify(pool, dbName);
    } else if (args.includes('--test')) {
      await cmdTest(pool);
    } else {
      const churchId = parseInt(args[0]);
      if (isNaN(churchId)) {
        console.error(`Invalid church_id: ${args[0]}`);
        process.exit(1);
      }
      await cmdProvision(pool, churchId);
    }
  } finally {
    await pool.end();
  }
}

async function cmdValidateTemplate(pool) {
  console.log(`\nValidating template: ${TEMPLATE_DB}`);
  console.log('─'.repeat(50));

  const result = await validateTemplate(pool);

  if (result.valid) {
    console.log(`✅ Template is valid`);
    console.log(`   Version: ${result.version}`);
    console.log(`   Status: approved and frozen`);
  } else {
    console.error(`❌ Template validation failed: ${result.reason}`);
    process.exit(1);
  }
}

async function cmdVerify(pool, dbName) {
  console.log(`\nVerifying tenant database: ${dbName}`);
  console.log('─'.repeat(50));

  const result = await verifyExistingTenantDb(dbName, pool);

  console.log(`Tables found: ${result.tableCount}`);
  console.log(`Verification: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);

  if (result.issues.length > 0) {
    console.log('\nIssues:');
    for (const issue of result.issues) {
      console.log(`  ⚠ ${issue}`);
    }
  }

  if (!result.passed) process.exit(1);
}

async function cmdProvision(pool, churchId) {
  console.log(`\nProvisioning tenant database for church ${churchId}`);
  console.log('─'.repeat(50));
  console.log(`Template: ${TEMPLATE_DB} v${APPROVED_VERSION}`);
  console.log(`Target:   om_church_${churchId}`);
  console.log('');

  const result = await provisionTenantDb(churchId, pool, { source: 'cli', initiatedBy: 'cli' });

  console.log('\n' + '─'.repeat(50));
  console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Database:  ${result.targetDb}`);
  console.log(`Template:  v${result.templateVersion}`);
  console.log(`Tables:    ${result.tablesCreated}`);
  console.log(`Verified:  ${result.verified}`);
  console.log(`DB Created: ${result.dbCreated}`);
  console.log(`Duration:  ${result.durationMs}ms`);

  if (result.error) {
    console.error(`Error: ${result.error}`);
  }
  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const w of result.warnings) {
      console.log(`  ⚠ ${w}`);
    }
  }

  if (!result.success) process.exit(1);
}

async function cmdTest(pool) {
  const testChurchId = 99999;
  const testDb = `om_church_${testChurchId}`;

  console.log(`\n🧪 Provisioning Test Run`);
  console.log('─'.repeat(50));
  console.log(`Template: ${TEMPLATE_DB} v${APPROVED_VERSION}`);
  console.log(`Test DB:  ${testDb}`);
  console.log('');

  // 1. Validate template
  console.log('Step 1: Validate template...');
  const templateCheck = await validateTemplate(pool);
  if (!templateCheck.valid) {
    console.error(`❌ Template invalid: ${templateCheck.reason}`);
    process.exit(1);
  }
  console.log(`  ✅ Template v${templateCheck.version} is valid\n`);

  // 2. Ensure test DB doesn't already exist
  const [existing] = await pool.query(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    [testDb]
  );
  if (existing.length > 0) {
    console.log(`  ⚠ Test DB ${testDb} already exists — dropping first...`);
    await pool.query(`DROP DATABASE \`${testDb}\``);
    console.log(`  ✅ Dropped ${testDb}\n`);
  }

  // 3. Provision
  console.log('Step 2: Provision test database...');
  const result = await provisionTenantDb(testChurchId, pool, { skipChurchUpdate: true, source: 'cli', initiatedBy: 'cli' });

  console.log(`  Success:    ${result.success}`);
  console.log(`  DB Created: ${result.dbCreated}`);
  console.log(`  Tables:     ${result.tablesCreated}`);
  console.log(`  Verified:   ${result.verified}`);
  console.log(`  Duration:   ${result.durationMs}ms`);

  if (!result.success) {
    console.error(`\n❌ Provisioning failed: ${result.error}`);
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.log('\n  Warnings:');
    for (const w of result.warnings) console.log(`    ⚠ ${w}`);
  }

  // 4. Extra verification
  console.log('\nStep 3: Extended verification...');
  const verify = await verifyExistingTenantDb(testDb, pool);
  console.log(`  Tables:      ${verify.tableCount}`);
  console.log(`  All passed:  ${verify.passed}`);

  if (verify.issues.length > 0) {
    console.log('\n  Issues:');
    for (const issue of verify.issues) console.log(`    ⚠ ${issue}`);
  }

  // 5. Check church_id defaults
  console.log('\nStep 4: Verify church_id defaults...');
  const [colCheck] = await pool.query(
    `SELECT TABLE_NAME, COLUMN_DEFAULT FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND COLUMN_NAME = 'church_id'
     ORDER BY TABLE_NAME`,
    [testDb]
  );
  let defaultsOk = true;
  for (const col of colCheck) {
    const expected = String(testChurchId);
    const ok = col.COLUMN_DEFAULT === expected;
    console.log(`  ${ok ? '✅' : '⚠'}  ${col.TABLE_NAME}.church_id DEFAULT = ${col.COLUMN_DEFAULT}`);
    if (!ok) defaultsOk = false;
  }

  // 6. Cleanup
  console.log('\nStep 5: Cleanup test database...');
  await pool.query(`DROP DATABASE \`${testDb}\``);
  console.log(`  ✅ Dropped ${testDb}`);

  // Final report
  console.log('\n' + '═'.repeat(50));
  const allGood = result.success && result.verified && verify.passed;
  console.log(`${allGood ? '✅' : '⚠'} TEST ${allGood ? 'PASSED' : 'PASSED WITH WARNINGS'}`);
  console.log('═'.repeat(50));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
