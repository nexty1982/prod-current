#!/usr/bin/env node
/**
 * Test Router Import
 * 
 * Tests if the churchOcrRoutes router can be imported correctly
 */

console.log('Testing churchOcrRoutes import...\n');

try {
  const router = require('./routes/churchOcrRoutes');
  
  console.log('✅ Router imported successfully');
  console.log('Router type:', typeof router);
  console.log('Router keys:', Object.keys(router));
  console.log('router.default type:', typeof router.default);
  console.log('router itself type:', typeof router);
  
  const routerToMount = router.default || router;
  console.log('\nRouter to mount type:', typeof routerToMount);
  console.log('Is function?', typeof routerToMount === 'function');
  
  if (typeof routerToMount === 'function') {
    console.log('\n✅ Router is ready to mount!');
  } else {
    console.log('\n❌ Router is not a function');
  }
  
} catch (error) {
  console.error('❌ Failed to import router:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
