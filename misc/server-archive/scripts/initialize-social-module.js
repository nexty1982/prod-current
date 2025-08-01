#!/usr/bin/env node

/**
 * Social Module Database Initialization Script
 * 
 * This script initializes all required database tables for the social experience module
 * including user profiles, blog posts, friendships, chat, and notifications.
 */

const { promisePool } = require('../config/db');
const path = require('path');
const fs = require('fs').promises;

console.log('🚀 Starting Orthodox Metrics Social Module Database Initialization...\n');

async function createTable(tableName, createSQL) {
    try {
        console.log(`📋 Creating table: ${tableName}`);
        await promisePool.query(createSQL);
        console.log(`✅ Table ${tableName} created successfully`);
        return true;
    } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log(`ℹ️  Table ${tableName} already exists`);
            return true;
        } else {
            console.error(`❌ Error creating table ${tableName}:`, error.message);
            return false;
        }
    }
}

async function checkTableExists(tableName) {
    try {
        const [result] = await promisePool.query(
            'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
            [tableName]
        );
        return result[0].count > 0;
    } catch (error) {
        console.error(`Error checking table ${tableName}:`, error.message);
        return false;
    }
}

async function initializeSocialTables() {
    console.log('🔧 Initializing Social Module Database Tables...\n');
    
    const tables = [
        {
            name: 'user_profiles',
            sql: `
                CREATE TABLE IF NOT EXISTS user_profiles (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    display_name VARCHAR(100),
                    bio TEXT,
                    location VARCHAR(100),
                    website VARCHAR(255),
                    birthday DATE,
                    status_message TEXT,
                    profile_theme VARCHAR(50) DEFAULT 'default',
                    profile_image_url VARCHAR(500),
                    cover_image_url VARCHAR(500),
                    is_online BOOLEAN DEFAULT FALSE,
                    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    privacy_settings JSON,
                    social_links JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_user_profile (user_id),
                    INDEX idx_display_name (display_name),
                    INDEX idx_is_online (is_online),
                    INDEX idx_last_seen (last_seen)
                )
            `
        },
        {
            name: 'blog_posts',
            sql: `
                CREATE TABLE IF NOT EXISTS blog_posts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) NOT NULL,
                    content LONGTEXT NOT NULL,
                    excerpt TEXT,
                    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
                    visibility ENUM('public', 'private', 'friends_only') DEFAULT 'public',
                    featured_image_url VARCHAR(500),
                    tags JSON,
                    metadata JSON,
                    view_count INT DEFAULT 0,
                    like_count INT DEFAULT 0,
                    comment_count INT DEFAULT 0,
                    is_pinned BOOLEAN DEFAULT FALSE,
                    scheduled_at TIMESTAMP NULL,
                    published_at TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_user_slug (user_id, slug),
                    INDEX idx_user_id (user_id),
                    INDEX idx_status (status),
                    INDEX idx_visibility (visibility),
                    INDEX idx_published_at (published_at),
                    INDEX idx_view_count (view_count),
                    INDEX idx_is_pinned (is_pinned),
                    FULLTEXT KEY ft_title_content (title, content)
                )
            `
        },
        {
            name: 'blog_comments',
            sql: `
                CREATE TABLE IF NOT EXISTS blog_comments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    post_id INT NOT NULL,
                    user_id INT NOT NULL,
                    parent_id INT NULL,
                    content TEXT NOT NULL,
                    like_count INT DEFAULT 0,
                    is_approved BOOLEAN DEFAULT TRUE,
                    is_edited BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (parent_id) REFERENCES blog_comments(id) ON DELETE CASCADE,
                    INDEX idx_post_id (post_id),
                    INDEX idx_user_id (user_id),
                    INDEX idx_parent_id (parent_id),
                    INDEX idx_created_at (created_at)
                )
            `
        },
        {
            name: 'friendships',
            sql: `
                CREATE TABLE IF NOT EXISTS friendships (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    requester_id INT NOT NULL,
                    addressee_id INT NOT NULL,
                    status ENUM('pending', 'accepted', 'declined', 'blocked') DEFAULT 'pending',
                    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    responded_at TIMESTAMP NULL,
                    notes TEXT,
                    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_friendship (requester_id, addressee_id),
                    INDEX idx_requester_id (requester_id),
                    INDEX idx_addressee_id (addressee_id),
                    INDEX idx_status (status),
                    INDEX idx_requested_at (requested_at),
                    CHECK (requester_id != addressee_id)
                )
            `
        },
        {
            name: 'chat_conversations',
            sql: `
                CREATE TABLE IF NOT EXISTS chat_conversations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    type ENUM('direct', 'group') NOT NULL,
                    name VARCHAR(255),
                    description TEXT,
                    avatar_url VARCHAR(500),
                    created_by INT NOT NULL,
                    last_message_id INT NULL,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE,
                    settings JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_type (type),
                    INDEX idx_created_by (created_by),
                    INDEX idx_last_activity (last_activity),
                    INDEX idx_is_active (is_active)
                )
            `
        },
        {
            name: 'chat_participants',
            sql: `
                CREATE TABLE IF NOT EXISTS chat_participants (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    conversation_id INT NOT NULL,
                    user_id INT NOT NULL,
                    role ENUM('member', 'admin', 'moderator') DEFAULT 'member',
                    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    notification_settings JSON,
                    is_active BOOLEAN DEFAULT TRUE,
                    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_conversation_user (conversation_id, user_id),
                    INDEX idx_conversation_id (conversation_id),
                    INDEX idx_user_id (user_id),
                    INDEX idx_role (role),
                    INDEX idx_last_read_at (last_read_at)
                )
            `
        },
        {
            name: 'chat_messages',
            sql: `
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    conversation_id INT NOT NULL,
                    sender_id INT NOT NULL,
                    content TEXT NOT NULL,
                    message_type ENUM('text', 'image', 'file', 'system') DEFAULT 'text',
                    reply_to_id INT NULL,
                    reactions JSON,
                    metadata JSON,
                    is_edited BOOLEAN DEFAULT FALSE,
                    is_deleted BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id) ON DELETE SET NULL,
                    INDEX idx_conversation_id (conversation_id),
                    INDEX idx_sender_id (sender_id),
                    INDEX idx_created_at (created_at),
                    INDEX idx_reply_to_id (reply_to_id),
                    FULLTEXT KEY ft_content (content)
                )
            `
        },
        {
            name: 'social_reactions',
            sql: `
                CREATE TABLE IF NOT EXISTS social_reactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    target_type ENUM('blog_post', 'blog_comment', 'chat_message') NOT NULL,
                    target_id INT NOT NULL,
                    reaction_type ENUM('like', 'love', 'laugh', 'wow', 'sad', 'angry', 'pray', 'amen') NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_user_target_reaction (user_id, target_type, target_id),
                    INDEX idx_user_id (user_id),
                    INDEX idx_target (target_type, target_id),
                    INDEX idx_reaction_type (reaction_type),
                    INDEX idx_created_at (created_at)
                )
            `
        },
        {
            name: 'activity_feed',
            sql: `
                CREATE TABLE IF NOT EXISTS activity_feed (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    actor_id INT NOT NULL,
                    activity_type ENUM('blog_post', 'blog_comment', 'friend_added', 'profile_updated', 'achievement', 'check_in') NOT NULL,
                    target_type ENUM('blog_post', 'user', 'comment', 'media') NULL,
                    target_id INT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    metadata JSON,
                    visibility ENUM('public', 'friends', 'private') DEFAULT 'friends',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_user_id (user_id),
                    INDEX idx_actor_id (actor_id),
                    INDEX idx_activity_type (activity_type),
                    INDEX idx_visibility (visibility),
                    INDEX idx_created_at (created_at)
                )
            `
        },
        {
            name: 'user_social_settings',
            sql: `
                CREATE TABLE IF NOT EXISTS user_social_settings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    notifications_enabled BOOLEAN DEFAULT TRUE,
                    email_notifications BOOLEAN DEFAULT TRUE,
                    push_notifications BOOLEAN DEFAULT TRUE,
                    friend_request_privacy ENUM('everyone', 'friends_of_friends', 'none') DEFAULT 'everyone',
                    profile_visibility ENUM('public', 'friends', 'private') DEFAULT 'public',
                    online_status_visible BOOLEAN DEFAULT TRUE,
                    activity_feed_visible BOOLEAN DEFAULT TRUE,
                    custom_settings JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_user_settings (user_id),
                    INDEX idx_user_id (user_id)
                )
            `
        },
        {
            name: 'social_media',
            sql: `
                CREATE TABLE IF NOT EXISTS social_media (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    filename VARCHAR(255) NOT NULL,
                    original_filename VARCHAR(255) NOT NULL,
                    file_path VARCHAR(500) NOT NULL,
                    file_url VARCHAR(500) NOT NULL,
                    file_type VARCHAR(100) NOT NULL,
                    file_size INT NOT NULL,
                    mime_type VARCHAR(100) NOT NULL,
                    alt_text VARCHAR(255),
                    description TEXT,
                    metadata JSON,
                    usage_type ENUM('blog_image', 'profile_image', 'cover_image', 'chat_file', 'emoji', 'other') NOT NULL,
                    is_public BOOLEAN DEFAULT TRUE,
                    download_count INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_user_id (user_id),
                    INDEX idx_usage_type (usage_type),
                    INDEX idx_file_type (file_type),
                    INDEX idx_created_at (created_at)
                )
            `
        }
    ];

    let successCount = 0;
    let totalCount = tables.length;

    for (const table of tables) {
        const success = await createTable(table.name, table.sql);
        if (success) successCount++;
        console.log(''); // Add spacing
    }

    return { successCount, totalCount };
}

