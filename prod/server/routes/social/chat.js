const express = require('express');
const { promisePool } = require('../../config/db');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    next();
};

// Helper function to check if users are friends
const checkFriendship = async (userId1, userId2) => {
    const [friendship] = await promisePool.query(`
        SELECT id FROM friendships 
        WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
        AND status = 'accepted'
    `, [userId1, userId2, userId2, userId1]);
    
    return friendship.length > 0;
};

// Helper function to get or create conversation between two users
const getOrCreateDirectConversation = async (userId1, userId2) => {
    // Check if conversation already exists
    const [existing] = await promisePool.query(`
        SELECT DISTINCT c.id
        FROM chat_conversations c
        JOIN chat_participants p1 ON c.id = p1.conversation_id
        JOIN chat_participants p2 ON c.id = p2.conversation_id
        WHERE c.type = 'direct'
        AND p1.user_id = ?
        AND p2.user_id = ?
        AND c.is_active = 1
    `, [userId1, userId2]);

    if (existing.length > 0) {
        return existing[0].id;
    }

    // Create new conversation
    const [conversation] = await promisePool.query(`
        INSERT INTO chat_conversations (type, created_by, is_active)
        VALUES ('direct', ?, 1)
    `, [userId1]);

    const conversationId = conversation.insertId;

    // Add both users as participants
    await promisePool.query(`
        INSERT INTO chat_participants (conversation_id, user_id, role)
        VALUES (?, ?, 'member'), (?, ?, 'member')
    `, [conversationId, userId1, conversationId, userId2]);

    return conversationId;
};

// =============================================================================
// CHAT CONVERSATIONS
// =============================================================================

// GET /api/social/chat/conversations - Get user's conversations
router.get('/conversations', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { limit = 20, offset = 0 } = req.query;

        const [conversations] = await promisePool.query(`
            SELECT 
                c.id,
                c.type,
                c.name,
                c.avatar_url,
                c.last_activity,
                cm.content as last_message_content,
                cm.created_at as last_message_time,
                cm.sender_id as last_message_sender_id,
                sender.first_name as last_message_sender_name,
                p.last_read_at,
                (
                    SELECT COUNT(*) 
                    FROM chat_messages 
                    WHERE conversation_id = c.id 
                    AND created_at > COALESCE(p.last_read_at, '1970-01-01')
                    AND sender_id != ?
                ) as unread_count,
                -- For direct conversations, get the other participant's info
                CASE 
                    WHEN c.type = 'direct' THEN (
                        SELECT JSON_OBJECT(
                            'id', other_user.id,
                            'first_name', other_user.first_name,
                            'last_name', other_user.last_name,
                            'display_name', other_profile.display_name,
                            'profile_image_url', other_profile.profile_image_url,
                            'is_online', other_profile.is_online,
                            'last_seen', other_profile.last_seen
                        )
                        FROM chat_participants other_p
                        JOIN orthodoxmetrics_auth_db.users other_user ON other_user.id = other_p.user_id
                        LEFT JOIN user_profiles other_profile ON other_profile.user_id = other_user.id
                        WHERE other_p.conversation_id = c.id 
                        AND other_p.user_id != ?
                        LIMIT 1
                    )
                    ELSE NULL
                END as other_participant
            FROM chat_conversations c
            JOIN chat_participants p ON c.id = p.conversation_id
            LEFT JOIN chat_messages cm ON c.last_message_id = cm.id
            LEFT JOIN orthodoxmetrics_auth_db.users sender ON cm.sender_id = sender.id
            WHERE p.user_id = ? 
            AND c.is_active = 1
            ORDER BY c.last_activity DESC
            LIMIT ? OFFSET ?
        `, [userId, userId, userId, parseInt(limit), parseInt(offset)]);

        // Parse JSON for other_participant
        const processedConversations = conversations.map(conv => ({
            ...conv,
            other_participant: conv.other_participant ? JSON.parse(conv.other_participant) : null,
            display_name: conv.type === 'direct' 
                ? (conv.other_participant 
                    ? JSON.parse(conv.other_participant).display_name || 
                      `${JSON.parse(conv.other_participant).first_name} ${JSON.parse(conv.other_participant).last_name}`.trim()
                    : 'Unknown User')
                : conv.name,
            avatar_url: conv.type === 'direct' 
                ? (conv.other_participant ? JSON.parse(conv.other_participant).profile_image_url : null)
                : conv.avatar_url
        }));

        res.json({
            success: true,
            conversations: processedConversations
        });

    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversations',
            error: error.message
        });
    }
});

