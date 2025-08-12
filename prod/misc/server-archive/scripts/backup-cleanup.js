#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class BackupCleanup {
    constructor() {
        this.BACKUP_BASE_DIR = '/backups';
        this.LOG_FILE = '/var/log/om-backup.log';
        this.MAX_FULL_BACKUPS = 4;
        this.MAX_DIFF_DAYS = 7;
    }

    async log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        
        try {
            await fs.appendFile(this.LOG_FILE, logEntry);
        } catch (error) {
            console.error(`Failed to write to log file: ${error.message}`);
        }
        
        console.log(logEntry.trim());
    }

    async getBackupDirectories() {
        try {
            const entries = await fs.readdir(this.BACKUP_BASE_DIR, { withFileTypes: true });
            return entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name)
                .filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name)) // YYYY-MM-DD format
                .sort();
        } catch (error) {
            await this.log(`Error reading backup directories: ${error.message}`, 'ERROR');
            return [];
        }
    }

    async getBackupFiles(backupDir, type) {
        try {
            const typeDir = path.join(this.BACKUP_BASE_DIR, backupDir, type);
            const files = await fs.readdir(typeDir);
            return files
                .filter(file => file.endsWith('.gpg'))
                .map(file => ({
                    name: file,
                    path: path.join(typeDir, file),
                    date: backupDir
                }));
        } catch (error) {
            return [];
        }
    }

    async cleanupFullBackups() {
        await this.log('Starting full backup cleanup...', 'INFO');
        
        const backupDirs = await this.getBackupDirectories();
        const fullBackups = [];
        
        // Collect all full backups
        for (const dir of backupDirs) {
            const files = await this.getBackupFiles(dir, 'full');
            fullBackups.push(...files);
        }
        
        // Sort by date (oldest first)
        fullBackups.sort((a, b) => a.date.localeCompare(b.date));
        
        // Keep only the most recent MAX_FULL_BACKUPS
        const toDelete = fullBackups.slice(0, fullBackups.length - this.MAX_FULL_BACKUPS);
        
        if (toDelete.length === 0) {
            await this.log('No full backups to delete', 'INFO');
            return;
        }
        
        await this.log(`Found ${toDelete.length} full backups to delete`, 'INFO');
        
        for (const backup of toDelete) {
            try {
                // Delete backup file and checksum
                await fs.unlink(backup.path);
                await fs.unlink(`${backup.path}.sha256sum`);
                
                await this.log(`Deleted full backup: ${backup.name}`, 'INFO');
                
                // Check if directory is empty and remove it
                const backupDir = path.dirname(backup.path);
                const remainingFiles = await fs.readdir(backupDir);
                if (remainingFiles.length === 0) {
                    await fs.rmdir(backupDir);
                    await this.log(`Removed empty directory: ${backupDir}`, 'INFO');
                }
                
            } catch (error) {
                await this.log(`Failed to delete full backup ${backup.name}: ${error.message}`, 'ERROR');
            }
        }
    }

    async cleanupDifferentialBackups() {
        await this.log('Starting differential backup cleanup...', 'INFO');
        
        const backupDirs = await this.getBackupDirectories();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.MAX_DIFF_DAYS);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
        
        await this.log(`Differential backup cutoff date: ${cutoffDateStr}`, 'INFO');
        
        let deletedCount = 0;
        
        for (const dir of backupDirs) {
            if (dir < cutoffDateStr) {
                const files = await this.getBackupFiles(dir, 'diff');
                
                for (const file of files) {
                    try {
                        // Delete backup file and checksum
                        await fs.unlink(file.path);
                        await fs.unlink(`${file.path}.sha256sum`);
                        
                        await this.log(`Deleted differential backup: ${file.name}`, 'INFO');
                        deletedCount++;
                        
                    } catch (error) {
                        await this.log(`Failed to delete differential backup ${file.name}: ${error.message}`, 'ERROR');
                    }
                }
                
                // Check if directory is empty and remove it
                const diffDir = path.join(this.BACKUP_BASE_DIR, dir, 'diff');
                try {
                    const remainingFiles = await fs.readdir(diffDir);
                    if (remainingFiles.length === 0) {
                        await fs.rmdir(diffDir);
                        await this.log(`Removed empty diff directory: ${diffDir}`, 'INFO');
                    }
                } catch (error) {
                    // Directory might not exist or be empty
                }
                
                // Check if the entire backup directory is empty
                const backupDir = path.join(this.BACKUP_BASE_DIR, dir);
                try {
                    const remainingDirs = await fs.readdir(backupDir);
                    if (remainingDirs.length === 0) {
                        await fs.rmdir(backupDir);
                        await this.log(`Removed empty backup directory: ${backupDir}`, 'INFO');
                    }
                } catch (error) {
                    // Directory might not exist or be empty
                }
            }
        }
        
        if (deletedCount === 0) {
            await this.log('No differential backups to delete', 'INFO');
        } else {
            await this.log(`Deleted ${deletedCount} differential backups`, 'INFO');
        }
    }

    async getBackupStats() {
        const backupDirs = await this.getBackupDirectories();
        let totalSize = 0;
        let fullCount = 0;
        let diffCount = 0;
        
        for (const dir of backupDirs) {
            // Count full backups
            const fullFiles = await this.getBackupFiles(dir, 'full');
            fullCount += fullFiles.length;
            
            // Count differential backups
            const diffFiles = await this.getBackupFiles(dir, 'diff');
            diffCount += diffFiles.length;
            
            // Calculate total size
            for (const file of [...fullFiles, ...diffFiles]) {
                try {
                    const stats = await fs.stat(file.path);
                    totalSize += stats.size;
                } catch (error) {
                    // File might not exist
                }
            }
        }
        
        return {
            totalSize,
            fullCount,
            diffCount,
            backupDirs: backupDirs.length
        };
    }

    async executeCleanup() {
        try {
            await this.log('Starting backup cleanup process...', 'INFO');
            
            // Get stats before cleanup
            const statsBefore = await this.getBackupStats();
            await this.log(`Before cleanup: ${statsBefore.fullCount} full, ${statsBefore.diffCount} differential backups`, 'INFO');
            
            // Cleanup full backups
            await this.cleanupFullBackups();
            
            // Cleanup differential backups
            await this.cleanupDifferentialBackups();
            
            // Get stats after cleanup
            const statsAfter = await this.getBackupStats();
            await this.log(`After cleanup: ${statsAfter.fullCount} full, ${statsAfter.diffCount} differential backups`, 'INFO');
            
            const freedSpace = statsBefore.totalSize - statsAfter.totalSize;
            const freedSpaceMB = (freedSpace / 1024 / 1024).toFixed(2);
            
            if (freedSpace > 0) {
                await this.log(`Freed ${freedSpaceMB} MB of disk space`, 'INFO');
            }
            
            await this.log('Backup cleanup completed successfully', 'INFO');
            
            return {
                success: true,
                freedSpace,
                freedSpaceMB,
                statsBefore,
                statsAfter
            };
            
        } catch (error) {
            await this.log(`Backup cleanup failed: ${error.message}`, 'ERROR');
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// CLI interface
if (require.main === module) {
    const cleanup = new BackupCleanup();
    cleanup.executeCleanup()
        .then(result => {
            if (result.success) {
                console.log('Cleanup completed successfully');
                process.exit(0);
            } else {
                console.error('Cleanup failed:', result.error);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Cleanup error:', error.message);
            process.exit(1);
        });
}

module.exports = BackupCleanup; 