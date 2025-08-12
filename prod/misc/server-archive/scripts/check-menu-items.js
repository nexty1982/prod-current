#!/usr/bin/env node

// Script to check what menu items currently exist in the database
const { promisePool } = require('../../config/db');

async function checkMenuItems() {
    try {
        console.log('🔍 Checking current menu items in database...\n');
        
        const [rows] = await promisePool.execute(`
            SELECT menu_key, title, path, is_system_required, display_order 
            FROM menu_items 
            ORDER BY display_order, title
        `);
        
        console.log('📋 Current menu items:');
        console.log('=' .repeat(80));
        rows.forEach((row, index) => {
            const required = row.is_system_required ? '🔒' : '  ';
            const path = row.path || 'no path';
            console.log(`${String(index + 1).padStart(2)}: ${required} ${row.menu_key.padEnd(25)} ${row.title.padEnd(30)} (${path})`);
        });
        
        console.log('=' .repeat(80));
        console.log(`Total: ${rows.length} menu items\n`);
        
        // Check permissions
        const [permissions] = await promisePool.execute(`
            SELECT COUNT(*) as count 
            FROM role_menu_permissions
        `);
        
        console.log(`🔐 Total role permissions: ${permissions[0].count}`);
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
        process.exit(1);
    }
}

checkMenuItems(); 