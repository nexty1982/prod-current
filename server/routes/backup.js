const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const cron = require('node-cron');
const { promisePool } = require('../config/db');
const archiver = require('archiver');
const mysqldump = require('mysqldump');

const router = express.Router();

// Middleware to check if user is super_admin
const requireSuperAdmin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    const userRole = req.session.user.role;
    if (userRole !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Super administrator privileges required'
        });
    }

    next();
};

// Configuration
const BACKUP_DIR = process.env.BACKUP_DIR || '/opt/backups/orthodox-metrics';
const APP_DIR = process.env.APP_DIR || '/var/www/orthodox-church-mgmt';
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'ocm_user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'orthodox_church_management'
};

// Backup settings (stored in database)
let currentSettings = {
    enabled: true,
    schedule: '0 2 * * *',
    retention_days: 30,
    include_database: true,
    include_files: true,
    include_uploads: true,
    compression: true,
    email_notifications: false,
    notification_email: '',
    backup_location: BACKUP_DIR,
    max_backups: 50,
};

let scheduledTask = null;

// Initialize backup settings from database
const initializeBackupSettings = async () => {
    try {
        const [rows] = await promisePool.query(
            'SELECT * FROM backup_settings WHERE id = 1'
        );

        if (rows.length > 0) {
            currentSettings = { ...currentSettings, ...JSON.parse(rows[0].settings) };
        }

        // Setup cron job if enabled
        if (currentSettings.enabled && currentSettings.schedule) {
            setupBackupSchedule();
        }
    } catch (error) {
        console.error('Error initializing backup settings:', error);
    }
};

// Setup automatic backup schedule
const setupBackupSchedule = () => {
    if (scheduledTask) {
        try {
            scheduledTask.stop();
            scheduledTask.destroy();
        } catch (error) {
            console.log('Warning: Could not stop existing scheduled task:', error.message);
        }
    }

    if (currentSettings.enabled && cron.validate(currentSettings.schedule)) {
        scheduledTask = cron.schedule(currentSettings.schedule, async () => {
            console.log('Running scheduled backup...');
            await createBackup('full', true);
        });
        console.log(`Backup scheduled: ${currentSettings.schedule}`);
    }
};

// Ensure backup directory exists
const ensureBackupDir = async () => {
    try {
        await fs.mkdir(currentSettings.backup_location, { recursive: true });
        return true;
    } catch (error) {
        console.error('Error creating backup directory:', error);
        return false;
    }
};

// Get storage information
const getStorageInfo = async () => {
    try {
        const stats = await fs.stat(currentSettings.backup_location);

        // Get disk usage (simplified - in production, use actual disk space commands)
        const backupFiles = await fs.readdir(currentSettings.backup_location);
        let backupSpace = 0;

        for (const file of backupFiles) {
            try {
                const filePath = path.join(currentSettings.backup_location, file);
                const fileStat = await fs.stat(filePath);
                backupSpace += fileStat.size;
            } catch (err) {
                // Skip files that can't be read
            }
        }

        return {
            total_space: 100 * 1024 * 1024 * 1024, // 100GB placeholder
            used_space: 50 * 1024 * 1024 * 1024, // 50GB placeholder
            backup_space: backupSpace,
        };
    } catch (error) {
        console.error('Error getting storage info:', error);
        return {
            total_space: 0,
            used_space: 0,
            backup_space: 0,
        };
    }
};

