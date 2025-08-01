-- OrthodoxMetrics Enhanced Social Chat System Database Schema
-- Comprehensive chat system with friends management, real-time messaging, and social features

-- =====================================================
-- FRIENDS & RELATIONSHIPS
-- =====================================================

-- Friends/Friendship table for managing friend relationships
CREATE TABLE IF NOT EXISTS friendships (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requester_id INT NOT NULL,
    addressee_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'blocked', 'declined') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_friendship (requester_id, addressee_id),
    INDEX idx_requester_status (requester_id, status),
    INDEX idx_addressee_status (addressee_id, status),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- CHAT CONVERSATIONS
-- =====================================================

-- Main conversations table (supports both direct and group chats)
CREATE TABLE IF NOT EXISTS chat_conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('direct', 'group') NOT NULL,
    name VARCHAR(255) NULL, -- For group chats
    description TEXT NULL, -- For group chats
    avatar_url VARCHAR(500) NULL,
    created_by INT NOT NULL,
    last_message_id INT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (last_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL,
    
    INDEX idx_type (type),
    INDEX idx_created_by (created_by),
    INDEX idx_last_activity (last_activity),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
);

-- Conversation participants (many-to-many relationship)
CREATE TABLE IF NOT EXISTS chat_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('admin', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    last_read_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_participant (conversation_id, user_id),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_user_id (user_id),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active),
    INDEX idx_last_read_at (last_read_at)
);

-- =====================================================
-- CHAT MESSAGES
-- =====================================================

-- Main messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'image', 'file', 'system', 'emoji') DEFAULT 'text',
    reply_to_id INT NULL, -- For message replies
    metadata JSON NULL, -- For storing file info, emoji data, etc.
    reactions JSON NULL, -- Store reactions as JSON
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
    INDEX idx_message_type (message_type),
    INDEX idx_is_deleted (is_deleted),
    INDEX idx_reply_to_id (reply_to_id),
    FULLTEXT idx_content (content)
);

-- Message read receipts
CREATE TABLE IF NOT EXISTS chat_message_reads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_read (message_id, user_id),
    INDEX idx_message_id (message_id),
    INDEX idx_user_id (user_id),
    INDEX idx_read_at (read_at)
);

-- =====================================================
-- SOCIAL REACTIONS
-- =====================================================

-- Reactions for messages (likes, loves, etc.)
CREATE TABLE IF NOT EXISTS social_reactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    target_type ENUM('chat_message', 'post', 'comment') NOT NULL,
    target_id INT NOT NULL,
    reaction_type ENUM('like', 'love', 'laugh', 'wow', 'sad', 'angry', 'pray', 'amen') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_reaction (user_id, target_type, target_id),
    INDEX idx_target (target_type, target_id),
    INDEX idx_user_id (user_id),
    INDEX idx_reaction_type (reaction_type),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- USER PROFILES & STATUS
-- =====================================================

-- Enhanced user profiles for chat features
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INT PRIMARY KEY,
    display_name VARCHAR(100) NULL,
    bio TEXT NULL,
    profile_image_url VARCHAR(500) NULL,
    cover_image_url VARCHAR(500) NULL,
    location VARCHAR(100) NULL,
    church_affiliation VARCHAR(200) NULL,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP NULL,
    status_message VARCHAR(255) NULL,
    privacy_settings JSON NULL,
    notification_settings JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_is_online (is_online),
    INDEX idx_last_seen (last_seen),
    INDEX idx_display_name (display_name),
    FULLTEXT idx_bio (bio, location, church_affiliation)
);

-- =====================================================
-- TYPING INDICATORS
-- =====================================================

-- Real-time typing indicators
CREATE TABLE IF NOT EXISTS chat_typing_indicators (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    is_typing BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_typing (conversation_id, user_id),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_user_id (user_id),
    INDEX idx_updated_at (updated_at)
);

-- =====================================================
-- CHAT ATTACHMENTS
-- =====================================================

-- File attachments for messages
CREATE TABLE IF NOT EXISTS chat_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500) NULL,
    mime_type VARCHAR(100) NOT NULL,
    metadata JSON NULL, -- For image dimensions, video duration, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    
    INDEX idx_message_id (message_id),
    INDEX idx_file_type (file_type),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

-- Enhanced notifications table (may already exist)
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('chat_message', 'friend_request', 'friend_accepted', 'mention', 'system', 'announcement') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sender_id INT NULL,
    data JSON NULL, -- Store additional data like conversation_id, etc.
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_sender_id (sender_id)
);

-- =====================================================
-- CHAT SETTINGS & PREFERENCES
-- =====================================================