// POST /api/social/chat/conversations - Create new conversation
router.post('/conversations', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { type, name, participant_ids, description } = req.body;

        if (!type || !['direct', 'group'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid conversation type'
            });
        }

        if (type === 'direct') {
            if (!participant_ids || participant_ids.length !== 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Direct conversations require exactly one other participant'
                });
            }

            const otherUserId = participant_ids[0];
            
            // Check if users are friends
            const areFriends = await checkFriendship(userId, otherUserId);
            if (!areFriends) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only start conversations with friends'
                });
            }

            // Get or create direct conversation
            const conversationId = await getOrCreateDirectConversation(userId, otherUserId);

            res.status(201).json({
                success: true,
                message: 'Conversation ready',
                conversation_id: conversationId
            });

        } else {
            // Group conversation
            if (!name || name.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Group conversations require a name'
                });
            }

            if (!participant_ids || participant_ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Group conversations require at least one participant'
                });
            }

            // Check that all participants are friends with the creator
            for (const participantId of participant_ids) {
                const areFriends = await checkFriendship(userId, participantId);
                if (!areFriends) {
                    return res.status(403).json({
                        success: false,
                        message: 'You can only add friends to group conversations'
                    });
                }
            }

            // Create group conversation
            const [conversation] = await promisePool.query(`
                INSERT INTO chat_conversations (type, name, description, created_by, is_active)
                VALUES ('group', ?, ?, ?, 1)
            `, [name, description, userId]);

            const conversationId = conversation.insertId;

            // Add creator as admin
            await promisePool.query(`
                INSERT INTO chat_participants (conversation_id, user_id, role)
                VALUES (?, ?, 'admin')
            `, [conversationId, userId]);

            // Add other participants as members
            for (const participantId of participant_ids) {
                await promisePool.query(`
                    INSERT INTO chat_participants (conversation_id, user_id, role)
                    VALUES (?, ?, 'member')
                `, [conversationId, participantId]);
            }

            res.status(201).json({
                success: true,
                message: 'Group conversation created successfully',
                conversation_id: conversationId
            });
        }

    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create conversation',
            error: error.message
        });
    }
});

// =============================================================================
// CHAT MESSAGES
// =============================================================================

// GET /api/social/chat/conversations/:id/messages - Get messages for a conversation
router.get('/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id: conversationId } = req.params;
        const { limit = 50, offset = 0, before_message_id } = req.query;

        // Check if user is a participant
        const [participant] = await promisePool.query(`
            SELECT id FROM chat_participants 
            WHERE conversation_id = ? AND user_id = ?
        `, [conversationId, userId]);

        if (participant.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this conversation'
            });
        }

        let query = `
            SELECT 
                m.id,
                m.content,
                m.message_type,
                m.metadata,
                m.reply_to_id,
                m.is_edited,
                m.is_deleted,
                m.reactions,
                m.created_at,
                m.updated_at,
                u.id as sender_id,
                u.first_name as sender_first_name,
                u.last_name as sender_last_name,
                up.display_name as sender_display_name,
                up.profile_image_url as sender_avatar,
                reply_m.content as reply_to_content,
                reply_u.first_name as reply_to_sender_name
            FROM chat_messages m
            JOIN orthodoxmetrics_auth_db.users u ON m.sender_id = u.id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            LEFT JOIN chat_messages reply_m ON m.reply_to_id = reply_m.id
            LEFT JOIN orthodoxmetrics_auth_db.users reply_u ON reply_m.sender_id = reply_u.id
            WHERE m.conversation_id = ?
            AND m.is_deleted = 0
        `;

        const params = [conversationId];

        if (before_message_id) {
            query += ' AND m.id < ?';
            params.push(before_message_id);
        }

        query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [messages] = await promisePool.query(query, params);

        // Parse JSON fields and add computed properties
        const processedMessages = messages.map(msg => ({
            ...msg,
            metadata: msg.metadata ? JSON.parse(msg.metadata) : {},
            reactions: msg.reactions ? JSON.parse(msg.reactions) : {},
            sender_name: msg.sender_display_name || `${msg.sender_first_name} ${msg.sender_last_name}`.trim(),
            can_edit: msg.sender_id === userId,
            can_delete: msg.sender_id === userId,
            reply_to: msg.reply_to_id ? {
                id: msg.reply_to_id,
                content: msg.reply_to_content,
                sender_name: msg.reply_to_sender_name
            } : null
        })).reverse(); // Reverse to show oldest first

        // Update last read timestamp
        await promisePool.query(`
            UPDATE chat_participants 
            SET last_read_at = NOW() 
            WHERE conversation_id = ? AND user_id = ?
        `, [conversationId, userId]);

        res.json({
            success: true,
            messages: processedMessages
        });

    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages',
            error: error.message
        });
    }
});

// POST /api/social/chat/conversations/:id/messages - Send message
router.post('/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id: conversationId } = req.params;
        const { content, message_type = 'text', reply_to_id, metadata = {} } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message content is required'
            });
        }

        // Check if user is a participant
        const [participant] = await promisePool.query(`
            SELECT id FROM chat_participants 
            WHERE conversation_id = ? AND user_id = ?
        `, [conversationId, userId]);

        if (participant.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this conversation'
            });
        }

        // Send message
        const [result] = await promisePool.query(`
            INSERT INTO chat_messages 
            (conversation_id, sender_id, content, message_type, reply_to_id, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            conversationId,
            userId,
            content,
            message_type,
            reply_to_id,
            JSON.stringify(metadata)
        ]);

        const messageId = result.insertId;

        // Get other participants for notifications
        const [otherParticipants] = await promisePool.query(`
            SELECT user_id FROM chat_participants 
            WHERE conversation_id = ? AND user_id != ?
        `, [conversationId, userId]);

        // Create notifications for other participants
        const [sender] = await promisePool.query(
            'SELECT first_name, last_name FROM orthodoxmetrics_auth_db.users WHERE id = ?',
            [userId]
        );

        const senderName = `${sender[0].first_name} ${sender[0].last_name}`.trim();

        for (const participant of otherParticipants) {
            await promisePool.query(`
                INSERT INTO notifications (user_id, type, title, message, sender_id, data)
                VALUES (?, 'chat_message', 'New Message', ?, ?, ?)
            `, [
                participant.user_id,
                `${senderName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
                userId,
                JSON.stringify({
                    conversation_id: conversationId,
                    message_id: messageId
                })
            ]);
        }

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            message_id: messageId
        });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message
        });
    }
});

