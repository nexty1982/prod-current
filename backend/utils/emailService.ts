/**
 * Email Service
 * Sends emails for Interactive Reports
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface RecipientInviteOptions {
  to: string;
  reportTitle: string;
  link: string;
  expiresAt: Date;
  churchName?: string;
}

export interface PriestSummaryOptions {
  to: string;
  reportTitle: string;
  link: string;
  submittedBy: string;
  counts: { patchCount: number };
  churchName?: string;
}

/**
 * Send recipient invite email
 */
export async function sendRecipientInvite(options: RecipientInviteOptions): Promise<void> {
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
export async function sendPriestSummary(options: PriestSummaryOptions): Promise<void> {
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

/**
 * Base email sending function
 * TODO: Replace with actual email service (SendGrid, AWS SES, nodemailer, etc.)
 */
async function sendEmail(options: EmailOptions): Promise<void> {
  // TODO: Implement actual email sending
  // Example with nodemailer:
  // 
  // const nodemailer = require('nodemailer');
  // const transporter = nodemailer.createTransport({
  //   host: process.env.SMTP_HOST,
  //   port: parseInt(process.env.SMTP_PORT || '587'),
  //   secure: false,
  //   auth: {
  //     user: process.env.SMTP_USER,
  //     pass: process.env.SMTP_PASS,
  //   },
  // });
  // 
  // await transporter.sendMail({
  //   from: process.env.EMAIL_FROM || 'noreply@orthodoxmetrics.com',
  //   to: options.to,
  //   subject: options.subject,
  //   html: options.html,
  //   text: options.text || options.html.replace(/<[^>]*>/g, ''),
  // });

  // For now, log to console (non-blocking)
  console.log('📧 Email would be sent:', {
    to: options.to,
    subject: options.subject,
    html: options.html.substring(0, 100) + '...',
  });
}

export { sendEmail };
