// server/utils/emailService.js
const nodemailer = require('nodemailer');
const path = require('path');
const { getActiveEmailConfig } = require('../api/settings');

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

// Create transporter with dynamic configuration
const createTransporter = async () => {
  try {
    // Try to get configuration from database first
    const dbConfig = await getActiveEmailConfig();
    
    if (dbConfig) {
      console.log(`📧 Using database email config: ${dbConfig.provider} (${dbConfig.smtp_host}:${dbConfig.smtp_port})`);
      
      // Only include auth if password is provided and not empty
      const hasPassword = dbConfig.smtp_pass && dbConfig.smtp_pass.trim() !== '';
      
      if (!hasPassword) {
        console.warn('⚠️ No SMTP password found in database config - email sending may fail');
      }
      
      const config = {
        host: dbConfig.smtp_host,
        port: dbConfig.smtp_port,
        secure: dbConfig.smtp_secure,
      };
      
      // Only add auth if we have both user and password
      if (dbConfig.smtp_user && hasPassword) {
        config.auth = {
          user: dbConfig.smtp_user,
          pass: dbConfig.smtp_pass,
        };
      } else if (dbConfig.smtp_user) {
        // User but no password - this will likely fail, but we'll let nodemailer handle it
        console.warn('⚠️ SMTP user configured but password is missing');
        config.auth = {
          user: dbConfig.smtp_user,
          pass: '',
        };
      }

      return nodemailer.createTransport(config);
    } else {
      // Fallback to environment variables
      console.log('📧 Using environment variable email config (fallback)');
      
      const config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || process.env.EMAIL_USER,
          pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
        },
      };

      return nodemailer.createTransport(config);
    }
  } catch (error) {
    console.error('Failed to get email config from database, using environment variables:', error);
    
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      },
    };

    return nodemailer.createTransport(config);
  }
};

// Send OCR receipt email
const sendOCRReceipt = async (sessionInfo, results, attachments = []) => {
  try {
    const transporter = await createTransporter();
    const { userEmail, sessionId, recordType } = sessionInfo;

    if (!userEmail) {
      throw new Error('No email address provided for receipt');
    }

    // Get sender info from database config or fallback to environment
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'Orthodox Church Records';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
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
    const transporter = await createTransporter();
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

    // Get sender info from database config or fallback to environment
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'Orthodox Church Records';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
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
    const transporter = await createTransporter();
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
    const transporter = await createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return { success: true };
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
    return { success: false, error: error.message };
  }
};

