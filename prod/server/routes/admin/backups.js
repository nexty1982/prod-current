const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const extract = require('extract-zip');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Middleware to ensure only super_admins can access
const requireSuperAdmin = requireRole(['super_admin']);

// Backup directories
const BACKUP_BASE_DIR = '/var/backups/orthodoxmetrics';
const PROD_BACKUP_DIR = path.join(BACKUP_BASE_DIR, 'prod');
const DEV_BACKUP_DIR = path.join(BACKUP_BASE_DIR, 'dev');

// Source directories
const PROD_SOURCE_DIR = '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod';
const DEV_SOURCE_DIR = '/var/www/orthodox-church-mgmt/orthodoxmetrics/dev';

// Ensure backup directories exist
async function ensureBackupDirectories() {
    try {
        await fs.mkdir(PROD_BACKUP_DIR, { recursive: true });
        await fs.mkdir(DEV_BACKUP_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating backup directories:', error);
    }
}

// Initialize backup directories on startup
ensureBackupDirectories();

// GET /api/backups/list?env=dev|prod - List available backups
router.get('/list', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { env } = req.query;
        
        if (!env || !['dev', 'prod'].includes(env)) {
            return res.status(400).json({ 
                error: 'Environment must be specified as "dev" or "prod"' 
            });
        }

        const backupDir = env === 'prod' ? PROD_BACKUP_DIR : DEV_BACKUP_DIR;
        
        // Check if directory exists
        try {
            await fs.access(backupDir);
        } catch (error) {
            return res.json({ backups: [] });
        }

        // Read directory contents
        const files = await fs.readdir(backupDir);
        const backups = [];

        for (const file of files) {
            if (file.endsWith('.zip')) {
                const filePath = path.join(backupDir, file);
                const stats = await fs.stat(filePath);
                
                backups.push({
                    filename: file,
                    size: stats.size,
                    created_at: stats.birthtime,
                    modified_at: stats.mtime
                });
            }
        }

        // Sort by creation date (newest first)
        backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json({ backups });

    } catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({ 
            error: 'Failed to list backups',
            details: error.message 
        });
    }
});

// POST /api/backups/create - Create a new backup
router.post('/create', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        console.log('[BACKUP] Starting backup creation...');
        const { env } = req.body;
        console.log('[BACKUP] Environment requested:', env);
        
        if (!env || !['dev', 'prod'].includes(env)) {
            console.log('[BACKUP] Invalid environment:', env);
            return res.status(400).json({ 
                error: 'Environment must be specified as "dev" or "prod"' 
            });
        }

        const sourceDir = env === 'prod' ? PROD_SOURCE_DIR : DEV_SOURCE_DIR;
        const backupDir = env === 'prod' ? PROD_BACKUP_DIR : DEV_BACKUP_DIR;
        console.log('[BACKUP] Source directory:', sourceDir);
        console.log('[BACKUP] Backup directory:', backupDir);
        
        // Check if source directory exists
        try {
            await fs.access(sourceDir);
            console.log('[BACKUP] Source directory exists ✓');
        } catch (error) {
            console.log('[BACKUP] Source directory not found:', sourceDir);
            return res.status(404).json({ 
                error: `Source directory not found: ${sourceDir}` 
            });
        }

        // Create backup filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const backupFilename = `${timestamp}.zip`;
        const backupPath = path.join(backupDir, backupFilename);
        console.log('[BACKUP] Backup filename:', backupFilename);
        console.log('[BACKUP] Full backup path:', backupPath);

        // Check if backup already exists for today
        try {
            await fs.access(backupPath);
            console.log('[BACKUP] Backup already exists for today:', backupPath);
            return res.status(409).json({ 
                error: `Backup for ${timestamp} already exists. Please delete it first or wait until tomorrow.` 
            });
        } catch (error) {
            // File doesn't exist, proceed with backup
            console.log('[BACKUP] No existing backup found, proceeding...');
        }

        // Create backup using zip command with larger buffer and quiet output
        const zipCommand = `cd "${sourceDir}" && zip -r -q "${backupPath}" . -x "node_modules/*" ".git/*" "*.log" "temp/*" "uploads/temp/*"`;
        
        console.log('[BACKUP] Executing zip command...');
        console.log('[BACKUP] Command:', zipCommand);
        
        const { stdout, stderr } = await execAsync(zipCommand, {
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            timeout: 300000 // 5 minutes timeout
        });
        
        console.log('[BACKUP] Zip command completed');
        if (stderr && !stderr.includes('warning')) {
            console.error('[BACKUP] Zip stderr:', stderr);
        }

        // Verify backup was created
        console.log('[BACKUP] Verifying backup file...');
        const stats = await fs.stat(backupPath);
        console.log('[BACKUP] Backup file verified, size:', stats.size, 'bytes');
        
        console.log('[BACKUP] Backup completed successfully ✓');
        res.json({ 
            success: true, 
            message: `Backup created successfully: ${backupFilename}`,
            filename: backupFilename,
            size: stats.size,
            created_at: stats.birthtime
        });

    } catch (error) {
        console.error('[BACKUP] Error creating backup:', error);
        res.status(500).json({ 
            error: 'Failed to create backup',
            details: error.message 
        });
    }
});

