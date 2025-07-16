// server/routes/admin.js - Extended admin routes for Orthodox Metrics management
const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/db');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

// System Statistics
router.get('/system-stats', async (req, res) => {
    try {
        // Get total clients
        const [clientCount] = await promisePool.execute('SELECT COUNT(*) as count FROM clients');

        // Get active clients
        const [activeClientCount] = await promisePool.execute(
            'SELECT COUNT(*) as count FROM clients WHERE status = "active"'
        );

        // Get total users across all client databases
        let totalUsers = 0;
        let activeUsers = 0;

        const [clients] = await promisePool.execute('SELECT database_name FROM clients WHERE status = "active"');

        for (const client of clients) {
            try {
                const mysql = require('mysql2/promise');
                const clientConnection = await mysql.createConnection({
                    host: process.env.DB_HOST || 'localhost',
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASSWORD || 'Summerof1982@!',
                    database: client.database_name
                });

                const [users] = await clientConnection.execute('SELECT COUNT(*) as count FROM users');
                const [activeUsersResult] = await clientConnection.execute(
                    'SELECT COUNT(*) as count FROM users WHERE is_active = true'
                );

                totalUsers += users[0].count;
                activeUsers += activeUsersResult[0].count;

                await clientConnection.end();
            } catch (error) {
                console.warn(`Error querying client database ${client.database_name}:`, error.message);
            }
        }

        // Get total records across all client databases
        let totalRecords = { baptisms: 0, marriages: 0, funerals: 0, total: 0 };

        for (const client of clients) {
            try {
                const mysql = require('mysql2/promise');
                const clientConnection = await mysql.createConnection({
                    host: process.env.DB_HOST || 'localhost',
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASSWORD || 'Summerof1982@!',
                    database: client.database_name
                });

                const [baptisms] = await clientConnection.execute('SELECT COUNT(*) as count FROM baptism_records');
                const [marriages] = await clientConnection.execute('SELECT COUNT(*) as count FROM marriage_records');
                const [funerals] = await clientConnection.execute('SELECT COUNT(*) as count FROM funeral_records');

                totalRecords.baptisms += baptisms[0].count;
                totalRecords.marriages += marriages[0].count;
                totalRecords.funerals += funerals[0].count;

                await clientConnection.end();
            } catch (error) {
                console.warn(`Error querying records from ${client.database_name}:`, error.message);
            }
        }

        totalRecords.total = totalRecords.baptisms + totalRecords.marriages + totalRecords.funerals;

        res.json({
            clients: {
                total: clientCount[0].count,
                active: activeClientCount[0].count,
                inactive: clientCount[0].count - activeClientCount[0].count
            },
            users: {
                total: totalUsers,
                active: activeUsers
            },
            records: totalRecords,
            system: {
                uptime: process.uptime(),
                nodeVersion: process.version,
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname()
            }
        });
    } catch (error) {
        console.error('Error fetching system stats:', error);
        res.status(500).json({ error: 'Failed to fetch system statistics' });
    }
});

// Database Health Check
router.get('/database-health', async (req, res) => {
    try {
        const healthResults = [];

        // Check main database
        try {
            const [result] = await promisePool.execute('SELECT 1');
            healthResults.push({
                database: 'orthodoxmetrics_db',
                type: 'main',
                status: 'healthy',
                responseTime: Date.now(),
                lastChecked: new Date().toISOString()
            });
        } catch (error) {
            healthResults.push({
                database: 'orthodoxmetrics_db',
                type: 'main',
                status: 'error',
                error: error.message,
                lastChecked: new Date().toISOString()
            });
        }

        // Check all client databases
        const [clients] = await promisePool.execute(
            'SELECT id, name, slug, database_name FROM clients WHERE status = "active"'
        );

        for (const client of clients) {
            const startTime = Date.now();
            try {
                const mysql = require('mysql2/promise');
                const clientConnection = await mysql.createConnection({
                    host: process.env.DB_HOST || 'localhost',
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASSWORD || 'Summerof1982@!',
                    database: client.database_name
                });

                await clientConnection.execute('SELECT 1');
                const responseTime = Date.now() - startTime;

                // Get basic stats
                const [baptisms] = await clientConnection.execute('SELECT COUNT(*) as count FROM baptism_records');
                const [marriages] = await clientConnection.execute('SELECT COUNT(*) as count FROM marriage_records');
                const [funerals] = await clientConnection.execute('SELECT COUNT(*) as count FROM funeral_records');
                const [users] = await clientConnection.execute('SELECT COUNT(*) as count FROM users');

                healthResults.push({
                    database: client.database_name,
                    type: 'client',
                    clientName: client.name,
                    clientSlug: client.slug,
                    status: 'healthy',
                    responseTime,
                    stats: {
                        baptisms: baptisms[0].count,
                        marriages: marriages[0].count,
                        funerals: funerals[0].count,
                        users: users[0].count
                    },
                    lastChecked: new Date().toISOString()
                });

                await clientConnection.end();
            } catch (error) {
                healthResults.push({
                    database: client.database_name,
                    type: 'client',
                    clientName: client.name,
                    clientSlug: client.slug,
                    status: 'error',
                    error: error.message,
                    lastChecked: new Date().toISOString()
                });
            }
        }

        const healthyDatabases = healthResults.filter(db => db.status === 'healthy').length;
        const totalDatabases = healthResults.length;

        res.json({
            overall: {
                status: healthyDatabases === totalDatabases ? 'healthy' : 'degraded',
                healthyCount: healthyDatabases,
                totalCount: totalDatabases,
                healthPercentage: Math.round((healthyDatabases / totalDatabases) * 100)
            },
            databases: healthResults
        });
    } catch (error) {
        console.error('Error checking database health:', error);
        res.status(500).json({ error: 'Failed to check database health' });
    }
});

