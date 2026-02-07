# Fixing OM Tasks Email with Microsoft Outlook (GoDaddy)

## Problem

Emails are not being sent from the `/devel-tools/om-tasks` page for the email address `info@orthodoxmetrics.com`, which is a Microsoft Outlook email purchased from GoDaddy.

---

## Root Cause

The email system uses database-driven SMTP configuration, but the `info@orthodoxmetrics.com` Microsoft Outlook email hasn't been configured in the system yet.

**Important**: Even though the email is purchased from GoDaddy, it uses **Microsoft 365/Outlook SMTP servers**, not GoDaddy's SMTP servers.

---

## Solution: Configure Microsoft 365 SMTP

### Step 1: Get App Password from Microsoft

Microsoft 365 requires an **App Password** (not your regular email password) for SMTP authentication.

#### Create an App Password:

1. Go to Microsoft Account Security: https://account.microsoft.com/security
2. Sign in with `info@orthodoxmetrics.com`
3. Navigate to **Security** → **Advanced security options**
4. Under **App passwords**, click **Create a new app password**
5. Name it: `Orthodox Metrics - OM Tasks System`
6. **Copy the generated password** (you won't be able to see it again!)
7. Save it securely

**Note**: If you don't see "App passwords", you may need to enable it or contact Microsoft support.

---

### Step 2: Configure via Web UI (Easiest Method)

#### Navigate to Settings:

1. Log in to https://orthodoxmetrics.com as super admin
2. Go to: `/devel-tools/om-tasks`
3. Click the **Settings** button in the top right
4. Fill in the email configuration form:

#### Configuration Settings:

| Field | Value |
|-------|-------|
| **Email Provider** | Outlook365 (this auto-fills the settings) |
| **SMTP Host** | `smtp-mail.outlook.com` |
| **SMTP Port** | `587` |
| **SMTP Security** | STARTTLS (unchecked SSL) |
| **SMTP Username** | `info@orthodoxmetrics.com` |
| **SMTP Password** | `[Your App Password from Step 1]` |
| **Sender Name** | `OMAI Task System` |
| **Sender Email** | `info@orthodoxmetrics.com` |

5. Click **Save Configuration**
6. Click **Test Email** and enter a test address to verify it works

---

### Step 3: Configure via Database (Alternative Method)

If you prefer to configure via SQL directly:

```sql
-- Check if email_settings table exists
SHOW TABLES LIKE 'email_settings';

-- Check current email configuration
SELECT * FROM email_settings WHERE is_active = TRUE;

-- Add/Update Microsoft Outlook configuration
INSERT INTO email_settings (
  provider,
  smtp_host,
  smtp_port,
  smtp_secure,
  smtp_user,
  smtp_pass,
  sender_name,
  sender_email,
  is_active,
  updated_at
) VALUES (
  'Outlook365',
  'smtp-mail.outlook.com',
  587,
  FALSE,
  'info@orthodoxmetrics.com',
  'YOUR_APP_PASSWORD_HERE',
  'OMAI Task System',
  'info@orthodoxmetrics.com',
  TRUE,
  NOW()
)
ON DUPLICATE KEY UPDATE
  provider = 'Outlook365',
  smtp_host = 'smtp-mail.outlook.com',
  smtp_port = 587,
  smtp_secure = FALSE,
  smtp_user = 'info@orthodoxmetrics.com',
  smtp_pass = 'YOUR_APP_PASSWORD_HERE',
  sender_name = 'OMAI Task System',
  sender_email = 'info@orthodoxmetrics.com',
  is_active = TRUE,
  updated_at = NOW();

-- Verify the configuration
SELECT 
  id, 
  provider, 
  smtp_host, 
  smtp_port, 
  smtp_secure, 
  smtp_user, 
  sender_name, 
  sender_email, 
  is_active,
  updated_at 
FROM email_settings 
WHERE is_active = TRUE;
```

**Important**: Replace `YOUR_APP_PASSWORD_HERE` with the actual app password from Step 1.

---

### Step 4: Test the Email System

#### Test via Web UI:

1. Go to `/devel-tools/om-tasks`
2. Click **Settings** → **Test Email**
3. Enter a test email address
4. Click **Send Test Email**
5. Check inbox for test email

#### Test by Generating a Task Link:

1. Go to `/devel-tools/om-tasks`
2. Click **Generate Link**
3. Enter an email address
4. Click **Generate Link**
5. Check that email address's inbox for the task assignment email

#### Check Backend Logs:

```bash
# Monitor the Node.js backend logs
sudo journalctl -u pm2-nparsons -f | grep -i email

# Or check PM2 logs
pm2 logs

# Look for messages like:
# ✅ Task assignment email sent to [email]: <message-id>
# ❌ Failed to send task assignment email: [error details]
```

---

## Troubleshooting

### Issue 1: "Failed to send email" Error

**Cause**: App password is incorrect or not generated.

**Fix**:
1. Generate a new app password from Microsoft Account Security
2. Update the configuration with the new password
3. Test again

### Issue 2: "Authentication failed" Error

**Cause**: Using regular password instead of app password.

**Fix**:
1. **DO NOT** use your regular `info@orthodoxmetrics.com` password
2. **MUST** use the app password generated from Microsoft Account Security
3. If you lost the app password, generate a new one

### Issue 3: "Connection timeout" Error

**Cause**: Firewall or network blocking port 587.

**Fix**:
```bash
# Check if port 587 is open
telnet smtp-mail.outlook.com 587

# If it hangs or fails, check firewall:
sudo ufw status
sudo ufw allow out 587/tcp
```

### Issue 4: "Recipient rejected" Error

**Cause**: Microsoft blocking external SMTP.

**Fix**:
1. Log in to https://admin.microsoft.com
2. Go to **Exchange admin center**
3. Navigate to **Mail flow** → **Connectors**
4. Ensure SMTP AUTH is enabled
5. Whitelist the server IP if needed

### Issue 5: Database Column Missing

If you see: `smtp_pass column not found`

**Fix**:
```sql
-- Add smtp_pass column if missing
ALTER TABLE email_settings 
ADD COLUMN smtp_pass VARCHAR(255) NULL;

-- Then update the configuration again
```

---

## Microsoft 365 SMTP Settings Reference

Use these settings for **ANY** Microsoft 365/Outlook email:

| Setting | Value |
|---------|-------|
| **SMTP Server** | `smtp-mail.outlook.com` or `smtp.office365.com` |
| **Port** | `587` (STARTTLS) or `25` |
| **Encryption** | STARTTLS (not SSL) |
| **Authentication** | Required (username + app password) |
| **Username** | Full email address (e.g., `info@orthodoxmetrics.com`) |
| **Password** | App password (NOT regular password) |

**Note**: Port `465` (SSL) is NOT supported by Microsoft 365.

---

## GoDaddy-Specific Notes

### If Email is Hosted by GoDaddy (cPanel Email):

If your email is actually GoDaddy Workspace Email (not Microsoft 365), use these settings instead:

| Setting | Value |
|---------|-------|
| **SMTP Server** | `smtpout.secureserver.net` |
| **Port** | `465` (SSL) or `587` (STARTTLS) |
| **Encryption** | SSL or STARTTLS |
| **Username** | Full email address |
| **Password** | Email account password |

### How to Check Which Type:

1. Log in to GoDaddy account
2. Go to **Email & Office** → **Workspace Email** or **Microsoft 365**
3. If it says **Microsoft 365**, use Microsoft SMTP settings (above)
4. If it says **Workspace Email**, use GoDaddy SMTP settings

---

## Verification Checklist

After configuration, verify:

- [ ] Can access `/devel-tools/om-tasks` settings page
- [ ] Email configuration saved successfully
- [ ] Test email sent and received
- [ ] Can generate task link and email is sent
- [ ] Task submission emails are working
- [ ] No errors in backend logs
- [ ] Emails appear in recipient inbox (not spam)

---

## Email Templates

The system sends these types of emails:

### 1. Task Assignment Email

**Subject**: `📝 Task Assignment Invitation - Orthodox Metrics AI`

**Sent when**: Admin generates a task link

**Recipient**: Email address specified in the task link

**Content**: Contains secure link for user to assign tasks

### 2. Task Submission Email

**Subject**: `📬 New Task Assignment from [email] ([count] tasks)`

**Sent when**: User submits tasks via the link

**Recipient**: `next1452@gmail.com` (Nick)

**Content**: Contains all submitted tasks with details

### 3. Task Creation Email

**Subject**: `✅ New Task Created: [task title]`

**Sent when**: Admin creates a task directly

**Recipient**: Task assignees

**Content**: Task details and action link

---

## Security Best Practices

1. **App Passwords**:
   - Never share app passwords
   - Generate unique app passwords for each service
   - Revoke unused app passwords

2. **Email Configuration**:
   - Only super admins should access email settings
   - Test configuration before saving
   - Monitor failed email logs

3. **SMTP Security**:
   - Always use STARTTLS or SSL
   - Never send passwords in plain text
   - Keep app passwords encrypted in database

---

## Next Steps

After fixing email configuration:

1. **Test all email functionality**:
   - Task assignment emails
   - Task submission emails
   - Test email feature

2. **Monitor logs** for the first few days:
   ```bash
   pm2 logs | grep -i email
   ```

3. **Update documentation** if any issues arise

4. **Consider backup SMTP** provider (e.g., SendGrid, AWS SES) for redundancy

---

## Support Resources

- **Microsoft 365 SMTP Documentation**: https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/how-to-set-up-a-multifunction-device-or-application-to-send-email-using-microsoft-365-or-office-365

- **GoDaddy Email Settings**: https://www.godaddy.com/help/email-settings-8405

- **App Password Issues**: https://support.microsoft.com/en-us/account-billing/manage-app-passwords-for-two-step-verification-d6dc8c6d-4bf7-4851-ad95-6d07799387e9

---

## Summary

**TL;DR**:

1. Generate **app password** from Microsoft Account Security
2. Configure email in `/devel-tools/om-tasks` → **Settings**
3. Use `smtp-mail.outlook.com:587` with STARTTLS
4. Username: `info@orthodoxmetrics.com`
5. Password: **App password** (not regular password)
6. Test with **Test Email** button
7. Verify task emails are sending

**Important**: Must use Microsoft 365 SMTP settings since the email is Outlook, even though it was purchased through GoDaddy.
