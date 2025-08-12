#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const execAsync = promisify(exec);

class SDLCBackupEngine {
    constructor() {
        this.BACKUP_BASE_DIR = '/backups';
        this.LOG_FILE = '/var/log/om-backup.log';
        this.ENCRYPTION_KEY_FILE = '/root/.om_backup_key';
        
        // Backup targets
        this.BACKUP_TARGETS = {
            system: [
                '/var/www/orthodox-church-mgmt/',
                '/opt/om-frontend/'
            ],
            databases: [
                'orthodoxmetrics_db'
                // Additional church databases will be detected dynamically
            ],
            config: [
                '/etc/pm2/',
                '/root/.pm2/'
            ]
        };
        
        this.encryptionKey = null;
    }

    async initialize() {
        try {
            // Ensure backup directories exist
            await this.ensureDirectories();
            
            // Load or generate encryption key
            await this.loadEncryptionKey();
            
            // Initialize logging
            await this.log('Backup engine initialized', 'INFO');
            
        } catch (error) {
            await this.log(`Initialization failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async ensureDirectories() {
        const today = new Date().toISOString().split('T')[0];
        const todayDir = path.join(this.BACKUP_BASE_DIR, today);
        const fullDir = path.join(todayDir, 'full');
        const diffDir = path.join(todayDir, 'diff');

        await fs.mkdir(fullDir, { recursive: true, mode: 0o700 });
        await fs.mkdir(diffDir, { recursive: true, mode: 0o700 });
        
        // Set proper permissions
        await execAsync(`chown root:root ${todayDir} && chmod 700 ${todayDir}`);
        await execAsync(`chown root:root ${fullDir} && chmod 700 ${fullDir}`);
        await execAsync(`chown root:root ${diffDir} && chmod 700 ${diffDir}`);
    }

    async loadEncryptionKey() {
        try {
            // Try to load existing key
            this.encryptionKey = await fs.readFile(this.ENCRYPTION_KEY_FILE, 'utf8');
            await this.log('Encryption key loaded from file', 'INFO');
        } catch (error) {
            // Generate new key if file doesn't exist
            this.encryptionKey = crypto.randomBytes(32).toString('hex');
            await fs.writeFile(this.ENCRYPTION_KEY_FILE, this.encryptionKey, { mode: 0o600 });
            await execAsync(`chown root:root ${this.ENCRYPTION_KEY_FILE}`);
            await this.log('New encryption key generated', 'INFO');
        }
    }

    async log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        
        try {
            await fs.appendFile(this.LOG_FILE, logEntry);
        } catch (error) {
            console.error(`Failed to write to log file: ${error.message}`);
        }
        
        // Also log to console for immediate feedback
        console.log(logEntry.trim());
    }

    async getLastFullBackupDate() {
        try {
            const backupDirs = await fs.readdir(this.BACKUP_BASE_DIR);
            const fullBackupDirs = backupDirs.filter(dir => {
                const fullDir = path.join(this.BACKUP_BASE_DIR, dir, 'full');
                return fs.access(fullDir).then(() => true).catch(() => false);
            });
            
            if (fullBackupDirs.length === 0) {
                return null;
            }
            
            // Sort by date and return the most recent
            fullBackupDirs.sort().reverse();
            return fullBackupDirs[0];
        } catch (error) {
            await this.log(`Error finding last full backup: ${error.message}`, 'ERROR');
            return null;
        }
    }

    async detectChurchDatabases() {
        try {
            const { stdout } = await execAsync('mysql -e "SHOW DATABASES LIKE \'%-church_db\'"');
            const databases = stdout.split('\n')
                .filter(line => line.trim() && !line.includes('Database'))
                .map(line => line.trim());
            
            this.BACKUP_TARGETS.databases = [
                'orthodoxmetrics_db',
                ...databases
            ];
            
            await this.log(`Detected databases: ${this.BACKUP_TARGETS.databases.join(', ')}`, 'INFO');
        } catch (error) {
            await this.log(`Database detection failed: ${error.message}`, 'WARNING');
        }
    }

    async createDatabaseDump(database, outputPath) {
        try {
            const dumpCommand = `mysqldump --single-transaction --routines --triggers ${database} | gzip > ${outputPath}`;
            await execAsync(dumpCommand);
            await this.log(`Database dump created: ${database} -> ${outputPath}`, 'INFO');
        } catch (error) {
            await this.log(`Database dump failed for ${database}: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async createSystemBackup(backupType, outputPath) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const tempDir = `/tmp/om-backup-${timestamp}`;
            await fs.mkdir(tempDir, { recursive: true });

            // Create database dumps
            for (const db of this.BACKUP_TARGETS.databases) {
                const dbDumpPath = path.join(tempDir, `${db}.sql.gz`);
                await this.createDatabaseDump(db, dbDumpPath);
            }

            // Create system backup
            const excludePatterns = [
                '--exclude=node_modules',
                '--exclude=.git',
                '--exclude=*.log',
                '--exclude=temp',
                '--exclude=uploads/temp'
            ];

            let tarCommand = `tar -czf ${outputPath} -C ${tempDir} .`;
            
            // Add system directories
            for (const target of this.BACKUP_TARGETS.system) {
                if (await fs.access(target).then(() => true).catch(() => false)) {
                    tarCommand += ` -C ${path.dirname(target)} ${path.basename(target)}`;
                }
            }

            // Add config directories
            for (const target of this.BACKUP_TARGETS.config) {
                if (await fs.access(target).then(() => true).catch(() => false)) {
                    tarCommand += ` -C ${path.dirname(target)} ${path.basename(target)}`;
                }
            }

            await execAsync(tarCommand);
            await this.log(`System backup created: ${outputPath}`, 'INFO');

            // Clean up temp directory
            await fs.rm(tempDir, { recursive: true, force: true });

        } catch (error) {
            await this.log(`System backup failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async createDifferentialBackup(outputPath) {
        try {
            const lastFullBackup = await this.getLastFullBackupDate();
            if (!lastFullBackup) {
                await this.log('No full backup found, creating full backup instead', 'WARNING');
                return await this.createFullBackup(outputPath);
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const tempDir = `/tmp/om-backup-diff-${timestamp}`;
            await fs.mkdir(tempDir, { recursive: true });

            // Find files newer than last full backup
            const findCommand = `find ${this.BACKUP_TARGETS.system.join(' ')} -newer /backups/${lastFullBackup}/full/ -type f -print0 | tar -czf ${outputPath} --null -T -`;
            
            await execAsync(findCommand);
            await this.log(`Differential backup created: ${outputPath}`, 'INFO');

            // Clean up temp directory
            await fs.rm(tempDir, { recursive: true, force: true });

        } catch (error) {
            await this.log(`Differential backup failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async encryptFile(inputPath, outputPath) {
        try {
            // Use GPG for encryption
            const gpgCommand = `echo "${this.encryptionKey}" | gpg --batch --yes --passphrase-fd 0 --symmetric --cipher-algo AES256 --output ${outputPath} ${inputPath}`;
            await execAsync(gpgCommand);
            
            // Remove unencrypted file
            await fs.unlink(inputPath);
            
            await this.log(`File encrypted: ${outputPath}`, 'INFO');
        } catch (error) {
            await this.log(`Encryption failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async generateChecksum(filePath) {
        try {
            const { stdout } = await execAsync(`sha256sum "${filePath}"`);
            const checksum = stdout.split(' ')[0];
            
            // Write checksum to file
            const checksumPath = `${filePath}.sha256sum`;
            await fs.writeFile(checksumPath, stdout);
            
            await this.log(`Checksum generated: ${checksumPath}`, 'INFO');
            return checksum;
        } catch (error) {
            await this.log(`Checksum generation failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async verifyChecksum(filePath) {
        try {
            const { stdout } = await execAsync(`sha256sum -c "${filePath}.sha256sum"`);
            await this.log(`Checksum verification passed: ${filePath}`, 'INFO');
            return true;
        } catch (error) {
            await this.log(`Checksum verification failed: ${filePath}`, 'ERROR');
            return false;
        }
    }

    async createFullBackup(outputPath) {
        try {
            await this.log('Starting full backup...', 'INFO');
            
            // Detect databases
            await this.detectChurchDatabases();
            
            // Create system backup
            await this.createSystemBackup('full', outputPath);
            
            // Get file size
            const stats = await fs.stat(outputPath);
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            
            await this.log(`Full backup completed: ${outputPath} (${sizeMB} MB)`, 'INFO');
            
        } catch (error) {
            await this.log(`Full backup failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async executeBackup(backupType) {
        try {
            await this.initialize();
            
            const today = new Date().toISOString().split('T')[0];
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = backupType === 'full' ? 'full' : 'diff';
            const outputDir = path.join(this.BACKUP_BASE_DIR, today, backupDir);
            
            // Create backup filename
            const backupFilename = `${backupType}-${timestamp}.tar.gz`;
            const backupPath = path.join(outputDir, backupFilename);
            const encryptedPath = `${backupPath}.gpg`;
            
            await this.log(`Starting ${backupType} backup: ${backupFilename}`, 'INFO');
            
            // Create backup
            if (backupType === 'full') {
                await this.createFullBackup(backupPath);
            } else {
                await this.createDifferentialBackup(backupPath);
            }
            
            // Encrypt backup
            await this.encryptFile(backupPath, encryptedPath);
            
            // Generate checksum
            await this.generateChecksum(encryptedPath);
            
            // Verify checksum
            const checksumValid = await this.verifyChecksum(encryptedPath);
            
            // Get final file size
            const stats = await fs.stat(encryptedPath);
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            
            if (checksumValid) {
                await this.log(`${backupType.toUpperCase()} backup completed successfully: ${encryptedPath} (${sizeMB} MB)`, 'INFO');
                return {
                    success: true,
                    file: encryptedPath,
                    size: stats.size,
                    checksum: await this.generateChecksum(encryptedPath)
                };
            } else {
                throw new Error('Checksum verification failed');
            }
            
        } catch (error) {
            await this.log(`Backup execution failed: ${error.message}`, 'ERROR');
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// CLI interface
if (require.main === module) {
    const backupType = process.argv[2];
    
    if (!backupType || !['full', 'diff'].includes(backupType)) {
        console.error('Usage: node backup-engine.js [full|diff]');
        process.exit(1);
    }
    
    const engine = new SDLCBackupEngine();
    engine.executeBackup(backupType)
        .then(result => {
            if (result.success) {
                console.log('Backup completed successfully');
                process.exit(0);
            } else {
                console.error('Backup failed:', result.error);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Backup engine error:', error.message);
            process.exit(1);
        });
}

module.exports = SDLCBackupEngine; 