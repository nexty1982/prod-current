#!/usr/bin/env node

console.log('🔍 DEBUG: Session Configuration Values');
console.log('=====================================');

// Load environment variables
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const isHTTPS = process.env.HTTPS === 'true' || process.env.NODE_ENV === 'production';

console.log('Environment Variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  HTTPS:', process.env.HTTPS);
console.log('  SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'NOT SET');

console.log('\nCalculated Values:');
console.log('  isProduction:', isProduction);
console.log('  isHTTPS:', isHTTPS);

console.log('\nCookie Configuration:');
console.log('  secure:', isHTTPS);
console.log('  httpOnly: true');
console.log('  domain:', isProduction ? '.orthodoxmetrics.com' : undefined);

console.log('\n🎯 Expected vs Current:');
console.log('  We WANT secure: true for HTTPS');
console.log('  We HAVE secure:', isHTTPS);

if (!isHTTPS) {
    console.log('\n❌ PROBLEM FOUND:');
    console.log('  isHTTPS is false, so secure cookies are disabled!');
    console.log('  This is why browser cookies show Secure: false');
    
    console.log('\n🔧 SOLUTION:');
    console.log('  The environment variables are not being set properly');
    console.log('  PM2 might not be picking up HTTPS=true');
} else {
    console.log('\n✅ Configuration looks correct');
    console.log('  The issue might be browser cache or session persistence');
} 