#!/usr/bin/env node
/**
 * Quick test script to verify OM_BUILD_EVENT_TOKEN is being read
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env
const envPath = join(__dirname, '..', 'server', '.env');
console.log('Looking for .env at:', envPath);

try {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
        console.error('Error loading .env:', result.error);
    } else {
        console.log('✅ .env loaded successfully');
    }
} catch (e) {
    console.error('Exception loading .env:', e.message);
}

// Check token
const token = process.env.OM_BUILD_EVENT_TOKEN;
if (token) {
    console.log('✅ OM_BUILD_EVENT_TOKEN found');
    console.log('   Length:', token.length);
    console.log('   First 8 chars:', token.substring(0, 8) + '...');
    console.log('   Has quotes:', token.startsWith('"') || token.startsWith("'"));
} else {
    console.log('❌ OM_BUILD_EVENT_TOKEN not found in process.env');
    
    // Try reading .env directly
    try {
        const envContent = readFileSync(envPath, 'utf8');
        const tokenLine = envContent.split('\n').find(line => line.startsWith('OM_BUILD_EVENT_TOKEN'));
        if (tokenLine) {
            console.log('Found in .env file:', tokenLine.substring(0, 50) + '...');
        } else {
            console.log('OM_BUILD_EVENT_TOKEN line not found in .env file');
        }
    } catch (e) {
        console.error('Could not read .env file:', e.message);
    }
}
