# OM Tasks Email - Quick Start Guide

## Problem

Emails aren't working for `/devel-tools/om-tasks` because email settings haven't been configured yet.

---

## Quick Fix (5 Minutes)

### Step 1: Get Microsoft App Password

1. Go to: https://account.microsoft.com/security
2. Sign in with `info@orthodoxmetrics.com`
3. Click **Advanced security options**
4. Under **App passwords**, click **Create a new app password**
5. Name it: `Orthodox Metrics OM Tasks`
6. **SAVE THE PASSWORD** (you can't see it again!)

### Step 2: Configure Email via Web

1. Log in to https://orthodoxmetrics.com (as super admin)
2. Go to: `/devel-tools/om-tasks`
3. Click **Settings** button (top right)
4. Select **Outlook365** from provider dropdown (this auto-fills most settings)
5. Fill in remaining fields:
   - **SMTP Username**: `info@orthodoxmetrics.com`
   - **SMTP Password**: `[Paste app password from Step 1]`
   - **Sender Email**: `info@orthodoxmetrics.com`
6. Click **Save Configuration**
7. Click **Test Email** button
8. Enter a test email address
9. Click **Send Test Email**
10. ✅ Check inbox - you should receive the test email!

---

## Settings at a Glance

When selecting **Outlook365** provider, these settings auto-fill:

- **SMTP Host**: `smtp-mail.outlook.com`
- **SMTP Port**: `587`
- **Security**: STARTTLS (not SSL)

You only need to provide:
- Username: `info@orthodoxmetrics.com`
- Password: App password (from Step 1)
- Sender Email: `info@orthodoxmetrics.com`

---

## Verify It's Working

### Test 1: Send Test Email

1. In Settings dialog, click **Test Email**
2. Enter your email address
3. Check inbox

### Test 2: Generate Task Link

1. Go to `/devel-tools/om-tasks`
2. Click **Generate Link**
3. Enter an email address
4. Click **Generate Link**
5. Check that email's inbox for task assignment email

### Test 3: Check Backend Logs

```bash
# Monitor email sending in real-time
pm2 logs | grep -i email

# Look for:
# ✅ Task assignment email sent to [email]
# ✅ Task submission email sent to Nick
```

---

## Troubleshooting

### "Authentication failed" Error

**Cause**: Using regular password instead of app password

**Fix**: Generate a new app password from Microsoft Account Security (Step 1)

### "Connection timeout" Error

**Cause**: Firewall blocking port 587

**Fix**:
```bash
# On Linux server, allow outbound port 587
sudo ufw allow out 587/tcp
sudo ufw reload
```

### Can't Find "App Passwords" Option

**Cause**: Two-factor authentication (2FA) not enabled

**Fix**: Enable 2FA on Microsoft account first, then app passwords will appear

---

## Database Check (Advanced)

If you prefer to check/configure via database:

```bash
# Run the check script
sudo /var/www/orthodoxmetrics/prod/scripts/check-email-config.sh
```

This script will:
- Check if email_settings table exists
- Show current configuration
- Verify password is set
- Test SMTP connectivity

---

## Full Documentation

For complete details, see:
- **Full Guide**: `/var/www/orthodoxmetrics/prod/docs/OPERATIONS/fixing-om-tasks-email-outlook.md`
- **Email Templates**: See full guide for all email types sent by the system

---

## Summary

1. **Get app password** from Microsoft Account Security
2. **Configure in web UI**: `/devel-tools/om-tasks` → **Settings**
3. **Use Outlook365 provider** (auto-fills most settings)
4. **Test** with Test Email button
5. **Done!** Emails will now work for task assignments

**Important**: Must use **app password**, not regular email password!
