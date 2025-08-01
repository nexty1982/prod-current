#!/usr/bin/env node

/**
 * OMAI Intelligence Test Script
 * Tests the upgraded intelligence engine with all required prompts
 * Created: 2025-07-27
 */

const path = require('path');

// Add project root to module path
process.env.NODE_PATH = path.join(__dirname, '..');
require('module')._initPaths();

const { askOMAI, debugPrompt } = require('../services/om-ai');

console.log('🧠 OMAI Intelligence Engine Test Suite');
console.log('=====================================\n');

// Test cases as specified by the user
const testCases = [
  {
    name: 'Date Query',
    prompt: 'what is today\'s date',
    expectedIntent: 'system_query',
    shouldContain: ['📅', 'Today is']
  },
  {
    name: 'Time Query',
    prompt: 'what\'s the time',
    expectedIntent: 'system_query',
    shouldContain: ['🕐', 'time is']
  },
  {
    name: 'User Identity',
    prompt: 'who am I',
    expectedIntent: 'user_info',
    shouldContain: ['👤', 'You are']
  },
  {
    name: 'Self Check',
    prompt: 'run self-check',
    expectedIntent: 'self_check',
    shouldContain: ['🔍', 'Self-Check Report', 'Healthy']
  },
  {
    name: 'JSON Optimization',
    prompt: 'optimize this json',
    expectedIntent: 'code_request',
    shouldContain: ['📋', 'JSON Optimization', 'optimize']
  },
  {
    name: 'Gibberish Handling',
    prompt: 'zzzzz',
    expectedIntent: 'fallback',
    shouldContain: ['🤔', 'programming language']
  },
  {
    name: 'Weather Query',
    prompt: 'what\'s the weather',
    expectedIntent: 'fallback',
    shouldContain: ['🌤️', 'weather API']
  },
  {
    name: 'Joke Request',
    prompt: 'tell me a joke',
    expectedIntent: 'fallback',
    shouldContain: ['😂', 'debug']
  },
  {
    name: 'Agent Command',
    prompt: 'run autofix',
    expectedIntent: 'agent_command',
    shouldContain: ['🔧', 'Auto-Fix Engine']
  },
  {
    name: 'Documentation Request',
    prompt: 'help with omai',
    expectedIntent: 'documentation_request',
    shouldContain: ['📚', 'Documentation Assistant']
  }
];

async function runTests() {
  console.log('Starting OMAI Intelligence Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`🔍 Testing: ${testCase.name}`);
    console.log(`   Prompt: "${testCase.prompt}"`);
    
    try {
      // Test prompt classification
      const debugInfo = debugPrompt(testCase.prompt);
      console.log(`   Intent: ${debugInfo.classifiedIntent}`);
      
      // Test actual response
      const securityContext = {
        user: { 
          name: 'Test User', 
          role: 'super_admin' 
        }
      };
      
      const response = await askOMAI(testCase.prompt, securityContext);
      
      // Validate response
      let success = true;
      let missingContent = [];
      
      for (const expectedContent of testCase.shouldContain) {
        if (!response.includes(expectedContent)) {
          success = false;
          missingContent.push(expectedContent);
        }
      }
      
      if (success) {
        console.log(`   ✅ PASSED\n`);
        passed++;
      } else {
        console.log(`   ❌ FAILED - Missing: ${missingContent.join(', ')}`);
        console.log(`   Response: ${response.substring(0, 100)}...\n`);
        failed++;
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}\n`);
      failed++;
    }
  }
  
  // Summary
  console.log('\n🎯 Test Results Summary');
  console.log('======================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! OMAI intelligence upgrade is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
}

// Additional debug tests
async function runDebugTests() {
  console.log('\n🛠️  Debug Function Tests');
  console.log('========================\n');
  
  const debugTestPrompts = [
    'what is today\'s date',
    'optimize my json',
    'tell me a joke',
    'who am I',
    'random gibberish xyz123'
  ];
  
  for (const prompt of debugTestPrompts) {
    console.log(`Debug: "${prompt}"`);
    const debugInfo = debugPrompt(prompt);
    console.log(`  Intent: ${debugInfo.classifiedIntent}`);
    console.log(`  Patterns: ${debugInfo.matchedPatterns.length}`);
    console.log('');
  }
}

// Performance test
async function runPerformanceTest() {
  console.log('\n⚡ Performance Test');
  console.log('==================\n');
  
  const startTime = Date.now();
  const iterations = 10;
  
  for (let i = 0; i < iterations; i++) {
    await askOMAI('what is today\'s date', { user: { role: 'admin' } });
  }
  
  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / iterations;
  
  console.log(`Total time for ${iterations} requests: ${totalTime}ms`);
  console.log(`Average response time: ${avgTime.toFixed(2)}ms`);
  console.log(`Requests per second: ${(1000 / avgTime).toFixed(2)}`);
}

// Run all tests
async function main() {
  try {
    await runTests();
    await runDebugTests();
    await runPerformanceTest();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Test suite interrupted. Goodbye!');
  process.exit(0);
});

// Run the tests
main(); 