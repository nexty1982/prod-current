const express = require('express');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { promisePool } = require('../../config/db');
const { notificationService } = require('../notifications');
const router = express.Router();

const execAsync = promisify(exec);

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.session.user.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Super admin privileges required'
        });
    }

    next();
};

// Service definitions and their monitoring commands
const SERVICES = {
    'backend': {
        name: 'backend',
        displayName: 'Backend Server',
        description: 'Main Node.js application server',
        category: 'core',
        restartable: true,
        checkCommand: 'pm2 jlist',
        startCommand: `cd ${process.env.PROJECT_ROOT || '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod'} && if [ -f "ecosystem.config.js" ]; then pm2 start ecosystem.config.js --env production; else pm2 start server/index.js --name orthodox-backend --env-file .env.production --env production; fi`,
        stopCommand: 'pm2 stop orthodox-backend',
        restartCommand: 'pm2 restart orthodox-backend',
        reloadCommand: 'pm2 reload orthodox-backend',
        port: 3001
    },
    'frontend': {
        name: 'frontend',
        displayName: 'Frontend Server',
        description: 'React development server',
        category: 'frontend',
        restartable: true,
        checkCommand: 'pm2 jlist',
        startCommand: 'cd front-end && pm2 start "npm run dev" --name orthodox-frontend',
        stopCommand: 'pm2 stop orthodox-frontend',
        restartCommand: 'pm2 restart orthodox-frontend',
        port: 5173
    },
    'database': {
        name: 'database',
        displayName: 'MySQL Database',
        description: 'Main database server',
        category: 'database',
        restartable: false,
        checkCommand: 'systemctl is-active mysql || systemctl is-active mariadb',
        port: 3306
    },
    'nginx': {
        name: 'nginx',
        displayName: 'Nginx Web Server',
        description: 'Reverse proxy and web server',
        category: 'core',
        restartable: true,
        checkCommand: 'systemctl is-active nginx',
        startCommand: 'sudo systemctl start nginx',
        stopCommand: 'sudo systemctl stop nginx',
        restartCommand: 'sudo systemctl restart nginx',
        reloadCommand: 'sudo systemctl reload nginx'
    },
    'pm2': {
        name: 'pm2',
        displayName: 'PM2 Process Manager',
        description: 'Node.js process manager',
        category: 'core',
        restartable: true,
        checkCommand: 'pm2 ping',
        reloadCommand: 'pm2 reload all',
        restartCommand: 'pm2 restart all'
    },
    'redis': {
        name: 'redis',
        displayName: 'Redis Cache',
        description: 'In-memory data structure store',
        category: 'database',
        restartable: true,
        checkCommand: 'systemctl is-active redis || systemctl is-active redis-server',
        startCommand: 'sudo systemctl start redis',
        stopCommand: 'sudo systemctl stop redis',
        restartCommand: 'sudo systemctl restart redis',
        port: 6379
    }
};

// Helper function to parse PM2 process list
const parsePM2List = (stdout) => {
    try {
        const processes = JSON.parse(stdout);
        const pm2Services = {};
        
        processes.forEach(proc => {
            if (proc.name === 'orthodox-backend' || proc.name === 'backend' || proc.name === 'index') {
                pm2Services.backend = {
                    status: proc.pm2_env.status === 'online' ? 'running' : 'stopped',
                    pid: proc.pid,
                    uptime: proc.pm2_env.pm_uptime ? formatUptime(Date.now() - proc.pm2_env.pm_uptime) : null,
                    cpu: proc.monit?.cpu || 0,
                    memory: proc.monit?.memory ? (proc.monit.memory / 1024 / 1024) : 0,
                    lastRestart: proc.pm2_env.pm_uptime ? new Date(proc.pm2_env.pm_uptime).toISOString() : null
                };
            }
            
            if (proc.name === 'orthodox-frontend' || proc.name === 'frontend') {
                pm2Services.frontend = {
                    status: proc.pm2_env.status === 'online' ? 'running' : 'stopped',
                    pid: proc.pid,
                    uptime: proc.pm2_env.pm_uptime ? formatUptime(Date.now() - proc.pm2_env.pm_uptime) : null,
                    cpu: proc.monit?.cpu || 0,
                    memory: proc.monit?.memory ? (proc.monit.memory / 1024 / 1024) : 0,
                    lastRestart: proc.pm2_env.pm_uptime ? new Date(proc.pm2_env.pm_uptime).toISOString() : null
                };
            }
            

        });
        
        return pm2Services;
    } catch (error) {
        console.error('Error parsing PM2 list:', error);
        return {};
    }
};