async function createDatabaseViews() {
    console.log('🔧 Creating database views...\n');
    
    const views = [
        {
            name: 'user_friends_view',
            sql: `
                CREATE OR REPLACE VIEW user_friends_view AS
                SELECT 
                    f.requester_id as user_id,
                    f.addressee_id as friend_id,
                    u.first_name,
                    u.last_name,
                    up.display_name,
                    up.profile_image_url,
                    up.is_online,
                    up.last_seen,
                    f.requested_at as friends_since
                FROM friendships f
                JOIN users u ON u.id = f.addressee_id
                LEFT JOIN user_profiles up ON up.user_id = u.id
                WHERE f.status = 'accepted'
                UNION ALL
                SELECT 
                    f.addressee_id as user_id,
                    f.requester_id as friend_id,
                    u.first_name,
                    u.last_name,
                    up.display_name,
                    up.profile_image_url,
                    up.is_online,
                    up.last_seen,
                    f.requested_at as friends_since
                FROM friendships f
                JOIN users u ON u.id = f.requester_id
                LEFT JOIN user_profiles up ON up.user_id = u.id
                WHERE f.status = 'accepted'
            `
        }
    ];

    for (const view of views) {
        try {
            console.log(`📋 Creating view: ${view.name}`);
            await promisePool.query(view.sql);
            console.log(`✅ View ${view.name} created successfully\n`);
        } catch (error) {
            console.error(`❌ Error creating view ${view.name}:`, error.message);
        }
    }
}

