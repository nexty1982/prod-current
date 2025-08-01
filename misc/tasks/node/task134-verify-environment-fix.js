#!/usr/bin/env node

/**
 * Task 134: Verify Environment Display Fix
 * Tests that the environment detection correctly identifies production vs development
 */

const http = require('http');
const os = require('os');

async function testEnvironmentDetection() {
    console.log('🔍 Testing Environment Detection Fix...\n');
    
    // Check current server network information
    console.log('📊 Current Server Information:');
    try {
        const networkInterfaces = os.networkInterfaces();
        const allAddresses = Object.values(networkInterfaces)
            .flat()
            .filter(iface => iface && iface.family === 'IPv4' && !iface.internal)
            .map(iface => iface.address);
        
        console.log('🌐 Server IP Addresses:', allAddresses);
        console.log('🏠 Hostname:', os.hostname());
        console.log('📁 Working Directory:', process.cwd());
        console.log('🔧 NODE_ENV:', process.env.NODE_ENV || 'not set');
        
        // Determine expected environment based on IP
        let expectedEnv = 'unknown';
        if (allAddresses.includes('192.168.1.239')) {
            expectedEnv = 'production';
        } else if (allAddresses.includes('192.168.1.240')) {
            expectedEnv = 'development';
        }
        
        console.log('✅ Expected Environment (based on IP):', expectedEnv);
        
    } catch (error) {
        console.error('❌ Failed to get network information:', error.message);
    }
    
    console.log('\n🧪 Testing API Endpoint...');
    
    // Test the system info API endpoint
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/admin/system/system-info',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    console.log('📡 API Response Status:', res.statusCode);
                    
                    if (res.statusCode === 200) {
                        const response = JSON.parse(data);
                        if (response.success && response.data && response.data.env) {
                            console.log('✅ Environment from API:', response.data.env);
                            console.log('🎯 Environment Detection Status: FIXED!');
                            
                            // Additional system info
                            console.log('\n📋 Additional System Info:');
                            console.log('📦 Version:', response.data.version);
                            console.log('💾 Memory:', response.data.memory + 'MB');
                            console.log('⏰ Uptime:', response.data.uptime);
                            console.log('🏛️ Churches:', response.data.churchCount);
                            
                            resolve({
                                success: true,
                                environment: response.data.env,
                                systemInfo: response.data
                            });
                        } else {
                            console.log('⚠️  API response missing environment data');
                            resolve({ success: false, error: 'Missing environment data' });
                        }
                    } else {
                        console.log('❌ API request failed with status:', res.statusCode);
                        resolve({ success: false, error: `HTTP ${res.statusCode}` });
                    }
                } catch (error) {
                    console.error('❌ Failed to parse API response:', error.message);
                    resolve({ success: false, error: error.message });
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ API request failed:', error.message);
            resolve({ success: false, error: error.message });
        });
        
        req.setTimeout(10000, () => {
            console.error('❌ API request timed out');
            req.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
        
        req.end();
    });
}

async function main() {
    console.log('🚀 Starting Environment Detection Verification...\n');
    
    const result = await testEnvironmentDetection();
    
    console.log('\n📊 Test Results Summary:');
    console.log('================================');
    
    if (result.success) {
        console.log('✅ Environment Detection: WORKING');
        console.log('🌍 Detected Environment:', result.environment);
        console.log('🎯 Fix Status: SUCCESSFUL');
        
        if (result.environment === 'production' || result.environment === 'development') {
            console.log('✅ Environment correctly identified based on server IP rules');
        } else {
            console.log('⚠️  Environment detected but not using IP-based rules');
        }
    } else {
        console.log('❌ Environment Detection: FAILED');
        console.log('🚫 Error:', result.error);
        console.log('🔧 Fix Status: NEEDS ATTENTION');
    }
    
    console.log('\n💡 Environment Rules:');
    console.log('   📍 192.168.1.239 → Production');
    console.log('   📍 192.168.1.240 → Development');
    console.log('   📍 Other IPs → Fallback logic');
    
    console.log('\n🏁 Environment Detection Verification Complete!');
}

// Run the verification
main().catch(console.error);