const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/auth');
// Support both development and production paths
let DatabaseService;
try {
    DatabaseService = require('../../services/databaseService');
} catch (e) {
    DatabaseService = require('../../services/databaseService');
}

let websocketService;
try {
    websocketService = require('../../services/websocketService');
} catch (e) {
    websocketService = require('../../services/websocketService');
}

/**
 * Admin Message API Routes
 * Allows admins to send instant messages to logged-in users
 */

// POST /api/admin/messages/send - Send a message to a user
router.post('/send', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { user_id, message } = req.body;
    const senderId = req.session?.user?.id || req.user?.id;

    if (!user_id || !message) {
      return res.status(400).json({
        success: false,
        message: 'user_id and message are required'
      });
    }

    if (!senderId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify target user exists
    const db = DatabaseService.getDatabase();
    const [users] = await db.query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = ?',
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Send message via WebSocket
    const result = await websocketService.sendAdminMessage(user_id, message, senderId);

    res.json({
      success: true,
      message: 'Message sent successfully',
      delivered: result.delivered,
      user: users[0]
    });

  } catch (error) {
    console.error('Error sending admin message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// POST /api/admin/messages/send-to-session - Send message to a specific session
router.post('/send-to-session', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { session_id, message } = req.body;
    const senderId = req.session?.user?.id || req.user?.id;

    if (!session_id || !message) {
      return res.status(400).json({
        success: false,
        message: 'session_id and message are required'
      });
    }

    // Extract user_id from session_id (format: jwt_{id})
    let tokenId = session_id;
    if (session_id.startsWith('jwt_')) {
      tokenId = session_id.replace('jwt_', '');
    }

    // Get user_id from refresh token
    const db = DatabaseService.getDatabase();
    const [tokens] = await db.query(
      'SELECT user_id FROM refresh_tokens WHERE id = ? AND expires_at > NOW()',
      [tokenId]
    );

    if (tokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or expired'
      });
    }

    const userId = tokens[0].user_id;

    // Send message via WebSocket
    const result = await websocketService.sendAdminMessage(userId, message, senderId);

    res.json({
      success: true,
      message: 'Message sent successfully',
      delivered: result.delivered
    });

  } catch (error) {
    console.error('Error sending message to session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

module.exports = router;

