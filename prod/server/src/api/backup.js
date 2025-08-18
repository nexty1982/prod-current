const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Middleware to ensure only super_admins can access
const requireSuperAdmin = requireRole(['super_admin']);

// Backup directories
const BACKUP_BASE_DIR = '/var/backups/orthodoxmetrics';
const BACKUP_DIR = path.join(BACKUP_BASE_DIR, 'system');

// Ensure backup directory exists
async function ensureBackupDirectory() {
    try {
        await fs.mkdir(BACKUP_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating backup directory:', error);
    }
}

// Initialize backup directory on startup
ensureBackupDirectory();

// GET /api/backup/settings - Get backup settings
router.get('/settings', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        // Default backup settings
        const defaultSettings = {
            enabled: true,
            schedule: '0 2 * * *', // Daily at 2 AM
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

        res.json({
            success: true,
            settings: defaultSettings
        });
    } catch (error) {
        console.error('Error getting backup settings:', error);
        res.status(500).json({ 
            error: 'Failed to get backup settings',
            details: error.message 
        });
    }
});

// PUT /api/backup/settings - Update backup settings
router.put('/settings', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const settings = req.body;
        
        // In a real implementation, you would save these to a database
        // For now, we'll just return success
        res.json({
            success: true,
            message: 'Backup settings updated successfully',
            data: settings
        });
    } catch (error) {
        console.error('Error updating backup settings:', error);
        res.status(500).json({ 
            error: 'Failed to update backup settings',
            details: error.message 
        });
    }
});

// GET /api/backup/files - List backup files
router.get('/files', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        // Check if directory exists
        try {
            await fs.access(BACKUP_DIR);
        } catch (error) {
            return res.json([]);
        }

        // Read directory contents
        const files = await fs.readdir(BACKUP_DIR);
        const backupFiles = [];

        for (const file of files) {
            if (file.endsWith('.zip') || file.endsWith('.sql')) {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = await fs.stat(filePath);
                
                backupFiles.push({
                    id: file.replace(/\.(zip|sql)$/, ''),
                    filename: file,
                    type: file.endsWith('.sql') ? 'database' : 'full',
                    status: 'completed',
                    size: stats.size,
                    created_at: stats.birthtime,
                    completed_at: stats.mtime
                });
            }
        }

        // Sort by creation date (newest first)
        backupFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json(backupFiles);

    } catch (error) {
        console.error('Error listing backup files:', error);
        res.status(500).json({ 
            error: 'Failed to list backup files',
            details: error.message 
        });
    }
});

// GET /api/backup/storage - Get storage information
router.get('/storage', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        // Get disk usage information
        const { stdout } = await execAsync('df -h /var/backups/orthodoxmetrics');
        const lines = stdout.trim().split('\n');
        const diskInfo = lines[1].split(/\s+/);
        
        // Parse disk usage (assuming output format: Filesystem Size Used Avail Use% Mounted)
        const totalSpace = parseInt(diskInfo[1]) * 1024 * 1024 * 1024; // Convert GB to bytes
        const usedSpace = parseInt(diskInfo[2]) * 1024 * 1024 * 1024;
        
        // Calculate backup space (sum of all backup files)
        let backupSpace = 0;
        try {
            const files = await fs.readdir(BACKUP_DIR);
            for (const file of files) {
                if (file.endsWith('.zip') || file.endsWith('.sql')) {
                    const filePath = path.join(BACKUP_DIR, file);
                    const stats = await fs.stat(filePath);
                    backupSpace += stats.size;
                }
            }
        } catch (error) {
            // Backup directory doesn't exist yet
        }

        res.json({
            total_space: totalSpace,
            used_space: usedSpace,
            backup_space: backupSpace
        });

    } catch (error) {
        console.error('Error getting storage info:', error);
        res.status(500).json({ 
            error: 'Failed to get storage information',
            details: error.message 
        });
    }
});

// POST /api/backup/run - Run a backup
router.post('/run', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = `orthodox-metrics-backup-${timestamp}.zip`;
        const backupPath = path.join(BACKUP_DIR, backupFilename);

        // Create backup using zip command
        const sourceDir = '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod';
        const zipCommand = `cd "${sourceDir}" && zip -r -q "${backupPath}" . -x "node_modules/*" ".git/*" "*.log" "temp/*" "uploads/temp/*"`;
        
        console.log(`Creating system backup: ${zipCommand}`);
        
        const { stdout, stderr } = await execAsync(zipCommand, {
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            timeout: 300000 // 5 minutes timeout
        });
        
        if (stderr && !stderr.includes('warning')) {
            console.error('Zip stderr:', stderr);
        }

        // Verify backup was created
        const stats = await fs.stat(backupPath);
        
        res.json({ 
            success: true, 
            message: 'Backup started successfully',
            backup_id: backupFilename.replace('.zip', ''),
            filename: backupFilename,
            size: stats.size
        });

    } catch (error) {
        console.error('Error running backup:', error);
        res.status(500).json({ 
            error: 'Failed to run backup',
            details: error.message 
        });
    }
});

// GET /api/backup/download/:id - Download a backup
router.get('/download/:id', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the backup file
        const files = await fs.readdir(BACKUP_DIR);
        const backupFile = files.find(file => file.includes(id) && (file.endsWith('.zip') || file.endsWith('.sql')));
        
        if (!backupFile) {
            return res.status(404).json({ 
                error: 'Backup file not found' 
            });
        }

        const filePath = path.join(BACKUP_DIR, backupFile);
        
        // Stream the file
        res.download(filePath, backupFile);

    } catch (error) {
        console.error('Error downloading backup:', error);
        res.status(500).json({ 
            error: 'Failed to download backup',
            details: error.message 
        });
    }
});

// DELETE /api/backup/delete/:id - Delete a backup
router.delete('/delete/:id', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the backup file
        const files = await fs.readdir(BACKUP_DIR);
        const backupFile = files.find(file => file.includes(id) && (file.endsWith('.zip') || file.endsWith('.sql')));
        
        if (!backupFile) {
            return res.status(404).json({ 
                error: 'Backup file not found' 
            });
        }

        const filePath = path.join(BACKUP_DIR, backupFile);
        
        // Delete the file
        await fs.unlink(filePath);

        res.json({ 
            success: true, 
            message: `Backup deleted successfully: ${backupFile}` 
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