const { getAppPool } = require('../config/db-compat');
// server/routes/settings.js
// System Settings API Routes
// Handles email configuration and other system settings

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { promisePool } = require('../config/db-compat');
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
    // Don't expose the password in response (if column exists)
    if (config.smtp_pass !== undefined) {
      delete config.smtp_pass;
    }

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

    // Validate required fields (smtp_pass is optional if updating existing config)
    if (!smtp_host || !smtp_port || !smtp_user || !sender_email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: smtp_host, smtp_port, smtp_user, sender_email'
      });
    }
    
    // Check if smtp_pass column exists first (needed for validation logic)
    let hasSmtpPassColumn = true;
    try {
      await getAppPool().query('SELECT smtp_pass FROM email_settings LIMIT 1');
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR' && err.message.includes('smtp_pass')) {
        hasSmtpPassColumn = false;
        // If column doesn't exist but user provided a password, add the column
        if (smtp_pass && smtp_pass.trim() !== '') {
          try {
            // Add column as nullable first, then update existing rows, then make it NOT NULL if needed
            await getAppPool().query(
              'ALTER TABLE email_settings ADD COLUMN smtp_pass VARCHAR(255) NULL'
            );
            // Update any existing rows to have empty string
            await getAppPool().query(
              'UPDATE email_settings SET smtp_pass = "" WHERE smtp_pass IS NULL'
            );
            hasSmtpPassColumn = true;
            console.log('✅ Added smtp_pass column to email_settings table');
          } catch (alterErr) {
            console.error('Failed to add smtp_pass column:', alterErr);
            // Continue without the column - password won't be saved
          }
        }
      } else {
        throw err; // Re-throw if it's a different error
      }
    }

    // Check for existing active configuration (without smtp_pass to avoid errors if column doesn't exist)
    const [existingRows] = await getAppPool().query(
      'SELECT id FROM email_settings WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 1'
    );
    
    // Determine if this is CREATE (new config) or UPDATE (existing config)
    let finalSmtpPass = smtp_pass && smtp_pass.trim() !== '' ? smtp_pass.trim() : null;
    let hasExistingConfig = existingRows.length > 0;
    let existingConfigId = hasExistingConfig ? existingRows[0].id : null;
    let existingPassword = null;
    
    // For UPDATE: Get existing password if column exists
    if (hasExistingConfig && hasSmtpPassColumn) {
      try {
        const [passRows] = await getAppPool().query(
          'SELECT smtp_pass FROM email_settings WHERE id = ?',
          [existingConfigId]
        );
        if (passRows.length > 0 && passRows[0].smtp_pass !== null && passRows[0].smtp_pass !== undefined) {
          const storedPass = passRows[0].smtp_pass;
          if (storedPass && storedPass.trim() !== '') {
            existingPassword = storedPass;
          }
        }
      } catch (err) {
        // Column might not exist, ignore
        console.warn('Could not retrieve existing password:', err.message);
      }
    }
    
    // Validation logic:
    // - CREATE: Password is REQUIRED if column exists
    // - UPDATE: Password is OPTIONAL - use provided one, or keep existing
    if (!hasExistingConfig) {
      // CREATE: Require password if column exists
      if (hasSmtpPassColumn && !finalSmtpPass) {
        return res.status(400).json({
          success: false,
          error: 'Password is required for new email configuration'
        });
      }
      // If column doesn't exist, allow without password (schema issue)
      if (!hasSmtpPassColumn && !finalSmtpPass) {
        console.warn('Creating email config without password - smtp_pass column does not exist in database');
      }
    } else {
      // UPDATE: Password is optional
      // If no password provided, use existing one (if available)
      if (!finalSmtpPass) {
        if (existingPassword) {
          finalSmtpPass = existingPassword; // Preserve existing password
        } else if (hasSmtpPassColumn) {
          // Column exists but no stored password and none provided - this is an error
          return res.status(400).json({
            success: false,
            error: 'Password is required. No existing password found in database.'
          });
        }
        // If column doesn't exist, we can't store password anyway
      }
      // If password was provided, use it (will update the stored password)
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

    let result;

    if (hasExistingConfig && existingConfigId) {
      // UPDATE existing configuration
      // Only update password if a new one was provided (not empty/whitespace)
      const passwordWasProvided = smtp_pass && smtp_pass.trim() !== '';
      
      if (hasSmtpPassColumn) {
        if (passwordWasProvided) {
          // Update WITH new password
          await getAppPool().query(
            `UPDATE email_settings SET 
             provider = ?, smtp_host = ?, smtp_port = ?, smtp_secure = ?, 
             smtp_user = ?, smtp_pass = ?, sender_name = ?, sender_email = ?, 
             updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [
              provider || 'Custom',
              smtp_host,
              parseInt(smtp_port),
              Boolean(smtp_secure),
              smtp_user,
              finalSmtpPass, // New password provided
              sender_name || 'OMAI Task System',
              sender_email,
              existingConfigId
            ]
          );
        } else {
          // Update WITHOUT changing password (preserve existing)
          // Only update other fields, leave smtp_pass unchanged
          await getAppPool().query(
            `UPDATE email_settings SET 
             provider = ?, smtp_host = ?, smtp_port = ?, smtp_secure = ?, 
             smtp_user = ?, sender_name = ?, sender_email = ?, 
             updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [
              provider || 'Custom',
              smtp_host,
              parseInt(smtp_port),
              Boolean(smtp_secure),
              smtp_user,
              sender_name || 'OMAI Task System',
              sender_email,
              existingConfigId
            ]
          );
        }
      } else {
        // Column doesn't exist - update without password
        await getAppPool().query(
          `UPDATE email_settings SET 
           provider = ?, smtp_host = ?, smtp_port = ?, smtp_secure = ?, 
           smtp_user = ?, sender_name = ?, sender_email = ?, 
           updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [
            provider || 'Custom',
            smtp_host,
            parseInt(smtp_port),
            Boolean(smtp_secure),
            smtp_user,
            sender_name || 'OMAI Task System',
            sender_email,
            existingConfigId
          ]
        );
      }
      result = { insertId: existingConfigId };
    } else {
      // Mark current active config as inactive (if any)
      await getAppPool().query(
        'UPDATE email_settings SET is_active = FALSE WHERE is_active = TRUE'
      );

      // Insert new configuration
      if (hasSmtpPassColumn && finalSmtpPass) {
        // Insert with password column
        [result] = await getAppPool().query(
          `INSERT INTO email_settings 
           (provider, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, sender_name, sender_email, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            provider || 'Custom',
            smtp_host,
            parseInt(smtp_port),
            Boolean(smtp_secure),
            smtp_user,
            finalSmtpPass,
            sender_name || 'OMAI Task System',
            sender_email
          ]
        );
      } else {
        // Insert without password column (column doesn't exist)
        [result] = await getAppPool().query(
          `INSERT INTO email_settings 
           (provider, smtp_host, smtp_port, smtp_secure, smtp_user, sender_name, sender_email, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            provider || 'Custom',
            smtp_host,
            parseInt(smtp_port),
            Boolean(smtp_secure),
            smtp_user,
            sender_name || 'OMAI Task System',
            sender_email
          ]
        );
      }
    }

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
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update email settings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      'SELECT id, provider, smtp_host, smtp_port, smtp_secure, smtp_user, sender_name, sender_email, is_active, updated_at FROM email_settings WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active email configuration found'
      });
    }

    const config = rows[0];
    
    // Try to get password if column exists
    let smtpPassword = null;
    try {
      const [passRows] = await getAppPool().query(
        'SELECT smtp_pass FROM email_settings WHERE id = ?',
        [config.id]
      );
      if (passRows.length > 0 && passRows[0].smtp_pass !== null && passRows[0].smtp_pass !== undefined) {
        const pass = passRows[0].smtp_pass;
        // Only use password if it's not empty (empty string means not set)
        if (pass && pass.trim() !== '') {
          smtpPassword = pass;
        }
      }
    } catch (err) {
      // Column doesn't exist, password will be null
      if (err.code === 'ER_BAD_FIELD_ERROR' && err.message.includes('smtp_pass')) {
        console.warn('smtp_pass column not found, email test may fail without password');
      } else {
        throw err; // Re-throw if it's a different error
      }
    }
    
    if (!smtpPassword || smtpPassword.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'SMTP password is not configured. Please set a password in email settings.'
      });
    }

    // Create transporter with current settings
    const transporter = nodemailer.createTransporter({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      auth: {
        user: config.smtp_user,
        pass: smtpPassword,
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
      'SELECT id, provider, smtp_host, smtp_port, smtp_secure, smtp_user, sender_name, sender_email, is_active, updated_at FROM email_settings WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 1'
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const config = rows[0];
    
    // Try to get password if column exists
    try {
      const [passRows] = await getAppPool().query(
        'SELECT smtp_pass FROM email_settings WHERE id = ?',
        [config.id]
      );
      if (passRows.length > 0 && passRows[0].smtp_pass !== null && passRows[0].smtp_pass !== undefined && passRows[0].smtp_pass.trim() !== '') {
        config.smtp_pass = passRows[0].smtp_pass;
      } else {
        // Password is null, undefined, or empty string - set to undefined so it's not passed to nodemailer
        config.smtp_pass = undefined;
      }
    } catch (err) {
      // Column doesn't exist, password will be undefined
      console.warn('smtp_pass column not found in email_settings table');
      config.smtp_pass = undefined;
    }
    
    return config;
  } catch (error) {
    console.error('Error fetching active email config:', error);
    return null;
  }
};

// Export utility function for other modules

// =====================================================
// USER TABLE SETTINGS ENDPOINTS
// =====================================================

// GET /api/settings/table-view - Get user table view settings
router.get("/table-view", async (req, res) => {
  try {
    const { churchId, table } = req.query;
    const userId = req.session?.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    if (!churchId || !table) {
      return res.status(400).json({ success: false, error: "churchId and table parameters are required" });
    }

    const [rows] = await getAppPool().query(
      "SELECT settings_json FROM user_table_settings WHERE user_id = ? AND church_id = ? AND table_name = ? ORDER BY updated_at DESC LIMIT 1",
      [userId, churchId, table]
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        data: {
          columns: { visible: [], order: [] },
          autoHideEmpty: false,
          defaultSort: { field: "", order: "desc" }
        }
      });
    }

    const settings = JSON.parse(rows[0].settings_json);
    res.json({ success: true, data: settings });

  } catch (error) {
    console.error("Error fetching table settings:", error);
    res.status(500).json({ success: false, error: "Failed to fetch table settings" });
  }
});

// POST /api/settings/table-view - Save user table view settings
router.post("/table-view", async (req, res) => {
  try {
    const { churchId, table, settings } = req.body;
    const userId = req.session?.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    if (!churchId || !table || !settings) {
      return res.status(400).json({ success: false, error: "churchId, table, and settings are required" });
    }

    // Validate settings structure
    if (!settings.columns || !settings.defaultSort) {
      return res.status(400).json({ success: false, error: "Invalid settings structure" });
    }

    const settingsJson = JSON.stringify(settings);

    // Check if settings already exist
    const [existingRows] = await getAppPool().query(
      "SELECT id FROM user_table_settings WHERE user_id = ? AND church_id = ? AND table_name = ?",
      [userId, churchId, table]
    );

    if (existingRows.length > 0) {
      // Update existing settings
      await getAppPool().query(
        "UPDATE user_table_settings SET settings_json = ?, updated_at = NOW() WHERE user_id = ? AND church_id = ? AND table_name = ?",
        [settingsJson, userId, churchId, table]
      );
    } else {
      // Insert new settings
      await getAppPool().query(
        "INSERT INTO user_table_settings (user_id, church_id, table_name, settings_json, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [userId, churchId, table, settingsJson]
      );
    }

    console.log(`✅ Table settings saved for user ${userId}, church ${churchId}, table ${table}`);

    res.json({
      success: true,
      message: "Table settings saved successfully",
      data: settings
    });

  } catch (error) {
    console.error("Error saving table settings:", error);
    res.status(500).json({ success: false, error: "Failed to save table settings" });
  }
});

module.exports = router;
module.exports.getActiveEmailConfig = getActiveEmailConfig; 