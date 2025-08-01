#!/usr/bin/env node

/**
 * Orthodox Metrics - Master Setup Script
 * Replaces: phase1-master-runner.js, phase2-master-runner.js
 * Provides: Complete system setup in logical order
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const mysql = require('mysql2/promise');

// ANSI color codes for enhanced output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorLog(message, color = 'white') {
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

class OrthodoxSetup {
  constructor(options = {}) {
    this.options = {
      skipDatabase: false,
      skipOcr: false,
      skipChurch: false,
      verbose: false,
      ...options
    };
  }

  async runScript(scriptPath, scriptName, required = true) {
    return new Promise((resolve, reject) => {
      const absolutePath = path.resolve(scriptPath);
      
      colorLog(`\n🚀 Running: ${scriptName}`, 'cyan');
      colorLog(`📍 Path: ${absolutePath}`, 'blue');
      colorLog('═'.repeat(80), 'blue');
      
      const child = spawn('node', [absolutePath], {
        stdio: 'inherit',
        shell: true,
        cwd: path.dirname(absolutePath)
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          colorLog(`\n✅ SUCCESS: ${scriptName} completed`, 'green');
          resolve({ success: true, code });
        } else {
          const message = `❌ FAILED: ${scriptName} (exit code: ${code})`;
          colorLog(`\n${message}`, 'red');
          
          if (required) {
            reject(new Error(message));
          } else {
            colorLog(`⚠️  Continuing despite failure (non-critical)`, 'yellow');
            resolve({ success: false, code });
          }
        }
      });
      
      child.on('error', (error) => {
        const message = `❌ ERROR: ${scriptName} - ${error.message}`;
        colorLog(`\n${message}`, 'red');
        
        if (required) {
          reject(error);
        } else {
          resolve({ success: false, error });
        }
      });
    });
  }

  async checkPrerequisites() {
    colorLog('\n🔍 Checking Prerequisites...', 'cyan');
    
    // Check Node.js version
    const nodeVersion = process.version;
    colorLog(`   Node.js: ${nodeVersion}`, 'green');
    
    // Check database connection
    try {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 3306
      });
      await connection.end();
      colorLog('   Database: Connection successful', 'green');
    } catch (error) {
      colorLog(`   Database: Connection failed - ${error.message}`, 'red');
      throw new Error('Database connection required for setup');
    }
    
    colorLog('✅ Prerequisites check passed', 'green');
  }

  async setupDatabase() {
    if (this.options.skipDatabase) {
      colorLog('⏭️  Skipping database setup', 'yellow');
      return;
    }

    colorLog('\n📂 Phase 1: Database Setup', 'magenta');
    
    const dbScripts = [
      { path: '../database/create-schema.js', name: 'Create Database Schema', required: true },
      { path: '../database/setup-ocr-tables.js', name: 'Setup OCR Tables', required: true },
      { path: '../database/create-field-mappings.js', name: 'Create Field Mappings', required: false }
    ];

    for (const script of dbScripts) {
      try {
        await this.runScript(script.path, script.name, script.required);
      } catch (error) {
        if (script.required) throw error;
      }
    }
  }

  async setupOcrPipeline() {
    if (this.options.skipOcr) {
      colorLog('⏭️  Skipping OCR pipeline setup', 'yellow');
      return;
    }

    colorLog('\n🔍 Phase 2: OCR Pipeline Setup', 'magenta');
    
    const ocrScripts = [
      { path: '../testing/test-google-vision.js', name: 'Test Google Vision API', required: true },
      { path: '../database/setup-ocr-processing.js', name: 'Setup OCR Processing', required: true },
      { path: '../testing/test-ocr-pipeline.js', name: 'Test OCR Pipeline', required: false }
    ];

    for (const script of ocrScripts) {
      try {
        await this.runScript(script.path, script.name, script.required);
      } catch (error) {
        if (script.required) throw error;
      }
    }
  }

  async setupChurchRegistration() {
    if (this.options.skipChurch) {
      colorLog('⏭️  Skipping church registration setup', 'yellow');
      return;
    }

    colorLog('\n⛪ Phase 3: Church Registration Setup', 'magenta');
    
    const churchScripts = [
      { path: '../setup/create-default-church.js', name: 'Create Default Church', required: false },
      { path: '../setup/setup-kanban-boards.js', name: 'Setup Kanban Boards', required: false }
    ];

    for (const script of churchScripts) {
      try {
        await this.runScript(script.path, script.name, script.required);
      } catch (error) {
        if (script.required) throw error;
      }
    }
  }

  async runValidation() {
    colorLog('\n✅ Phase 4: Validation', 'magenta');
    
    const validationScripts = [
      { path: '../testing/health-check.js', name: 'System Health Check', required: true },
      { path: '../testing/test-api-endpoints.js', name: 'Test API Endpoints', required: false }
    ];

    for (const script of validationScripts) {
      try {
        await this.runScript(script.path, script.name, script.required);
      } catch (error) {
        if (script.required) throw error;
      }
    }
  }

  async run() {
    const startTime = Date.now();
    
    colorLog('🏛️  Orthodox Metrics - Master Setup', 'cyan');
    colorLog('═'.repeat(80), 'blue');
    colorLog('Setting up complete Orthodox church management system...', 'white');
    
    try {
      await this.checkPrerequisites();
      await this.setupDatabase();
      await this.setupOcrPipeline();
      await this.setupChurchRegistration();
      await this.runValidation();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      colorLog('\n🎉 SETUP COMPLETE!', 'green');
      colorLog('═'.repeat(80), 'green');
      colorLog(`⏱️  Total time: ${duration}s`, 'green');
      colorLog('\n🎯 Next Steps:', 'cyan');
      colorLog('   1. Start the server: npm start', 'white');
      colorLog('   2. Open browser: http://localhost:3000', 'white');
      colorLog('   3. Login with default admin credentials', 'white');
      colorLog('   4. Configure your church settings', 'white');
      
    } catch (error) {
      colorLog(`\n💥 SETUP FAILED: ${error.message}`, 'red');
      colorLog('═'.repeat(80), 'red');
      colorLog('\n🔧 Troubleshooting:', 'yellow');
      colorLog('   1. Check database credentials in .env', 'white');
      colorLog('   2. Ensure MySQL is running', 'white');
      colorLog('   3. Verify Google Cloud credentials', 'white');
      colorLog('   4. Check logs for detailed errors', 'white');
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--skip-database':
        options.skipDatabase = true;
        break;
      case '--skip-ocr':
        options.skipOcr = true;
        break;
      case '--skip-church':
        options.skipChurch = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        console.log(`
Orthodox Metrics Setup Script

Usage: node master-setup.js [options]

Options:
  --skip-database    Skip database setup
  --skip-ocr         Skip OCR pipeline setup  
  --skip-church      Skip church registration setup
  --verbose          Enable verbose logging
  --help             Show this help message

Examples:
  node master-setup.js                    # Full setup
  node master-setup.js --skip-church      # Skip church setup
  node master-setup.js --verbose          # Detailed logging
        `);
        process.exit(0);
    }
  }
  
  const setup = new OrthodoxSetup(options);
  await setup.run();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = OrthodoxSetup;
