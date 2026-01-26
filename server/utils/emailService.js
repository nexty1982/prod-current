/**
 * Email Service
 * Sends emails for Interactive Reports
 */

const nodemailer = require('nodemailer');

// Email configuration from environment variables
// GoDaddy email supports:
// - Microsoft 365: smtp.office365.com, port 587, STARTTLS (secure: false)
// - GoDaddy Workspace: smtpout.secureserver.net, port 465 (SSL) or 587 (TLS)
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtpout.secureserver.net', // Default to GoDaddy Workspace
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465', // SSL for port 465
  auth: {
    user: process.env.SMTP_USER, // Full email address: info@orthodoxmetrics.com
    pass: process.env.SMTP_PASS  // Your email account password
  },
  tls: {
    // Don't reject unauthorized certificates (some GoDaddy setups need this)
    rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
  }
};

const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SMTP_USER || 'info@orthodoxmetrics.com';
const FROM_NAME = process.env.FROM_NAME || 'OrthodoxMetrics';

// Create transporter (lazy initialization)
let transporter = null;

function getTransporter() {
  if (!transporter) {
    // If no SMTP config, use console logging fallback
    if (!process.env.SMTP_HOST && !process.env.SMTP_USER) {
      console.warn('⚠️  SMTP not configured. Emails will be logged to console only.');
      return null;
    }
    
    try {
      transporter = nodemailer.createTransport(EMAIL_CONFIG);
    } catch (error) {
      console.error('❌ Failed to create email transporter:', error);
      return null;
    }
  }
  return transporter;
}

// Base email sending function
async function sendEmail(options) {
  const { to, subject, html, text } = options;
  
  const transporter = getTransporter();
  
  // If no transporter (SMTP not configured), log to console
  if (!transporter) {
    console.log('📧 [EMAIL LOG] Would send email:', {
      to,
      subject,
      preview: html ? html.substring(0, 150).replace(/<[^>]*>/g, '') + '...' : text?.substring(0, 150) + '...',
    });
    console.log('📧 [EMAIL LOG] Full HTML:', html);
    console.log('📧 [EMAIL LOG] To enable actual email sending, configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS environment variables.');
    return;
  }
  
  try {
    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', {
      to,
      subject,
      messageId: result.messageId,
    });
    
    return result;
  } catch (error) {
    console.error('❌ Failed to send email:', {
      to,
      subject,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    // Don't throw - email failures shouldn't break the request
    // Just log the error and continue
    return null;
  }
}

/**
 * Send recipient invite email
 */
async function sendRecipientInvite(options) {
  const { to, reportTitle, link, expiresAt, churchName } = options;
  
  const subject = `Complete Records for ${reportTitle}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4C1D95; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4C1D95; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${churchName ? churchName : 'OrthodoxMetrics'}</h2>
        </div>
        <div class="content">
          <h3>Complete Records Request</h3>
          <p>You have been assigned records to complete for: <strong>${reportTitle}</strong></p>
          <p>Please use the link below to access the form and fill in the missing information:</p>
          <p style="text-align: center;">
            <a href="${link}" class="button">Complete Records</a>
          </p>
          <p><strong>Important:</strong> This link will expire on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}.</p>
          <p>If you have any questions, please contact the church office.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from OrthodoxMetrics.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Complete Records Request

You have been assigned records to complete for: ${reportTitle}

Please use the link below to access the form:
${link}

This link will expire on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}.

If you have any questions, please contact the church office.
  `;

  await sendEmail({ to, subject, html, text });
}

/**
 * Send priest summary email
 */
async function sendPriestSummary(options) {
  const { to, reportTitle, link, submittedBy, counts, churchName } = options;
  
  const subject = `Updates Submitted for ${reportTitle}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4C1D95; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4C1D95; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${churchName ? churchName : 'OrthodoxMetrics'}</h2>
        </div>
        <div class="content">
          <h3>Updates Submitted</h3>
          <p><strong>${submittedBy}</strong> has submitted <strong>${counts.patchCount}</strong> update(s) for review.</p>
          <p>Report: <strong>${reportTitle}</strong></p>
          <p style="text-align: center;">
            <a href="${link}" class="button">Review Updates</a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated message from OrthodoxMetrics.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Updates Submitted

${submittedBy} has submitted ${counts.patchCount} update(s) for review.

Report: ${reportTitle}

Review updates: ${link}
  `;

  await sendEmail({ to, subject, html, text });
}

module.exports = {
  sendEmail,
  sendRecipientInvite,
  sendPriestSummary,
};
