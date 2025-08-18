#!/usr/bin/env node
// Check current status of frjames@ssppoc.org user
const { promisePool } = require('../../config/db');
const { getChurchDbConnection } = require('../utils/dbSwitcher');

async function checkFrjamesStatus() {
    console.log('🔍 Checking current status of frjames@ssppoc.org...\n');
    
    try {
        // Get user details
        const [users] = await promisePool.execute(
            'SELECT id, email, role, church_id, first_name, last_name, is_active FROM users WHERE email = ?',
            ['frjames@ssppoc.org']
        );
        
        if (users.length === 0) {
            console.log('❌ User frjames@ssppoc.org not found in database');
            return;
        }
        
        const user = users[0];
        console.log('👤 User Details:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Church ID: ${user.church_id || 'Not assigned'}`);
        console.log(`   Is Active: ${user.is_active}`);
        
        // Check if church exists
        if (user.church_id) {
            const [churches] = await promisePool.execute(
                'SELECT id, name, database_name, is_active FROM churches WHERE id = ?',
                [user.church_id]
            );
            
            if (churches.length > 0) {
                const church = churches[0];
                console.log(`\n🏛️ Assigned Church:`);
                console.log(`   Name: ${church.name}`);
                console.log(`   Database: ${church.database_name}`);
                console.log(`   Is Active: ${church.is_active}`);
            } else {
                console.log(`\n❌ Assigned church ID ${user.church_id} not found!`);
            }
        }
        
        // Check available churches
        console.log('\n🏛️ Available Churches:');
        const [allChurches] = await promisePool.execute(
            'SELECT id, name, database_name, is_active FROM churches WHERE is_active = 1 ORDER BY id'
        );
        
        if (allChurches.length === 0) {
            console.log('   ❌ No active churches found');
        } else {
            allChurches.forEach(church => {
                console.log(`   ${church.id}. ${church.name} (DB: ${church.database_name})`);
            });
        }
        
        // Check baptism records in the user's church database
        if (user.church_id) {
            const [churches] = await promisePool.execute(
                'SELECT database_name FROM churches WHERE id = ?',
                [user.church_id]
            );
            
            if (churches.length > 0) {
                const dbName = churches[0].database_name;
                console.log(`\n📋 Checking baptism records in ${dbName}...`);
                
                try {
                    // Try to connect to the church database
                    const churchDbPool = await getChurchDbConnection(dbName);
                    const [records] = await churchDbPool.execute('SELECT COUNT(*) as count FROM baptism_records');
                    console.log(`   Baptism records count: ${records[0].count}`);
                } catch (error) {
                    console.log(`   ❌ Error accessing church database: ${error.message}`);
                }
            }
        }
        
        console.log('\n🔧 Issues Found:');
        
        if (!user.church_id) {
            console.log('   ❌ User has no church assignment');
            console.log('   💡 Fix: Assign user to a church');
        }
        
        if (user.role === 'super_admin') {
            console.log('   ❌ User has super_admin role (may cause redirect issues)');
            console.log('   💡 Fix: Change role to "admin" if user should access church records');
        }
        
        if (!user.is_active) {
            console.log('   ❌ User account is not active');
            console.log('   💡 Fix: Set is_active = 1');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await promisePool.end();
    }
}

checkFrjamesStatus(); 