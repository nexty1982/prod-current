#!/usr/bin/env node

// Script to populate menu_items and role_menu_permissions tables with default data
const { promisePool } = require('../config/db');

const defaultMenuItems = [
    // Main Navigation
    { menu_key: 'dashboard', title: 'Dashboard', path: '/dashboard', icon: 'IconDashboard', parent_id: null, display_order: 1, is_system_required: true, description: 'Main dashboard view' },
    { menu_key: 'calendar', title: 'Calendar', path: '/calendar', icon: 'IconCalendar', parent_id: null, display_order: 2, is_system_required: false, description: 'Calendar and events' },
    { menu_key: 'notes', title: 'Notes', path: '/notes', icon: 'IconNotes', parent_id: null, display_order: 3, is_system_required: false, description: 'Notes and reminders' },
    
    // Records Management
    { menu_key: 'records', title: 'Records', path: null, icon: 'IconFiles', parent_id: null, display_order: 10, is_system_required: false, description: 'Church records management' },
    { menu_key: 'baptism-records', title: 'Baptism Records', path: '/baptism-records', icon: 'IconDroplet', parent_id: null, display_order: 11, is_system_required: false, description: 'Baptism records management' },
    { menu_key: 'marriage-records', title: 'Marriage Records', path: '/marriage-records', icon: 'IconHeart', parent_id: null, display_order: 12, is_system_required: false, description: 'Marriage records management' },
    { menu_key: 'funeral-records', title: 'Funeral Records', path: '/funeral-records', icon: 'IconCross', parent_id: null, display_order: 13, is_system_required: false, description: 'Funeral records management' },
    
    // Administration
    { menu_key: 'admin', title: 'Administration', path: null, icon: 'IconSettings', parent_id: null, display_order: 90, is_system_required: false, description: 'Administrative functions' },
    { menu_key: 'user-management', title: 'User Management', path: '/admin/users', icon: 'IconUsers', parent_id: null, display_order: 91, is_system_required: false, description: 'Manage system users' },
    { menu_key: 'menu-management', title: 'Menu Management', path: '/admin/menu-management', icon: 'IconMenu', parent_id: null, display_order: 92, is_system_required: false, description: 'Manage menu permissions' },
    { menu_key: 'menu-permissions', title: 'Menu Permissions', path: '/admin/menu-permissions', icon: 'IconLock', parent_id: null, display_order: 93, is_system_required: false, description: 'Advanced menu permission management' },
    { menu_key: 'admin-settings', title: 'Admin Settings', path: '/admin/settings', icon: 'IconSettingsAutomation', parent_id: null, display_order: 94, is_system_required: false, description: 'System configuration' },
    
    // Church Management
    { menu_key: 'church-management', title: 'Church Management', path: '/apps/church-management', icon: 'IconBuilding', parent_id: null, display_order: 20, is_system_required: false, description: 'Manage church information' },
    
    // Social Features
    { menu_key: 'social', title: 'Social', path: null, icon: 'IconUsers', parent_id: null, display_order: 80, is_system_required: false, description: 'Social features and community' },
    { menu_key: 'social-blog', title: 'Blog', path: '/social/blog', icon: 'IconArticle', parent_id: null, display_order: 81, is_system_required: false, description: 'Community blog' },
    { menu_key: 'social-friends', title: 'Friends', path: '/social/friends', icon: 'IconUsersFriends', parent_id: null, display_order: 82, is_system_required: false, description: 'Friends and connections' },
    { menu_key: 'social-chat', title: 'Chat', path: '/social/chat', icon: 'IconMessage', parent_id: null, display_order: 83, is_system_required: false, description: 'Community chat' },
    
    // System Required Items
    { menu_key: 'profile', title: 'Profile', path: '/profile', icon: 'IconUser', parent_id: null, display_order: 99, is_system_required: true, description: 'User profile' },
];

// Default role permissions - defines which roles can see which menu items
const rolePermissions = {
    'super_admin': ['dashboard', 'calendar', 'notes', 'records', 'baptism-records', 'marriage-records', 'funeral-records', 'admin', 'user-management', 'menu-management', 'menu-permissions', 'admin-settings', 'church-management', 'social', 'social-blog', 'social-friends', 'social-chat', 'profile'],
    'admin': ['dashboard', 'calendar', 'notes', 'records', 'baptism-records', 'marriage-records', 'funeral-records', 'user-management', 'church-management', 'social', 'social-blog', 'social-friends', 'social-chat', 'profile'],
    'manager': ['dashboard', 'calendar', 'notes', 'records', 'baptism-records', 'marriage-records', 'funeral-records', 'church-management', 'social', 'social-blog', 'social-friends', 'social-chat', 'profile'],
    'priest': ['dashboard', 'calendar', 'notes', 'records', 'baptism-records', 'marriage-records', 'funeral-records', 'church-management', 'social', 'social-blog', 'social-friends', 'social-chat', 'profile'],
    'deacon': ['dashboard', 'calendar', 'notes', 'records', 'baptism-records', 'marriage-records', 'funeral-records', 'social', 'social-blog', 'social-friends', 'social-chat', 'profile'],
    'user': ['dashboard', 'calendar', 'notes', 'social', 'social-blog', 'social-friends', 'social-chat', 'profile'],
    'viewer': ['dashboard', 'calendar', 'social', 'social-blog', 'profile']
};

async function populateMenuItems() {
    console.log('🎯 Starting menu items population...');
    
    try {
        // Clear existing data
        console.log('🧹 Clearing existing menu data...');
        await promisePool.execute('DELETE FROM role_menu_permissions');
        await promisePool.execute('DELETE FROM menu_items');
        
        // Reset auto-increment
        await promisePool.execute('ALTER TABLE menu_items AUTO_INCREMENT = 1');
        
        console.log('📝 Inserting menu items...');
        
        // Insert menu items
        for (const item of defaultMenuItems) {
            const [result] = await promisePool.execute(
                `INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [item.menu_key, item.title, item.path, item.icon, item.parent_id, item.display_order, item.is_system_required, item.description]
            );
            
            console.log(`   ✅ Added: ${item.title} (ID: ${result.insertId})`);
        }
        
        console.log('🔐 Setting up role permissions...');
        
        // Get all menu items to map menu_key to id
        const [menuItems] = await promisePool.execute('SELECT id, menu_key FROM menu_items');
        const menuKeyToId = {};
        menuItems.forEach(item => {
            menuKeyToId[item.menu_key] = item.id;
        });
        
        // Insert role permissions
        for (const [role, menuKeys] of Object.entries(rolePermissions)) {
            console.log(`   🔐 Setting permissions for role: ${role}`);
            
            for (const menuKey of menuKeys) {
                if (menuKeyToId[menuKey]) {
                    await promisePool.execute(
                        'INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) VALUES (?, ?, ?)',
                        [role, menuKeyToId[menuKey], true]
                    );
                } else {
                    console.log(`   ⚠️  Warning: Menu key '${menuKey}' not found for role '${role}'`);
                }
            }
        }
        
        // Verify results
        const [itemCount] = await promisePool.execute('SELECT COUNT(*) as count FROM menu_items');
        const [permissionCount] = await promisePool.execute('SELECT COUNT(*) as count FROM role_menu_permissions');
        
        console.log(`✅ Successfully populated menu system:`);
        console.log(`   📋 Menu items: ${itemCount[0].count}`);
        console.log(`   🔐 Role permissions: ${permissionCount[0].count}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error populating menu items:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    populateMenuItems()
        .then(() => {
            console.log('🎉 Menu population completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Menu population failed:', error);
            process.exit(1);
        });
}

module.exports = { populateMenuItems }; 