// GET /api/backups/download/:env/:filename - Download a backup file
router.get('/download/:env/:filename', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { env, filename } = req.params;
        
        if (!['dev', 'prod'].includes(env)) {
            return res.status(400).json({ 
                error: 'Environment must be "dev" or "prod"' 
            });
        }

        // Validate filename to prevent directory traversal
        if (!filename.match(/^\d{4}-\d{2}-\d{2}\.zip$/)) {
            return res.status(400).json({ 
                error: 'Invalid filename format. Expected: YYYY-MM-DD.zip' 
            });
        }

        const backupDir = env === 'prod' ? PROD_BACKUP_DIR : DEV_BACKUP_DIR;
        const filePath = path.join(backupDir, filename);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({ 
                error: 'Backup file not found' 
            });
        }

        // Stream the file
        res.download(filePath, filename);

    } catch (error) {
        console.error('Error downloading backup:', error);
        res.status(500).json({ 
            error: 'Failed to download backup',
            details: error.message 
        });
    }
});

// POST /api/backups/restore - Restore a backup
router.post('/restore', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { env, filename } = req.body;
        
        if (!env || !['dev', 'prod'].includes(env)) {
            return res.status(400).json({ 
                error: 'Environment must be specified as "dev" or "prod"' 
            });
        }

        if (!filename || !filename.match(/^\d{4}-\d{2}-\d{2}\.zip$/)) {
            return res.status(400).json({ 
                error: 'Invalid filename format. Expected: YYYY-MM-DD.zip' 
            });
        }

        const backupDir = env === 'prod' ? PROD_BACKUP_DIR : DEV_BACKUP_DIR;
        const targetDir = env === 'prod' ? PROD_SOURCE_DIR : DEV_SOURCE_DIR;
        const backupPath = path.join(backupDir, filename);

        // Check if backup file exists
        try {
            await fs.access(backupPath);
        } catch (error) {
            return res.status(404).json({ 
                error: 'Backup file not found' 
            });
        }

        // Check if target directory exists
        try {
            await fs.access(targetDir);
        } catch (error) {
            return res.status(404).json({ 
                error: `Target directory not found: ${targetDir}` 
            });
        }

        // Create a temporary directory for extraction
        const tempDir = path.join(targetDir, 'temp_restore_' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        try {
            // Extract backup to temporary directory
            await extract(backupPath, { dir: tempDir });

            // Create backup of current state before restore
            const currentBackupName = `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
            const currentBackupPath = path.join(backupDir, currentBackupName);
            
            const currentBackupCommand = `cd "${targetDir}" && zip -r -q "${currentBackupPath}" . -x "node_modules/*" ".git/*" "*.log" "temp/*" "uploads/temp/*" "temp_restore_*"`;
            await execAsync(currentBackupCommand, {
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                timeout: 300000 // 5 minutes timeout
            });

            // Move extracted files to target directory (excluding temp_restore_* directories)
            const moveCommand = `cd "${tempDir}" && find . -maxdepth 1 -not -name "temp_restore_*" -exec mv {} "${targetDir}/" \\;`;
            await execAsync(moveCommand, {
                maxBuffer: 1024 * 1024, // 1MB buffer
                timeout: 60000 // 1 minute timeout
            });

            // Clean up temporary directory
            await fs.rmdir(tempDir, { recursive: true });

            res.json({ 
                success: true, 
                message: `Backup restored successfully: ${filename}`,
                pre_restore_backup: currentBackupName
            });

        } catch (error) {
            // Clean up on error
            try {
                await fs.rmdir(tempDir, { recursive: true });
            } catch (cleanupError) {
                console.error('Error cleaning up temp directory:', cleanupError);
            }
            throw error;
        }

    } catch (error) {
        console.error('Error restoring backup:', error);
        res.status(500).json({ 
            error: 'Failed to restore backup',
            details: error.message 
        });
    }
});

// DELETE /api/backups/:env/:filename - Delete a backup
router.delete('/:env/:filename', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { env, filename } = req.params;
        
        if (!['dev', 'prod'].includes(env)) {
            return res.status(400).json({ 
                error: 'Environment must be "dev" or "prod"' 
            });
        }

        // Validate filename to prevent directory traversal
        if (!filename.match(/^\d{4}-\d{2}-\d{2}\.zip$/)) {
            return res.status(400).json({ 
                error: 'Invalid filename format. Expected: YYYY-MM-DD.zip' 
            });
        }

        const backupDir = env === 'prod' ? PROD_BACKUP_DIR : DEV_BACKUP_DIR;
        const filePath = path.join(backupDir, filename);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({ 
                error: 'Backup file not found' 
            });
        }

        // Delete the file
        await fs.unlink(filePath);

        res.json({ 
            success: true, 
            message: `Backup deleted successfully: ${filename}` 
        });

    } catch (error) {
        console.error('Error deleting backup:', error);
        res.status(500).json({ 
            error: 'Failed to delete backup',
            details: error.message 
        });
    }
});

module.exports = router; 