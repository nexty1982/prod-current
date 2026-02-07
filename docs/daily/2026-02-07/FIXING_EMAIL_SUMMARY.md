# OM Tasks Email Fix Summary

## Issue

Email functionality not working for `/devel-tools/om-tasks` with Microsoft Outlook email `info@orthodoxmetrics.com` (purchased from GoDaddy).

---

## Root Cause

The OM Tasks system requires SMTP configuration in the database, but it hasn't been configured yet for the Microsoft Outlook email.

**Key Point**: Even though the email was purchased from GoDaddy, it uses **Microsoft 365/Outlook SMTP servers**, not GoDaddy's SMTP servers.

---

## Solution Provided

### 1. **Documentation Created**

#### Quick Start Guide (5-minute setup):
- **Location**: `docs/OPERATIONS/om-tasks-email-quickstart.md`
- **Purpose**: Fast, step-by-step instructions for non-technical users
- **Contents**: How to get app password and configure email via web UI

#### Complete Guide:
- **Location**: `docs/OPERATIONS/fixing-om-tasks-email-outlook.md`
- **Purpose**: Comprehensive troubleshooting and configuration guide
- **Contents**:
  - How to generate Microsoft app passwords
  - Web UI configuration steps
  - Database configuration (alternative method)
  - Troubleshooting common issues
  - Microsoft 365 SMTP settings reference
  - GoDaddy vs Microsoft 365 differences
  - Verification checklist
  - Security best practices

### 2. **Diagnostic Script Created**

- **Location**: `scripts/check-email-config.sh`
- **Purpose**: Automated email configuration checker
- **Features**:
  - Checks if `email_settings` table exists (creates if missing)
  - Verifies `smtp_pass` column exists (adds if missing)
  - Shows current email configuration
  - Checks password status
  - Tests SMTP connectivity
  - Provides actionable recommendations

**Usage**:
```bash
sudo /var/www/orthodoxmetrics/prod/scripts/check-email-config.sh
```

### 3. **UI Improvements**

Updated `EmailSettingsForm.tsx` component with:
- Better help text for Microsoft Outlook/GoDaddy users
- Link to Microsoft Account Security for app password generation
- Clear warning about app password requirement
- Clarification that Outlook emails via GoDaddy need Outlook365 provider

---

## Configuration Steps (For User)

### Quick Setup (5 Minutes):

1. **Get App Password**:
   - Go to: https://account.microsoft.com/security
   - Sign in with `info@orthodoxmetrics.com`
   - Navigate to: **Advanced security options** → **App passwords**
   - Click **Create a new app password**
   - Save the generated password

2. **Configure via Web UI**:
   - Log in to: https://orthodoxmetrics.com (as super admin)
   - Go to: `/devel-tools/om-tasks`
   - Click **Settings** button (top right)
   - Select **Outlook365** provider (auto-fills settings)
   - Fill in:
     - **Username**: `info@orthodoxmetrics.com`
     - **Password**: [App password from Step 1]
     - **Sender Email**: `info@orthodoxmetrics.com`
   - Click **Save Configuration**

3. **Test**:
   - Click **Test Email** button
   - Enter test email address
   - Verify test email received

---

## Microsoft 365 SMTP Settings

These settings are used when **Outlook365** provider is selected:

| Setting | Value |
|---------|-------|
| **SMTP Host** | `smtp-mail.outlook.com` |
| **SMTP Port** | `587` |
| **Security** | STARTTLS (not SSL) |
| **Username** | `info@orthodoxmetrics.com` |
| **Password** | App password (NOT regular password) |
| **Sender Email** | `info@orthodoxmetrics.com` |

**Important**: Port 465 (SSL) is NOT supported by Microsoft 365.

---

## Email System Overview

The OM Tasks system sends these emails:

### 1. **Task Assignment Email**
- **When**: Admin generates a task link
- **To**: Email specified in task link
- **Subject**: `📝 Task Assignment Invitation - Orthodox Metrics AI`
- **Contains**: Secure link for user to assign tasks

### 2. **Task Submission Email**
- **When**: User submits tasks via link
- **To**: `next1452@gmail.com` (Nick)
- **Subject**: `📬 New Task Assignment from [email] ([count] tasks)`
- **Contains**: All submitted tasks with details

### 3. **Task Creation Email**
- **When**: Admin creates task directly
- **To**: Task assignees
- **Subject**: `✅ New Task Created: [task title]`
- **Contains**: Task details and action link

---

## Verification Steps

