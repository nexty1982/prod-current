const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../../middleware/auth');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// Middleware for super_admin only
const requireSuperAdmin = requireRole(['super_admin']);

// NFS Configuration file path
const NFS_CONFIG_FILE = '/etc/orthodoxmetrics/nfs-backup.conf';
const NFS_MOUNT_POINT = '/mnt/orthodox-nfs-backup';

// Validation functions
function validateIPv4(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
}

function validatePath(path) {
    return path.startsWith('/') && path.length > 1;
}

// Load NFS configuration
async function loadNFSConfig() {
    try {
        const configData = await fs.readFile(NFS_CONFIG_FILE, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        // Return default config if file doesn't exist
        return {
            enabled: false,
            nfsServerIP: '',
            remotePath: '',
            mountTarget: NFS_MOUNT_POINT,
            persistMount: false
        };
    }
}

// Save NFS configuration
async function saveNFSConfig(config) {
    try {
        // Ensure directory exists
        await fs.mkdir(path.dirname(NFS_CONFIG_FILE), { recursive: true, mode: 0o700 });
        
        // Save config with proper permissions
        await fs.writeFile(NFS_CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
        
        return true;
    } catch (error) {
        console.error('Error saving NFS config:', error);
        return false;
    }
}

// Check if NFS is mounted
async function checkNFSMount() {
    try {
        const { stdout } = await execAsync('mount | grep nfs');
        const lines = stdout.split('\n');
        
        for (const line of lines) {
            if (line.includes(NFS_MOUNT_POINT)) {
                return {
                    mounted: true,
                    mountInfo: line.trim()
                };
            }
        }
        
        return { mounted: false };
    } catch (error) {
        return { mounted: false };
    }
}

// Test NFS connection
async function testNFSConnection(nfsServerIP, remotePath) {
    try {
        // Test if NFS server is reachable
        await execAsync(`ping -c 1 -W 3 ${nfsServerIP}`);
        
        // Test if NFS export is available
        const { stdout } = await execAsync(`showmount -e ${nfsServerIP}`);
        
        // Check if the remote path is in the exports
        if (stdout.includes(remotePath)) {
            return { success: true, message: 'NFS connection successful' };
        } else {
            return { success: false, message: 'Remote path not found in NFS exports' };
        }
    } catch (error) {
        return { success: false, message: `NFS connection failed: ${error.message}` };
    }
}

// Mount NFS share
async function mountNFSShare(nfsServerIP, remotePath, mountTarget) {
    try {
        // Create mount point if it doesn't exist
        await fs.mkdir(mountTarget, { recursive: true, mode: 0o755 });
        
        // Mount the NFS share
        const mountCommand = `mount -t nfs ${nfsServerIP}:${remotePath} ${mountTarget}`;
        await execAsync(mountCommand);
        
        // Verify mount was successful
        const mountCheck = await checkNFSMount();
        if (mountCheck.mounted) {
            return { success: true, message: 'NFS share mounted successfully' };
        } else {
            return { success: false, message: 'Mount command succeeded but share not detected' };
        }
    } catch (error) {
        return { success: false, message: `Mount failed: ${error.message}` };
    }
}

// Unmount NFS share
async function unmountNFSShare(mountTarget) {
    try {
        await execAsync(`umount ${mountTarget}`);
        return { success: true, message: 'NFS share unmounted successfully' };
    } catch (error) {
        return { success: false, message: `Unmount failed: ${error.message}` };
    }
}

// Update fstab for persistent mounting
async function updateFstab(nfsServerIP, remotePath, mountTarget, persistMount) {
    try {
        const fstabEntry = `${nfsServerIP}:${remotePath} ${mountTarget} nfs defaults 0 0`;
        
        if (persistMount) {
            // Check if entry already exists
            const { stdout } = await execAsync('cat /etc/fstab');
            if (!stdout.includes(mountTarget)) {
                // Add entry to fstab
                await execAsync(`echo "${fstabEntry}" >> /etc/fstab`);
            }
        } else {
            // Remove entry from fstab if it exists
            const { stdout } = await execAsync('cat /etc/fstab');
            const lines = stdout.split('\n').filter(line => !line.includes(mountTarget));
            await fs.writeFile('/etc/fstab', lines.join('\n') + '\n');
        }
        
        return true;
    } catch (error) {
        console.error('Error updating fstab:', error);
        return false;
    }
}

// Log audit entry
async function logAuditEntry(action, details, success) {
    try {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            action: `NFS_BACKUP_${action}`,
            details,
            success,
            user: 'system'
        };
        
        // Append to audit log
        await fs.appendFile('/var/log/orthodoxmetrics/audit.log', JSON.stringify(auditEntry) + '\n');
    } catch (error) {
        console.error('Error logging audit entry:', error);
    }
}

// GET /api/admin/nfs-backup/config - Get NFS configuration
router.get('/config', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const config = await loadNFSConfig();
        const mountStatus = await checkNFSMount();
        
        // Get disk space if mounted
        let diskSpace = null;
        if (mountStatus.mounted) {
            try {
                const { stdout } = await execAsync(`df -h ${NFS_MOUNT_POINT} | tail -1`);
                const parts = stdout.split(/\s+/);
                diskSpace = {
                    total: parts[1],
                    used: parts[2],
                    available: parts[3],
                    usePercent: parts[4]
                };
            } catch (error) {
                console.error('Error getting disk space:', error);
            }
        }
        
        res.json({
            success: true,
            config,
            mountStatus,
            diskSpace
        });
    } catch (error) {
        console.error('Error getting NFS config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get NFS configuration'
        });
    }
});

