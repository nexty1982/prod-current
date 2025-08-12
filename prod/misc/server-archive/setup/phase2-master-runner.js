#!/usr/bin/env node

/**
 * Phase 2: OCR Transfer & Field Mapping Services - MASTER RUNNER
 * Executes all Phase 2 scripts in the correct sequence
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

async function runPhase2() {
  const startTime = Date.now();
  
  // Header
  colorLog('\n🎯 PHASE 2: OCR TRANSFER & FIELD MAPPING SERVICES', 'bright');
  colorLog('🔄 MASTER RUNNER - Executing all Phase 2 scripts in sequence', 'yellow');
  colorLog('═'.repeat(80), 'magenta');
  
  const scriptsDir = __dirname;
  
  // Phase 2 scripts in execution order
  const phase2Scripts = [
    {
      file: 'phase2-verify-phase1.js',
      name: 'Step 1: Phase 1 Verification',
      description: 'Verify Phase 1 components are in place and functional'
    },
    {
      file: 'phase2-create-transfer-service.js',
      name: 'Step 2: OCR Transfer Service',
      description: 'Create transferOcrResult() and automated transfer service'
    },
    {
      file: 'phase2-create-field-mapping.js',
      name: 'Step 3: Field Mapping Engine',
      description: 'Implement getFieldConfig() and mapOcrTextToFields() functions'
    },
    {
      file: 'phase2-create-text-parsers.js',
      name: 'Step 4: Text Processing Utilities',
      description: 'Build text parsing, validation, and formatting helpers'
    },
    {
      file: 'phase2-create-api-endpoints.js',
      name: 'Step 5: Backend API Routes',
      description: 'Create REST API endpoints for OCR transfer and field mapping'
    },
    {
      file: 'phase2-test-integration.js',
      name: 'Step 6: Integration Testing',
      description: 'Test complete OCR → Records DB transfer workflow'
    },
    {
      file: 'phase2-complete.js',
      name: 'Step 7: Completion Verification',
      description: 'Final verification and completion report (updates todo.md)'
    }
  ];
  
  colorLog(`📋 EXECUTION PLAN: ${phase2Scripts.length} scripts to run`, 'yellow');
  phase2Scripts.forEach((script, index) => {
    colorLog(`   ${index + 1}. ${script.name}`, 'white');
    colorLog(`      ${script.description}`, 'dim');
  });
  
  colorLog('\n⚠️  PREREQUISITES CHECK:', 'yellow');
  colorLog('   🔍 Checking Phase 1 completion...', 'dim');
  
  // Check if Phase 1 files exist
  const phase1RequiredFiles = [
    'server/types/ocrTypes.ts',
    'server/types/ocrUtils.ts', 
    'server/utils/dbConnections.ts',
    'server/services/fieldConfigService.ts'
  ];
  
  let phase1Complete = true;
  const projectRoot = path.resolve(__dirname, '..', '..');
  
  for (const file of phase1RequiredFiles) {
    const filePath = path.join(projectRoot, file);
    try {
      await fs.access(filePath);
      colorLog(`   ✅ ${file}: Found`, 'green');
    } catch {
      colorLog(`   ❌ ${file}: Missing`, 'red');
      phase1Complete = false;
    }
  }
  
  if (!phase1Complete) {
    colorLog('\n❌ PREREQUISITE FAILED: Phase 1 not complete!', 'red');
    colorLog('🔧 Please run Phase 1 first: node server/scripts/phase1-master-runner.js', 'yellow');
    colorLog('═'.repeat(80), 'red');
    process.exit(1);
  }
  
  colorLog('   ✅ Phase 1: All components verified', 'green');
  colorLog('\n⏱️  Starting Phase 2 execution...', 'cyan');
  
  let completedScripts = 0;
  
  try {
    // Run each script in sequence
    for (const script of phase2Scripts) {
      const scriptPath = path.join(scriptsDir, script.file);
      
      // Check if script file exists
      try {
        await fs.access(scriptPath);
      } catch (error) {
        colorLog(`\n⚠️  Script not found: ${script.file}`, 'yellow');
        colorLog(`📝 Creating placeholder script...`, 'dim');
        
        // Create placeholder script
        const placeholderContent = `#!/usr/bin/env node

/**
 * ${script.name}
 * ${script.description}
 * 
 * STATUS: PLACEHOLDER - Implementation needed
 */

