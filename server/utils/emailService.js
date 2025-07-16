// server/utils/emailService.js
const nodemailer = require('nodemailer');
const path = require('path');

// Email templates
const getOCRReceiptTemplate = (sessionInfo, results) => {
  const { sessionId, recordType, churchId, userEmail, expiresAt } = sessionInfo;
  const { processedImages, extractedText, translatedText, confidence } = results;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #8c249d; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .result-card { background: #f9f9f9; border-left: 4px solid #8c249d; padding: 15px; margin: 10px 0; }
        .footer { background: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
        .download-link { background: #8c249d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        .metadata { background: #e8f4f8; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📄 OCR Processing Complete</h1>
        <p>Orthodox Church Records Management System</p>
    </div>
    
    <div class="content">
        <h2>Hello!</h2>
        <p>Your document OCR processing has been completed successfully. Here are the results:</p>
        
        <div class="metadata">
            <h3>📋 Session Details</h3>
            <p><strong>Session ID:</strong> ${sessionId}</p>
            <p><strong>Record Type:</strong> ${recordType.charAt(0).toUpperCase() + recordType.slice(1)}</p>
            <p><strong>Church ID:</strong> ${churchId}</p>
            <p><strong>Processed:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Images Processed:</strong> ${processedImages || 0}</p>
        </div>

        ${extractedText ? `
        <div class="result-card">
            <h3>🔍 Extracted Text</h3>
            <pre style="white-space: pre-wrap; font-family: monospace; background: white; padding: 10px; border-radius: 3px;">${extractedText}</pre>
            ${confidence ? `<p><em>Confidence Score: ${Math.round(confidence * 100)}%</em></p>` : ''}
        </div>
        ` : ''}

        ${translatedText ? `
        <div class="result-card">
            <h3>🌐 Translated Text</h3>
            <pre style="white-space: pre-wrap; font-family: monospace; background: white; padding: 10px; border-radius: 3px;">${translatedText}</pre>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/ocr/results/${sessionId}" class="download-link">
                📥 Download Full Results
            </a>
        </div>
        
        <p><em>⏰ Note: This download link will expire on ${new Date(expiresAt).toLocaleDateString()} for security reasons.</em></p>
        
        <h3>Next Steps:</h3>
        <ul>
            <li>Review the extracted text for accuracy</li>
            <li>Download the processed results before expiry</li>
            <li>Contact your church administrator if you need assistance</li>
        </ul>
    </div>
    
    <div class="footer">
        <p>© 2025 Orthodox Church Records Management System</p>
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>
  `;
};

// Create transporter
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
  };

  return nodemailer.createTransporter(config);
};

// Send OCR receipt email
const sendOCRReceipt = async (sessionInfo, results, attachments = []) => {
  try {
    const transporter = createTransporter();
    const { userEmail, sessionId, recordType } = sessionInfo;

    if (!userEmail) {
      throw new Error('No email address provided for receipt');
    }

    const mailOptions = {
      from: `"Orthodox Church Records" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `OCR Processing Complete - ${recordType.charAt(0).toUpperCase() + recordType.slice(1)} Record (${sessionId.substring(0, 8)})`,
      html: getOCRReceiptTemplate(sessionInfo, results),
      attachments: attachments // Array of {filename, content, contentType}
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ OCR receipt email sent:', {
      messageId: info.messageId,
      to: userEmail,
      sessionId: sessionId
    });

    return {
      success: true,
      messageId: info.messageId,
      recipient: userEmail
    };

  } catch (error) {
    console.error('❌ Error sending OCR receipt email:', error);
    throw error;
  }
};

// Send session verification email
const sendSessionVerification = async (sessionInfo) => {
  try {
    const transporter = createTransporter();
    const { userEmail, sessionId, pin, expiresAt, recordType } = sessionInfo;

    if (!userEmail) {
      return { success: false, reason: 'No email provided' };
    }

    const verificationTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #8c249d; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .pin-box { background: #f0f8ff; border: 2px solid #8c249d; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
        .pin { font-size: 24px; font-weight: bold; color: #8c249d; letter-spacing: 3px; }
        .footer { background: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 Session Verification</h1>
        <p>Orthodox Church Records Management System</p>
    </div>
    
    <div class="content">
        <h2>Your OCR Session is Ready</h2>
        <p>A new OCR session has been created for processing your ${recordType} records.</p>
        
        <div class="pin-box">
            <h3>📱 Verification PIN</h3>
            <div class="pin">${pin}</div>
            <p>Use this PIN to verify your session when scanning the QR code</p>
        </div>
        
        <h3>📋 Session Details:</h3>
        <ul>
            <li><strong>Session ID:</strong> ${sessionId}</li>
            <li><strong>Record Type:</strong> ${recordType.charAt(0).toUpperCase() + recordType.slice(1)}</li>
            <li><strong>Expires:</strong> ${new Date(expiresAt).toLocaleString()}</li>
        </ul>
        
        <h3>🚀 How to Use:</h3>
        <ol>
            <li>Scan the QR code displayed on the screen</li>
            <li>Enter the PIN: <strong>${pin}</strong></li>
            <li>Upload your document images</li>
            <li>Wait for processing to complete</li>
            <li>Receive your results via email</li>
        </ol>
    </div>
    
    <div class="footer">
        <p>© 2025 Orthodox Church Records Management System</p>
        <p>This PIN will expire on ${new Date(expiresAt).toLocaleString()}</p>
    </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"Orthodox Church Records" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `OCR Session Created - PIN: ${pin}`,
      html: verificationTemplate
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Session verification email sent:', {
      messageId: info.messageId,
      to: userEmail,
      sessionId: sessionId
    });

    return {
      success: true,
      messageId: info.messageId,
      recipient: userEmail
    };

  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

// Send error notification email
const sendErrorNotification = async (sessionInfo, error) => {
  try {
    const transporter = createTransporter();
    const { userEmail, sessionId, recordType } = sessionInfo;

    if (!userEmail) {
      return { success: false, reason: 'No email provided' };
    }

    const errorTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .error-box { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { background: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚠️ OCR Processing Error</h1>
        <p>Orthodox Church Records Management System</p>
    </div>
    
    <div class="content">
        <h2>Processing Error Occurred</h2>
        <p>We encountered an issue while processing your ${recordType} records.</p>
        
        <div class="error-box">
            <h3>🔍 Error Details:</h3>
            <p><strong>Session ID:</strong> ${sessionId}</p>
            <p><strong>Error:</strong> ${error.message || 'Unknown error occurred'}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <h3>🛠️ What to do next:</h3>
        <ul>
            <li>Check that your images are clear and readable</li>
            <li>Ensure images are in supported formats (JPG, PNG, PDF)</li>
            <li>Try creating a new session and re-uploading</li>
            <li>Contact support if the problem persists</li>
        </ul>
        
        <p>We apologize for the inconvenience. Please try again or contact your church administrator for assistance.</p>
    </div>
    
    <div class="footer">
        <p>© 2025 Orthodox Church Records Management System</p>
        <p>Session ID: ${sessionId}</p>
    </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"Orthodox Church Records" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `OCR Processing Error - Session ${sessionId.substring(0, 8)}`,
      html: errorTemplate
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Error notification email sent:', {
      messageId: info.messageId,
      to: userEmail,
      sessionId: sessionId
    });

    return {
      success: true,
      messageId: info.messageId,
      recipient: userEmail
    };

  } catch (emailError) {
    console.error('❌ Error sending error notification email:', emailError);
    return { success: false, error: emailError.message };
  }
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return { success: true };
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOCRReceipt,
  sendSessionVerification,
  sendErrorNotification,
  testEmailConfig
};