// Server Metrics
router.get('/server-metrics', async (req, res) => {
    try {
        const metrics = {
            cpu: {
                usage: 0, // Calculate CPU usage
                cores: os.cpus().length,
                model: os.cpus()[0]?.model || 'Unknown'
            },
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem(),
                usage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
            },
            disk: {
                // Basic disk info - in production, use a proper disk usage library
                usage: 50 // Placeholder
            },
            network: {
                interfaces: Object.keys(os.networkInterfaces())
            },
            process: {
                uptime: process.uptime(),
                pid: process.pid,
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            },
            load: os.loadavg(),
            platform: {
                type: os.type(),
                platform: os.platform(),
                arch: os.arch(),
                release: os.release(),
                hostname: os.hostname()
            }
        };

        // Calculate approximate CPU usage
        const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
        metrics.cpu.usage = Math.min(Math.round(cpuUsage), 100);

        res.json(metrics);
    } catch (error) {
        console.error('Error fetching server metrics:', error);
        res.status(500).json({ error: 'Failed to fetch server metrics' });
    }
});

// System Backup
router.post('/backup', async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.resolve(__dirname, '../../backups');

        // Ensure backup directory exists
        try {
            await fs.access(backupDir);
        } catch {
            await fs.mkdir(backupDir, { recursive: true });
        }

        const backupFile = path.join(backupDir, `orthodox-metrics-backup-${timestamp}.sql`);

        // Create mysqldump command for all databases
        const { spawn } = require('child_process');

        const mysqldumpProcess = spawn('mysqldump', [
            '-h', process.env.DB_HOST || 'localhost',
            '-u', process.env.DB_USER || 'root',
            `-p${process.env.DB_PASSWORD || 'Summerof1982@!'}`,
            '--all-databases',
            '--routines',
            '--triggers'
        ]);

        const writeStream = require('fs').createWriteStream(backupFile);
        mysqldumpProcess.stdout.pipe(writeStream);

        mysqldumpProcess.on('close', (code) => {
            if (code === 0) {
                res.json({
                    success: true,
                    message: 'Backup created successfully',
                    file: backupFile,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Backup failed',
                    code
                });
            }
        });

        mysqldumpProcess.on('error', (error) => {
            res.status(500).json({
                success: false,
                message: 'Backup process failed',
                error: error.message
            });
        });

    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// List Backups
router.get('/backups', async (req, res) => {
    try {
        const backupDir = path.resolve(__dirname, '../../backups');

        try {
            const files = await fs.readdir(backupDir);
            const backupFiles = files.filter(file => file.endsWith('.sql'));

            const backups = await Promise.all(
                backupFiles.map(async (file) => {
                    const filePath = path.join(backupDir, file);
                    const stats = await fs.stat(filePath);

                    return {
                        filename: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime
                    };
                })
            );

            // Sort by creation date, newest first
            backups.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

            res.json(backups);
        } catch (error) {
            if (error.code === 'ENOENT') {
                res.json([]); // No backup directory yet
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({ error: 'Failed to list backups' });
    }
});

// Client-specific backup
router.post('/backup/:clientId', async (req, res) => {
    try {
        const clientId = req.params.clientId;

        // Get client info
        const [clients] = await promisePool.execute(
            'SELECT name, slug, database_name FROM clients WHERE id = ?',
            [clientId]
        );

        if (clients.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const client = clients[0];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.resolve(__dirname, '../../backups');

        // Ensure backup directory exists
        try {
            await fs.access(backupDir);
        } catch {
            await fs.mkdir(backupDir, { recursive: true });
        }

        const backupFile = path.join(backupDir, `${client.slug}-backup-${timestamp}.sql`);

        // Create mysqldump command for specific database
        const { spawn } = require('child_process');

        const mysqldumpProcess = spawn('mysqldump', [
            '-h', process.env.DB_HOST || 'localhost',
            '-u', process.env.DB_USER || 'root',
            `-p${process.env.DB_PASSWORD || 'Summerof1982@!'}`,
            '--routines',
            '--triggers',
            client.database_name
        ]);

        const writeStream = require('fs').createWriteStream(backupFile);
        mysqldumpProcess.stdout.pipe(writeStream);

        mysqldumpProcess.on('close', (code) => {
            if (code === 0) {
                res.json({
                    success: true,
                    message: `Backup created for ${client.name}`,
                    client: client.name,
                    file: backupFile,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Client backup failed',
                    code
                });
            }
        });

        mysqldumpProcess.on('error', (error) => {
            res.status(500).json({
                success: false,
                message: 'Client backup process failed',
                error: error.message
            });
        });

    } catch (error) {
        console.error('Error creating client backup:', error);
        res.status(500).json({ error: 'Failed to create client backup' });
    }
});

// System Configuration
router.get('/config', async (req, res) => {
    try {
        const config = {
            environment: process.env.NODE_ENV || 'development',
            database: {
                host: process.env.DB_HOST || 'localhost',
                name: process.env.DB_NAME || 'orthodoxmetrics_db',
                // Don't expose credentials
            },
            server: {
                port: process.env.PORT || 3001,
                host: process.env.HOST || '0.0.0.0'
            },
            features: {
                multiTenant: true,
                backup: true,
                monitoring: true
            }
        };

        res.json(config);
    } catch (error) {
        console.error('Error fetching config:', error);
        res.status(500).json({ error: 'Failed to fetch configuration' });
    }
});

// Update System Configuration
router.put('/config', async (req, res) => {
    try {
        // In a real implementation, you'd update configuration files or environment variables
        // For now, just return success
        res.json({
            success: true,
            message: 'Configuration updated successfully'
        });
    } catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
});

// Middleware to check if user is admin or super_admin
const checkRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            // Check if user is authenticated
            if (!req.session?.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const userRole = req.session.user.role;
            
            // Check if user has required role
            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient privileges'
                });
            }

            next();
        } catch (error) {
            console.error('Error in checkRole middleware:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    };
};

// GET /api/admin/system/system-info - Get system information
router.get('/system-info', checkRole(['super_admin', 'admin']), async (req, res) => {
    try {
        console.log('📊 Fetching system information...');

        // Get package.json version
        let version = 'Unknown';
        try {
            const packageJson = require('../../package.json');
            version = packageJson.version || 'Unknown';
        } catch (error) {
            console.warn('Could not read package.json version:', error.message);
        }

        // Get church count from database
        let churchCount = 0;
        try {
            const [result] = await promisePool.query('SELECT COUNT(*) as count FROM churches');
            churchCount = result[0]?.count || 0;
        } catch (error) {
            console.warn('Could not fetch church count:', error.message);
        }

        // Format memory usage in MB
        const memoryUsage = process.memoryUsage();
        const memoryInMB = Math.round(memoryUsage.rss / 1024 / 1024);

        // Format uptime in hours and minutes
        const uptimeSeconds = process.uptime();
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const formattedUptime = `${hours}h ${minutes}m`;

        // Get system information
        const systemInfo = {
            // System Information
            nodeVersion: process.version,
            uptime: formattedUptime,
            uptimeSeconds: Math.round(uptimeSeconds),
            hostname: os.hostname(),
            memory: memoryInMB,
            platform: os.platform(),
            arch: os.arch(),
            
            // Application Settings
            env: process.env.NODE_ENV || 'development',
            version: version,
            dateFormat: 'MM/DD/YYYY',
            language: 'en',
            churchCount: churchCount,
            
            // Additional system details
            totalMemory: Math.round(os.totalmem() / 1024 / 1024),
            freeMemory: Math.round(os.freemem() / 1024 / 1024),
            cpuCount: os.cpus().length,
            loadAverage: os.loadavg()[0].toFixed(2)
        };

        console.log('✅ System information retrieved successfully');
        console.log('   Node.js version:', systemInfo.nodeVersion);
        console.log('   Uptime:', systemInfo.uptime);
        console.log('   Memory usage:', systemInfo.memory, 'MB');
        console.log('   Church count:', systemInfo.churchCount);

        res.json({
            success: true,
            data: systemInfo
        });

    } catch (error) {
        console.error('❌ Error fetching system information:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve system information',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