// Helper function to format uptime
const formatUptime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
};

// Helper function to check if port is in use
const checkPort = async (port) => {
    try {
        const { stdout } = await execAsync(`netstat -tlnp 2>/dev/null | grep :${port} || ss -tlnp 2>/dev/null | grep :${port} || true`);
        return stdout.trim().length > 0;
    } catch (error) {
        return false;
    }
};

// Helper function to check systemd service status
const checkSystemdService = async (serviceName) => {
    try {
        const { stdout } = await execAsync(`systemctl is-active ${serviceName} 2>/dev/null || echo inactive`);
        const status = stdout.trim();
        return {
            status: status === 'active' ? 'running' : 'stopped',
            systemdStatus: status
        };
    } catch (error) {
        return { status: 'unknown', systemdStatus: 'unknown' };
    }
};

// GET /admin/services/status - Get status of all services
router.get('/status', requireSuperAdmin, async (req, res) => {
    try {
        console.log('🔍 Fetching service status...');
        
        const services = [];
        
        // Get PM2 services
        let pm2Services = {};
        try {
            const { stdout } = await execAsync('pm2 jlist 2>/dev/null || echo "[]"');
            pm2Services = parsePM2List(stdout);
        } catch (error) {
            console.warn('PM2 not available or error getting PM2 status:', error.message);
        }
        
        // Check each service
        for (const [serviceKey, serviceConfig] of Object.entries(SERVICES)) {
            let serviceStatus = {
                name: serviceConfig.name,
                displayName: serviceConfig.displayName,
                description: serviceConfig.description,
                category: serviceConfig.category,
                restartable: serviceConfig.restartable,
                status: 'unknown',
                port: serviceConfig.port
            };
            
            try {
                if (serviceConfig.category === 'core' && serviceKey === 'pm2') {
                    // Check PM2 itself
                    try {
                        await execAsync('pm2 ping 2>/dev/null');
                        serviceStatus.status = 'running';
                    } catch {
                        serviceStatus.status = 'stopped';
                    }
                } else if (pm2Services[serviceKey]) {
                    // Use PM2 data if available
                    serviceStatus = { ...serviceStatus, ...pm2Services[serviceKey] };
                } else if (serviceConfig.checkCommand.includes('systemctl')) {
                    // Check systemd services
                    const serviceName = serviceKey === 'database' ? 'mysql' : serviceKey;
                    const systemdResult = await checkSystemdService(serviceName);
                    serviceStatus.status = systemdResult.status;
                } else if (serviceConfig.port) {
                    // Check if port is in use
                    const portInUse = await checkPort(serviceConfig.port);
                    serviceStatus.status = portInUse ? 'running' : 'stopped';
                }
                
                // Additional database check
                if (serviceKey === 'database') {
                    try {
                        await promisePool.query('SELECT 1');
                        serviceStatus.status = 'running';
                    } catch (error) {
                        serviceStatus.status = 'error';
                    }
                }
                
            } catch (error) {
                console.warn(`Error checking service ${serviceKey}:`, error.message);
                serviceStatus.status = 'error';
            }
            
            services.push(serviceStatus);
        }
        
        console.log(`✅ Service status check complete: ${services.length} services checked`);
        res.json({ services });
        
    } catch (error) {
        console.error('❌ Error fetching service status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch service status',
            error: error.message
        });
    }
});

