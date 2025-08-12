const { getAppPool } = require('../../config/db-compat');
// server/routes/settings.js
// System Settings API Routes
// Handles email configuration and other system settings

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { promisePool } = require('../../config/db-compat');
const { authMiddleware } = require('../middleware/auth');

// Middleware to require authentication for all settings endpoints
router.use(authMiddleware);

// Helper function to check admin roles
const requireAdminRole = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  const userRole = req.session.user.role;
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  
  next();
};

// =====================================================
// EMAIL SETTINGS ENDPOINTS
// =====================================================

// GET /api/settings/email - Get current email configuration
router.get('/email', requireAdminRole, async (req, res) => {
  try {
    const [rows] = await getAppPool().query(
      'SELECT id, provider, smtp_host, smtp_port, smtp_secure, smtp_user, sender_name, sender_email, is_active, updated_at FROM email_settings WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No email configuration found'
      });
    }

    const config = rows[0];
    // Don't expose the password in response
    delete config.smtp_pass;

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email settings'
    });
  }
});

// POST /api/settings/email - Update email configuration
router.post('/email', requireAdminRole, async (req, res) => {
  try {
    const {
      provider,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_pass,
      sender_name,
      sender_email
    } = req.body;

    // Validate required fields
    if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass || !sender_email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: smtp_host, smtp_port, smtp_user, smtp_pass, sender_email'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sender_email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sender email format'
      });
    }

    // Validate port range
    if (smtp_port < 1 || smtp_port > 65535) {
      return res.status(400).json({
        success: false,
        error: 'SMTP port must be between 1 and 65535'
      });
    }

    // Mark current active config as inactive
    await getAppPool().query(
      'UPDATE email_settings SET is_active = FALSE WHERE is_active = TRUE'
    );

    // Insert new configuration
    const [result] = await getAppPool().query(
      `INSERT INTO email_settings 
       (provider, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, sender_name, sender_email, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        provider || 'Custom',
        smtp_host,
        parseInt(smtp_port),
        Boolean(smtp_secure),
        smtp_user,
        smtp_pass,
        sender_name || 'OMAI Task System',
        sender_email
      ]
    );

    console.log(`✅ Email settings updated by user ${req.session.user?.email || 'unknown'}`);

    res.json({
      success: true,
      message: 'Email settings updated successfully',
      data: {
        id: result.insertId,
        provider: provider || 'Custom',
        smtp_host,
        smtp_port: parseInt(smtp_port),
        smtp_secure: Boolean(smtp_secure),
        smtp_user,
        sender_name: sender_name || 'OMAI Task System',
        sender_email,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update email settings'
    });
  }
});

// POST /api/settings/email/test - Test email configuration
router.post('/email/test', requireAdminRole, async (req, res) => {
  try {
    const { test_email } = req.body;

    if (!test_email) {
      return res.status(400).json({
        success: false,
        error: 'Test email address is required'
      });
    }

    // Get current email configuration
    const [rows] = await getAppPool().query(
      'SELECT * FROM email_settings WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active email configuration found'
      });
    }

    const config = rows[0];

    // Create transporter with current settings
    const transporter = nodemailer.createTransporter({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass,
      },
    });

    // Verify connection
    await transporter.verify();

    // Send test email
    const testMailOptions = {
      from: `"${config.sender_name}" <${config.sender_email}>`,
      to: test_email,
      subject: '✅ Email Configuration Test - Orthodox Metrics',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background: #8c249d; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .footer { background: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>✅ Email Test Successful</h1>
                <p>Orthodox Metrics Email Configuration</p>
            </div>
            
            <div class="content">
                <h2>Congratulations!</h2>
                <p>Your email configuration is working correctly.</p>
                
                <h3>Configuration Details:</h3>
                <ul>
                    <li><strong>Provider:</strong> ${config.provider}</li>
                    <li><strong>SMTP Host:</strong> ${config.smtp_host}</li>
                    <li><strong>SMTP Port:</strong> ${config.smtp_port}</li>
                    <li><strong>Security:</strong> ${config.smtp_secure ? 'SSL/TLS' : 'STARTTLS'}</li>
                    <li><strong>Sender:</strong> ${config.sender_name} &lt;${config.sender_email}&gt;</li>
                </ul>
                
                <p>The OMAI Task Assignment system will now use this configuration for sending emails.</p>
            </div>
            
            <div class="footer">
                <p>© 2025 Orthodox Metrics AI System</p>
                <p>Email test sent at ${new Date().toISOString()}</p>
            </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(testMailOptions);
    
    console.log(`✅ Test email sent to ${test_email} via ${config.provider}`);

    res.json({
      success: true,
      message: 'Test email sent successfully',
      data: {
        test_email,
        message_id: info.messageId,
        provider: config.provider,
        smtp_host: config.smtp_host
      }
    });

  } catch (error) {
    console.error('Email test failed:', error);
    
    let errorMessage = 'Email test failed';
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your username and password.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Connection failed. Please check your SMTP host and port.';
    } else if (error.code === 'ESOCKET') {
      errorMessage = 'Socket error. Please check your network connection.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

// Get active email configuration for other services to use
const getActiveEmailConfig = async () => {
  try {
    const [rows] = await getAppPool().query(
      'SELECT * FROM email_settings WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 1'
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error fetching active email config:', error);
    return null;
  }
};

// Export utility function for other modules
module.exports = router;
module.exports.getActiveEmailConfig = getActiveEmailConfig; 