// Create database backup for ALL databases
const createDatabaseBackup = async (backupDir, timestamp) => {
    const allDbsFile = path.join(backupDir, `all_databases_${timestamp}.sql`);
    
    try {
        console.log('🗄️  Backing up ALL databases...');
        
        // Get list of all databases (excluding system databases)
        const [databases] = await promisePool.query(`
            SHOW DATABASES 
            WHERE \`Database\` NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
        `);
        
        console.log(`📋 Found ${databases.length} databases to backup:`, databases.map(db => db.Database));
        
        // Create individual database dumps
        const dumpFiles = [];
        
        for (const dbRow of databases) {
            const dbName = dbRow.Database;
            const dbDumpFile = path.join(backupDir, `database_${dbName}_${timestamp}.sql`);
            
            console.log(`💾 Backing up database: ${dbName}`);
            
            try {
                await mysqldump({
                    connection: {
                        host: DB_CONFIG.host,
                        user: DB_CONFIG.user,
                        password: DB_CONFIG.password,
                        database: dbName
                    },
                    dumpToFile: dbDumpFile,
                });
                
                dumpFiles.push(dbDumpFile);
                console.log(`✅ Successfully backed up: ${dbName}`);
            } catch (dbError) {
                console.error(`❌ Failed to backup database ${dbName}:`, dbError);
                // Continue with other databases even if one fails
            }
        }
        
        // Create a combined file with all database dumps
        const combinedContent = [];
        combinedContent.push(`-- Orthodox Metrics Complete Database Backup`);
        combinedContent.push(`-- Generated: ${new Date().toISOString()}`);
        combinedContent.push(`-- Total Databases: ${dumpFiles.length}`);
        combinedContent.push(`--\n`);
        
        for (const dumpFile of dumpFiles) {
            const dbName = path.basename(dumpFile).replace(`database_`, '').replace(`_${timestamp}.sql`, '');
            combinedContent.push(`-- ====================================`);
            combinedContent.push(`-- DATABASE: ${dbName}`);
            combinedContent.push(`-- ====================================`);
            combinedContent.push(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
            combinedContent.push(`CREATE DATABASE \`${dbName}\`;`);
            combinedContent.push(`USE \`${dbName}\`;`);
            combinedContent.push(``);
            
            const dumpContent = await fs.readFile(dumpFile, 'utf8');
            combinedContent.push(dumpContent);
            combinedContent.push(`\n-- End of ${dbName}\n`);
        }
        
        await fs.writeFile(allDbsFile, combinedContent.join('\n'));
        
        // Clean up individual dump files
        for (const dumpFile of dumpFiles) {
            await fs.unlink(dumpFile).catch(() => {});
        }
        
        console.log(`🎉 All databases backed up to: ${allDbsFile}`);
        return allDbsFile;
        
    } catch (error) {
        console.error('❌ Database backup error:', error);
        throw error;
    }
};

// Create files backup - EVERYTHING one level above server directory
const createFilesBackup = async (backupDir, timestamp, includeUploads = true) => {
    return new Promise(async (resolve, reject) => {
        const archivePath = path.join(backupDir, `files_complete_${timestamp}.tar.gz`);
        const output = require('fs').createWriteStream(archivePath);
        const archive = archiver('tar', {
            gzip: true,
            gzipOptions: {
                level: currentSettings.compression ? 6 : 1
            }
        });

        output.on('close', () => {
            console.log(`🎉 Complete files backup created: ${(archive.pointer() / (1024*1024)).toFixed(2)} MB`);
            resolve(archivePath);
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);

        // The project root is one level above the server directory
        const projectRoot = path.resolve(__dirname, '../../');
        console.log(`📁 Backing up entire project from: ${projectRoot}`);

        try {
            // Add ALL directories and files from project root
            if (currentSettings.include_files) {
                console.log('📦 Adding server directory...');
                archive.directory(path.join(projectRoot, 'server'), 'server');
                
                console.log('📦 Adding front-end directory...');
                archive.directory(path.join(projectRoot, 'front-end'), 'front-end');
                
                console.log('📦 Adding public directory...');
                archive.directory(path.join(projectRoot, 'public'), 'public');
                
                console.log('📦 Adding scripts directory...');
                archive.directory(path.join(projectRoot, 'scripts'), 'scripts');
                
                console.log('📦 Adding docs directory...');
                archive.directory(path.join(projectRoot, 'docs'), 'docs');
                
                console.log('📦 Adding baptismrecords directory...');
                archive.directory(path.join(projectRoot, 'baptismrecords'), 'baptismrecords');
                
                console.log('📦 Adding marriagerecords directory...');
                archive.directory(path.join(projectRoot, 'marriagerecords'), 'marriagerecords');
                
                console.log('📦 Adding funeralrecords directory...');
                archive.directory(path.join(projectRoot, 'funeralrecords'), 'funeralrecords');
                
                // Add important config files from root
                console.log('📄 Adding root configuration files...');
                const rootFiles = ['package.json', 'README.md', 'ecosystem.config.cjs', 'todo.md', 'instructions.txt'];
                
                for (const file of rootFiles) {
                    const filePath = path.join(projectRoot, file);
                    try {
                        await fs.access(filePath);
                        archive.file(filePath, { name: file });
                        console.log(`✅ Added: ${file}`);
                    } catch (err) {
                        console.log(`⚠️  Skipped missing file: ${file}`);
                    }
                }
            }

            // Add uploads if requested
            if (includeUploads && currentSettings.include_uploads) {
                console.log('📸 Adding uploads directory...');
                const uploadsPath = path.join(projectRoot, 'public/uploads');
                archive.directory(uploadsPath, 'public/uploads');
            }

            console.log('🔄 Finalizing archive...');
            archive.finalize();
            
        } catch (error) {
            console.error('❌ Error during files backup:', error);
            reject(error);
        }
    });
};

// Main backup creation function
const createBackup = async (type = 'full', isScheduled = false) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${timestamp}_${type}`;

    try {
        console.log(`🚀 Starting ${type} backup (ID: ${backupId})`);
        console.log(`📅 Timestamp: ${timestamp}`);
        console.log(`📂 Backup directory: ${currentSettings.backup_location}`);

        await ensureBackupDir();

        // Create backup record
        const [result] = await promisePool.query(
            'INSERT INTO backup_files (id, filename, type, status, created_at) VALUES (?, ?, ?, ?, NOW())',
            [backupId, `${backupId}.tar.gz`, type, 'in_progress']
        );

        const tempDir = path.join(currentSettings.backup_location, `temp_${timestamp}`);
        await fs.mkdir(tempDir, { recursive: true });

        const backupFiles = [];

        // Create database backup
        if (type === 'full' || type === 'database') {
            if (currentSettings.include_database) {
                console.log('🗄️  Creating comprehensive database backup...');
                console.log('📋 This will backup ALL databases including:');
                console.log('   - cgpt, cgpt_logs');
                console.log('   - orthodox_ssppoc2, orthodoxmetrics_db, orthodoxmetrics_test_db');
                console.log('   - saints_peter_and_paul_orthodox_church_db, ssppoc_records_db');
                
                const dbBackup = await createDatabaseBackup(tempDir, timestamp);
                backupFiles.push(dbBackup);
            }
        }

        // Create files backup
        if (type === 'full' || type === 'files') {
            console.log('📁 Creating comprehensive files backup...');
            console.log('📋 This will backup ALL project files including:');
            console.log('   - /server (backend code)');
            console.log('   - /front-end (React app)');
            console.log('   - /public (static assets)');
            console.log('   - /scripts (utility scripts)');
            console.log('   - /docs (documentation)');
            console.log('   - /*records directories');
            console.log('   - Root config files (package.json, ecosystem.config.cjs, etc.)');
            
            const filesBackup = await createFilesBackup(tempDir, timestamp, type === 'full');
            backupFiles.push(filesBackup);
        }

        // Create final compressed archive
        const finalBackupPath = path.join(currentSettings.backup_location, `${backupId}.tar.gz`);
        await new Promise((resolve, reject) => {
            const output = require('fs').createWriteStream(finalBackupPath);
            const archive = archiver('tar', { gzip: true });

            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);

            // Add all backup files to the final archive
            for (const file of backupFiles) {
                archive.file(file, { name: path.basename(file) });
            }

            archive.finalize();
        });

        // Get final file size
        const stats = await fs.stat(finalBackupPath);

        // Update backup record
        await promisePool.query(
            'UPDATE backup_files SET status = ?, size = ? WHERE id = ?',
            ['completed', stats.size, backupId]
        );

        // Cleanup temp directory
        await fs.rmdir(tempDir, { recursive: true });

        // Cleanup old backups
        await cleanupOldBackups();

        console.log(`Backup completed: ${backupId}`);

        // Send notification if enabled
        if (currentSettings.email_notifications && currentSettings.notification_email) {
            await sendBackupNotification(backupId, 'completed', stats.size);
        }

        return {
            success: true,
            backupId,
            size: stats.size,
            path: finalBackupPath
        };

    } catch (error) {
        console.error('Backup creation error:', error);

        // Update backup record with error
        await promisePool.query(
            'UPDATE backup_files SET status = ?, error_message = ? WHERE id = ?',
            ['failed', error.message, backupId]
        );

        // Send error notification
        if (currentSettings.email_notifications && currentSettings.notification_email) {
            await sendBackupNotification(backupId, 'failed', 0, error.message);
        }

        throw error;
    }
};

// Cleanup old backups
const cleanupOldBackups = async () => {
    try {
        // Remove backups older than retention period
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - currentSettings.retention_days);

        const [oldBackups] = await promisePool.query(
            'SELECT id, filename FROM backup_files WHERE created_at < ? AND status = "completed"',
            [retentionDate]
        );

        for (const backup of oldBackups) {
            try {
                const filePath = path.join(currentSettings.backup_location, backup.filename);
                await fs.unlink(filePath);
                await promisePool.query('DELETE FROM backup_files WHERE id = ?', [backup.id]);
                console.log(`Deleted old backup: ${backup.filename}`);
            } catch (err) {
                console.error(`Error deleting backup ${backup.filename}:`, err);
            }
        }

        // Limit total number of backups
        const [allBackups] = await promisePool.query(
            'SELECT id, filename FROM backup_files WHERE status = "completed" ORDER BY created_at DESC LIMIT ?, 999999',
            [currentSettings.max_backups]
        );

        for (const backup of allBackups) {
            try {
                const filePath = path.join(currentSettings.backup_location, backup.filename);
                await fs.unlink(filePath);
                await promisePool.query('DELETE FROM backup_files WHERE id = ?', [backup.id]);
                console.log(`Deleted excess backup: ${backup.filename}`);
            } catch (err) {
                console.error(`Error deleting backup ${backup.filename}:`, err);
            }
        }

    } catch (error) {
        console.error('Error cleaning up old backups:', error);
    }
};

// Send backup notification email
const sendBackupNotification = async (backupId, status, size, error = null) => {
    // TODO: Implement email notification
    console.log(`Backup notification: ${backupId} - ${status} - ${size} bytes`);
    if (error) {
        console.log(`Error: ${error}`);
    }
};

// Routes

// GET /api/admin/backup/settings
router.get('/settings', requireSuperAdmin, async (req, res) => {
    try {
        res.json({
            success: true,
            settings: currentSettings
        });
    } catch (error) {
        console.error('Error getting backup settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get backup settings'
        });
    }
});

// PUT /api/admin/backup/settings
router.put('/settings', requireSuperAdmin, async (req, res) => {
    try {
        const newSettings = { ...currentSettings, ...req.body };

        // Validate cron expression if provided
        if (newSettings.schedule !== 'custom' && !cron.validate(newSettings.schedule)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid cron expression'
            });
        }

        // Save to database
        await promisePool.query(
            'INSERT INTO backup_settings (id, settings) VALUES (1, ?) ON DUPLICATE KEY UPDATE settings = ?',
            [JSON.stringify(newSettings), JSON.stringify(newSettings)]
        );

        currentSettings = newSettings;

        // Update cron schedule
        setupBackupSchedule();

        res.json({
            success: true,
            message: 'Backup settings updated successfully'
        });
    } catch (error) {
        console.error('Error updating backup settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update backup settings'
        });
    }
});

// GET /api/admin/backup/files
router.get('/files', requireSuperAdmin, async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT * FROM backup_files ORDER BY created_at DESC LIMIT 100'
        );

        res.json({
            success: true,
            files: rows
        });
    } catch (error) {
        console.error('Error getting backup files:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get backup files'
        });
    }
});

// GET /api/admin/backup/storage
router.get('/storage', requireSuperAdmin, async (req, res) => {
    try {
        const storage = await getStorageInfo();
        res.json({
            success: true,
            storage
        });
    } catch (error) {
        console.error('Error getting storage info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get storage information'
        });
    }
});

// POST /api/admin/backup/run
router.post('/run', requireSuperAdmin, async (req, res) => {
    try {
        const { type = 'full' } = req.body;

        if (!['full', 'database', 'files'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid backup type'
            });
        }

        // Run backup asynchronously
        setImmediate(async () => {
            try {
                await createBackup(type, false);
            } catch (error) {
                console.error('Async backup error:', error);
            }
        });

        res.json({
            success: true,
            message: 'Backup started successfully'
        });
    } catch (error) {
        console.error('Error starting backup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start backup'
        });
    }
});

// GET /api/admin/backup/download/:id
router.get('/download/:id', requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await promisePool.query(
            'SELECT * FROM backup_files WHERE id = ? AND status = "completed"',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Backup file not found'
            });
        }

        const backup = rows[0];
        const filePath = path.join(currentSettings.backup_location, backup.filename);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({
                success: false,
                message: 'Backup file not found on disk'
            });
        }

        res.download(filePath, backup.filename);
    } catch (error) {
        console.error('Error downloading backup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download backup'
        });
    }
});

// DELETE /api/admin/backup/delete/:id
router.delete('/delete/:id', requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await promisePool.query(
            'SELECT * FROM backup_files WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Backup file not found'
            });
        }

        const backup = rows[0];
        const filePath = path.join(currentSettings.backup_location, backup.filename);

        // Delete file from disk
        try {
            await fs.unlink(filePath);
        } catch (error) {
            console.warn('File already deleted from disk:', filePath);
        }

        // Delete from database
        await promisePool.query('DELETE FROM backup_files WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Backup deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting backup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete backup'
        });
    }
});

// GET /api/admin/backup/databases - List all databases that will be backed up
router.get('/databases', requireSuperAdmin, async (req, res) => {
    try {
        console.log('🔍 Fetching list of databases to backup...');
        
        // Get list of all databases (excluding system databases)
        const [databases] = await promisePool.query(`
            SHOW DATABASES 
            WHERE \`Database\` NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
        `);
        
        const dbList = databases.map(db => db.Database);
        
        console.log(`📋 Found ${dbList.length} databases:`, dbList);
        
        res.json({
            success: true,
            databases: dbList,
            total_count: dbList.length,
            message: `Found ${dbList.length} databases that will be included in backup`
        });
        
    } catch (error) {
        console.error('❌ Error getting databases list:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get databases list',
            error: error.message
        });
    }
});

// Initialize on module load
initializeBackupSettings();

module.exports = router;