After configuration, verify with these steps:

1. **Test via Web UI**:
   - Go to `/devel-tools/om-tasks` → Settings
   - Click **Test Email**
   - Enter test address and send

2. **Test Task Link Generation**:
   - Click **Generate Link**
   - Enter email address
   - Check inbox for assignment email

3. **Monitor Backend Logs**:
   ```bash
   pm2 logs | grep -i email
   ```
   - Look for: `✅ Task assignment email sent to [email]`
   - Or: `❌ Failed to send...` (indicates problem)

4. **Run Diagnostic Script**:
   ```bash
   sudo /var/www/orthodoxmetrics/prod/scripts/check-email-config.sh
   ```

---

## Common Issues & Fixes

### Issue: "Authentication failed"
**Cause**: Using regular password instead of app password
**Fix**: Generate app password from Microsoft Account Security

### Issue: "Connection timeout"
**Cause**: Firewall blocking port 587
**Fix**: `sudo ufw allow out 587/tcp && sudo ufw reload`

### Issue: Can't find "App Passwords" option
**Cause**: 2FA not enabled on Microsoft account
**Fix**: Enable 2FA first, then app passwords option will appear

### Issue: "smtp_pass column not found"
**Cause**: Database schema outdated
**Fix**: Run diagnostic script (will auto-fix) or add column manually

---

## Files Created/Modified

### Created:
1. `docs/OPERATIONS/om-tasks-email-quickstart.md` - Quick setup guide
2. `docs/OPERATIONS/fixing-om-tasks-email-outlook.md` - Complete guide
3. `scripts/check-email-config.sh` - Diagnostic script
4. `FIXING_EMAIL_SUMMARY.md` - This file

### Modified:
1. `front-end/src/features/devel-tools/om-tasks/components/EmailSettingsForm.tsx`
   - Added better help text for Microsoft/GoDaddy users
   - Added link to Microsoft Account Security
   - Clarified app password requirement

---

## Backend Code (Already Implemented)

The email system is already implemented in:

- **Email Service**: `server/src/utils/emailService.js`
  - `createTransporter()` - Creates SMTP connection
  - `sendTaskAssignmentEmail()` - Sends task links
  - `sendTaskSubmissionEmail()` - Sends submissions to Nick
  - `sendTaskCreationEmail()` - Sends task notifications

- **Settings API**: `server/src/api/settings.js`
  - `GET /api/settings/email` - Get email config
  - `POST /api/settings/email` - Save email config
  - `POST /api/settings/email/test` - Test email sending
  - `getActiveEmailConfig()` - Helper function

- **OMAI API**: `server/src/api/omai.js`
  - Task link generation endpoints
  - Task submission endpoints
  - Integrates with email service

**No backend changes were needed** - the system is fully functional, just needs configuration.

---

## Security Notes

1. **App Passwords**:
   - Never share app passwords
   - Generate unique passwords for each service
   - Revoke unused app passwords

2. **Database**:
   - Passwords stored encrypted in database
   - Only exposed to nodemailer SMTP client
   - Never returned in API responses

3. **SMTP**:
   - Always uses STARTTLS or SSL
   - Credentials never logged
   - Failed auth attempts logged (without credentials)

---

## Next Steps for User

1. ✅ **Follow quick start guide**: `docs/OPERATIONS/om-tasks-email-quickstart.md`
2. ✅ **Generate app password** from Microsoft Account Security
3. ✅ **Configure email** via `/devel-tools/om-tasks` → Settings
4. ✅ **Test** with Test Email button
5. ✅ **Verify** by generating a task link
6. ✅ **Monitor** logs for first few emails

---

## Support Resources

- **Microsoft 365 SMTP**: https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/how-to-set-up-a-multifunction-device-or-application-to-send-email-using-microsoft-365-or-office-365
- **GoDaddy Email**: https://www.godaddy.com/help/email-settings-8405
- **App Passwords**: https://support.microsoft.com/en-us/account-billing/manage-app-passwords-for-two-step-verification-d6dc8c6d-4bf7-4851-ad95-6d07799387e9

---

## Summary

**The email system is fully implemented and working.**

**What was missing**: SMTP configuration for `info@orthodoxmetrics.com`

**What's provided**: Complete documentation, diagnostic tools, and UI improvements to make configuration easy.

**What user needs to do**: Follow quick start guide (5 minutes) to configure email with Microsoft app password.

**Result**: All OM Tasks emails will work (task assignments, submissions, notifications).
