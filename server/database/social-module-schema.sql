-- =============================================================================
-- ORTHODOX METRICS SOCIAL EXPERIENCE MODULE DATABASE SCHEMA
-- =============================================================================
-- This schema supports:
-- - User blogging system with privacy controls
-- - Friend management and requests
-- - Real-time chat and notifications
-- - Social interactions (likes, comments, reactions)
-- - Profile customization and themes
-- =============================================================================

-- User Profiles Extended (enhances existing user table)
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
);

-- Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    excerpt TEXT,
    featured_image_url VARCHAR(500),
    status ENUM('draft', 'published', 'private', 'scheduled') DEFAULT 'draft',
    visibility ENUM('public', 'private', 'friends_only') DEFAULT 'public',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    tags JSON,
    metadata JSON,
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
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
    INDEX idx_is_pinned (is_pinned),
    INDEX idx_tags (tags),
    FULLTEXT KEY ft_title_content (title, content)
);

-- Blog Categories
CREATE TABLE IF NOT EXISTS blog_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#007bff',
    icon VARCHAR(50),
    post_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_category (user_id, name),
    INDEX idx_user_id (user_id)
);

-- Blog Post Categories (Many-to-Many)
CREATE TABLE IF NOT EXISTS blog_post_categories (
    post_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (post_id, category_id),
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE CASCADE
);

-- Blog Comments
CREATE TABLE IF NOT EXISTS blog_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_id INT NULL,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    like_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES blog_comments(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_parent_id (parent_id),
    INDEX idx_created_at (created_at)
);

-- Friend Relationships
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
    INDEX idx_requested_at (requested_at)
);

-- Chat Conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('direct', 'group') DEFAULT 'direct',
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
    INDEX idx_last_activity (last_activity),
    INDEX idx_is_active (is_active)
);

-- Chat Participants
CREATE TABLE IF NOT EXISTS chat_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('member', 'admin', 'moderator') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_muted BOOLEAN DEFAULT FALSE,
    notification_settings JSON,
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_participant (conversation_id, user_id),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_user_id (user_id),
    INDEX idx_last_read_at (last_read_at)
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_type ENUM('text', 'image', 'file', 'emoji', 'system') DEFAULT 'text',
    content TEXT NOT NULL,
    metadata JSON,
    reply_to_id INT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMP NULL,
    read_by JSON,
    reactions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id) ON DELETE SET NULL,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_created_at (created_at),
    INDEX idx_message_type (message_type)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('friend_request', 'friend_accepted', 'blog_comment', 'blog_like', 'blog_access_request', 'chat_message', 'mention', 'system') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    expires_at TIMESTAMP NULL,
    action_url VARCHAR(500),
    sender_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_priority (priority)
);

-- Social Reactions (for posts, comments, messages)
CREATE TABLE IF NOT EXISTS social_reactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    target_type ENUM('blog_post', 'blog_comment', 'chat_message') NOT NULL,
    target_id INT NOT NULL,
    reaction_type ENUM('like', 'love', 'laugh', 'wow', 'sad', 'angry', 'pray', 'amen') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_reaction (user_id, target_type, target_id),
    INDEX idx_target (target_type, target_id),
    INDEX idx_user_id (user_id),
    INDEX idx_reaction_type (reaction_type)
);

-- Blog Access Requests (for private blogs)
CREATE TABLE IF NOT EXISTS blog_access_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blog_owner_id INT NOT NULL,
    requester_id INT NOT NULL,
    status ENUM('pending', 'approved', 'denied') DEFAULT 'pending',
    message TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (blog_owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_access_request (blog_owner_id, requester_id),
    INDEX idx_blog_owner_id (blog_owner_id),
    INDEX idx_requester_id (requester_id),
    INDEX idx_status (status),
    INDEX idx_requested_at (requested_at)
);

-- Media Files (for blog images, chat files, etc.)
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
);

-- Activity Feed (for "What's New" timeline)
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
);

-- User Preferences and Settings
CREATE TABLE IF NOT EXISTS user_social_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    blog_enabled BOOLEAN DEFAULT TRUE,
    blog_comments_enabled BOOLEAN DEFAULT TRUE,
    blog_auto_approve_comments BOOLEAN DEFAULT TRUE,
    friend_requests_enabled BOOLEAN DEFAULT TRUE,
    chat_enabled BOOLEAN DEFAULT TRUE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    privacy_level ENUM('public', 'friends', 'private') DEFAULT 'friends',
    show_online_status BOOLEAN DEFAULT TRUE,
    allow_friend_requests BOOLEAN DEFAULT TRUE,
    allow_blog_access_requests BOOLEAN DEFAULT TRUE,
    custom_settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_settings (user_id)
);

-- User Sessions (for online presence)
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    device_info JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_token (session_token),
    INDEX idx_user_id (user_id),
    INDEX idx_last_activity (last_activity),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active)
);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update blog comment count when comments are added/removed
DELIMITER $$
CREATE TRIGGER update_blog_comment_count_insert
    AFTER INSERT ON blog_comments
    FOR EACH ROW
BEGIN
    UPDATE blog_posts 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.post_id;
END$$

CREATE TRIGGER update_blog_comment_count_delete
    AFTER DELETE ON blog_comments
    FOR EACH ROW
BEGIN
    UPDATE blog_posts 
    SET comment_count = comment_count - 1 
    WHERE id = OLD.post_id;
