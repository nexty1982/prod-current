#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script to apply file moves from moves_map.json using git mv
 * Skips files under misc/omai or misc/server-archive as requested
 */

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

function shouldSkipPath(filePath) {
  // Skip OMAI and server-archive files as requested
  return filePath.includes('misc/omai') || 
         filePath.includes('misc/server-archive') ||
         filePath.includes('omai_logging_db') ||
         filePath.includes('omai_error_tracking_db');
}

function applyMoves() {
  try {
    // Read the moves map
    const movesMapPath = path.join(__dirname, '..', 'prod', 'moves_map.json');
    if (!fs.existsSync(movesMapPath)) {
      console.error('moves_map.json not found at:', movesMapPath);
      process.exit(1);
    }

    const movesMap = JSON.parse(fs.readFileSync(movesMapPath, 'utf8'));
    
    let totalMoves = 0;
    let skippedMoves = 0;
    let successfulMoves = 0;
    let failedMoves = 0;
    
    const report = {
      moved: [],
      skipped: [],
      failed: []
    };

    console.log(`Found ${Object.keys(movesMap).length} file moves to process...`);
    
    // Process each move
    for (const [sourceRelative, targetRelative] of Object.entries(movesMap)) {
      totalMoves++;
      
      // Convert to absolute paths
      const sourcePath = path.join(__dirname, '..', 'prod', sourceRelative);
      const targetPath = path.join(__dirname, '..', 'prod', targetRelative);
      
      // Skip OMAI and server-archive files
      if (shouldSkipPath(sourceRelative) || shouldSkipPath(targetRelative)) {
        console.log(`SKIP: ${sourceRelative} (excluded path)`);
        skippedMoves++;
        report.skipped.push({ source: sourceRelative, target: targetRelative, reason: 'excluded path' });
        continue;
      }
      
      // Check if source file exists
      if (!fs.existsSync(sourcePath)) {
        console.log(`SKIP: ${sourceRelative} (source not found)`);
        skippedMoves++;
        report.skipped.push({ source: sourceRelative, target: targetRelative, reason: 'source not found' });
        continue;
      }
      
      try {
        // Ensure target directory exists
        ensureDirectoryExists(targetPath);
        
        // Use git mv to preserve history
        const gitMvCommand = `git mv "${sourcePath}" "${targetPath}"`;
        execSync(gitMvCommand, { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
        
        console.log(`MOVED: ${sourceRelative} → ${targetRelative}`);
        successfulMoves++;
        report.moved.push({ source: sourceRelative, target: targetRelative });
        
      } catch (error) {
        console.error(`FAILED: ${sourceRelative} → ${targetRelative}`);
        console.error(`  Error: ${error.message}`);
        failedMoves++;
        report.failed.push({ 
          source: sourceRelative, 
          target: targetRelative, 
          error: error.message 
        });
      }
    }
    
    // Write report
    const reportPath = path.join(__dirname, 'ghc_move_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n=== MOVE SUMMARY ===');
    console.log(`Total moves planned: ${totalMoves}`);
    console.log(`Successful moves: ${successfulMoves}`);
    console.log(`Skipped moves: ${skippedMoves}`);
    console.log(`Failed moves: ${failedMoves}`);
    console.log(`\nDetailed report written to: ${reportPath}`);
    
    if (failedMoves > 0) {
      console.log('\nSome moves failed. Check the report for details.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error applying moves:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  applyMoves();
}

module.exports = { applyMoves };
