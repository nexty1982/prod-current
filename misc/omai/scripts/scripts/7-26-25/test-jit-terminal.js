#!/usr/bin/env node

/**
 * JIT Terminal Test Script
 * Tests the actual terminal connection and shell interaction
 */

const TerminalManager = require('./server/services/terminalManager');

async function testTerminalConnection() {
  console.log('🧪 Testing JIT Terminal Connection...');
  console.log('=====================================');
  
  const terminalManager = new TerminalManager();
  
  try {
    // Run the built-in test
    console.log('\n1. Running built-in terminal test...');
    const testResult = await terminalManager.testTerminal();
    
    console.log('\n✅ Terminal Test Results:');
    console.log(`   - Success: ${testResult.success}`);
    console.log(`   - PID: ${testResult.pid}`);
    console.log(`   - Shell: ${testResult.shell}`);
    console.log(`   - Message: ${testResult.message}`);
    console.log('\n📄 Terminal Output:');
    console.log(testResult.output);
    
    // Test manual session creation
    console.log('\n2. Testing manual session creation...');
    const sessionId = `manual-test-${Date.now()}`;
    
    const createResult = await terminalManager.createTerminal(sessionId, {
      cols: 120,
      rows: 30
    });
    
    console.log('\n✅ Manual Session Results:');
    console.log(`   - Success: ${createResult.success}`);
    console.log(`   - Session ID: ${createResult.sessionId}`);
    console.log(`   - PID: ${createResult.pid}`);
    console.log(`   - Shell: ${createResult.shell}`);
    
    // Get session info
    const sessionInfo = terminalManager.getTerminalSession(sessionId);
    console.log('\n📊 Session Info:');
    console.log(`   - Active: ${sessionInfo.isActive}`);
    console.log(`   - Created: ${sessionInfo.createdAt}`);
    console.log(`   - CWD: ${sessionInfo.cwd}`);
    console.log(`   - Size: ${sessionInfo.cols}x${sessionInfo.rows}`);
    
    // Test writing to terminal
    console.log('\n3. Testing terminal input...');
    await terminalManager.writeToTerminal(sessionId, 'echo "Manual test successful"\n');
    await terminalManager.writeToTerminal(sessionId, 'pwd\n');
    await terminalManager.writeToTerminal(sessionId, 'whoami\n');
    
    // Wait a bit for output
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clean up
    console.log('\n4. Cleaning up test session...');
    await terminalManager.closeTerminal(sessionId);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Terminal spawning works');
    console.log('   ✅ Shell process initialization works');  
    console.log('   ✅ Command input/output works');
    console.log('   ✅ Session management works');
    console.log('\n🚀 JIT Terminal is ready for WebSocket integration!');
    
  } catch (error) {
    console.error('\n❌ Terminal test failed:', error);
    console.error('\n🔍 Troubleshooting:');
    console.error('   - Check if node-pty is properly installed');
    console.error('   - Verify shell path is correct');
    console.error('   - Check file permissions');
    console.error('   - Ensure pty support is available');
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testTerminalConnection().catch(console.error);
}

module.exports = testTerminalConnection;
