#!/usr/bin/env node

/**
 * Test script for database utilities
 */

import { testConnections, getChurchInfo, validateUserPermissions } from '../utils/dbConnections';
import { getFieldConfig, getChurchFieldConfigs } from '../services/fieldConfigService';

async function testDbUtilities() {
  console.log('🧪 Testing database utilities...');
  
  try {
    // Test connections
    console.log('\n🔌 Testing database connections...');
    const connectionTest = await testConnections();
    
    if (connectionTest.success) {
      console.log('✅ All database connections successful');
    } else {
      console.log('❌ Some database connections failed:');
      Object.entries(connectionTest.results).forEach(([db, result]) => {
        if (result.connected) {
          console.log(`   ✅ ${db}: Connected`);
        } else {
          console.log(`   ❌ ${db}: ${result.error}`);
        }
      });
    }
    
    // Test church info retrieval
    console.log('\n🏛️ Testing church info retrieval...');
    try {
      const churchInfo = await getChurchInfo(14);
      console.log(`✅ Church info retrieved: ${churchInfo.name}`);
    } catch (error) {
      console.log(`❌ Church info failed: ${error.message}`);
    }
    
    // Test field configuration retrieval
    console.log('\n📋 Testing field configuration retrieval...');
    try {
      const fieldConfig = await getFieldConfig(14, 'baptism');
      if (fieldConfig) {
        console.log(`✅ Field config retrieved: ${fieldConfig.fields.length} fields`);
      } else {
        console.log('ℹ️  No field config found (expected for new setup)');
      }
    } catch (error) {
      console.log(`❌ Field config failed: ${error.message}`);
    }
    
    // Test church field configs
    console.log('\n📂 Testing church field configs...');
    try {
      const configs = await getChurchFieldConfigs(14);
      console.log(`✅ Found ${configs.length} field configurations for church 14`);
    } catch (error) {
      console.log(`❌ Church field configs failed: ${error.message}`);
    }
    
    console.log('\n🎉 Database utilities test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testDbUtilities().catch(console.error);
