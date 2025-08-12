const { getAppPool } = require('../../config/db-compat');
// Email Notification Utility for Church Provisioning
// Sends multilingual emails during the provisioning process

const nodemailer = require('nodemailer');
const db = require('../../config/db-compat');
const logger = require('./logger');

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'localhost',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@orthodoxmetrics.com';
const FROM_NAME = process.env.FROM_NAME || 'OrthodoxMetrics Team';

// Create transporter
let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (process.env.NODE_ENV === 'development') {
      // Use ethereal email for development
      transporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'ethereal.user@ethereal.email',
          pass: 'ethereal.pass'
        }
      });
    } else {
      transporter = nodemailer.createTransporter(EMAIL_CONFIG);
    }
  }
  return transporter;
}

// Send provision email
async function sendProvisionEmail(queueId, templateType, extraData = {}) {
  try {
    logger.info(`Sending ${templateType} email for queue ${queueId}`);

    // Get queue entry with church data
    const [queueRows] = await getAppPool().query(`
      SELECT 
        cpq.*,
        c.name as church_name,
        c.location as church_location,
        c.contact_email,
        c.contact_name
      FROM church_provision_queue cpq
      LEFT JOIN churches c ON cpq.church_id = c.id
      WHERE cpq.id = ?
    `, [queueId]);

    if (queueRows.length === 0) {
      throw new Error(`Queue entry ${queueId} not found`);
    }

    const queueEntry = queueRows[0];
    const language = queueEntry.language_preference || 'en';

    // Get email template
    const [templateRows] = await getAppPool().query(`
      SELECT subject_template, body_template
      FROM provision_notification_templates
      WHERE language_code = ? AND template_type = ? AND is_active = TRUE
    `, [language, templateType]);

    if (templateRows.length === 0) {
      // Fallback to English if language template not found
      const [englishRows] = await getAppPool().query(`
        SELECT subject_template, body_template
        FROM provision_notification_templates
        WHERE language_code = 'en' AND template_type = ? AND is_active = TRUE
      `, [templateType]);

      if (englishRows.length === 0) {
        throw new Error(`No email template found for type: ${templateType}`);
      }

      templateRows.push(englishRows[0]);
    }

    const template = templateRows[0];

    // Prepare template variables
    const templateVars = {
      contactName: queueEntry.contact_name || 'Dear Friend',
      churchName: queueEntry.church_name,
      churchLocation: queueEntry.church_location,
      siteSlug: queueEntry.site_slug,
      adminEmail: queueEntry.admin_email,
      ...extraData
    };

    // If we have a site URL, use it, otherwise construct it
    if (extraData.siteUrl) {
      templateVars.siteUrl = extraData.siteUrl;
    } else if (queueEntry.site_slug) {
      templateVars.siteUrl = `${process.env.BASE_URL || 'https://orthodoxmetrics.com'}/churches/${queueEntry.site_slug}`;
    }

    // Process template variables
    const subject = processTemplate(template.subject_template, templateVars);
    const body = processTemplate(template.body_template, templateVars);

    // Send email
    const mailOptions = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: queueEntry.admin_email,
      subject: subject,
      text: body,
      html: convertToHtml(body),
      headers: {
        'X-Church-Queue-ID': queueId,
        'X-Church-Slug': queueEntry.site_slug,
        'X-Template-Type': templateType,
        'X-Language': language
      }
    };

    const transporter = getTransporter();
    const result = await transporter.sendMail(mailOptions);

    logger.info(`Email sent successfully to ${queueEntry.admin_email}:`, result.messageId);

    // Log email in database
    await logEmailSent({
      queueId,
      templateType,
      recipient: queueEntry.admin_email,
      subject,
      messageId: result.messageId,
      language
    });

    return {
      success: true,
      messageId: result.messageId,
      recipient: queueEntry.admin_email,
      subject,
      templateType
    };

  } catch (error) {
    logger.error(`Failed to send ${templateType} email for queue ${queueId}:`, error);
    
    // Log failed email attempt
    try {
      await logEmailFailed({
        queueId,
        templateType,
        error: error.message
      });
    } catch (logError) {
      logger.error('Failed to log email failure:', logError);
    }

    return {
      success: false,
      error: error.message
    };
  }
}

// Process template with variables
function processTemplate(template, variables) {
  let processed = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    processed = processed.replace(new RegExp(placeholder, 'g'), value || '');
  }
  
  return processed;
}

