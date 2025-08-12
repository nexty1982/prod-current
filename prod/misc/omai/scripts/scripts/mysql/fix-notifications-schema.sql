-- Fix notifications schema issues
-- This script updates the SendFriendRequest stored procedure and adds missing notification types

USE orthodoxmetrics_db;

-- First, let's add the missing notification types if they don't exist
INSERT IGNORE INTO notification_types (name, description, category, is_active, default_enabled) VALUES
('friend_request', 'Friend request notifications', 'user', TRUE, TRUE),
('friend_accepted', 'Friend request accepted notifications', 'user', TRUE, TRUE),
('blog_comment', 'Blog comment notifications', 'user', TRUE, TRUE),
('blog_like', 'Blog like notifications', 'user', TRUE, TRUE),
('blog_access_request', 'Blog access request notifications', 'user', TRUE, TRUE),
('chat_message', 'Chat message notifications', 'user', TRUE, TRUE),
('mention', 'User mention notifications', 'user', TRUE, TRUE),
('system', 'System notifications', 'system', TRUE, TRUE);

-- Drop the old SendFriendRequest procedure if it exists
DROP PROCEDURE IF EXISTS SendFriendRequest;

-- Create the updated SendFriendRequest procedure using the new schema
DELIMITER $$
CREATE PROCEDURE SendFriendRequest(
    IN requester_user_id INT,
    IN addressee_user_id INT,
    IN request_message TEXT
)
BEGIN
    DECLARE existing_request INT DEFAULT 0;
    DECLARE friend_request_type_id INT;
    
    -- Get the notification type ID for friend requests
    SELECT id INTO friend_request_type_id FROM notification_types WHERE name = 'friend_request' AND is_active = TRUE;
    
    -- Check if request already exists
    SELECT COUNT(*) INTO existing_request
    FROM friendships
    WHERE (requester_id = requester_user_id AND addressee_id = addressee_user_id)
       OR (requester_id = addressee_user_id AND addressee_id = requester_user_id);
    
    IF existing_request = 0 THEN
        INSERT INTO friendships (requester_id, addressee_id, notes)
        VALUES (requester_user_id, addressee_user_id, request_message);
        
        -- Create notification using the new schema
        IF friend_request_type_id IS NOT NULL THEN
            INSERT INTO notifications (
                user_id, 
                notification_type_id, 
                title, 
                message, 
                sender_id, 
                data,
                priority
            )
            VALUES (
                addressee_user_id,
                friend_request_type_id,
                'New Friend Request',
                CONCAT('You have a new friend request from ', (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = requester_user_id)),
                requester_user_id,
                JSON_OBJECT('request_id', LAST_INSERT_ID()),
                'normal'
            );
        END IF;
    END IF;
END$$
DELIMITER ;

-- Drop the old AcceptFriendRequest procedure if it exists
DROP PROCEDURE IF EXISTS AcceptFriendRequest;

-- Create the updated AcceptFriendRequest procedure using the new schema
DELIMITER $$
CREATE PROCEDURE AcceptFriendRequest(
    IN request_id INT
)
BEGIN
    DECLARE requester_user_id INT;
    DECLARE addressee_user_id INT;
    DECLARE friend_accepted_type_id INT;
    
    -- Get the notification type ID for friend accepted
    SELECT id INTO friend_accepted_type_id FROM notification_types WHERE name = 'friend_accepted' AND is_active = TRUE;
    
    -- Update friendship status
    UPDATE friendships 
    SET status = 'accepted', responded_at = NOW()
    WHERE id = request_id;
    
    -- Get requester and addressee IDs for notification
    SELECT requester_id, addressee_id INTO requester_user_id, addressee_user_id
    FROM friendships WHERE id = request_id;
    
    -- Create notification for requester using the new schema
    IF friend_accepted_type_id IS NOT NULL THEN
        INSERT INTO notifications (
            user_id, 
            notification_type_id, 
            title, 
            message, 
            sender_id, 
            data,
            priority
        )
        VALUES (
            requester_user_id,
            friend_accepted_type_id,
            'Friend Request Accepted',
            CONCAT('Your friend request has been accepted!'),
            addressee_user_id,
            JSON_OBJECT('friendship_id', request_id),
            'normal'
        );
    END IF;
    
    -- Create activity feed entries (if activity_feed table exists)
    -- Note: This assumes the activity_feed table exists with the correct schema
    -- If it doesn't exist, these INSERT statements will be ignored
    INSERT IGNORE INTO activity_feed (user_id, actor_id, activity_type, target_type, target_id, title, description)
    VALUES 
        (requester_user_id, requester_user_id, 'friend_added', 'user', addressee_user_id, 'New Friend', 'Added a new friend'),
        (addressee_user_id, addressee_user_id, 'friend_added', 'user', requester_user_id, 'New Friend', 'Added a new friend');
END$$
DELIMITER ;

-- Verify the procedures were created successfully
SHOW PROCEDURE STATUS WHERE Name IN ('SendFriendRequest', 'AcceptFriendRequest');

-- Show the notification types
SELECT * FROM notification_types WHERE name IN ('friend_request', 'friend_accepted', 'blog_comment', 'blog_like', 'blog_access_request', 'chat_message', 'mention', 'system'); 