// OMAI Task Assignment Email Templates
const getTaskAssignmentTemplate = (taskURL, email) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #8c249d; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .button { 
            display: inline-block; 
            background: #8c249d; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
            font-weight: bold;
        }
        .footer { background: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
        .highlight { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📝 Task Assignment Invitation</h1>
        <p>Orthodox Metrics AI System</p>
    </div>
    
    <div class="content">
        <h2>Hello!</h2>
        <p>You've been invited to assign tasks to Nick through the OMAI Task Assignment System.</p>
        
        <div class="highlight">
            <h3>🎯 How it works:</h3>
            <ul>
                <li><strong>Click the link below</strong> to access your secure task form</li>
                <li><strong>Add multiple tasks</strong> with titles, descriptions, and priorities</li>
                <li><strong>Submit instantly</strong> - tasks are sent directly to Nick at next1452@gmail.com</li>
                <li><strong>No account required</strong> - just use this secure link</li>
            </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${taskURL}" class="button">
                📋 Assign Tasks to Nick
            </a>
        </div>
        
        <p><strong>Direct Link:</strong> <a href="${taskURL}">${taskURL}</a></p>
        
        <div class="highlight">
            <h3>📋 Task Priorities Available:</h3>
            <ul>
                <li><strong>🔥 High Priority</strong> - Urgent tasks requiring immediate attention</li>
                <li><strong>⚠️ Medium Priority</strong> - Standard tasks for regular workflow</li>
                <li><strong>🧊 Low Priority</strong> - Nice-to-have tasks for when time permits</li>
            </ul>
        </div>
        
        <p><em>⏰ Note: This link expires in 30 days for security reasons.</em></p>
        
        <h3>Questions?</h3>
        <p>If you have any questions about the task assignment system, please contact Nick directly at next1452@gmail.com.</p>
    </div>
    
    <div class="footer">
        <p>© 2025 Orthodox Metrics AI System</p>
        <p>This is an automated message from OMAI.</p>
        <p>Recipient: ${email}</p>
    </div>
</body>
</html>
  `;
};

const getTaskSubmissionTemplate = (fromEmail, tasks, submissionId) => {
  const OMAIRequest = require('./OMAIRequest');
  const tasksHTML = OMAIRequest.formatTasksForEmail(tasks);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #8c249d; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .task-list { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { background: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
        .metadata { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .priority-high { border-left: 4px solid #ff4444; }
        .priority-medium { border-left: 4px solid #ff9944; }
        .priority-low { border-left: 4px solid #44ff44; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📬 New Task Assignment</h1>
        <p>OMAI Task Assignment System</p>
    </div>
    
    <div class="content">
        <h2>Hi Nick!</h2>
        <p>You have received ${tasks.length} new task${tasks.length > 1 ? 's' : ''} through the OMAI Task Assignment System.</p>
        
        <div class="metadata">
            <h3>📋 Submission Details</h3>
            <p><strong>From:</strong> ${fromEmail}</p>
            <p><strong>Submission ID:</strong> #${submissionId}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Tasks:</strong> ${tasks.length}</p>
        </div>

        <div class="task-list">
            <h3>🎯 Tasks Assigned:</h3>
            ${tasksHTML}
        </div>
        
        <h3>📊 Quick Summary:</h3>
        <ul>
            <li><strong>🔥 High Priority:</strong> ${tasks.filter(t => ['🔥', 'high'].includes(t.priority)).length} tasks</li>
            <li><strong>⚠️ Medium Priority:</strong> ${tasks.filter(t => ['⚠️', 'medium'].includes(t.priority)).length} tasks</li>
            <li><strong>🧊 Low Priority:</strong> ${tasks.filter(t => ['🧊', 'low'].includes(t.priority)).length} tasks</li>
        </ul>
        
        <h3>Next Steps:</h3>
        <ul>
            <li>Review the task priorities and descriptions</li>
            <li>Contact ${fromEmail} if you need clarification on any tasks</li>
            <li>Add tasks to your preferred project management system</li>
        </ul>
        
        <p><em>💡 Tip: You can reply directly to ${fromEmail} from this email to discuss the tasks.</em></p>
    </div>
    
    <div class="footer">
        <p>© 2025 Orthodox Metrics AI System</p>
        <p>This task assignment was processed automatically by OMAI.</p>
        <p>Submission ID: #${submissionId} | Generated: ${new Date().toISOString()}</p>
    </div>
</body>
</html>
  `;
};

// Send task assignment email
const sendTaskAssignmentEmail = async (email, taskURL, token) => {
  try {
    const transporter = await createTransporter();
    const htmlContent = getTaskAssignmentTemplate(taskURL, email);

    // Get sender info from database config or fallback
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'OMAI Task System';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: email,
      subject: '📝 Task Assignment Invitation - Orthodox Metrics AI',
      html: htmlContent,
      headers: {
        'X-OMAI-Type': 'task-assignment',
        'X-OMAI-Token': token.substring(0, 8) + '...',
        'X-Priority': '1'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Task assignment email sent to ${email}:`, info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
      email: email
    };
  } catch (error) {
    console.error(`❌ Failed to send task assignment email to ${email}:`, error);
    throw error;
  }
};

// Send task submission email to Nick
const sendTaskSubmissionEmail = async (fromEmail, tasks, submissionId) => {
  try {
    const transporter = await createTransporter();
    const htmlContent = getTaskSubmissionTemplate(fromEmail, tasks, submissionId);

    // Get sender info from database config or fallback
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'OMAI Task System';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: 'next1452@gmail.com',
      replyTo: fromEmail,
      subject: `📬 New Task Assignment from ${fromEmail} (${tasks.length} tasks)`,
      html: htmlContent,
      headers: {
        'X-OMAI-Type': 'task-submission',
        'X-OMAI-Submission': submissionId,
        'X-OMAI-From': fromEmail,
        'X-OMAI-Task-Count': tasks.length,
        'X-Priority': '1'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Task submission email sent to Nick from ${fromEmail}:`, info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
      from: fromEmail,
      taskCount: tasks.length
    };
  } catch (error) {
    console.error(`❌ Failed to send task submission email from ${fromEmail}:`, error);
    throw error;
  }
};

// Send task creation email notification
const sendTaskCreationEmail = async (task, createdByEmail) => {
  try {
    const transporter = await createTransporter();
    
    // Build email content
    const taskUrl = `${process.env.FRONTEND_URL || 'https://orthodoxmetrics.com'}/devel-tools/om-tasks`;
    const adminUrl = `${process.env.FRONTEND_URL || 'https://orthodoxmetrics.com'}/admin/settings`;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8c249d; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .field { margin: 10px 0; }
    .label { font-weight: bold; color: #555; }
    .value { margin-left: 10px; }
    .tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
    .tag { background: #e0e0e0; padding: 3px 8px; border-radius: 3px; font-size: 0.9em; }
    .button { display: inline-block; padding: 10px 20px; background: #8c249d; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>📝 New OM Task Created</h2>
    </div>
    <div class="content">
      <div class="field">
        <span class="label">Title:</span>
        <span class="value">${task.title}</span>
      </div>
      <div class="field">
        <span class="label">Category:</span>
        <span class="value">${task.category}</span>
      </div>
      <div class="field">
        <span class="label">Type:</span>
        <span class="value">${task.type}</span>
      </div>
      <div class="field">
        <span class="label">Visibility:</span>
        <span class="value">${task.visibility}</span>
      </div>
      <div class="field">
        <span class="label">Importance:</span>
        <span class="value">${task.importance}</span>
      </div>
      <div class="field">
        <span class="label">Status:</span>
        <span class="value">${task.status}</span>
      </div>
      <div class="field">
        <span class="label">Tags:</span>
        <div class="tags">
          ${(task.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </div>
      <div class="field">
        <span class="label">Details:</span>
        <div class="value" style="white-space: pre-wrap; background: white; padding: 10px; border-radius: 3px; margin-top: 5px;">
          ${task.details.substring(0, 500)}${task.details.length > 500 ? '...' : ''}
        </div>
      </div>
      ${task.assigned_to ? `
      <div class="field">
        <span class="label">Assigned To:</span>
        <span class="value">${task.assigned_to}</span>
      </div>
      ` : ''}
      ${task.assigned_by ? `
      <div class="field">
        <span class="label">Assigned By:</span>
        <span class="value">${task.assigned_by}</span>
      </div>
      ` : ''}
      ${task.notes ? `
      <div class="field">
        <span class="label">Notes:</span>
        <div class="value" style="white-space: pre-wrap;">${task.notes}</div>
      </div>
      ` : ''}
      <div class="field">
        <span class="label">Created By:</span>
        <span class="value">${createdByEmail}</span>
      </div>
      <div class="field">
        <span class="label">Created At:</span>
        <span class="value">${new Date(task.created_at).toLocaleString()}</span>
      </div>
      
      <a href="${taskUrl}" class="button">View Task in Admin Panel</a>
    </div>
    <div class="footer">
      <p>This is an automated notification from the OM Tasks system.</p>
      <p>Task ID: ${task.id}</p>
    </div>
  </div>
</body>
</html>
    `;

    // Get sender info from database config or fallback
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'OMAI Task System';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: 'info@orthodoxmetrics.com',
      subject: `[OM-TASKS] New Task Created: ${task.title} (${task.category} / ${task.type} / ${task.visibility})`,
      html: htmlContent,
      headers: {
        'X-OMAI-Type': 'task-creation',
        'X-OMAI-Task-Id': task.id,
        'X-OMAI-Task-Type': task.type,
        'X-OMAI-Task-Visibility': task.visibility,
        'X-Priority': '1'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Task creation email sent to info@orthodoxmetrics.com for task ${task.id}:`, info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
      taskId: task.id
    };
  } catch (error) {
    console.error(`❌ Failed to send task creation email for task ${task.id}:`, error);
    throw error;
  }
};

module.exports = {
  sendOCRReceipt,
  sendSessionVerification,
  sendErrorNotification,
  testEmailConfig,
  sendTaskAssignmentEmail,
  sendTaskSubmissionEmail,
  sendTaskCreationEmail
};