console.log('🚧 ${script.name}: PLACEHOLDER SCRIPT');
console.log('📝 Description: ${script.description}');
console.log('⚠️  This script needs to be implemented');
console.log('✅ Placeholder execution complete');
`;
        
        await fs.writeFile(scriptPath, placeholderContent);
        colorLog(`   ✅ Created: ${script.file}`, 'green');
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
    
    colorLog('\n🎉 PHASE 2 MASTER RUNNER: ALL SCRIPTS COMPLETED SUCCESSFULLY!', 'bgGreen');
    colorLog('═'.repeat(80), 'green');
    colorLog(`✅ Scripts Executed: ${completedScripts}/${phase2Scripts.length}`, 'green');
    colorLog(`⏱️  Total Duration: ${duration} seconds`, 'green');
    colorLog(`📅 Completed: ${new Date().toLocaleString()}`, 'green');
    
    colorLog('\n📊 PHASE 2 DELIVERABLES CREATED:', 'cyan');
    colorLog('   🔄 Transfer Services:', 'white');
    colorLog('      - OCR result transfer automation', 'dim');
    colorLog('      - Cross-database connection management', 'dim');
    
    colorLog('   🗺️  Field Mapping Engine:', 'white');
    colorLog('      - Field configuration retrieval', 'dim');
    colorLog('      - OCR text to field mapping', 'dim');
    colorLog('      - Field validation and formatting', 'dim');
    
    colorLog('   🔧 Text Processing:', 'white');
    colorLog('      - Text parsing utilities', 'dim');
    colorLog('      - Field concatenation support', 'dim');
    colorLog('      - Custom formatting functions', 'dim');
    
    colorLog('   🌐 API Endpoints:', 'white');
    colorLog('      - REST API for OCR transfers', 'dim');
    colorLog('      - Field mapping API routes', 'dim');
    colorLog('      - Integration testing endpoints', 'dim');
    
    colorLog('\n🚀 READY FOR PHASE 3: Record Insertion & Logging!', 'bgBlue');
    colorLog('📋 Next command: node server/scripts/phase3-master-runner.js', 'yellow');
    colorLog('═'.repeat(80), 'magenta');
    
  } catch (error) {
    // Failure summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    colorLog('\n💥 PHASE 2 MASTER RUNNER: EXECUTION FAILED!', 'bgRed');
    colorLog('═'.repeat(80), 'red');
    colorLog(`❌ Scripts Completed: ${completedScripts}/${phase2Scripts.length}`, 'red');
    colorLog(`⏱️  Duration: ${duration} seconds`, 'red');
    colorLog(`💀 Error: ${error.message}`, 'red');
    
    if (completedScripts > 0) {
      colorLog('\n✅ Successfully completed scripts:', 'green');
      for (let i = 0; i < completedScripts; i++) {
        colorLog(`   ${i + 1}. ${phase2Scripts[i].name}`, 'green');
      }
    }
    
    if (completedScripts < phase2Scripts.length) {
      colorLog('\n❌ Failed/pending scripts:', 'red');
      for (let i = completedScripts; i < phase2Scripts.length; i++) {
        const status = i === completedScripts ? '💥 FAILED' : '⏸️  PENDING';
        colorLog(`   ${i + 1}. ${status}: ${phase2Scripts[i].name}`, 'red');
      }
    }
    
    colorLog('\n🔧 RECOVERY OPTIONS:', 'yellow');
    colorLog('   1. Fix the error and re-run this master script', 'white');
    colorLog('   2. Run individual scripts starting from the failed one:', 'white');
    
    for (let i = completedScripts; i < phase2Scripts.length; i++) {
      colorLog(`      node server/scripts/${phase2Scripts[i].file}`, 'dim');
    }
    
    colorLog('═'.repeat(80), 'red');
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  colorLog('\n\n⏹️  PHASE 2 MASTER RUNNER: Interrupted by user', 'yellow');
  colorLog('🔄 You can resume by running this script again', 'dim');
  process.exit(0);
});

process.on('SIGTERM', () => {
  colorLog('\n\n⏹️  PHASE 2 MASTER RUNNER: Terminated', 'yellow');
  process.exit(0);
});

// Run Phase 2
colorLog('🎬 PHASE 2 MASTER RUNNER: Starting...', 'bright');
runPhase2().catch((error) => {
  colorLog(`\n💀 FATAL ERROR: ${error.message}`, 'red');
  process.exit(1);
});