// PUT /api/social/chat/messages/:id - Edit message
router.put('/messages/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id: messageId } = req.params;
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message content is required'
            });
        }

        // Check if user owns the message
        const [message] = await promisePool.query(
            'SELECT sender_id FROM chat_messages WHERE id = ?',
            [messageId]
        );

        if (message.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        if (message[0].sender_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own messages'
            });
        }

        // Update message
        await promisePool.query(`
            UPDATE chat_messages 
            SET content = ?, is_edited = 1, updated_at = NOW()
            WHERE id = ?
        `, [content, messageId]);

        res.json({
            success: true,
            message: 'Message updated successfully'
        });

    } catch (error) {
        console.error('Error editing message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to edit message',
            error: error.message
        });
    }
});

// DELETE /api/social/chat/messages/:id - Delete message
router.delete('/messages/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id: messageId } = req.params;

        // Check if user owns the message
        const [message] = await promisePool.query(
            'SELECT sender_id FROM chat_messages WHERE id = ?',
            [messageId]
        );

        if (message.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        if (message[0].sender_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own messages'
            });
        }

        // Soft delete message
        await promisePool.query(`
            UPDATE chat_messages 
            SET is_deleted = 1, content = '[Message deleted]', updated_at = NOW()
            WHERE id = ?
        `, [messageId]);

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete message',
            error: error.message
        });
    }
});

// =============================================================================
// MESSAGE REACTIONS
// =============================================================================

// POST /api/social/chat/messages/:id/react - Add/update reaction to message
router.post('/messages/:id/react', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id: messageId } = req.params;
        const { reaction_type } = req.body;

        const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'pray', 'amen'];
        if (!validReactions.includes(reaction_type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reaction type'
            });
        }

        // Check if user has access to the message
        const [message] = await promisePool.query(`
            SELECT m.id 
            FROM chat_messages m
            JOIN chat_participants p ON m.conversation_id = p.conversation_id
            WHERE m.id = ? AND p.user_id = ?
        `, [messageId, userId]);

        if (message.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Message not found or access denied'
            });
        }

        // Add or update reaction
        await promisePool.query(`
            INSERT INTO social_reactions (user_id, target_type, target_id, reaction_type)
            VALUES (?, 'chat_message', ?, ?)
            ON DUPLICATE KEY UPDATE reaction_type = VALUES(reaction_type)
        `, [userId, messageId, reaction_type]);

        res.json({
            success: true,
            message: 'Reaction added successfully'
        });

    } catch (error) {
        console.error('Error adding reaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add reaction',
            error: error.message
        });
    }
});

// DELETE /api/social/chat/messages/:id/react - Remove reaction from message
router.delete('/messages/:id/react', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id: messageId } = req.params;

        await promisePool.query(
            'DELETE FROM social_reactions WHERE user_id = ? AND target_type = "chat_message" AND target_id = ?',
            [userId, messageId]
        );

        res.json({
            success: true,
            message: 'Reaction removed successfully'
        });

    } catch (error) {
        console.error('Error removing reaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove reaction',
            error: error.message
        });
    }
});

// =============================================================================
// CONVERSATION MANAGEMENT
// =============================================================================

// PUT /api/social/chat/conversations/:id/read - Mark conversation as read
router.put('/conversations/:id/read', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id: conversationId } = req.params;

        await promisePool.query(`
            UPDATE chat_participants 
            SET last_read_at = NOW() 
            WHERE conversation_id = ? AND user_id = ?
        `, [conversationId, userId]);

        res.json({
            success: true,
            message: 'Conversation marked as read'
        });

    } catch (error) {
        console.error('Error marking conversation as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark conversation as read',
            error: error.message
        });
    }
});

// POST /api/social/chat/start/:friendId - Start conversation with friend
router.post('/start/:friendId', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { friendId } = req.params;

        // Check if users are friends
        const areFriends = await checkFriendship(userId, friendId);
        if (!areFriends) {
            return res.status(403).json({
                success: false,
                message: 'You can only start conversations with friends'
            });
        }

        // Get or create conversation
        const conversationId = await getOrCreateDirectConversation(userId, friendId);

        res.json({
            success: true,
            conversation_id: conversationId
        });

    } catch (error) {
        console.error('Error starting conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start conversation',
            error: error.message
        });
    }
});

module.exports = router; 