// GET /admin/services/health - Get overall system health
router.get('/health', requireSuperAdmin, async (req, res) => {
    try {
        console.log('🏥 Checking system health...');
        
        // Get service statuses (reuse the status endpoint logic)
        const statusResponse = await new Promise((resolve) => {
            const mockReq = { session: req.session };
            const mockRes = {
                json: (data) => resolve(data)
            };
            
            // Call the status endpoint internally
            router.stack[0].route.stack[0].handle(mockReq, mockRes, () => {});
        });
        
        const services = statusResponse.services || [];
        const runningServices = services.filter(s => s.status === 'running').length;
        const totalServices = services.length;
        const criticalServices = services
            .filter(s => s.category === 'core' && s.status !== 'running')
            .map(s => s.name);
        
        let overall = 'healthy';
        if (criticalServices.length > 0) {
            overall = 'critical';
        } else if (runningServices < totalServices * 0.8) {
            overall = 'warning';
        }
        
        const health = {
            overall,
            servicesUp: runningServices,
            servicesTotal: totalServices,
            lastUpdate: new Date().toISOString(),
            criticalServices
        };
        
        console.log(`✅ System health: ${overall} (${runningServices}/${totalServices} services up)`);
        res.json(health);
        
    } catch (error) {
        console.error('❌ Error checking system health:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check system health',
            error: error.message
        });
    }
});

// POST /admin/services/frontend/rebuild - Trigger frontend rebuild (MUST be before generic route)
router.post('/frontend/rebuild', requireSuperAdmin, async (req, res) => {
    try {
        console.log('🔨 Starting frontend rebuild with proper build flags...');
        
        // Use configurable paths for frontend build
        const frontendPath = process.env.FRONTEND_PATH || '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/front-end';
        const rebuildCommand = `cd ${frontendPath} && NODE_OPTIONS="--max-old-space-size=4096" npm run build`;
        
        console.log('Executing build command:', rebuildCommand);
        
        // Execute build and capture output
        const buildProcess = exec(rebuildCommand, { timeout: 300000 }, async (error, stdout, stderr) => {
            const userId = req.session.user?.id;
            
            if (error) {
                console.error('🚨 FRONTEND BUILD FAILED 🚨');
                console.error('❌ Build process failed:', error);
                console.error('Error details:', error.message);
                await logServiceAction('frontend', 'rebuild', false, req.session.user?.email, error.message);
                
                // Send system notification for build failure
                if (userId) {
                    try {
                        await notificationService.createNotification(
                            userId,
                            'system_alert',
                            'Frontend Build Failed',
                            `The frontend build process failed: ${error.message.slice(0, 200)}${error.message.length > 200 ? '...' : ''}`,
                            {
                                priority: 'high',
                                icon: '🚨',
                                actionUrl: '/admin/settings',
                                actionText: 'View Settings',
                                data: {
                                    buildCommand: rebuildCommand,
                                    errorDetails: error.message,
                                    timestamp: new Date().toISOString()
                                }
                            }
                        );
                        console.log('📢 Build failure notification sent to user');
                    } catch (notifError) {
                        console.error('Failed to send build failure notification:', notifError);
                    }
                }
            } else {
                console.log('🎉 FRONTEND BUILD COMPLETED SUCCESSFULLY 🎉');
                console.log('✅ Build process completed successfully');
                console.log('📊 Build output summary:', stdout.slice(-500)); // Last 500 chars
                console.log('📁 Frontend assets ready at: /front-end/dist/');
                await logServiceAction('frontend', 'rebuild', true, req.session.user?.email, 'Build completed successfully');
                
                // Send system notification for build success
                if (userId) {
                    try {
                        await notificationService.createNotification(
                            userId,
                            'system_alert',
                            'Frontend Build Completed',
                            'The frontend has been successfully rebuilt and is now live with your latest changes.',
                            {
                                priority: 'normal',
                                icon: '🎉',
                                actionUrl: '/',
                                actionText: 'View Site',
                                data: {
                                    buildCommand: rebuildCommand,
                                    buildSummary: stdout.slice(-200),
                                    timestamp: new Date().toISOString()
                                }
                            }
                        );
                        console.log('📢 Build success notification sent to user');
                    } catch (notifError) {
                        console.error('Failed to send build success notification:', notifError);
                    }
                }
            }
        });
        
        // Log the action immediately
        await logServiceAction('frontend', 'rebuild', true, req.session.user.email, 'Build started with NODE_OPTIONS="--max-old-space-size=4096"');
        
        // Send system notification for build start
        const userId = req.session.user?.id;
        if (userId) {
            try {
                await notificationService.createNotification(
                    userId,
                    'system_alert',
                    'Frontend Build Started',
                    'The frontend rebuild process has been initiated. You will receive another notification when it completes.',
                    {
                        priority: 'normal',
                        icon: '🔧',
                        actionUrl: '/admin/settings',
                        actionText: 'View Progress',
                        data: {
                            buildCommand: rebuildCommand,
                            timestamp: new Date().toISOString()
                        }
                    }
                );
                console.log('📢 Build start notification sent to user');
            } catch (notifError) {
                console.error('Failed to send build start notification:', notifError);
            }
        }
        
        console.log('✅ Frontend rebuild started with memory optimization');
        res.json({
            success: true,
            message: 'Frontend rebuild started with NODE_OPTIONS="--max-old-space-size=4096"',
            buildId: Date.now(),
            command: 'NODE_OPTIONS="--max-old-space-size=4096" npm run build'
        });
        
    } catch (error) {
        console.error('❌ Error starting frontend rebuild:', error);
        
        await logServiceAction('frontend', 'rebuild', false, req.session.user.email, error.message);
        
        res.status(500).json({
            success: false,
            message: 'Failed to start frontend rebuild',
            error: error.message
        });
    }
});