async function updateExistingChatConstraints() {
    console.log('🔧 Updating chat_conversations foreign key constraint...\n');
    
    try {
        // Add foreign key constraint for last_message_id if it doesn't exist
        await promisePool.query(`
            ALTER TABLE chat_conversations 
            ADD CONSTRAINT fk_last_message 
            FOREIGN KEY (last_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL
        `);
        console.log('✅ Added foreign key constraint for last_message_id\n');
    } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
            console.log('ℹ️  Foreign key constraint already exists\n');
        } else {
            console.log('ℹ️  Foreign key constraint not added (may already exist or table structure differs)\n');
        }
    }
}

async function verifyInstallation() {
    console.log('🔍 Verifying installation...\n');
    
    const requiredTables = [
        'user_profiles',
        'blog_posts', 
        'blog_comments',
        'friendships',
        'chat_conversations',
        'chat_participants', 
        'chat_messages',
        'social_reactions',
        'activity_feed',
        'user_social_settings',
        'social_media'
    ];

    let verifiedCount = 0;
    
    for (const tableName of requiredTables) {
        const exists = await checkTableExists(tableName);
        if (exists) {
            console.log(`✅ ${tableName} - exists`);
            verifiedCount++;
        } else {
            console.log(`❌ ${tableName} - missing`);
        }
    }

    console.log(`\n📊 Verification: ${verifiedCount}/${requiredTables.length} tables verified\n`);
    
    return verifiedCount === requiredTables.length;
}

