const { getAppPool } = require('../../config/db-compat');
const { Server } = require('socket.io');
const { promisePool } = require('../../config/db-compat');
const session = require('express-session');

class WebSocketService {
    constructor() {
        this.io = null;
        this.userSockets = new Map(); // userId -> Set of socket IDs
        this.socketUsers = new Map(); // socketId -> userId
        this.conversationRooms = new Map(); // conversationId -> Set of user IDs
    }

    /**
     * Initialize WebSocket server with Express app
     */
    initialize(server, sessionMiddleware) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        // Use session middleware for authentication
        this.io.use((socket, next) => {
            sessionMiddleware(socket.request, {}, next);
        });

        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const session = socket.request.session;
                
                if (!session || !session.user) {
                    console.log('🔒 WebSocket connection rejected: No session');
                    return next(new Error('Authentication required'));
                }

                socket.userId = session.user.id;
                socket.userEmail = session.user.email;
                socket.userName = `${session.user.first_name} ${session.user.last_name}`;
                
                console.log(`🔌 WebSocket authenticated: ${socket.userEmail} (${socket.userId})`);
                next();
            } catch (error) {
                console.error('🔒 WebSocket auth error:', error);
                next(new Error('Authentication failed'));
            }
        });

        this.setupEventHandlers();
        console.log('🚀 WebSocket service initialized');
    }

    /**
     * Set up all WebSocket event handlers
     */
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
            
            // Chat events
            socket.on('join_conversation', (data) => this.handleJoinConversation(socket, data));
            socket.on('leave_conversation', (data) => this.handleLeaveConversation(socket, data));
            socket.on('send_message', (data) => this.handleSendMessage(socket, data));
            socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
            socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));
            socket.on('message_read', (data) => this.handleMessageRead(socket, data));
            
            // Notification events
            socket.on('mark_notification_read', (data) => this.handleMarkNotificationRead(socket, data));
            
            // Presence events
            socket.on('update_presence', (data) => this.handleUpdatePresence(socket, data));
            
            // Log streaming events
            socket.on('subscribe_logs', (data) => this.handleSubscribeLogs(socket, data));
            socket.on('unsubscribe_logs', () => this.handleUnsubscribeLogs(socket));
            socket.on('update_log_filters', (data) => this.handleUpdateLogFilters(socket, data));
            
            // Disconnect
            socket.on('disconnect', () => this.handleDisconnection(socket));
        });
    }

    /**
     * Handle new WebSocket connection
     */
    async handleConnection(socket) {
        const userId = socket.userId;
        
        try {
            // Track user socket
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId).add(socket.id);
            this.socketUsers.set(socket.id, userId);

            // Update user online status
            await this.updateUserOnlineStatus(userId, true);

            // Join user to their personal notification room
            socket.join(`user_${userId}`);

            // Get user's active conversations and join them
            await this.joinUserConversations(socket, userId);

            // Notify friends about online status
            await this.broadcastPresenceUpdate(userId, true);

            console.log(`✅ User ${socket.userEmail} connected (${socket.id})`);
            
            // Send initial data
            socket.emit('connection_success', {
                message: 'Connected to real-time service',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error handling connection:', error);
            socket.disconnect();
        }
    }

    /**
     * Handle WebSocket disconnection
     */
    async handleDisconnection(socket) {
        const userId = socket.userId;
        
        try {
            // Remove socket from tracking
            if (this.userSockets.has(userId)) {
                this.userSockets.get(userId).delete(socket.id);
                
                // If no more sockets for this user, mark offline
                if (this.userSockets.get(userId).size === 0) {
                    this.userSockets.delete(userId);
                    await this.updateUserOnlineStatus(userId, false);
                    await this.broadcastPresenceUpdate(userId, false);
                }
            }
            
            this.socketUsers.delete(socket.id);
            console.log(`❌ User ${socket.userEmail} disconnected (${socket.id})`);
            
        } catch (error) {
            console.error('❌ Error handling disconnection:', error);
        }
    }

    /**
     * Join user to their active conversations
     */
    async joinUserConversations(socket, userId) {
        try {
            const [conversations] = await getAppPool().query(`
                SELECT DISTINCT c.id 
                FROM chat_conversations c
                JOIN chat_participants p ON c.id = p.conversation_id
                WHERE p.user_id = ? AND p.is_active = 1 AND c.is_active = 1
            `, [userId]);

            for (const conv of conversations) {
                socket.join(`conversation_${conv.id}`);
                
                // Track conversation membership
                if (!this.conversationRooms.has(conv.id)) {
                    this.conversationRooms.set(conv.id, new Set());
                }
                this.conversationRooms.get(conv.id).add(userId);
            }

            console.log(`👥 User ${userId} joined ${conversations.length} conversations`);
        } catch (error) {
            console.error('❌ Error joining user conversations:', error);
        }
    }

    /**
     * Handle joining a specific conversation
     */
    async handleJoinConversation(socket, data) {
        const { conversationId } = data;
        const userId = socket.userId;

        try {
            // Verify user is a participant
            const [participant] = await getAppPool().query(`
                SELECT id FROM chat_participants 
                WHERE conversation_id = ? AND user_id = ? AND is_active = 1
            `, [conversationId, userId]);

            if (participant.length === 0) {
                socket.emit('error', { message: 'Not authorized for this conversation' });
                return;
            }

            socket.join(`conversation_${conversationId}`);
            
            // Track conversation membership
            if (!this.conversationRooms.has(conversationId)) {
                this.conversationRooms.set(conversationId, new Set());
            }
            this.conversationRooms.get(conversationId).add(userId);

            console.log(`👥 User ${userId} joined conversation ${conversationId}`);
            
            socket.emit('conversation_joined', { conversationId });
            
        } catch (error) {
            console.error('❌ Error joining conversation:', error);
            socket.emit('error', { message: 'Failed to join conversation' });
        }
    }

    /**
     * Handle leaving a conversation
     */
    handleLeaveConversation(socket, data) {
        const { conversationId } = data;
        const userId = socket.userId;

        socket.leave(`conversation_${conversationId}`);
        
        if (this.conversationRooms.has(conversationId)) {
            this.conversationRooms.get(conversationId).delete(userId);
        }

        console.log(`👋 User ${userId} left conversation ${conversationId}`);
        socket.emit('conversation_left', { conversationId });
    }

    /**
     * Handle sending a message
     */
    async handleSendMessage(socket, data) {
        const { conversationId, content, messageType = 'text', replyToId } = data;
        const userId = socket.userId;

        try {
            // Verify user is a participant
            const [participant] = await getAppPool().query(`
                SELECT id FROM chat_participants 
                WHERE conversation_id = ? AND user_id = ?
            `, [conversationId, userId]);

            if (participant.length === 0) {
                socket.emit('error', { message: 'Not authorized for this conversation' });
                return;
            }

            // Save message to database
            const [result] = await getAppPool().query(`
                INSERT INTO chat_messages (conversation_id, sender_id, content, message_type, reply_to_id)
                VALUES (?, ?, ?, ?, ?)
            `, [conversationId, userId, content, messageType, replyToId]);

            const messageId = result.insertId;

            // Get sender info for the message
            const [senderInfo] = await getAppPool().query(`
                SELECT u.id, u.first_name, u.last_name, up.display_name, up.profile_image_url
                FROM orthodoxmetrics_auth_db.users u
                LEFT JOIN user_profiles up ON up.user_id = u.id
                WHERE u.id = ?
            `, [userId]);

            const messageData = {
                id: messageId,
                conversation_id: conversationId,
                sender_id: userId,
                content,
                message_type: messageType,
                reply_to_id: replyToId,
                created_at: new Date().toISOString(),
                sender: senderInfo[0],
                is_edited: false,
                is_deleted: false
            };

            // Update conversation last activity
            await getAppPool().query(`
                UPDATE chat_conversations 
                SET last_message_id = ?, last_activity = NOW() 
                WHERE id = ?
            `, [messageId, conversationId]);

            // Broadcast to conversation participants
            this.io.to(`conversation_${conversationId}`).emit('new_message', messageData);

            // Send notifications to offline participants
            await this.sendMessageNotifications(conversationId, userId, content, messageId);

            console.log(`💬 Message ${messageId} sent in conversation ${conversationId}`);

        } catch (error) {
            console.error('❌ Error sending message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    }

    /**
     * Handle typing indicators
     */
    handleTypingStart(socket, data) {
        const { conversationId } = data;
        const userId = socket.userId;

        socket.to(`conversation_${conversationId}`).emit('user_typing', {
            conversationId,
            userId,
            userName: socket.userName,
            isTyping: true
        });
    }

    handleTypingStop(socket, data) {
        const { conversationId } = data;
        const userId = socket.userId;

        socket.to(`conversation_${conversationId}`).emit('user_typing', {
            conversationId,
            userId,
            userName: socket.userName,
            isTyping: false
        });
    }

    /**
     * Handle message read receipts
     */
    async handleMessageRead(socket, data) {
        const { conversationId, messageId } = data;
        const userId = socket.userId;

        try {
            // Update last read timestamp
            await getAppPool().query(`
                UPDATE chat_participants 
                SET last_read_at = NOW() 
                WHERE conversation_id = ? AND user_id = ?
            `, [conversationId, userId]);

            // Broadcast read receipt to conversation
            socket.to(`conversation_${conversationId}`).emit('message_read', {
                conversationId,
                messageId,
                userId,
                readAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error updating read receipt:', error);
        }
    }

    /**
     * Handle notification read
     */
    async handleMarkNotificationRead(socket, data) {
        const { notificationId } = data;
        const userId = socket.userId;

        try {
            await getAppPool().query(`
                UPDATE notifications 
                SET is_read = TRUE 
                WHERE id = ? AND user_id = ?
            `, [notificationId, userId]);

            socket.emit('notification_read', { notificationId });

        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
        }
    }

    /**
     * Handle presence updates
     */
    async handleUpdatePresence(socket, data) {
        const { status } = data; // 'online', 'away', 'busy', 'offline'
        const userId = socket.userId;

        try {
            await getAppPool().query(`
                UPDATE user_profiles 
                SET last_seen = NOW() 
                WHERE user_id = ?
            `, [userId]);

            await this.broadcastPresenceUpdate(userId, status !== 'offline');

        } catch (error) {
            console.error('❌ Error updating presence:', error);
        }
    }

    /**
     * Update user online status in database
     */
    async updateUserOnlineStatus(userId, isOnline) {
        try {
            await getAppPool().query(`
                INSERT INTO user_profiles (user_id, is_online, last_seen)
                VALUES (?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                is_online = VALUES(is_online), 
                last_seen = VALUES(last_seen)
            `, [userId, isOnline]);

        } catch (error) {
            console.error('❌ Error updating online status:', error);
        }
    }

    /**
     * Broadcast presence update to friends
     */
    async broadcastPresenceUpdate(userId, isOnline) {
        try {
            // Get user's friends
            const [friends] = await getAppPool().query(`
                SELECT friend_id FROM user_friends_view WHERE user_id = ?
            `, [userId]);

            // Notify each online friend
            for (const friend of friends) {
                if (this.userSockets.has(friend.friend_id)) {
                    this.io.to(`user_${friend.friend_id}`).emit('friend_presence_update', {
                        userId,
                        isOnline,
                        timestamp: new Date().toISOString()
                    });
                }
            }

        } catch (error) {
            console.error('❌ Error broadcasting presence update:', error);
        }
    }

    /**
     * Send message notifications to offline participants
     */
    async sendMessageNotifications(conversationId, senderId, content, messageId) {
        try {
            // Get participants who are not online
            const [participants] = await getAppPool().query(`
                SELECT p.user_id, u.first_name, u.last_name
                FROM chat_participants p
                JOIN orthodoxmetrics_auth_db.users u ON u.id = p.user_id
                WHERE p.conversation_id = ? AND p.user_id != ? AND p.is_active = 1
            `, [conversationId, senderId]);

            // Get sender info
            const [senderInfo] = await getAppPool().query(`
                SELECT first_name, last_name FROM orthodoxmetrics_auth_db.users WHERE id = ?
            `, [senderId]);

            const senderName = `${senderInfo[0].first_name} ${senderInfo[0].last_name}`;

            for (const participant of participants) {
                // Check if user is online
                const isOnline = this.userSockets.has(participant.user_id);
                
                if (isOnline) {
                    // Send real-time notification
                    this.io.to(`user_${participant.user_id}`).emit('new_notification', {
                        type: 'chat_message',
                        title: 'New Message',
                        message: `${senderName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                        data: {
                            conversation_id: conversationId,
                            message_id: messageId,
                            sender_id: senderId
                        },
                        timestamp: new Date().toISOString()
                    });
                }

                // Always create database notification for message history
                await getAppPool().query(`
                    INSERT INTO notifications (user_id, type, title, message, sender_id, data)
                    VALUES (?, 'chat_message', 'New Message', ?, ?, ?)
                `, [
                    participant.user_id,
                    `${senderName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
                    senderId,
                    JSON.stringify({
                        conversation_id: conversationId,
                        message_id: messageId
                    })
                ]);
            }

        } catch (error) {
            console.error('❌ Error sending message notifications:', error);
        }
    }

    /**
     * Send notification to specific user
     */
    async sendNotificationToUser(userId, notification) {
        try {
            // Send real-time notification if user is online
            if (this.userSockets.has(userId)) {
                this.io.to(`user_${userId}`).emit('new_notification', notification);
            }

            // Always save to database
            await getAppPool().query(`
                INSERT INTO notifications (user_id, type, title, message, sender_id, data, priority)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                userId,
                notification.type,
                notification.title,
                notification.message,
                notification.sender_id || null,
                JSON.stringify(notification.data || {}),
                notification.priority || 'normal'
            ]);

        } catch (error) {
            console.error('❌ Error sending notification to user:', error);
        }
    }

    /**
     * Broadcast notification to multiple users
     */
    async broadcastNotification(userIds, notification) {
        for (const userId of userIds) {
            await this.sendNotificationToUser(userId, notification);
        }
    }

    /**
     * Get online users count
     */
    getOnlineUsersCount() {
        return this.userSockets.size;
    }

    /**
     * Handle log subscription
     */
    async handleSubscribeLogs(socket, data) {
        try {
            const { filters = {} } = data || {};
            
            // Store log filters on socket
            socket.logFilters = filters;
            socket.logSubscribed = true;
            
            // Join log streaming room
            socket.join('log_stream');
            
            console.log(`[WebSocket] User ${socket.userEmail} subscribed to log stream with filters:`, filters);
            
            // Send recent logs based on filters
            await this.sendRecentLogs(socket, filters);
            
            // Acknowledge subscription
            socket.emit('log_subscription_confirmed', {
                filters,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[WebSocket] Error subscribing to logs:', error);
            socket.emit('log_error', {
                message: 'Failed to subscribe to log stream',
                error: error.message
            });
        }
    }

    /**
     * Handle log unsubscription
     */
    handleUnsubscribeLogs(socket) {
        socket.logSubscribed = false;
        socket.logFilters = null;
        socket.leave('log_stream');
        
        console.log(`[WebSocket] User ${socket.userEmail} unsubscribed from log stream`);
        
        socket.emit('log_unsubscription_confirmed', {
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Handle log filter updates
     */
    async handleUpdateLogFilters(socket, data) {
        try {
            const { filters = {} } = data || {};
            
            socket.logFilters = filters;
            
            console.log(`[WebSocket] User ${socket.userEmail} updated log filters:`, filters);
            
            // Send recent logs with new filters
            await this.sendRecentLogs(socket, filters);
            
            socket.emit('log_filters_updated', {
                filters,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[WebSocket] Error updating log filters:', error);
            socket.emit('log_error', {
                message: 'Failed to update log filters',
                error: error.message
            });
        }
    }

    /**
     * Send recent logs to a socket
     */
    async sendRecentLogs(socket, filters = {}) {
        try {
            const { dbLogger } = require('../utils/dbLogger');
            
            const logFilters = {
                ...filters,
                limit: Math.min(filters.limit || 50, 100)
            };
            
            const logs = await dbLogger.getLogs(logFilters);
            
            // Send logs in reverse order (newest first)
            const recentLogs = logs.reverse();
            
            socket.emit('recent_logs', {
                logs: recentLogs,
                count: recentLogs.length,
                filters: logFilters,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[WebSocket] Error sending recent logs:', error);
            socket.emit('log_error', {
                message: 'Failed to fetch recent logs',
                error: error.message
            });
        }
    }

    /**
     * Broadcast new log entry to subscribed clients
     */
    broadcastLogEntry(logEntry) {
        if (!this.io) return;
        
        // Get all sockets in the log stream room
        const room = this.io.sockets.adapter.rooms.get('log_stream');
        
        if (!room) return;
        
        let sentCount = 0;
        
        // Send to each subscribed socket that matches filters
        room.forEach(socketId => {
            const socket = this.io.sockets.sockets.get(socketId);
            
            if (socket && socket.logSubscribed) {
                if (this.logMatchesFilters(logEntry, socket.logFilters)) {
                    socket.emit('new_log', {
                        log: logEntry,
                        timestamp: new Date().toISOString()
                    });
                    sentCount++;
                }
            }
        });
        
        if (sentCount > 0) {
            console.log(`[WebSocket] Broadcasted log to ${sentCount} clients`);
        }
    }

    /**
     * Check if log entry matches socket filters
     */
    logMatchesFilters(logEntry, filters) {
        if (!filters || Object.keys(filters).length === 0) {
            return true; // No filters = show all
        }

        // Level filter
        if (filters.level && logEntry.level !== filters.level) {
            return false;
        }

        // Source filter
        if (filters.source && !logEntry.source.toLowerCase().includes(filters.source.toLowerCase())) {
            return false;
        }

        // Service filter
        if (filters.service && logEntry.service !== filters.service) {
            return false;
        }

        // User email filter
        if (filters.user_email && logEntry.user_email !== filters.user_email) {
            return false;
        }

        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const searchableText = [
                logEntry.message,
                logEntry.source,
                logEntry.service || '',
                JSON.stringify(logEntry.meta || {})
            ].join(' ').toLowerCase();

            if (!searchableText.includes(searchLower)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get user's socket instances
     */
    getUserSockets(userId) {
        return this.userSockets.get(userId) || new Set();
    }

    /**
     * Check if user is online
     */
    isUserOnline(userId) {
        return this.userSockets.has(userId);
    }

    /**
     * Get conversation participants count
     */
    getConversationParticipants(conversationId) {
        return this.conversationRooms.get(conversationId) || new Set();
    }
}

module.exports = new WebSocketService(); 