// POST /admin/services/:service/:action - Control a service
router.post('/:service/:action', requireSuperAdmin, async (req, res) => {
    const { service: serviceName, action } = req.params;
    
    try {
        console.log(`🎮 Service control: ${action} ${serviceName}`);
        
        const serviceConfig = SERVICES[serviceName];
        if (!serviceConfig) {
            return res.status(404).json({
                success: false,
                message: `Service ${serviceName} not found`
            });
        }
        
        if (!serviceConfig.restartable) {
            return res.status(400).json({
                success: false,
                message: `Service ${serviceName} is not controllable via this interface`
            });
        }
        
        let command;
        switch (action) {
            case 'start':
                command = serviceConfig.startCommand;
                break;
            case 'stop':
                command = serviceConfig.stopCommand;
                break;
            case 'restart':
                command = serviceConfig.restartCommand;
                break;
            case 'reload':
                command = serviceConfig.reloadCommand;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: `Invalid action: ${action}`
                });
        }
        
        if (!command) {
            return res.status(400).json({
                success: false,
                message: `Action ${action} not supported for service ${serviceName}`
            });
        }
        
        // Execute the command
        console.log(`Executing: ${command}`);
        const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
        
        // Log the action
        await logServiceAction(serviceName, action, true, req.session.user.email);
        
        console.log(`✅ Successfully executed ${action} on ${serviceName}`);
        res.json({
            success: true,
            message: `Successfully ${action}ed ${serviceName}`,
            output: stdout,
            error: stderr
        });
        
    } catch (error) {
        console.error(`❌ Error ${action}ing ${serviceName}:`, error);
        
        // Log the failed action
        await logServiceAction(serviceName, action, false, req.session.user.email, error.message);
        
        res.status(500).json({
            success: false,
            message: `Failed to ${action} ${serviceName}`,
            error: error.message
        });
    }
});

// GET /admin/services/actions/recent - Get recent service actions
router.get('/actions/recent', requireSuperAdmin, async (req, res) => {
    try {
        const [actions] = await promisePool.query(`
            SELECT service, action, timestamp, success, message, user_email
            FROM service_actions 
            ORDER BY timestamp DESC 
            LIMIT 50
        `);
        
        res.json({ actions });
        
    } catch (error) {
        console.error('Error fetching recent actions:', error);
        res.json({ actions: [] }); // Return empty array if table doesn't exist
    }
});

// Helper function to log service actions
const logServiceAction = async (service, action, success, userEmail, message = null) => {
    try {
        await promisePool.query(`
            INSERT INTO service_actions (service, action, timestamp, success, message, user_email)
            VALUES (?, ?, NOW(), ?, ?, ?)
        `, [service, action, success, message, userEmail]);
    } catch (error) {
        console.warn('Failed to log service action:', error.message);
        // Continue execution even if logging fails
    }
};

