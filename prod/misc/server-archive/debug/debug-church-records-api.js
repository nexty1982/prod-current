const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  multipleStatements: true
};

async function debugChurchRecordsIssue() {
  console.log('🔍 Debugging Church Records Issue...\n');
  
  try {
    // Connect to MySQL
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL\n');

    // Step 1: Check church database linkage
    console.log('=== STEP 1: Church Database Linkage ===');
    const [churches] = await connection.execute(`
      SELECT id, name, database_name 
      FROM orthodoxmetrics_db.churches 
      WHERE name LIKE '%Saints Peter%' OR name LIKE '%SSPPOC%'
    `);
    
    console.log('Churches found:', churches);
    
    if (churches.length === 0) {
      console.log('❌ No SSPPOC church found in orthodoxmetrics_db.churches');
      return;
    }
    
    const church = churches[0];
    console.log(`\n✅ Church found: ${church.name} (ID: ${church.id})`);
    console.log(`Database name: ${church.database_name}\n`);

    // Step 2: Check if the database exists
    console.log('=== STEP 2: Database Existence Check ===');
    const [databases] = await connection.execute(`
      SELECT SCHEMA_NAME 
      FROM information_schema.SCHEMATA 
      WHERE SCHEMA_NAME = ?
    `, [church.database_name]);
    
    if (databases.length === 0) {
      console.log(`❌ Database ${church.database_name} does not exist!`);
      return;
    }
    console.log(`✅ Database ${church.database_name} exists\n`);

    // Step 3: Check marriage_records table
    console.log('=== STEP 3: Marriage Records Count ===');
    const [totalCount] = await connection.execute(`
      SELECT COUNT(*) as total_records 
      FROM \`${church.database_name}\`.marriage_records
    `);
    console.log(`Total marriage records: ${totalCount[0].total_records}\n`);

    // Step 4: Check church_id distribution
    console.log('=== STEP 4: Church ID Distribution ===');
    const [distribution] = await connection.execute(`
      SELECT 
        church_id, 
        COUNT(*) as record_count,
        MIN(id) as first_record_id,
        MAX(id) as last_record_id
      FROM \`${church.database_name}\`.marriage_records 
      GROUP BY church_id 
      ORDER BY church_id
    `);
    
    console.log('Church ID distribution in marriage_records:');
    distribution.forEach(row => {
      console.log(`  Church ID ${row.church_id}: ${row.record_count} records (IDs: ${row.first_record_id}-${row.last_record_id})`);
    });
    console.log();

    // Step 5: Check records for the church ID
    console.log(`=== STEP 5: Records for Church ID ${church.id} ===`);
    const [churchRecords] = await connection.execute(`
      SELECT 
        id, church_id, fname_groom, lname_groom, fname_bride, lname_bride, mdate
      FROM \`${church.database_name}\`.marriage_records 
      WHERE church_id = ? 
      LIMIT 5
    `, [church.id]);
    
    if (churchRecords.length === 0) {
      console.log(`❌ No marriage records found for church_id = ${church.id}`);
      
      // Check if records exist with different church_id
      const [otherRecords] = await connection.execute(`
        SELECT DISTINCT church_id, COUNT(*) as count
        FROM \`${church.database_name}\`.marriage_records 
        GROUP BY church_id
      `);
      console.log('Records found with different church_id values:');
      otherRecords.forEach(row => {
        console.log(`  Church ID ${row.church_id}: ${row.count} records`);
      });
    } else {
      console.log(`✅ Found ${churchRecords.length} marriage records for church_id = ${church.id}:`);
      churchRecords.forEach(record => {
        console.log(`  ID: ${record.id}, Groom: ${record.fname_groom} ${record.lname_groom}, Bride: ${record.fname_bride} ${record.lname_bride}, Date: ${record.mdate}`);
      });
    }
    console.log();

    // Step 6: Test the API endpoint simulation
    console.log('=== STEP 6: API Endpoint Simulation ===');
    console.log(`Testing query: SELECT * FROM marriage_records WHERE church_id = ${church.id} ORDER BY id DESC LIMIT 10`);
    
    const [apiSimulation] = await connection.execute(`
      SELECT * FROM \`${church.database_name}\`.marriage_records 
      WHERE church_id = ? 
      ORDER BY id DESC 
      LIMIT 10
    `, [church.id]);
    
    console.log(`API would return: ${apiSimulation.length} records`);
    if (apiSimulation.length > 0) {
      console.log('Sample record:', {
        id: apiSimulation[0].id,
        church_id: apiSimulation[0].church_id,
        groom: `${apiSimulation[0].fname_groom} ${apiSimulation[0].lname_groom}`,
        bride: `${apiSimulation[0].fname_bride} ${apiSimulation[0].lname_bride}`
      });
    }

    await connection.end();
    console.log('\n🔍 Debug complete!');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run the debug if this file is executed directly
if (require.main === module) {
  debugChurchRecordsIssue();
}

module.exports = { debugChurchRecordsIssue }; 