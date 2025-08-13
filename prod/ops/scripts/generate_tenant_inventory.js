#!/usr/bin/env node

/**
 * Generate inventory of tables for multi-tenant migration
 * Outputs: ops/audit/tenant_inventory.json and tenant_plan.md
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
    // Get all tables
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
        AND TABLE_TYPE = 'BASE TABLE'
        AND TABLE_NAME NOT IN ('migrations', 'schema_migrations', 'churches')
      ORDER BY TABLE_NAME
    `);

    const inventory = [];
    
    for (const { TABLE_NAME } of tables) {
      // Check for church_id column
      const [churchCol] = await connection.execute(`
        SELECT COUNT(*) as has_church_id
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
          AND TABLE_NAME = ?
          AND COLUMN_NAME = 'church_id'
      `, [TABLE_NAME]);

      // Check for user_id or created_by columns
      const [userCols] = await connection.execute(`
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
          AND TABLE_NAME = ?
          AND COLUMN_NAME IN ('user_id', 'created_by', 'updated_by', 'owner_id')
      `, [TABLE_NAME]);

      // Check for unique constraints
      const [uniques] = await connection.execute(`
        SELECT DISTINCT COLUMN_NAME
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = 'orthodoxmetrics_db'
          AND TABLE_NAME = ?
          AND NON_UNIQUE = 0
          AND COLUMN_NAME NOT IN ('id', 'church_id')
      `, [TABLE_NAME]);

      // Get row count
      const [[{ row_count }]] = await connection.execute(
        `SELECT COUNT(*) as row_count FROM \`${TABLE_NAME}\``
      );

      const item = {
        table: TABLE_NAME,
        has_church_id: churchCol[0].has_church_id === 1,
        user_columns: userCols.map(c => c.COLUMN_NAME),
        candidate_uniques: uniques.map(u => u.COLUMN_NAME),
        row_count: row_count
      };

      // Determine action needed
      if (item.has_church_id) {
        item.action = 'verify_only';
      } else if (item.user_columns.length > 0) {
        item.action = 'add_church_id_via_user';
        item.backfill_column = item.user_columns[0];
      } else if (TABLE_NAME.includes('log') || TABLE_NAME.includes('audit') || TABLE_NAME.includes('migration')) {
        item.action = 'skip_system_table';
      } else {
        item.action = 'needs_manual_mapping';
      }

      inventory.push(item);
    }

    // Write inventory JSON
    const auditDir = path.join(__dirname, '../../audit');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(auditDir, 'tenant_inventory.json'),
      JSON.stringify(inventory, null, 2)
    );

    // Generate plan markdown
    let planMd = `# Multi-Tenant Migration Plan

Generated: ${new Date().toISOString()}

## Summary
- Total tables: ${inventory.length}
- Already have church_id: ${inventory.filter(i => i.has_church_id).length}
- Can backfill via user: ${inventory.filter(i => i.action === 'add_church_id_via_user').length}
- Need manual mapping: ${inventory.filter(i => i.action === 'needs_manual_mapping').length}
- System tables (skip): ${inventory.filter(i => i.action === 'skip_system_table').length}

## Action Plan

### Tables Already Scoped (Verify Only)
${inventory.filter(i => i.action === 'verify_only')
  .map(i => `- \`${i.table}\` (${i.row_count} rows)`)
  .join('\n')}

### Tables to Add church_id via User Join
${inventory.filter(i => i.action === 'add_church_id_via_user')
  .map(i => `- \`${i.table}\` via \`${i.backfill_column}\` (${i.row_count} rows)`)
  .join('\n')}

### Tables Needing Manual Review
${inventory.filter(i => i.action === 'needs_manual_mapping')
  .map(i => `- \`${i.table}\` (${i.row_count} rows) - Uniques: [${i.candidate_uniques.join(', ')}]`)
  .join('\n')}

### System Tables (Skip)
${inventory.filter(i => i.action === 'skip_system_table')
  .map(i => `- \`${i.table}\``)
  .join('\n')}

## Next Steps

1. Run church_id addition for tables with user columns:
\`\`\`sql
${inventory.filter(i => i.action === 'add_church_id_via_user')
  .map(i => `CALL omx_add_church_fk('${i.table}', 1);
CALL omx_backfill_church_via_user('${i.table}', '${i.backfill_column}');`)
  .join('\n')}
\`\`\`

2. Add scoped unique constraints where needed:
\`\`\`sql
${inventory.filter(i => i.action === 'add_church_id_via_user' && i.candidate_uniques.length > 0)
  .map(i => i.candidate_uniques.map(u => 
    `CALL omx_add_scoped_unique('${i.table}', '${u}', '${u}');`
  ).join('\n'))
  .join('\n')}
\`\`\`

3. Review and handle manual mapping tables individually.
`;

    fs.writeFileSync(
      path.join(auditDir, 'tenant_plan.md'),
      planMd
    );

    console.log('✅ Inventory generated:');
    console.log(`   - ${path.join(auditDir, 'tenant_inventory.json')}`);
    console.log(`   - ${path.join(auditDir, 'tenant_plan.md')}`);
    
    // Show summary
    console.log('\n📊 Summary:');
    console.log(`   Total tables: ${inventory.length}`);
    console.log(`   Already have church_id: ${inventory.filter(i => i.has_church_id).length}`);
    console.log(`   Can backfill via user: ${inventory.filter(i => i.action === 'add_church_id_via_user').length}`);
    console.log(`   Need manual mapping: ${inventory.filter(i => i.action === 'needs_manual_mapping').length}`);

  } finally {
    await connection.end();
  }
}

main().catch(console.error);
