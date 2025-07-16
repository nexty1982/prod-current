// server/routes/admin/systemInfo.js
const express = require('express');
const os = require('os');
const path = require('path');
const { promisePool } = require('../../config/db');

const router = express.Router();

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

// GET /api/admin/system-info - Get system information
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
