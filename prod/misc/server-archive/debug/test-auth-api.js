#!/usr/bin/env node

const https = require('https');

console.log('🔍 Testing Authentication API...\n');

// Test the auth/check endpoint that we see working in the logs
const options = {
    hostname: 'orthodoxmetrics.com',
    port: 443,
    path: '/api/auth/check',
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'User-Agent': 'OrthodoxMetrics-Debug-Script'
    }
};

const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('\n📊 Response Body:');
        try {
            const parsed = JSON.parse(data);
            console.log(JSON.stringify(parsed, null, 2));
            
            if (parsed.authenticated) {
                console.log('\n✅ User is authenticated');
                console.log(`👤 User Role: ${parsed.user?.role || 'Unknown'}`);
                console.log(`📧 User Email: ${parsed.user?.email || 'Unknown'}`);
                
                const isAdmin = parsed.user?.role === 'admin';
                const isSuperAdmin = parsed.user?.role === 'super_admin';
                console.log(`🔐 Is Admin: ${isAdmin}`);
                console.log(`🔐 Is Super Admin: ${isSuperAdmin}`);
                console.log(`🎯 Should see Content/Services tabs: ${isAdmin || isSuperAdmin}`);
            } else {
                console.log('\n❌ User is NOT authenticated');
            }
        } catch (err) {
            console.log('Raw response:', data);
            console.error('Failed to parse JSON:', err.message);
        }
    });
});

req.on('error', (err) => {
    console.error('❌ Request failed:', err.message);
});

console.log('🌐 Making request to: https://orthodoxmetrics.com/api/auth/check');
console.log('⚠️  Note: This will test without cookies, so might show as unauthenticated\n');

req.end(); 