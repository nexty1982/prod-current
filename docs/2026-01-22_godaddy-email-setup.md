# GoDaddy Email Configuration for Interactive Reports

## Quick Setup

To use your **info@orthodoxmetrics.com** GoDaddy email for sending Interactive Report emails, configure these environment variables:

### Option 1: GoDaddy Workspace Email (Recommended)

If you have GoDaddy Workspace Email (standard GoDaddy email hosting):

```bash
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@orthodoxmetrics.com
SMTP_PASS=your-email-password
FROM_EMAIL=info@orthodoxmetrics.com
FROM_NAME=OrthodoxMetrics
```

### Option 2: Microsoft 365 Email (from GoDaddy)

If your GoDaddy email is through Microsoft 365:

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@orthodoxmetrics.com
SMTP_PASS=your-email-password
FROM_EMAIL=info@orthodoxmetrics.com
FROM_NAME=OrthodoxMetrics
```

## How to Determine Your Email Type

1. **Log into your GoDaddy account**
2. **Go to Email & Office Dashboard**
3. **Check your email plan:**
   - If you see "Microsoft 365" → Use Option 2 (smtp.office365.com)
   - If you see "GoDaddy Workspace Email" → Use Option 1 (smtpout.secureserver.net)

## Where to Set Environment Variables

### For Production (PM2):

1. **Edit PM2 ecosystem file** or set in your startup script:
   ```bash
   export SMTP_HOST=smtpout.secureserver.net
   export SMTP_PORT=587
   export SMTP_SECURE=false
   export SMTP_USER=info@orthodoxmetrics.com
   export SMTP_PASS=your-password-here
   export FROM_EMAIL=info@orthodoxmetrics.com
   export FROM_NAME=OrthodoxMetrics
   ```

2. **Or create/update `.env.production` file** in the `server/` directory:
   ```
   SMTP_HOST=smtpout.secureserver.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=info@orthodoxmetrics.com
   SMTP_PASS=your-password-here
   FROM_EMAIL=info@orthodoxmetrics.com
   FROM_NAME=OrthodoxMetrics
   ```

3. **Restart PM2:**
   ```bash
   pm2 restart orthodox-backend
   ```

### For Development:

Create/update `.env.development` in the `server/` directory with the same variables.

## Important Notes

1. **SMTP Authentication Required:**
   - Make sure SMTP authentication is enabled in your GoDaddy email settings
   - Log into GoDaddy → Email & Office → Your email account → Settings → Enable SMTP

2. **Password:**
   - Use your **email account password** (not your GoDaddy account password)
   - For Microsoft 365, you may need an "App Password" if 2FA is enabled

3. **Port 587 vs 465:**
   - **Port 587 (TLS)** - Recommended, works better with firewalls
   - **Port 465 (SSL)** - Set `SMTP_SECURE=true` if using this port
   - Both work with GoDaddy, but 587 is preferred

4. **Testing:**
   - After configuration, create an Interactive Report
   - Check backend logs for: `✅ Email sent successfully`
   - Check recipient's inbox (and spam folder)

## Troubleshooting

### Email not sending?

1. **Check backend logs:**
   ```bash
   pm2 logs orthodox-backend | grep -i email
   ```

2. **Verify SMTP settings:**
   - Ensure `SMTP_USER` is the full email: `info@orthodoxmetrics.com`
   - Ensure `SMTP_PASS` is correct
   - Try port 465 with `SMTP_SECURE=true` if 587 doesn't work

3. **Test SMTP connection:**
   - The email service will log connection errors
   - Look for `❌ Failed to send email` in logs

4. **GoDaddy-specific issues:**
   - Some GoDaddy accounts require enabling "SMTP Authentication" in email settings
   - Check GoDaddy email settings for any restrictions

### Still not working?

If emails still don't send, check:
- GoDaddy email account is active
- SMTP is enabled in GoDaddy email settings
- Firewall isn't blocking port 587/465
- Email password is correct (try logging into webmail to verify)

---

**After configuration, restart the backend and test by creating an Interactive Report.**
