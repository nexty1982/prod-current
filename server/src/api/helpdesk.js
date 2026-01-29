const express = require('express');
const router = express.Router();
const FreeScoutAPI = require('../../integrations/freescout-api');

const freescout = new FreeScoutAPI();

// Health check endpoint
router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'helpdesk-api',
    freescout: {
      configured: !!(process.env.FREESCOUT_API_URL && process.env.FREESCOUT_API_KEY),
      url: process.env.FREESCOUT_API_URL ? process.env.FREESCOUT_API_URL.replace(/\/api.*/, '') : null,
    },
  };

  if (health.freescout.configured) {
    try {
      const start = Date.now();
      await freescout.client.get('/conversations', {
        params: { mailboxId: freescout.mailboxId, page: 1, pageSize: 1 },
        timeout: 5000,
      });
      health.freescout.status = 'connected';
      health.freescout.responseTimeMs = Date.now() - start;
    } catch (error) {
      health.freescout.status = 'error';
      health.freescout.error = error.message;
      health.status = 'degraded';
    }
  } else {
    health.freescout.status = 'not_configured';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Get user's tickets
router.get('/tickets', async (req, res) => {
  try {
    if (!req.session?.user?.email) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const tickets = await freescout.getTicketsByEmail(req.session.user.email);
    res.json({ success: true, tickets });
  } catch (error) {
    console.error('Error fetching helpdesk tickets:', error);
    res.json({ success: true, tickets: [] });
  }
});

// Create new ticket
router.post('/tickets', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const { subject, body } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ success: false, message: 'Subject and body required' });
    }
    const ticket = await freescout.createTicket({
      subject,
      body,
      customerEmail: req.session.user.email,
      customerName: req.session.user.name || req.session.user.username,
    });
    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Error creating helpdesk ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to create ticket' });
  }
});

// Get single ticket
router.get('/tickets/:id', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const ticket = await freescout.getTicket(req.params.id);
    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
  }
});

// Add reply to ticket
router.post('/tickets/:id/reply', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const { body } = req.body;
    if (!body) {
      return res.status(400).json({ success: false, message: 'Reply body required' });
    }
    const reply = await freescout.addReply(req.params.id, {
      body,
      userEmail: req.session.user.email,
    });
    res.json({ success: true, reply });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ success: false, message: 'Failed to add reply' });
  }
});

module.exports = router;
