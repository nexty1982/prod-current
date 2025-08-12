// server/jobs/auto-learning-runner.js
// CLI execution script for 24-hour auto-learning OCR task

const AutoLearningTaskService = require('../services/ai/autoLearningTaskService');
const logger = require('../utils/logger');

class AutoLearningRunner {
  constructor() {
    this.taskService = new AutoLearningTaskService();
    this.isRunning = false;
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);
    const options = {
      path: 'data/records/',
      hours: 24,
      help: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--help' || arg === '-h') {
        options.help = true;
      } else if (arg.startsWith('--path=')) {
        options.path = arg.split('=')[1];
      } else if (arg.startsWith('--hours=')) {
        options.hours = parseInt(arg.split('=')[1]);
      } else if (arg === '--path' && i + 1 < args.length) {
        options.path = args[++i];
      } else if (arg === '--hours' && i + 1 < args.length) {
        options.hours = parseInt(args[++i]);
      }
    }

    return options;
  }

  /**
   * Display help information
   */
  showHelp() {
    console.log(`
🧠 Orthodox Metrics Auto-Learning OCR Task Runner

USAGE:
  node jobs/auto-learning-runner.js [OPTIONS]

OPTIONS:
  --path <path>     Base directory path for record images (default: data/records/)
  --hours <number>  Maximum hours to run (default: 24)
  --help, -h        Show this help message

EXAMPLES:
  # Run with default settings (24 hours, data/records/)
  node jobs/auto-learning-runner.js

  # Run for 12 hours with custom path
  node jobs/auto-learning-runner.js --path=data/images --hours=12

  # Run with short form arguments
  node jobs/auto-learning-runner.js --path /var/images --hours 6

DESCRIPTION:
  This script runs a 24-hour continuous task that processes all available 
  record images across Baptism, Marriage, and Funeral types to iteratively 
  improve OCR mapping, confidence analysis, and field recognition.

  The task will:
  • Discover all images in the specified directory (prod/data/records/)
  • Apply preprocessing pipeline (grayscale, threshold, denoise, etc.)
  • Run OCR processing with Google Vision API
  • Map extracted text to database fields
  • Analyze confidence scores and generate learning rules
  • Store results and generate final summary report

OUTPUT FILES:
  /processed_data/ocr_results.json    - All processing results
  /logs/errors.json                   - Processing errors
  /logs/discrepancies.json           - Field mapping discrepancies
  /ai/learning/mappings.json         - Generated learning rules
  /logs/summary-YYYYMMDD.json        - Final summary report

SAFETY:
  • Task can be safely interrupted with Ctrl+C
  • All progress is saved continuously
  • No destructive operations on original images
  • Comprehensive error logging and recovery
`);
  }

  /**
   * Set up signal handlers for graceful shutdown
   */
  setupSignalHandlers() {
    const shutdown = async (signal) => {
      console.log(`\n📶 Received ${signal}, initiating graceful shutdown...`);
      
      if (this.isRunning) {
        console.log('⏹️  Stopping auto-learning task...');
        const stopped = await this.taskService.stopTask();
        
        if (stopped) {
          console.log('✅ Auto-learning task stopped successfully');
          
          // Get final status
          const status = this.taskService.getStatus();
          console.log('\n📊 Final Statistics:');
          console.log(`   Records Processed: ${status.recordsProcessed || 0}`);
          console.log(`   Success Rate: ${status.successRate?.toFixed(1) || 0}%`);
          console.log(`   Average Confidence: ${status.averageConfidence?.toFixed(1) || 0}%`);
          console.log(`   Errors: ${status.errorCount || 0}`);
          console.log(`   Training Rules: ${status.trainingRulesGenerated || 0}`);
        }
      }

      console.log('👋 Goodbye!');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  /**
   * Display real-time progress
   */
  displayProgress() {
    const progressInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(progressInterval);
        return;
      }

      const status = this.taskService.getStatus();
      
      // Clear previous line and show progress
      process.stdout.write('\r\x1b[K'); // Clear line
      process.stdout.write(
        `🔄 Processing... ${status.recordsProcessed || 0}/${status.totalRecords || 0} ` +
        `(${status.progress || 0}%) | Success: ${status.successRate?.toFixed(1) || 0}% | ` +
        `Confidence: ${status.averageConfidence?.toFixed(1) || 0}% | ` +
        `Errors: ${status.errorCount || 0} | ` +
        `Remaining: ${status.timeRemaining || 'calculating...'}`
      );
    }, 2000); // Update every 2 seconds

    return progressInterval;
  }

  /**
   * Validate options
   */
  validateOptions(options) {
    const errors = [];

    if (!options.path || typeof options.path !== 'string') {
      errors.push('Path must be a valid string');
    }

    if (!Number.isInteger(options.hours) || options.hours < 1 || options.hours > 72) {
      errors.push('Hours must be an integer between 1 and 72');
    }

    return errors;
  }

  /**
   * Main execution function
   */
  async run() {
    console.log('🧠 Orthodox Metrics Auto-Learning OCR Task Runner');
    console.log('================================================\n');

    const options = this.parseArgs();

    if (options.help) {
      this.showHelp();
      return;
    }

    // Validate options
    const validationErrors = this.validateOptions(options);
    if (validationErrors.length > 0) {
      console.error('❌ Validation Errors:');
      validationErrors.forEach(error => console.error(`   • ${error}`));
      console.error('\nUse --help for usage information');
      process.exit(1);
    }

    console.log('⚙️  Configuration:');
    console.log(`   📁 Base Path: ${options.path}`);
    console.log(`   ⏰ Max Hours: ${options.hours}`);
    console.log(`   🕐 Start Time: ${new Date().toLocaleString()}`);
    console.log('');

    // Set up signal handlers
    this.setupSignalHandlers();

    try {
      this.isRunning = true;
      
      // Start progress display
      console.log('🚀 Starting auto-learning task...\n');
      const progressInterval = this.displayProgress();

      // Start the task
      await this.taskService.startTask(options.path, options.hours);

      // Clear progress display
      clearInterval(progressInterval);
      process.stdout.write('\r\x1b[K'); // Clear line

      // Show completion status
      const finalStatus = this.taskService.getStatus();
      
      console.log('\n🎉 Auto-Learning Task Completed Successfully!\n');
      console.log('📊 Final Statistics:');
      console.log(`   Records Processed: ${finalStatus.recordsProcessed || 0}/${finalStatus.totalRecords || 0}`);
      console.log(`   Success Rate: ${finalStatus.successRate?.toFixed(1) || 0}%`);
      console.log(`   Average Confidence: ${finalStatus.averageConfidence?.toFixed(1) || 0}%`);
      console.log(`   Errors: ${finalStatus.errorCount || 0}`);
      console.log(`   Training Rules Generated: ${finalStatus.trainingRulesGenerated || 0}`);
      console.log(`   Total Runtime: ${finalStatus.duration ? this.formatDuration(finalStatus.duration) : 'unknown'}`);
      
      console.log('\n📁 Output Files:');
      console.log('   • /processed_data/ocr_results.json - Processing results');
      console.log('   • /logs/summary-YYYYMMDD.json - Final summary report');
      console.log('   • /logs/errors.json - Error log');
      console.log('   • /ai/learning/mappings.json - Learning rules');

    } catch (error) {
      clearInterval(progressInterval);
      process.stdout.write('\r\x1b[K'); // Clear line
      
      console.error('\n❌ Auto-Learning Task Failed:');
      console.error(`   Error: ${error.message}`);
      
      logger.error('AutoLearningRunner', 'Task execution failed', {
        error: error.message,
        stack: error.stack,
        options
      });

      process.exit(1);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Format duration for display
   */
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Execute if called directly
if (require.main === module) {
  const runner = new AutoLearningRunner();
  runner.run().catch(error => {
    console.error('💥 Unexpected error:', error.message);
    process.exit(1);
  });
}

module.exports = AutoLearningRunner;
