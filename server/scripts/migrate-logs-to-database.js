#!/usr/bin/env node
// Migration script to import existing log files into system_logs database table
// Supports JSON logs from Winston and plain text logs from various services

const fs = require('fs').promises;
const path = require('path');
const { promisePool } = require('../config/db');
const { dbLogger } = require('../utils/dbLogger');

class LogMigration {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.processedCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }

  async run() {
    console.log('🔄 Starting log migration to database...');
    
    try {
      // Initialize database tables
      await dbLogger.initializeDatabase();
      
      // Find all log files
      const logFiles = await this.findLogFiles();
      console.log(`📁 Found ${logFiles.length} log files to migrate`);
      
      // Process each log file
      for (const logFile of logFiles) {
        await this.processLogFile(logFile);
      }
      
      await this.printSummary();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }

  async findLogFiles() {
    const logFiles = [];
    
    try {
      const entries = await fs.readdir(this.logDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(this.logDir, entry.name);
        
        if (entry.isFile() && entry.name.endsWith('.log')) {
          logFiles.push({
            path: fullPath,
            name: entry.name,
            type: this.detectLogType(entry.name)
          });
        } else if (entry.isDirectory()) {
          // Recursively scan subdirectories (like builds/)
          const subFiles = await this.findLogFilesInDir(fullPath);
          logFiles.push(...subFiles);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read log directory: ${error.message}`);
    }
    
    return logFiles;
  }

  async findLogFilesInDir(dirPath) {
    const logFiles = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.log')) {
          const fullPath = path.join(dirPath, entry.name);
          logFiles.push({
            path: fullPath,
            name: entry.name,
            type: this.detectLogType(entry.name),
            subdir: path.basename(dirPath)
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read directory ${dirPath}: ${error.message}`);
    }
    
    return logFiles;
  }

  detectLogType(fileName) {
    if (fileName.includes('error')) return 'error-log';
    if (fileName.includes('auth')) return 'auth-log';
    if (fileName.includes('api')) return 'api-log';
    if (fileName.includes('database')) return 'database-log';
    if (fileName.includes('email')) return 'email-log';
    if (fileName.includes('upload')) return 'upload-log';
    if (fileName.includes('combined')) return 'combined-log';
    if (fileName.includes('stream_build')) return 'build-log';
    if (fileName.includes('bigbook')) return 'bigbook-log';
    if (fileName.includes('omai')) return 'omai-log';
    return 'general-log';
  }

  async processLogFile(logFile) {
    console.log(`📄 Processing: ${logFile.name}`);
    
    try {
      const content = await fs.readFile(logFile.path, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      let successCount = 0;
      let lineErrorCount = 0;
      
      for (const line of lines) {
        try {
          await this.processLogLine(line, logFile);
          successCount++;
        } catch (error) {
          lineErrorCount++;
          if (lineErrorCount <= 5) { // Only show first 5 errors per file
            console.warn(`  ⚠️  Line error: ${error.message}`);
          }
        }
      }
      
      console.log(`  ✅ ${successCount} entries migrated, ${lineErrorCount} errors`);
      this.processedCount += successCount;
      this.errorCount += lineErrorCount;
      
    } catch (error) {
      console.error(`  ❌ Failed to process ${logFile.name}: ${error.message}`);
      this.errorCount++;
    }
  }

  async processLogLine(line, logFile) {
    // Try to parse as JSON first (Winston logs)
    let logEntry;
    
    try {
      logEntry = JSON.parse(line);
      await this.migrateJsonLog(logEntry, logFile);
    } catch (jsonError) {
      // Not JSON, try to parse as plain text
      await this.migratePlainTextLog(line, logFile);
    }
  }

  async migrateJsonLog(logEntry, logFile) {
    const timestamp = logEntry.timestamp ? new Date(logEntry.timestamp) : new Date();
    const level = this.mapLogLevel(logEntry.level);
    const message = logEntry.message || 'No message';
    const source = logFile.type;
    const service = this.mapService(logFile.name, logFile.subdir);
    
    // Extract metadata
    const meta = { ...logEntry };
    delete meta.timestamp;
    delete meta.level;
    delete meta.message;
    
    await this.insertLogEntry({
      timestamp,
      level,
      source,
      message,
      meta: JSON.stringify(meta),
      service,
      migrated_from: logFile.path
    });
  }

  async migratePlainTextLog(line, logFile) {
    // Parse common log formats
    const patterns = [
      // [2024-01-01T10:30:00.000Z] [INFO] Message
      /^\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.+)$/,
      // [2024-01-01T10:30:00.000Z] Message  
      /^\[([^\]]+)\]\s*(.+)$/,
      // 2024-01-01 10:30:00 - Message
      /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s*-\s*(.+)$/
    ];
    
    let timestamp = new Date();
    let level = 'INFO';
    let message = line;
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        if (match.length === 4) {
          // Has timestamp and level
          timestamp = new Date(match[1]);
          level = this.mapLogLevel(match[2]);
          message = match[3];
        } else if (match.length === 3) {
          // Has timestamp only
          timestamp = new Date(match[1]);
          message = match[2];
        }
        break;
      }
    }
    
    // If timestamp parsing failed, use file modification time
    if (isNaN(timestamp.getTime())) {
      try {
        const stats = await fs.stat(logFile.path);
        timestamp = stats.mtime;
      } catch (error) {
        timestamp = new Date();
      }
    }
    
    const source = logFile.type;
    const service = this.mapService(logFile.name, logFile.subdir);
    
    await this.insertLogEntry({
      timestamp,
      level,
      source,
      message: message.trim(),
      meta: JSON.stringify({ originalLine: line }),
      service,
      migrated_from: logFile.path
    });
  }

  mapLogLevel(level) {
    if (!level) return 'INFO';
    
    const levelMap = {
      'error': 'ERROR',
      'err': 'ERROR',
      'warn': 'WARN',
      'warning': 'WARN',
      'info': 'INFO',
      'debug': 'DEBUG',
      'verbose': 'DEBUG',
      'silly': 'DEBUG'
    };
    
    return levelMap[level.toLowerCase()] || 'INFO';
  }

  mapService(fileName, subdir) {
    if (subdir === 'builds') return 'build-system';
    if (fileName.includes('auth')) return 'authentication';
    if (fileName.includes('api')) return 'api-server';
    if (fileName.includes('database')) return 'database';
    if (fileName.includes('email')) return 'email-service';
    if (fileName.includes('upload')) return 'file-upload';
    if (fileName.includes('bigbook')) return 'bigbook-system';
    if (fileName.includes('omai')) return 'omai-service';
    return 'legacy-migration';
  }

  async insertLogEntry(entry) {
    const sql = `
      INSERT INTO system_logs (timestamp, level, source, message, meta, service, user_email, session_id, request_id, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL)
    `;
    
    await promisePool.execute(sql, [
      entry.timestamp,
      entry.level,
      entry.source,
      entry.message,
      entry.meta,
      entry.service
    ]);
  }

  async printSummary() {
    const duration = Date.now() - this.startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${this.processedCount} log entries`);
    console.log(`❌ Errors encountered: ${this.errorCount}`);
    console.log(`⏱️  Duration: ${minutes}m ${seconds}s`);
    
    if (this.processedCount > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('💡 You can now query logs using: SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 10;');
    }
  }
}

// Run migration if script is executed directly
if (require.main === module) {
  const migration = new LogMigration();
  migration.run().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = LogMigration;