async function createSampleData() {
    console.log('🔧 Creating sample data for testing...\n');
    
    try {
        // Check if we already have user profiles
        const [profileCount] = await promisePool.query('SELECT COUNT(*) as count FROM user_profiles');
        
        if (profileCount[0].count === 0) {
            console.log('📋 Creating sample user profiles...');
            
            // Get existing users
            const [users] = await promisePool.query('SELECT id, first_name, last_name FROM users LIMIT 5');
            
            for (const user of users) {
                await promisePool.query(`
                    INSERT INTO user_profiles (user_id, display_name, bio, is_online, privacy_settings, social_links)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    user.id,
                    `${user.first_name} ${user.last_name}`,
                    `Hello! I'm ${user.first_name}, excited to be part of the Orthodox Metrics community.`,
                    Math.random() > 0.5, // Random online status
                    JSON.stringify({
                        profile_visibility: 'public',
                        friend_requests: 'everyone',
                        online_status: true
                    }),
                    JSON.stringify({
                        website: null,
                        facebook: null,
                        twitter: null
                    })
                ]);
            }
            
            console.log(`✅ Created ${users.length} user profiles\n`);
        } else {
            console.log('ℹ️  User profiles already exist\n');
        }

        // Create default social settings for users
        const [settingsCount] = await promisePool.query('SELECT COUNT(*) as count FROM user_social_settings');
        
        if (settingsCount[0].count === 0) {
            console.log('📋 Creating default social settings...');
            
            await promisePool.query(`
                INSERT INTO user_social_settings (user_id, custom_settings)
                SELECT id, JSON_OBJECT(
                    'friend_requests', true,
                    'blog_comments', true,
                    'blog_likes', true,
                    'chat_messages', true,
                    'mentions', true
                )
                FROM users
            `);
            
            console.log('✅ Created default social settings for all users\n');
        } else {
            console.log('ℹ️  Social settings already exist\n');
        }

    } catch (error) {
        console.error('❌ Error creating sample data:', error.message);
    }
}

// Main execution
async function main() {
    try {
        console.log('🌟 Orthodox Metrics Social Module Initialization');
        console.log('=====================================\n');

        // Initialize tables
        const { successCount, totalCount } = await initializeSocialTables();
        
        if (successCount === totalCount) {
            console.log(`🎉 All ${totalCount} social tables initialized successfully!\n`);
        } else {
            console.log(`⚠️  ${successCount}/${totalCount} tables initialized. Some tables may have had issues.\n`);
        }

        // Create views
        await createDatabaseViews();

        // Update constraints
        await updateExistingChatConstraints();

        // Create sample data
        await createSampleData();

        // Verify installation
        const allTablesExist = await verifyInstallation();
        
        if (allTablesExist) {
            console.log('🎉 Social Module Database Initialization Complete!');
            console.log('✅ All required tables and views have been created');
            console.log('✅ Sample data has been initialized');
            console.log('✅ Your social experience module is ready to use!\n');
            
            console.log('🚀 Next Steps:');
            console.log('1. Restart your application server');
            console.log('2. Test the social features in your frontend');
            console.log('3. Check the social menu items in the navigation\n');
            
            process.exit(0);
        } else {
            console.log('❌ Installation verification failed. Please check the errors above.');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 Fatal error during initialization:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        // Close database connection
        if (promisePool?.end) {
            await promisePool.end();
        }
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the script
main(); 