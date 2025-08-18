#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

(async () => {
    try {
        console.log('🔍 Checking what\'s using port 3001...\n');
        
        // Check what's listening on port 3001
        console.log('1. Checking port 3001 listeners:');
        try {
            const { stdout: netstatOutput } = await execAsync('netstat -tlnp | grep :3001');
            console.log('✅ Port 3001 listeners:');
            console.log(netstatOutput);
        } catch (err) {
            if (err.code === 1 && err.stdout === '') {
                console.log('⚠️  No processes listening on port 3001');
            } else {
                console.log('❌ Error checking port 3001:', err.message);
            }
        }
        
        // Alternative check with ss command
        console.log('\n2. Alternative check with ss command:');
        try {
            const { stdout: ssOutput } = await execAsync('ss -tlnp | grep :3001');
            console.log('✅ Port 3001 (ss command):');
            console.log(ssOutput);
        } catch (err) {
            if (err.code === 1 && err.stdout === '') {
                console.log('⚠️  No processes listening on port 3001 (ss)');
            } else {
                console.log('❌ Error with ss command:', err.message);
            }
        }
        
        // Check PM2 processes
        console.log('\n3. Checking PM2 processes:');
        try {
            const { stdout: pm2Output } = await execAsync('pm2 list');
            console.log('✅ PM2 processes:');
            console.log(pm2Output);
        } catch (err) {
            console.log('❌ PM2 not available or error:', err.message);
        }
        
        // Check for Node.js processes
        console.log('\n4. Checking Node.js processes:');
        try {
            const { stdout: nodeProcesses } = await execAsync('ps aux | grep node | grep -v grep');
            console.log('✅ Node.js processes:');
            console.log(nodeProcesses);
        } catch (err) {
            console.log('❌ No Node.js processes found or error:', err.message);
        }
        
        // Check nginx configuration for port conflicts
        console.log('\n5. Checking nginx config for port 3001:');
        try {
            const { stdout: nginxGrep } = await execAsync('grep -r "listen.*3001" /etc/nginx/ 2>/dev/null || echo "No nginx configs listening on 3001"');
            console.log('✅ Nginx configs with port 3001:');
            console.log(nginxGrep);
        } catch (err) {
            console.log('❌ Error checking nginx configs:', err.message);
        }
        
        console.log('\n🎯 NEXT STEPS:');
        console.log('1. If Node.js backend is running on 3001 → Good! Remove nginx server block for 3001');
        console.log('2. If no process on 3001 → Start your backend server');
        console.log('3. If nginx config has port 3001 → Remove the conflicting server block');
        console.log('4. Then restart nginx: sudo systemctl restart nginx');
        
    } catch (err) {
        console.error('❌ Port check script failed:', err.message);
        process.exit(1);
    }
})(); 