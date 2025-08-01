#!/usr/bin/env node

// Script to check current menu items and add all missing ones
const { promisePool } = require('../server/config/db');

async function checkAndPopulateMenuItems() {
    try {
        console.log('🔍 Checking current menu items in database...\n');
        
        // Check current items
        const [existingRows] = await promisePool.execute(`
            SELECT menu_key, title, path, is_system_required, display_order 
            FROM menu_items 
            ORDER BY display_order, title
        `);
        
        console.log('📋 Current menu items in database:');
        console.log('=' .repeat(80));
        existingRows.forEach((row, index) => {
            const required = row.is_system_required ? '🔒' : '  ';
            const path = row.path || 'no path';
            console.log(`${String(index + 1).padStart(2)}: ${required} ${row.menu_key.padEnd(30)} ${row.title.padEnd(35)} (${path})`);
        });
        console.log('=' .repeat(80));
        console.log(`Current total: ${existingRows.length} menu items\n`);
        
        // Complete list of all menu items that should exist based on frontend routes
        const allMenuItems = [
            // Main Navigation
            { menu_key: 'dashboard', title: 'Dashboard', path: '/dashboard', icon: 'IconDashboard', parent_id: null, display_order: 1, is_system_required: true, description: 'Main dashboard view' },
            { menu_key: 'orthodox-metrics', title: 'Orthodox Metrics', path: '/orthodox-metrics', icon: 'IconChartBar', parent_id: null, display_order: 2, is_system_required: false, description: 'Orthodox Metrics dashboard' },
            { menu_key: 'calendar', title: 'Calendar', path: '/calendar', icon: 'IconCalendar', parent_id: null, display_order: 3, is_system_required: false, description: 'Calendar and events' },
            { menu_key: 'liturgical-calendar', title: 'Liturgical Calendar', path: '/calendar/liturgical', icon: 'IconCalendarEvent', parent_id: null, display_order: 4, is_system_required: false, description: 'Orthodox liturgical calendar' },
            { menu_key: 'notes', title: 'Notes', path: '/notes', icon: 'IconNotes', parent_id: null, display_order: 5, is_system_required: false, description: 'Notes and reminders' },
            { menu_key: 'chat', title: 'Chat', path: '/chat', icon: 'IconMessage', parent_id: null, display_order: 6, is_system_required: false, description: 'Chat application' },
            { menu_key: 'contacts', title: 'Contacts', path: '/contacts', icon: 'IconAddressBook', parent_id: null, display_order: 7, is_system_required: false, description: 'Contact management' },
            { menu_key: 'tickets', title: 'Tickets', path: '/tickets', icon: 'IconTicket', parent_id: null, display_order: 8, is_system_required: false, description: 'Support tickets' },
            { menu_key: 'kanban', title: 'Kanban Board', path: '/kanban', icon: 'IconColumns', parent_id: null, display_order: 9, is_system_required: false, description: 'Project management board' },
            
            // Records Management
            { menu_key: 'records', title: 'Records', path: null, icon: 'IconFiles', parent_id: null, display_order: 20, is_system_required: false, description: 'Church records management' },
            { menu_key: 'baptism-records', title: 'Baptism Records', path: '/baptism-records', icon: 'IconDroplet', parent_id: null, display_order: 21, is_system_required: false, description: 'Baptism records management' },
            { menu_key: 'marriage-records', title: 'Marriage Records', path: '/marriage-records', icon: 'IconHeart', parent_id: null, display_order: 22, is_system_required: false, description: 'Marriage records management' },
            { menu_key: 'funeral-records', title: 'Funeral Records', path: '/funeral-records', icon: 'IconCross', parent_id: null, display_order: 23, is_system_required: false, description: 'Funeral records management' },
            { menu_key: 'unified-records', title: 'Unified Records', path: '/records/unified', icon: 'IconDatabase', parent_id: null, display_order: 24, is_system_required: false, description: 'Unified records interface' },
            { menu_key: 'church-records', title: 'Church Records', path: '/records/church', icon: 'IconBuilding', parent_id: null, display_order: 25, is_system_required: false, description: 'Church-specific records' },
            { menu_key: 'records-management', title: 'Records Management', path: '/apps/records', icon: 'IconFolderOpen', parent_id: null, display_order: 26, is_system_required: false, description: 'Advanced records management' },
            
            // Certificates
            { menu_key: 'certificates', title: 'Certificates', path: null, icon: 'IconCertificate', parent_id: null, display_order: 30, is_system_required: false, description: 'Certificate management' },
            { menu_key: 'baptism-certificates', title: 'Baptism Certificates', path: '/certificates/baptism', icon: 'IconDroplet', parent_id: null, display_order: 31, is_system_required: false, description: 'Generate baptism certificates' },
            { menu_key: 'marriage-certificates', title: 'Marriage Certificates', path: '/certificates/marriage', icon: 'IconHeart', parent_id: null, display_order: 32, is_system_required: false, description: 'Generate marriage certificates' },
            { menu_key: 'funeral-certificates', title: 'Funeral Certificates', path: '/certificates/funeral', icon: 'IconCross', parent_id: null, display_order: 33, is_system_required: false, description: 'Generate funeral certificates' },
            
            // Business & Billing
            { menu_key: 'billing', title: 'Billing', path: null, icon: 'IconCreditCard', parent_id: null, display_order: 40, is_system_required: false, description: 'Billing and invoicing' },
            { menu_key: 'invoices', title: 'Invoices', path: '/billing/invoices', icon: 'IconFileInvoice', parent_id: null, display_order: 41, is_system_required: false, description: 'Invoice management' },
            { menu_key: 'invoice-list', title: 'Invoice List', path: '/invoices/list', icon: 'IconList', parent_id: null, display_order: 42, is_system_required: false, description: 'List all invoices' },
            { menu_key: 'invoice-create', title: 'Create Invoice', path: '/invoices/create', icon: 'IconPlus', parent_id: null, display_order: 43, is_system_required: false, description: 'Create new invoice' },
            { menu_key: 'payments', title: 'Payments', path: '/billing/payments', icon: 'IconCash', parent_id: null, display_order: 44, is_system_required: false, description: 'Payment tracking' },
            { menu_key: 'ecommerce', title: 'E-Commerce', path: '/ecommerce', icon: 'IconShoppingCart', parent_id: null, display_order: 45, is_system_required: false, description: 'E-commerce management' },
            
            // Church Management
            { menu_key: 'church-management', title: 'Church Management', path: '/apps/church-management', icon: 'IconBuilding', parent_id: null, display_order: 50, is_system_required: false, description: 'Manage church information' },
            { menu_key: 'church-list', title: 'Church List', path: '/church/list', icon: 'IconBuildingChurch', parent_id: null, display_order: 51, is_system_required: false, description: 'List of churches' },
            { menu_key: 'church-setup', title: 'Church Setup', path: '/church/setup', icon: 'IconSettings', parent_id: null, display_order: 52, is_system_required: false, description: 'Church setup wizard' },
            
            // Client Management
            { menu_key: 'client-management', title: 'Client Management', path: '/clients', icon: 'IconUsers', parent_id: null, display_order: 55, is_system_required: false, description: 'Multi-tenant client management' },
            { menu_key: 'add-client', title: 'Add Client', path: '/clients/add', icon: 'IconUserPlus', parent_id: null, display_order: 56, is_system_required: false, description: 'Add new client' },
            
            // OCR & Document Processing
            { menu_key: 'ocr', title: 'OCR Processing', path: null, icon: 'IconScan', parent_id: null, display_order: 60, is_system_required: false, description: 'Document scanning and OCR' },
            { menu_key: 'ocr-upload', title: 'OCR Upload', path: '/ocr/upload', icon: 'IconUpload', parent_id: null, display_order: 61, is_system_required: false, description: 'Upload documents for OCR' },
            { menu_key: 'ocr-field-mapping', title: 'OCR Field Mapping', path: '/ocr/field-mapping', icon: 'IconMap', parent_id: null, display_order: 62, is_system_required: false, description: 'Configure OCR field mapping' },
            
            // Social Features
            { menu_key: 'social', title: 'Social', path: null, icon: 'IconUsers', parent_id: null, display_order: 70, is_system_required: false, description: 'Social features and community' },
            { menu_key: 'social-blog', title: 'Blog', path: '/social/blog', icon: 'IconArticle', parent_id: null, display_order: 71, is_system_required: false, description: 'Community blog' },
            { menu_key: 'social-friends', title: 'Friends', path: '/social/friends', icon: 'IconUsersFriends', parent_id: null, display_order: 72, is_system_required: false, description: 'Friends and connections' },
            { menu_key: 'social-chat', title: 'Social Chat', path: '/social/chat', icon: 'IconMessage', parent_id: null, display_order: 73, is_system_required: false, description: 'Community chat' },
            { menu_key: 'social-notifications', title: 'Social Notifications', path: '/social/notifications', icon: 'IconBell', parent_id: null, display_order: 74, is_system_required: false, description: 'Social notifications center' },
            
            // User Profile & Settings
            { menu_key: 'user-profile', title: 'User Profile', path: '/user/profile', icon: 'IconUser', parent_id: null, display_order: 80, is_system_required: false, description: 'User profile management' },
            { menu_key: 'followers', title: 'Followers', path: '/user/followers', icon: 'IconUserCheck', parent_id: null, display_order: 81, is_system_required: false, description: 'User followers' },
            { menu_key: 'friends', title: 'Friends', path: '/user/friends', icon: 'IconUsers', parent_id: null, display_order: 82, is_system_required: false, description: 'User friends' },
            { menu_key: 'gallery', title: 'Gallery', path: '/user/gallery', icon: 'IconPhoto', parent_id: null, display_order: 83, is_system_required: false, description: 'User photo gallery' },
            { menu_key: 'email', title: 'Email', path: '/email', icon: 'IconMail', parent_id: null, display_order: 84, is_system_required: false, description: 'Email interface' },
            
            // Orthodox Features
            { menu_key: 'orthodox-headlines', title: 'Orthodox Headlines', path: '/orthodox-headlines', icon: 'IconNews', parent_id: null, display_order: 85, is_system_required: false, description: 'Orthodox news and headlines' },
            
            // Administration
            { menu_key: 'admin', title: 'Administration', path: null, icon: 'IconSettings', parent_id: null, display_order: 90, is_system_required: false, description: 'Administrative functions' },
            { menu_key: 'user-management', title: 'User Management', path: '/admin/users', icon: 'IconUsers', parent_id: null, display_order: 91, is_system_required: false, description: 'Manage system users' },
            { menu_key: 'role-management', title: 'Role Management', path: '/admin/roles', icon: 'IconShield', parent_id: null, display_order: 92, is_system_required: false, description: 'Manage user roles' },
            { menu_key: 'menu-management', title: 'Menu Management', path: '/admin/menu-management', icon: 'IconMenu', parent_id: null, display_order: 93, is_system_required: false, description: 'Manage menu permissions' },
            { menu_key: 'menu-permissions', title: 'Menu Permissions', path: '/admin/menu-permissions', icon: 'IconLock', parent_id: null, display_order: 94, is_system_required: false, description: 'Advanced menu permission management' },
            { menu_key: 'admin-settings', title: 'Admin Settings', path: '/admin/settings', icon: 'IconSettingsAutomation', parent_id: null, display_order: 95, is_system_required: false, description: 'System configuration' },
            { menu_key: 'session-management', title: 'Session Management', path: '/admin/sessions', icon: 'IconClock', parent_id: null, display_order: 96, is_system_required: false, description: 'Manage user sessions' },
            { menu_key: 'activity-logs', title: 'Activity Logs', path: '/admin/activity-logs', icon: 'IconHistory', parent_id: null, display_order: 97, is_system_required: false, description: 'System activity logs' },
            { menu_key: 'system-logs', title: 'System Logs', path: '/admin/logs', icon: 'IconFileText', parent_id: null, display_order: 98, is_system_required: false, description: 'System logs and monitoring' },
            
            // Developer Tools (Super Admin Only)
            { menu_key: 'developer-tools', title: 'Developer Tools', path: null, icon: 'IconCode', parent_id: null, display_order: 100, is_system_required: false, description: 'Developer and system tools' },
            { menu_key: 'site-structure', title: 'Site Structure', path: '/dev/site-structure', icon: 'IconSitemap', parent_id: null, display_order: 101, is_system_required: false, description: 'Site structure visualizer' },
            { menu_key: 'script-runner', title: 'Script Runner', path: '/admin/script-runner', icon: 'IconTerminal', parent_id: null, display_order: 102, is_system_required: false, description: 'Run administrative scripts' },
            { menu_key: 'jit-terminal', title: 'JIT Terminal', path: '/admin/jit-terminal', icon: 'IconTerminal', parent_id: null, display_order: 103, is_system_required: false, description: 'Just-in-time terminal access' },
            { menu_key: 'ai-admin', title: 'AI Admin Panel', path: '/admin/ai', icon: 'IconBrain', parent_id: null, display_order: 104, is_system_required: false, description: 'AI administration panel' },
            { menu_key: 'super-admin-dashboard', title: 'Super Admin Dashboard', path: '/admin/super-dashboard', icon: 'IconDashboard', parent_id: null, display_order: 105, is_system_required: false, description: 'Super administrator dashboard' },
            
            // System Required Items
            { menu_key: 'profile', title: 'Profile', path: '/profile', icon: 'IconUser', parent_id: null, display_order: 199, is_system_required: true, description: 'User profile' },
            { menu_key: 'logout', title: 'Logout', path: '/logout', icon: 'IconLogout', parent_id: null, display_order: 200, is_system_required: true, description: 'Logout from system' },
        ];
        
        // Get existing menu keys
        const existingKeys = new Set(existingRows.map(row => row.menu_key));
        
        // Find missing items
        const missingItems = allMenuItems.filter(item => !existingKeys.has(item.menu_key));
        
        console.log(`🔍 Analysis:`);
        console.log(`   • Existing items: ${existingRows.length}`);
        console.log(`   • Should have: ${allMenuItems.length}`);
        console.log(`   • Missing items: ${missingItems.length}\n`);
        
        if (missingItems.length === 0) {
            console.log('✅ All menu items are already present in the database!');
            return;
        }
        
        console.log('📝 Missing menu items that will be added:');
        console.log('=' .repeat(80));
        missingItems.forEach((item, index) => {
            const path = item.path || 'no path';
            console.log(`${String(index + 1).padStart(2)}: ${item.menu_key.padEnd(30)} ${item.title.padEnd(35)} (${path})`);
        });
        console.log('=' .repeat(80));
        
        // Add missing items
        console.log('\n🔄 Adding missing menu items to database...');
        
        await promisePool.execute('START TRANSACTION');
        
        try {
            for (const item of missingItems) {
                const [result] = await promisePool.execute(
                    `INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [item.menu_key, item.title, item.path, item.icon, item.parent_id, item.display_order, item.is_system_required, item.description]
                );
                console.log(`   ✅ Added: ${item.title} (ID: ${result.insertId})`);
            }
            
            await promisePool.execute('COMMIT');
            console.log(`\n✅ Successfully added ${missingItems.length} new menu items!`);
            
        } catch (error) {
            await promisePool.execute('ROLLBACK');
            throw error;
        }
        
        // Now add default permissions for new items
        console.log('\n🔐 Setting up permissions for new menu items...');
        
        // Default role permissions
        const rolePermissions = {
            'super_admin': '*', // All items
            'admin': ['dashboard', 'orthodox-metrics', 'calendar', 'liturgical-calendar', 'notes', 'chat', 'contacts', 'tickets', 'kanban', 'records', 'baptism-records', 'marriage-records', 'funeral-records', 'unified-records', 'church-records', 'records-management', 'certificates', 'baptism-certificates', 'marriage-certificates', 'funeral-certificates', 'billing', 'invoices', 'invoice-list', 'invoice-create', 'payments', 'ecommerce', 'church-management', 'church-list', 'church-setup', 'client-management', 'add-client', 'ocr', 'ocr-upload', 'ocr-field-mapping', 'social', 'social-blog', 'social-friends', 'social-chat', 'social-notifications', 'user-profile', 'followers', 'friends', 'gallery', 'email', 'orthodox-headlines', 'user-management', 'role-management', 'menu-permissions', 'admin-settings', 'session-management', 'activity-logs', 'system-logs', 'profile', 'logout'],
            'manager': ['dashboard', 'orthodox-metrics', 'calendar', 'liturgical-calendar', 'notes', 'chat', 'contacts', 'tickets', 'kanban', 'records', 'baptism-records', 'marriage-records', 'funeral-records', 'unified-records', 'church-records', 'records-management', 'certificates', 'baptism-certificates', 'marriage-certificates', 'funeral-certificates', 'church-management', 'church-list', 'church-setup', 'ocr', 'ocr-upload', 'ocr-field-mapping', 'social', 'social-blog', 'social-friends', 'social-chat', 'social-notifications', 'user-profile', 'followers', 'friends', 'gallery', 'email', 'orthodox-headlines', 'profile', 'logout'],
            'priest': ['dashboard', 'orthodox-metrics', 'calendar', 'liturgical-calendar', 'notes', 'chat', 'contacts', 'records', 'baptism-records', 'marriage-records', 'funeral-records', 'unified-records', 'church-records', 'certificates', 'baptism-certificates', 'marriage-certificates', 'funeral-certificates', 'church-management', 'social', 'social-blog', 'social-friends', 'social-chat', 'social-notifications', 'user-profile', 'followers', 'friends', 'gallery', 'email', 'orthodox-headlines', 'profile', 'logout'],
            'deacon': ['dashboard', 'orthodox-metrics', 'calendar', 'liturgical-calendar', 'notes', 'chat', 'contacts', 'records', 'baptism-records', 'marriage-records', 'funeral-records', 'unified-records', 'church-records', 'certificates', 'baptism-certificates', 'marriage-certificates', 'funeral-certificates', 'social', 'social-blog', 'social-friends', 'social-chat', 'social-notifications', 'user-profile', 'followers', 'friends', 'gallery', 'email', 'orthodox-headlines', 'profile', 'logout'],
            'user': ['dashboard', 'calendar', 'liturgical-calendar', 'notes', 'chat', 'contacts', 'social', 'social-blog', 'social-friends', 'social-chat', 'social-notifications', 'user-profile', 'followers', 'friends', 'gallery', 'email', 'orthodox-headlines', 'profile', 'logout'],
            'viewer': ['dashboard', 'calendar', 'liturgical-calendar', 'social', 'social-blog', 'user-profile', 'orthodox-headlines', 'profile', 'logout']
        };
        
        // Get all menu items to create permission mapping
        const [allItems] = await promisePool.execute('SELECT id, menu_key FROM menu_items');
        const menuKeyToId = {};
        allItems.forEach(item => {
            menuKeyToId[item.menu_key] = item.id;
        });
        
        // Add permissions for new items only
        const newItemKeys = new Set(missingItems.map(item => item.menu_key));
        
        await promisePool.execute('START TRANSACTION');
        
        try {
            for (const [role, allowedKeys] of Object.entries(rolePermissions)) {
                const itemsToAdd = allowedKeys === '*' ? 
                    missingItems.map(item => item.menu_key) : 
                    allowedKeys.filter(key => newItemKeys.has(key));
                
                for (const menuKey of itemsToAdd) {
                    if (menuKeyToId[menuKey]) {
                        await promisePool.execute(
                            'INSERT IGNORE INTO role_menu_permissions (role, menu_item_id, is_visible) VALUES (?, ?, ?)',
                            [role, menuKeyToId[menuKey], true]
                        );
                    }
                }
                
                console.log(`   🔐 Set permissions for ${role}: ${itemsToAdd.length} new items`);
            }
            
            await promisePool.execute('COMMIT');
            
        } catch (error) {
            await promisePool.execute('ROLLBACK');
            throw error;
        }
        
        // Final summary
        const [finalCount] = await promisePool.execute('SELECT COUNT(*) as count FROM menu_items');
        const [finalPermissions] = await promisePool.execute('SELECT COUNT(*) as count FROM role_menu_permissions');
        
        console.log('\n🎉 Menu population completed successfully!');
        console.log(`📊 Final totals:`);
        console.log(`   • Menu items: ${finalCount[0].count}`);
        console.log(`   • Role permissions: ${finalPermissions[0].count}`);
        console.log('\n💡 The menu management interface should now show all available menu items.');
        console.log('   Visit: https://orthodoxmetrics.com/admin/menu-management');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
checkAndPopulateMenuItems()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    }); 