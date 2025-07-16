#!/usr/bin/env node

/**
 * Phase 1: Database Schema & Core Infrastructure - MASTER RUNNER
 * Executes all Phase 1 scripts in the correct sequence
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// ANSI color codes for enhanced output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

function colorLog(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runScript(scriptPath, scriptName) {
  return new Promise((resolve, reject) => {
    const absolutePath = path.resolve(scriptPath);
    
    colorLog(`\n🚀 Running: ${scriptName}`, 'cyan');
    colorLog(`📍 Path: ${absolutePath}`, 'dim');
    colorLog('═'.repeat(80), 'blue');
    
    const child = spawn('node', [absolutePath], {
      stdio: 'inherit',
      shell: true,
      cwd: path.dirname(absolutePath)
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        colorLog(`\n✅ SUCCESS: ${scriptName} completed`, 'green');
        colorLog('═'.repeat(80), 'green');
        resolve();
      } else {
        colorLog(`\n❌ FAILED: ${scriptName} exited with code ${code}`, 'red');
        colorLog('═'.repeat(80), 'red');
        reject(new Error(`Script ${scriptName} failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      colorLog(`\n💥 ERROR: ${scriptName} - ${error.message}`, 'red');
      reject(error);
    });
  });
}

async function runPhase1() {
  const startTime = Date.now();
  
  // Header
  colorLog('\n🎯 PHASE 1: DATABASE SCHEMA & CORE INFRASTRUCTURE', 'bright');
  colorLog('🏗️  MASTER RUNNER - Executing all Phase 1 scripts in sequence', 'yellow');
  colorLog('═'.repeat(80), 'magenta');
  
  const scriptsDir = __dirname;
  
  // Phase 1 scripts in execution order
  const phase1Scripts = [
    {
      file: 'phase1-verify-records-db.js',
      name: 'Step 1: Database Verification',
      description: 'Verify database connections and check for existing OCR tables'
    },
    {
      file: 'phase1-create-ocr-schema.js', 
      name: 'Step 2: OCR Schema Creation',
      description: 'Create all 4 OCR tables with proper schema and sample data'
    },
    {
      file: 'phase1-create-typescript-interfaces.js',
      name: 'Step 3: TypeScript Interfaces',
      description: 'Generate TypeScript interfaces for OCR field mapping system'
    },
    {
      file: 'phase1-create-db-utilities.js',
      name: 'Step 4: Database Utilities', 
      description: 'Create cross-database utilities and field configuration services'
    },
    {
      file: 'phase1-complete.js',
      name: 'Step 5: Completion Verification',
      description: 'Final verification and completion report (updates todo.md)'
    }
  ];
  
  colorLog(`📋 EXECUTION PLAN: ${phase1Scripts.length} scripts to run`, 'yellow');
  phase1Scripts.forEach((script, index) => {
    colorLog(`   ${index + 1}. ${script.name}`, 'white');
    colorLog(`      ${script.description}`, 'dim');
  });
  
  colorLog('\n⏱️  Starting execution...', 'cyan');
  
  let completedScripts = 0;
  let failedScript = null;
  
  try {
    // Run each script in sequence
    for (const script of phase1Scripts) {
      const scriptPath = path.join(scriptsDir, script.file);
      
      // Check if script file exists
      try {
        await fs.access(scriptPath);
      } catch (error) {
        throw new Error(`Script file not found: ${scriptPath}`);
      }
      
      // Run the script
      await runScript(scriptPath, script.name);
      completedScripts++;
      
      // Short delay between scripts for better readability
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Success summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    colorLog('\n🎉 PHASE 1 MASTER RUNNER: ALL SCRIPTS COMPLETED SUCCESSFULLY!', 'bgGreen');
    colorLog('═'.repeat(80), 'green');
    colorLog(`✅ Scripts Executed: ${completedScripts}/${phase1Scripts.length}`, 'green');
    colorLog(`⏱️  Total Duration: ${duration} seconds`, 'green');
    colorLog(`📅 Completed: ${new Date().toLocaleString()}`, 'green');
    
    colorLog('\n📊 PHASE 1 DELIVERABLES CREATED:', 'cyan');
    colorLog('   🗄️  Database Schema:', 'white');
    colorLog('      - ocr_field_configurations table', 'dim');
    colorLog('      - ocr_processing_log table', 'dim');
    colorLog('      - ocr_review_queue table', 'dim');
    colorLog('      - ocr_job_transfers table', 'dim');
    
    colorLog('   📝 TypeScript Interfaces:', 'white');
    colorLog('      - server/types/ocrTypes.ts', 'dim');
    colorLog('      - server/types/ocrUtils.ts', 'dim');
    
    colorLog('   🔧 Database Utilities:', 'white');
    colorLog('      - server/utils/dbConnections.ts', 'dim');
    colorLog('      - server/services/fieldConfigService.ts', 'dim');
    
    colorLog('\n🚀 READY FOR PHASE 2: OCR Transfer & Field Mapping Services!', 'bgBlue');
    colorLog('📋 Next command: node server/scripts/phase2-master-runner.js', 'yellow');
    colorLog('═'.repeat(80), 'magenta');
    
  } catch (error) {
    // Failure summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    colorLog('\n💥 PHASE 1 MASTER RUNNER: EXECUTION FAILED!', 'bgRed');
    colorLog('═'.repeat(80), 'red');
    colorLog(`❌ Scripts Completed: ${completedScripts}/${phase1Scripts.length}`, 'red');
    colorLog(`⏱️  Duration: ${duration} seconds`, 'red');
    colorLog(`💀 Error: ${error.message}`, 'red');
    
    if (completedScripts > 0) {
      colorLog('\n✅ Successfully completed scripts:', 'green');
      for (let i = 0; i < completedScripts; i++) {
        colorLog(`   ${i + 1}. ${phase1Scripts[i].name}`, 'green');
      }
    }
    
    if (completedScripts < phase1Scripts.length) {
      colorLog('\n❌ Failed/pending scripts:', 'red');
      for (let i = completedScripts; i < phase1Scripts.length; i++) {
        const status = i === completedScripts ? '💥 FAILED' : '⏸️  PENDING';
        colorLog(`   ${i + 1}. ${status}: ${phase1Scripts[i].name}`, 'red');
      }
    }
    
    colorLog('\n🔧 RECOVERY OPTIONS:', 'yellow');
    colorLog('   1. Fix the error and re-run this master script', 'white');
    colorLog('   2. Run individual scripts starting from the failed one:', 'white');
    
    for (let i = completedScripts; i < phase1Scripts.length; i++) {
      colorLog(`      node server/scripts/${phase1Scripts[i].file}`, 'dim');
    }
    
    colorLog('═'.repeat(80), 'red');
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  colorLog('\n\n⏹️  PHASE 1 MASTER RUNNER: Interrupted by user', 'yellow');
  colorLog('🔄 You can resume by running this script again', 'dim');
  process.exit(0);
});

process.on('SIGTERM', () => {
  colorLog('\n\n⏹️  PHASE 1 MASTER RUNNER: Terminated', 'yellow');
  process.exit(0);
});

// Run Phase 1
colorLog('🎬 PHASE 1 MASTER RUNNER: Starting...', 'bright');
runPhase1().catch((error) => {
  colorLog(`\n💀 FATAL ERROR: ${error.message}`, 'red');
  process.exit(1);
});