END$$
DELIMITER ;

-- Update category post count
DELIMITER $$
CREATE TRIGGER update_category_post_count_insert
    AFTER INSERT ON blog_post_categories
    FOR EACH ROW
BEGIN
    UPDATE blog_categories 
    SET post_count = post_count + 1 
    WHERE id = NEW.category_id;
END$$

CREATE TRIGGER update_category_post_count_delete
    AFTER DELETE ON blog_post_categories
    FOR EACH ROW
BEGIN
    UPDATE blog_categories 
    SET post_count = post_count - 1 
    WHERE id = OLD.category_id;
END$$
DELIMITER ;

-- Update last activity in conversations
DELIMITER $$
CREATE TRIGGER update_conversation_activity
    AFTER INSERT ON chat_messages
    FOR EACH ROW
BEGIN
    UPDATE chat_conversations 
    SET last_activity = NOW(), last_message_id = NEW.id 
    WHERE id = NEW.conversation_id;
END$$
DELIMITER ;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_blog_posts_user_status_published ON blog_posts(user_id, status, published_at);
CREATE INDEX idx_blog_posts_visibility_published ON blog_posts(visibility, published_at);
CREATE INDEX idx_friendships_users_status ON friendships(requester_id, addressee_id, status);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at);
CREATE INDEX idx_activity_feed_user_visibility ON activity_feed(user_id, visibility, created_at);
CREATE INDEX idx_chat_messages_conversation_created ON chat_messages(conversation_id, created_at);

-- =============================================================================
-- INITIAL DATA SETUP
-- =============================================================================

-- Insert default social settings for existing users
INSERT IGNORE INTO user_social_settings (user_id)
SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM user_social_settings);

-- Insert default user profiles for existing users
INSERT IGNORE INTO user_profiles (user_id, display_name)
SELECT id, CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_profiles);

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for user's friend list with online status
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
LEFT JOIN user_profiles up ON up.user_id = f.addressee_id
WHERE f.status = 'accepted'
UNION
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
LEFT JOIN user_profiles up ON up.user_id = f.requester_id
WHERE f.status = 'accepted';

-- View for blog posts with author info
CREATE OR REPLACE VIEW blog_posts_with_author AS
SELECT 
    bp.*,
    u.first_name,
    u.last_name,
    up.display_name,
    up.profile_image_url,
    (SELECT COUNT(*) FROM social_reactions sr WHERE sr.target_type = 'blog_post' AND sr.target_id = bp.id) as total_reactions
FROM blog_posts bp
JOIN users u ON u.id = bp.user_id
LEFT JOIN user_profiles up ON up.user_id = bp.user_id;

-- =============================================================================
-- STORED PROCEDURES FOR COMMON OPERATIONS
-- =============================================================================

-- Procedure to send friend request
DELIMITER $$
CREATE PROCEDURE SendFriendRequest(
    IN requester_user_id INT,
    IN addressee_user_id INT,
    IN request_message TEXT
)
BEGIN
    DECLARE existing_request INT DEFAULT 0;
    
    -- Check if request already exists
    SELECT COUNT(*) INTO existing_request
    FROM friendships
    WHERE (requester_id = requester_user_id AND addressee_id = addressee_user_id)
       OR (requester_id = addressee_user_id AND addressee_id = requester_user_id);
    
    IF existing_request = 0 THEN
        INSERT INTO friendships (requester_id, addressee_id, notes)
        VALUES (requester_user_id, addressee_user_id, request_message);
        
        -- Create notification
        INSERT INTO notifications (user_id, type, title, message, sender_id, data)
        VALUES (
            addressee_user_id,
            'friend_request',
            'New Friend Request',
            CONCAT('You have a new friend request from ', (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = requester_user_id)),
            requester_user_id,
            JSON_OBJECT('request_id', LAST_INSERT_ID())
        );
    END IF;
END$$
DELIMITER ;

-- Procedure to accept friend request
DELIMITER $$
CREATE PROCEDURE AcceptFriendRequest(
    IN request_id INT
)
BEGIN
    DECLARE requester_user_id INT;
    
    -- Update friendship status
    UPDATE friendships 
    SET status = 'accepted', responded_at = NOW()
    WHERE id = request_id;
    
    -- Get requester ID for notification
    SELECT requester_id INTO requester_user_id
    FROM friendships WHERE id = request_id;
    
    -- Create notification for requester
    INSERT INTO notifications (user_id, type, title, message, sender_id, data)
    VALUES (
        requester_user_id,
        'friend_accepted',
        'Friend Request Accepted',
        CONCAT('Your friend request has been accepted!'),
        (SELECT addressee_id FROM friendships WHERE id = request_id),
        JSON_OBJECT('friendship_id', request_id)
    );
    
    -- Create activity feed entries
    INSERT INTO activity_feed (user_id, actor_id, activity_type, target_type, target_id, title, description)
    VALUES 
        (requester_user_id, requester_user_id, 'friend_added', 'user', (SELECT addressee_id FROM friendships WHERE id = request_id), 'New Friend', 'Added a new friend'),
        ((SELECT addressee_id FROM friendships WHERE id = request_id), (SELECT addressee_id FROM friendships WHERE id = request_id), 'friend_added', 'user', requester_user_id, 'New Friend', 'Added a new friend');
END$$
DELIMITER ;

-- =============================================================================
-- SCHEMA CREATION COMPLETE
-- ============================================================================= 