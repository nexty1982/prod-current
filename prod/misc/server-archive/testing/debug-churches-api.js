#!/usr/bin/env node

/**
 * Churches API Debug Test
 * 
 * Directly tests the churches route functionality to isolate the 500 error
 */

const { promisePool } = require('../../config/db');
const { cleanRecords, cleanRecord } = require('../utils/dateFormatter');

async function testChurchesQuery() {
  console.log('🔍 Testing Churches Query Directly');
  console.log('=' .repeat(50));
  
  try {
    console.log('1. Testing database query...');
    
    const [churches] = await promisePool.query(`
      SELECT 
        id,
        name as church_name,
        email,
        phone,
        address,
        city,
        state_province,
        postal_code,
        country,
        preferred_language as language_preference,
        timezone,
        currency,
        tax_id,
        website,
        description_multilang,
        settings,
        is_active,
        created_at,
        updated_at,
        has_baptism_records,
        has_marriage_records,
        has_funeral_records,
        setup_complete,
        instance_port,
        last_login_at,
        record_count_cache,
        notes,
        database_name
      FROM churches 
      WHERE is_active = 1
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Query successful: Found ${churches.length} churches`);
    
    if (churches.length > 0) {
      console.log('2. Testing first church record...');
      console.log('Raw church data:', JSON.stringify(churches[0], null, 2));
      
      console.log('3. Testing cleanRecord function...');
      const cleanedRecord = cleanRecord(churches[0]);
      console.log('Cleaned church data:', JSON.stringify(cleanedRecord, null, 2));
      
      console.log('4. Testing cleanRecords function...');
      const cleanedRecords = cleanRecords(churches);
      console.log(`✅ Cleaned ${cleanedRecords.length} records successfully`);
      
      console.log('5. Testing final response format...');
      const response = {
        success: true,
        churches: cleanedRecords
      };
      console.log('✅ Response format test successful');
      console.log('Response size:', JSON.stringify(response).length, 'characters');
      
    } else {
      console.log('⚠️  No churches found in database');
    }
    
  } catch (error) {
    console.log('❌ Error in churches query test:');
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    console.log('Error code:', error.code);
    console.log('Error stack:', error.stack);
    
    if (error.sql) {
      console.log('SQL Query:', error.sql);
    }
  }
}

async function testRouteExecution() {
  console.log('\n🚀 Simulating Actual Route Execution');
  console.log('=' .repeat(50));
  
  try {
    // Simulate the exact route logic
    console.log('🔍 Churches endpoint called');
    
    const [churches] = await promisePool.query(`
      SELECT 
        id,
        name as church_name,
        email,
        phone,
        address,
        city,
        state_province,
        postal_code,
        country,
        preferred_language as language_preference,
        timezone,
        currency,
        tax_id,
        website,
        description_multilang,
        settings,
        is_active,
        created_at,
        updated_at,
        has_baptism_records,
        has_marriage_records,
        has_funeral_records,
        setup_complete,
        instance_port,
        last_login_at,
        record_count_cache,
        notes,
        database_name
      FROM churches 
      WHERE is_active = 1
      ORDER BY created_at DESC
    `);

    console.log(`✅ Found ${churches.length} churches`);
    
    const responseData = { 
      success: true,
      churches: cleanRecords(churches) 
    };
    
    console.log('✅ Route simulation successful');
    console.log('Response keys:', Object.keys(responseData));
    console.log('Churches count:', responseData.churches.length);
    
  } catch (error) {
    console.log('❌ Route simulation failed:');
    console.log('This is the exact error the API is encountering:');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

async function run() {
  await testChurchesQuery();
  await testRouteExecution();
  
  console.log('\n✅ Churches API debug test complete!');
}

// Run if called directly
if (require.main === module) {
  run().catch(error => {
    console.error('❌ Debug test failed:', error);
    process.exit(1);
  });
}

module.exports = { testChurchesQuery, testRouteExecution };
