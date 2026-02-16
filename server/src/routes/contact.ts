/**
 * Contact Form Route
 * POST /api/contact — Public contact form submission (no auth required)
 * Extracted from index.ts lines ~793-839.
 */
const express = require('express');
const router = express.Router();

router.post('/contact', async (req: any, res: any) => {
  try {
    const { firstName, lastName, phone, email, enquiryType, message } = req.body;
    if (!firstName || !lastName || !email || !phone || !message) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled out.' });
    }
    // Send email to info@orthodoxmetrics.com
    const { sendContactEmail } = require('../utils/emailService');
    const emailResult = await sendContactEmail({ firstName, lastName, phone, email, enquiryType, message });
    if (!emailResult.success) {
      console.error('Contact email failed:', emailResult.error);
    }
    // Create contact_us notification for all super_admins
    try {
      const { getAppPool } = require('../config/db-compat');
      const [admins] = await getAppPool().query(
        "SELECT id FROM orthodoxmetrics_db.users WHERE role = 'super_admin' AND is_active = 1"
      );
      const { notificationService } = require('../api/notifications');
      const enquiryLabels: Record<string, string> = {
        general: 'General Enquiry', parish_registration: 'Parish Registration',
        records: 'Records & Certificates', technical: 'Technical Support',
        billing: 'Billing & Pricing', other: 'Other',
      };
      for (const admin of admins) {
        await notificationService.createNotification(
          admin.id,
          'contact_us',
          'New Contact Form Submission',
          `${firstName} ${lastName} (${email}) sent a ${enquiryLabels[enquiryType] || enquiryType} enquiry.`,
          {
            priority: 'normal',
            actionUrl: null,
            data: { firstName, lastName, email, phone, enquiryType, message: message.substring(0, 500) },
          }
        );
      }
      console.log(`📬 Contact Us notification sent to ${admins.length} super_admin(s)`);
    } catch (notifErr: any) {
      console.error('Contact notification failed (non-fatal):', notifErr.message);
    }
    res.json({ success: true, message: 'Your message has been sent successfully.' });
  } catch (error: any) {
    console.error('Contact form error:', error);
    res.status(500).json({ success: false, message: 'Failed to send your message. Please try again later.' });
  }
});

module.exports = router;
export {};