-- User chat preferences
CREATE TABLE IF NOT EXISTS chat_settings (
    user_id INT PRIMARY KEY,
    enable_notifications BOOLEAN DEFAULT TRUE,
    enable_sound BOOLEAN DEFAULT TRUE,
    enable_typing_indicators BOOLEAN DEFAULT TRUE,
    enable_read_receipts BOOLEAN DEFAULT TRUE,
    theme ENUM('light', 'dark', 'auto') DEFAULT 'auto',
    font_size ENUM('small', 'medium', 'large') DEFAULT 'medium',
    auto_download_media BOOLEAN DEFAULT TRUE,
    message_preview BOOLEAN DEFAULT TRUE,
    online_status_visible BOOLEAN DEFAULT TRUE,
    last_seen_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- CHAT MODERATION
-- =====================================================

-- Message reports for moderation
CREATE TABLE IF NOT EXISTS chat_message_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    reporter_id INT NOT NULL,
    reason ENUM('spam', 'harassment', 'inappropriate', 'violence', 'other') NOT NULL,
    description TEXT NULL,
    status ENUM('pending', 'reviewed', 'resolved', 'dismissed') DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_report (message_id, reporter_id),
    INDEX idx_message_id (message_id),
    INDEX idx_reporter_id (reporter_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update conversation last_activity when new message is sent
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS update_conversation_activity
    AFTER INSERT ON chat_messages
    FOR EACH ROW
BEGIN
    UPDATE chat_conversations 
    SET last_activity = NEW.created_at, last_message_id = NEW.id
    WHERE id = NEW.conversation_id;
END$$

-- Clean up old typing indicators (older than 30 seconds)
CREATE EVENT IF NOT EXISTS cleanup_typing_indicators
ON SCHEDULE EVERY 30 SECOND
DO
    DELETE FROM chat_typing_indicators 
    WHERE updated_at < DATE_SUB(NOW(), INTERVAL 30 SECOND);$$

DELIMITER ;

-- =====================================================
-- INITIAL DATA & DEFAULTS
-- =====================================================

-- Create default chat settings for existing users
INSERT IGNORE INTO chat_settings (user_id)
SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM chat_settings);

-- Create default user profiles for existing users
INSERT IGNORE INTO user_profiles (user_id, display_name)
SELECT id, CONCAT(first_name, ' ', last_name) 
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_profiles);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_friendships_mutual 
ON friendships (requester_id, addressee_id, status);

CREATE INDEX IF NOT EXISTS idx_conversations_user_active 
ON chat_participants (user_id, is_active, conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON chat_messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications (user_id, is_read, created_at DESC);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for getting user's friends with their status
CREATE VIEW IF NOT EXISTS v_user_friends AS
SELECT 
    f.id as friendship_id,
    f.requester_id,
    f.addressee_id,
    f.status,
    f.created_at as friendship_created,
    CASE 
        WHEN f.requester_id = u.id THEN f.addressee_id
        ELSE f.requester_id
    END as friend_id,
    CASE 
        WHEN f.requester_id = u.id THEN 
            CONCAT(friend_user.first_name, ' ', friend_user.last_name)
        ELSE 
            CONCAT(req_user.first_name, ' ', req_user.last_name)
    END as friend_name,
    CASE 
        WHEN f.requester_id = u.id THEN friend_profile.profile_image_url
        ELSE req_profile.profile_image_url
    END as friend_avatar,
    CASE 
        WHEN f.requester_id = u.id THEN friend_profile.is_online
        ELSE req_profile.is_online
    END as friend_online,
    CASE 
        WHEN f.requester_id = u.id THEN friend_profile.last_seen
        ELSE req_profile.last_seen
    END as friend_last_seen
FROM friendships f
JOIN users u ON (u.id = f.requester_id OR u.id = f.addressee_id)
LEFT JOIN users friend_user ON friend_user.id = f.addressee_id
LEFT JOIN users req_user ON req_user.id = f.requester_id
LEFT JOIN user_profiles friend_profile ON friend_profile.user_id = f.addressee_id
LEFT JOIN user_profiles req_profile ON req_profile.user_id = f.requester_id;

-- View for conversation summaries
CREATE VIEW IF NOT EXISTS v_conversation_summaries AS
SELECT 
    c.id,
    c.type,
    c.name,
    c.last_activity,
    cm.content as last_message_content,
    cm.sender_id as last_message_sender_id,
    sender.first_name as last_message_sender_name,
    COUNT(DISTINCT cp.user_id) as participant_count,
    c.is_active
FROM chat_conversations c
LEFT JOIN chat_messages cm ON c.last_message_id = cm.id
LEFT JOIN users sender ON cm.sender_id = sender.id
LEFT JOIN chat_participants cp ON c.id = cp.conversation_id AND cp.is_active = TRUE
GROUP BY c.id, c.type, c.name, c.last_activity, cm.content, cm.sender_id, sender.first_name, c.is_active; 