// POST /api/admin/nfs-backup/config - Save NFS configuration
router.post('/config', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { nfsServerIP, remotePath, mountTarget, enabled, persistMount } = req.body;
        
        // Validate inputs
        if (!validateIPv4(nfsServerIP)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid NFS server IP address'
            });
        }
        
        if (!validatePath(remotePath)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid remote path'
            });
        }
        
        if (!validatePath(mountTarget)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid mount target'
            });
        }
        
        // Load current config
        const currentConfig = await loadNFSConfig();
        
        // Create new config
        const newConfig = {
            enabled: Boolean(enabled),
            nfsServerIP: nfsServerIP.trim(),
            remotePath: remotePath.trim(),
            mountTarget: mountTarget.trim(),
            persistMount: Boolean(persistMount)
        };
        
        // Save configuration
        const saved = await saveNFSConfig(newConfig);
        if (!saved) {
            return res.status(500).json({
                success: false,
                error: 'Failed to save NFS configuration'
            });
        }
        
        // Handle mounting/unmounting based on enabled status
        let mountResult = null;
        
        if (newConfig.enabled) {
            // Test connection first
            const testResult = await testNFSConnection(newConfig.nfsServerIP, newConfig.remotePath);
            if (!testResult.success) {
                return res.status(400).json({
                    success: false,
                    error: testResult.message
                });
            }
            
            // Mount the share
            mountResult = await mountNFSShare(newConfig.nfsServerIP, newConfig.remotePath, newConfig.mountTarget);
            
            // Update fstab if needed
            await updateFstab(newConfig.nfsServerIP, newConfig.remotePath, newConfig.mountTarget, newConfig.persistMount);
        } else {
            // Unmount if currently mounted
            const mountStatus = await checkNFSMount();
            if (mountStatus.mounted) {
                mountResult = await unmountNFSShare(newConfig.mountTarget);
            }
        }
        
        // Log audit entry
        await logAuditEntry('CONFIG_UPDATE', {
            enabled: newConfig.enabled,
            nfsServerIP: newConfig.nfsServerIP,
            remotePath: newConfig.remotePath,
            mountResult
        }, true);
        
        res.json({
            success: true,
            message: 'NFS configuration saved successfully',
            mountResult
        });
        
    } catch (error) {
        console.error('Error saving NFS config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save NFS configuration'
        });
    }
});

// POST /api/admin/nfs-backup/test - Test NFS connection
router.post('/test', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { nfsServerIP, remotePath } = req.body;
        
        // Validate inputs
        if (!validateIPv4(nfsServerIP)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid NFS server IP address'
            });
        }
        
        if (!validatePath(remotePath)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid remote path'
            });
        }
        
        // Test connection
        const result = await testNFSConnection(nfsServerIP, remotePath);
        
        res.json({
            success: result.success,
            message: result.message
        });
        
    } catch (error) {
        console.error('Error testing NFS connection:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test NFS connection'
        });
    }
});

// POST /api/admin/nfs-backup/mount - Manually mount NFS share
router.post('/mount', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const config = await loadNFSConfig();
        
        if (!config.enabled) {
            return res.status(400).json({
                success: false,
                error: 'NFS backup is not enabled'
            });
        }
        
        const result = await mountNFSShare(config.nfsServerIP, config.remotePath, config.mountTarget);
        
        // Log audit entry
        await logAuditEntry('MANUAL_MOUNT', result, result.success);
        
        res.json({
            success: result.success,
            message: result.message
        });
        
    } catch (error) {
        console.error('Error mounting NFS share:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mount NFS share'
        });
    }
});

// POST /api/admin/nfs-backup/unmount - Manually unmount NFS share
router.post('/unmount', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const config = await loadNFSConfig();
        const result = await unmountNFSShare(config.mountTarget);
        
        // Log audit entry
        await logAuditEntry('MANUAL_UNMOUNT', result, result.success);
        
        res.json({
            success: result.success,
            message: result.message
        });
        
    } catch (error) {
        console.error('Error unmounting NFS share:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unmount NFS share'
        });
    }
});

// GET /api/admin/nfs-backup/status - Get detailed NFS status
router.get('/status', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const config = await loadNFSConfig();
        const mountStatus = await checkNFSMount();
        
        // Get disk space if mounted
        let diskSpace = null;
        if (mountStatus.mounted) {
            try {
                const { stdout } = await execAsync(`df -h ${NFS_MOUNT_POINT} | tail -1`);
                const parts = stdout.split(/\s+/);
                diskSpace = {
                    total: parts[1],
                    used: parts[2],
                    available: parts[3],
                    usePercent: parts[4]
                };
            } catch (error) {
                console.error('Error getting disk space:', error);
            }
        }
        
        // Get recent backup logs
        let recentBackups = [];
        try {
            const { stdout } = await execAsync(`tail -n 10 /var/log/om-backup.log | grep -E "(FULL|DIFF)" | head -5`);
            recentBackups = stdout.split('\n').filter(line => line.trim()).map(line => {
                const match = line.match(/\[(.*?)\] \[(.*?)\] (.*)/);
                return match ? {
                    timestamp: match[1],
                    level: match[2],
                    message: match[3]
                } : null;
            }).filter(Boolean);
        } catch (error) {
            console.error('Error getting recent backups:', error);
        }
        
        res.json({
            success: true,
            config,
            mountStatus,
            diskSpace,
            recentBackups
        });
        
    } catch (error) {
        console.error('Error getting NFS status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get NFS status'
        });
    }
});

module.exports = router; 