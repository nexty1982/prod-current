#!/usr/bin/env node

/**
 * Script to test build history functionality by creating sample build entries
 */

const fs = require('fs').promises;
const path = require('path');

const BUILD_HISTORY_PATH = path.join(__dirname, '../server/data/build-history.json');

async function createSampleBuildHistory() {
  try {
    console.log('🔨 Creating sample build history for testing...');
    
    const sampleBuilds = [
      {
        id: 'test_build_1',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        duration: 45000, // 45 seconds
        success: true,
        config: {
          mode: 'incremental',
          memory: 4096,
          legacyPeerDeps: true,
          skipInstall: false,
          dryRun: false
        },
        output: '✅ Build completed successfully!\nFiles compiled without errors.',
        error: null,
        triggeredBy: 'test@orthodoxmetrics.com'
      },
      {
        id: 'test_build_2',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        duration: 120000, // 2 minutes
        success: false,
        config: {
          mode: 'full',
          memory: 4096,
          legacyPeerDeps: true,
          skipInstall: false,
          dryRun: false
        },
        output: '❌ Build failed with errors!\nTypeScript compilation failed.',
        error: 'TypeScript compilation errors',
        triggeredBy: 'admin@orthodoxmetrics.com'
      },
      {
        id: 'test_build_3',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        duration: 30000, // 30 seconds
        success: true,
        config: {
          mode: 'incremental',
          memory: 8192,
          legacyPeerDeps: false,
          skipInstall: true,
          dryRun: false
        },
        output: '✅ Fast incremental build completed!\nNo dependencies changed.',
        error: null,
        triggeredBy: 'developer@orthodoxmetrics.com'
      }
    ];
    
    // Write sample builds to history file
    await fs.writeFile(BUILD_HISTORY_PATH, JSON.stringify(sampleBuilds, null, 2));
    
    console.log('✅ Sample build history created successfully!');
    console.log(`📄 ${sampleBuilds.length} build entries added to history`);
    console.log('🎯 You can now test the Build Console to see the history');
    
  } catch (error) {
    console.error('❌ Failed to create sample build history:', error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  createSampleBuildHistory();
}

module.exports = { createSampleBuildHistory };