#!/usr/bin/env node

/**
 * Script to add build routes to the main server index.js
 * This ensures the build API endpoints are properly mounted
 */

const fs = require('fs').promises;
const path = require('path');

const SERVER_INDEX_PATH = path.join(__dirname, '../server/index.js');

async function addBuildRoutes() {
  try {
    console.log('📝 Adding build routes to server...');
    
    // Read the current server index file
    const indexContent = await fs.readFile(SERVER_INDEX_PATH, 'utf8');
    
    // Check if build routes are already added
    if (indexContent.includes("const buildRouter = require('./routes/build')")) {
      console.log('✅ Build routes already mounted in server');
      return;
    }
    
    // Find where to add the build routes
    let updatedContent = indexContent;
    
    // Add the require statement after other route requires
    const requirePattern = /const componentsRouter = require\('\.\/routes\/admin\/components'\);/;
    if (requirePattern.test(updatedContent)) {
      updatedContent = updatedContent.replace(
        requirePattern,
        `const componentsRouter = require('./routes/admin/components');
const buildRouter = require('./routes/build');`
      );
    } else {
      // Fallback: add after the last require statement
      const lastRequirePattern = /const .+ = require\('\.\/routes\/.+'\);(?![\s\S]*const .+ = require\('\.\/routes)/;
      if (lastRequirePattern.test(updatedContent)) {
        updatedContent = updatedContent.replace(
          lastRequirePattern,
          `$&
const buildRouter = require('./routes/build');`
        );
      } else {
        console.log('⚠️  Could not find appropriate place to add build router require');
      }
    }
    
    // Add the route mounting after other route mountings
    const mountPattern = /app\.use\('\/api\/admin\/components', componentsRouter\);/;
    if (mountPattern.test(updatedContent)) {
      updatedContent = updatedContent.replace(
        mountPattern,
        `app.use('/api/admin/components', componentsRouter);
app.use('/api/build', buildRouter);`
      );
    } else {
      // Fallback: add before the final middleware or after other app.use statements
      const appUsePattern = /app\.use\('\/api\/.+', .+Router\);(?![\s\S]*app\.use\('\/api)/;
      if (appUsePattern.test(updatedContent)) {
        updatedContent = updatedContent.replace(
          appUsePattern,
          `$&
app.use('/api/build', buildRouter);`
        );
      } else {
        console.log('⚠️  Could not find appropriate place to mount build router');
      }
    }
    
    // Write the updated content back to the file
    await fs.writeFile(SERVER_INDEX_PATH, updatedContent);
    
    console.log('✅ Build routes successfully added to server');
    console.log('📡 Available endpoints:');
    console.log('   GET /api/build/config');
    console.log('   POST /api/build/config');
    console.log('   GET /api/build/logs');
    console.log('   GET /api/build/meta');
    console.log('   POST /api/build/run');
    console.log('   GET /api/build/run-stream');
    
  } catch (error) {
    console.error('❌ Failed to add build routes:', error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  addBuildRoutes();
}

module.exports = { addBuildRoutes };