// Convert plain text to basic HTML
function convertToHtml(text) {
  return text
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/🔗 (https?:\/\/[^\s]+)/g, '🔗 <a href="$1" style="color: #007bff; text-decoration: none;">$1</a>')
    .replace(/📧 ([^\s]+@[^\s]+)/g, '📧 <a href="mailto:$1" style="color: #007bff; text-decoration: none;">$1</a>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// Log successful email
async function logEmailSent({ queueId, templateType, recipient, subject, messageId, language }) {
  try {
    await getAppPool().query(`
      INSERT INTO provision_email_log (
        queue_id, template_type, recipient, subject, message_id, 
        language, status, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'sent', NOW())
    `, [queueId, templateType, recipient, subject, messageId, language]);
  } catch (error) {
    logger.error('Failed to log email:', error);
  }
}

// Log failed email
async function logEmailFailed({ queueId, templateType, error }) {
  try {
    await getAppPool().query(`
      INSERT INTO provision_email_log (
        queue_id, template_type, status, error_message, created_at
      ) VALUES (?, ?, 'failed', ?, NOW())
    `, [queueId, templateType, error]);
  } catch (logError) {
    logger.error('Failed to log email failure:', logError);
  }
}

// Send custom email (for manual notifications)
async function sendCustomEmail({ to, subject, body, language = 'en', churchSlug = null }) {
  try {
    const transporter = getTransporter();
    
    const mailOptions = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: to,
      subject: subject,
      text: body,
      html: convertToHtml(body),
      headers: {
        'X-Language': language,
        'X-Church-Slug': churchSlug,
        'X-Email-Type': 'custom'
      }
    };

    const result = await transporter.sendMail(mailOptions);
    
    logger.info(`Custom email sent successfully to ${to}:`, result.messageId);
    
    return {
      success: true,
      messageId: result.messageId
    };

  } catch (error) {
    logger.error(`Failed to send custom email to ${to}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Send bulk emails (for announcements)
async function sendBulkEmails({ recipients, subject, body, language = 'en' }) {
  const results = [];
  
  for (const recipient of recipients) {
    try {
      const result = await sendCustomEmail({
        to: recipient.email,
        subject: processTemplate(subject, recipient),
        body: processTemplate(body, recipient),
        language,
        churchSlug: recipient.churchSlug
      });
      
      results.push({
        recipient: recipient.email,
        ...result
      });
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      results.push({
        recipient: recipient.email,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

// Test email configuration
async function testEmailConfig() {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    
    logger.info('Email configuration is valid');
    return { success: true };
    
  } catch (error) {
    logger.error('Email configuration test failed:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Get email templates for a language
async function getEmailTemplates(language = 'en') {
  try {
    const [rows] = await getAppPool().query(`
      SELECT template_type, subject_template, body_template
      FROM provision_notification_templates
      WHERE language_code = ? AND is_active = TRUE
      ORDER BY template_type
    `, [language]);

    return {
      success: true,
      templates: rows
    };

  } catch (error) {
    logger.error(`Failed to get email templates for ${language}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Update email template
async function updateEmailTemplate({ language, templateType, subjectTemplate, bodyTemplate }) {
  try {
    const [result] = await getAppPool().query(`
      UPDATE provision_notification_templates 
      SET subject_template = ?, body_template = ?, updated_at = NOW()
      WHERE language_code = ? AND template_type = ?
    `, [subjectTemplate, bodyTemplate, language, templateType]);

    if (result.affectedRows === 0) {
      // Insert new template if it doesn't exist
      await getAppPool().query(`
        INSERT INTO provision_notification_templates 
        (language_code, template_type, subject_template, body_template)
        VALUES (?, ?, ?, ?)
      `, [language, templateType, subjectTemplate, bodyTemplate]);
    }

    logger.info(`Updated email template: ${language}/${templateType}`);
    
    return { success: true };

  } catch (error) {
    logger.error(`Failed to update email template ${language}/${templateType}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Create email log table if it doesn't exist
async function initializeEmailLog() {
  try {
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS provision_email_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        queue_id INT,
        template_type VARCHAR(50),
        recipient VARCHAR(255),
        subject TEXT,
        message_id VARCHAR(255),
        language VARCHAR(5),
        status ENUM('sent', 'failed', 'bounced') DEFAULT 'sent',
        error_message TEXT,
        sent_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_queue_id (queue_id),
        INDEX idx_template_type (template_type),
        INDEX idx_status (status),
        INDEX idx_sent_at (sent_at)
      )
    `);
    
    logger.info('Email log table initialized');
    
  } catch (error) {
    logger.error('Failed to initialize email log table:', error);
  }
}

// Initialize email system
async function initializeEmailSystem() {
  await initializeEmailLog();
  return testEmailConfig();
}

module.exports = {
  sendProvisionEmail,
  sendCustomEmail,
  sendBulkEmails,
  testEmailConfig,
  getEmailTemplates,
  updateEmailTemplate,
  initializeEmailSystem
};