// Create service_actions table if it doesn't exist
const initializeServiceActionsTable = async () => {
    try {
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS service_actions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service VARCHAR(50) NOT NULL,
                action VARCHAR(20) NOT NULL,
                timestamp DATETIME NOT NULL,
                success BOOLEAN NOT NULL,
                message TEXT NULL,
                user_email VARCHAR(255) NULL,
                INDEX idx_timestamp (timestamp),
                INDEX idx_service (service)
            )
        `);
        console.log('✅ Service actions table initialized');
    } catch (error) {
        console.warn('⚠️ Failed to initialize service actions table:', error.message);
    }
};

// Initialize the table when the module loads
initializeServiceActionsTable();

// GET /admin/services/:service/logs - Get service logs
router.get('/:service/logs', requireSuperAdmin, async (req, res) => {
    const { service: serviceName } = req.params;
    const { lines = 100 } = req.query;
    
    try {
        console.log(`📋 Fetching logs for service: ${serviceName}`);
        
        let command;
        if (serviceName === 'pm2') {
            // Get logs for all PM2 processes
            command = `pm2 logs --lines ${lines} --nostream`;
        } else if (serviceName === 'nginx') {
            // Get nginx error logs
            command = `tail -n ${lines} /var/log/nginx/error.log 2>/dev/null || echo "No nginx logs found"`;
        } else if (serviceName === 'database' || serviceName === 'mysql') {
            // Get MySQL/MariaDB logs
            command = `tail -n ${lines} /var/log/mysql/error.log 2>/dev/null || tail -n ${lines} /var/log/mariadb/mariadb.log 2>/dev/null || echo "No database logs found"`;
        } else {
            // For PM2 managed services, get specific process logs
            const serviceConfig = SERVICES[serviceName];
            if (serviceConfig && serviceConfig.category !== 'database') {
                command = `pm2 logs ${serviceName === 'backend' ? 'orthodox-backend' : serviceName} --lines ${lines} --nostream`;
            } else {
                return res.status(400).json({
                    success: false,
                    message: `Log viewing not supported for service: ${serviceName}`
                });
            }
        }
        
        const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
        
        // Process the logs to make them more readable
        let logs = stdout || stderr || 'No logs available';
        
        // Split into lines and add timestamps if missing
        const logLines = logs.split('\n')
            .filter(line => line.trim().length > 0)
            .slice(-lines) // Ensure we don't exceed requested lines
            .map(line => {
                // If line doesn't start with a timestamp, add one
                if (!/^\d{4}-\d{2}-\d{2}/.test(line) && !/^\w{3}\s+\d{2}/.test(line)) {
                    return `${new Date().toISOString()} | ${line}`;
                }
                return line;
            });
        
        res.json({
            success: true,
            service: serviceName,
            logs: logLines,
            totalLines: logLines.length,
            command: command
        });
        
    } catch (error) {
        console.error(`❌ Error fetching logs for ${serviceName}:`, error);
        res.status(500).json({
            success: false,
            message: `Failed to fetch logs for ${serviceName}`,
            error: error.message
        });
    }
});

// GET /admin/services/pm2/processes - Get detailed PM2 process info
router.get('/pm2/processes', requireSuperAdmin, async (req, res) => {
    try {
        console.log('📊 Fetching detailed PM2 process information...');
        
        const { stdout } = await execAsync('pm2 jlist');
        const processes = JSON.parse(stdout);
        
        const detailedProcesses = processes.map(proc => ({
            name: proc.name,
            pid: proc.pid,
            status: proc.pm2_env.status,
            cpu: proc.monit?.cpu || 0,
            memory: proc.monit?.memory ? Math.round(proc.monit.memory / 1024 / 1024) : 0,
            uptime: proc.pm2_env.pm_uptime ? formatUptime(Date.now() - proc.pm2_env.pm_uptime) : 'N/A',
            restarts: proc.pm2_env.restart_time || 0,
            script: proc.pm2_env.pm_exec_path,
            args: proc.pm2_env.args || [],
            env: {
                NODE_ENV: proc.pm2_env.NODE_ENV,
                PORT: proc.pm2_env.PORT
            },
            logs: {
                out: proc.pm2_env.pm_out_log_path,
                error: proc.pm2_env.pm_err_log_path
            }
        }));
        
        res.json({
            success: true,
            processes: detailedProcesses,
            totalProcesses: processes.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching PM2 processes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch PM2 process information',
            error: error.message
        });
    }
});

module.exports = router; 