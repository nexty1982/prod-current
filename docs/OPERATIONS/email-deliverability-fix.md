# Email Deliverability Fix for info@orthodoxmetrics.com

**Date**: February 5, 2026  
**Provider**: GoDaddy SMTP  
**Domain**: orthodoxmetrics.com  
**Status**: REQUIRES ACTION

---

## 🔍 CURRENT CONFIGURATION (VERIFIED)

**Application Email Settings** (from database):
- **Provider**: GoDaddy
- **SMTP Host**: smtpout.secureserver.net
- **SMTP Port**: 465 (SSL)
- **SMTP User**: info@orthodoxmetrics.com
- **Sender Email**: info@orthodoxmetrics.com
- **Sender Name**: Orthodox Metrics AI

**Status**: ✅ Application configured correctly

---

## ⚠️ PROBLEM

Emails from `info@orthodoxmetrics.com` are likely:
1. Going to spam folders
2. Being rejected by Gmail/Outlook
3. Failing SPF/DKIM/DMARC checks

**Root Cause**: Missing or misconfigured DNS authentication records

---

## 🔧 SOLUTION: DNS Configuration (GoDaddy Method)

### STEP 1: Add SPF Record

**Purpose**: Authorizes GoDaddy servers to send email for your domain

**DNS Record to Add**:
```
Type: TXT
Host: @
Value: v=spf1 include:secureserver.net -all
TTL: 600 (or default)
```

**What it does**: Tells receiving servers that GoDaddy (secureserver.net) is authorized to send email for orthodoxmetrics.com

---

### STEP 2: Add DKIM Records

**Purpose**: Digitally signs your emails to prove authenticity

#### Option A: GoDaddy Auto-DKIM (If Available)

1. Log into GoDaddy
2. Go to **Products** → **Email** → **Workspace Email**
3. Look for **Domain Authentication** or **DKIM Settings**
4. Click **Enable DKIM**
5. GoDaddy will automatically add the DKIM records

#### Option B: Manual DKIM Setup (If GoDaddy doesn't auto-configure)

GoDaddy typically uses these DKIM records for Workspace Email:

**DKIM Record 1**:
```
Type: TXT
Host: k1._domainkey
Value: k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDPtW5iwpXVPGWfrKuw...
       (GoDaddy will provide the full public key)
TTL: 600
```

**Note**: You must get the actual DKIM public key from GoDaddy. Contact GoDaddy support and ask for:
- "DKIM public key for info@orthodoxmetrics.com"
- "Domain authentication records for Workspace Email"

---

### STEP 3: Add DMARC Record

**Purpose**: Tells receiving servers what to do if SPF/DKIM fail, and where to send reports

**DNS Record to Add**:
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:info@orthodoxmetrics.com; ruf=mailto:info@orthodoxmetrics.com; fo=1; adkim=r; aspf=r
TTL: 600
```

**Explanation**:
- `p=none` - Start in monitoring mode (don't reject emails yet)
- `rua=mailto:info@orthodoxmetrics.com` - Send aggregate reports here
- `ruf=mailto:info@orthodoxmetrics.com` - Send forensic reports here
- `fo=1` - Generate report if any check fails
- `adkim=r` - Relaxed DKIM alignment
- `aspf=r` - Relaxed SPF alignment

**After 1-2 weeks of monitoring**, change to:
```
v=DMARC1; p=quarantine; rua=mailto:info@orthodoxmetrics.com; ruf=mailto:info@orthodoxmetrics.com; fo=1
```

**After another 2 weeks**, if reports look good, change to:
```
v=DMARC1; p=reject; rua=mailto:info@orthodoxmetrics.com; ruf=mailto:info@orthodoxmetrics.com; fo=1
```

---

## 📋 DNS CONFIGURATION CHECKLIST

### How to Add DNS Records

1. **Log into GoDaddy DNS Manager**:
   - Go to https://dnsmanagement.godaddy.com/
   - Find `orthodoxmetrics.com`
   - Click **DNS** or **Manage DNS**

2. **Add SPF Record**:
   - [ ] Click **Add Record**
   - [ ] Type: TXT
   - [ ] Host: @ (or leave blank for root domain)
   - [ ] Value: `v=spf1 include:secureserver.net -all`
   - [ ] TTL: 600
   - [ ] Save

3. **Add DKIM Record**:
   - [ ] Contact GoDaddy Support for DKIM public key
   - [ ] Or check if auto-DKIM is available in Workspace Email settings
   - [ ] Add the DKIM TXT record they provide

4. **Add DMARC Record**:
   - [ ] Click **Add Record**
   - [ ] Type: TXT
   - [ ] Host: _dmarc
   - [ ] Value: `v=DMARC1; p=none; rua=mailto:info@orthodoxmetrics.com; ruf=mailto:info@orthodoxmetrics.com; fo=1; adkim=r; aspf=r`
   - [ ] TTL: 600
   - [ ] Save

---

## 🔍 VERIFY DNS PROPAGATION

**Wait 10-30 minutes after adding records**, then test:

### Check SPF:
```bash
nslookup -type=txt orthodoxmetrics.com
# Look for: "v=spf1 include:secureserver.net -all"
```

### Check DKIM:
```bash
nslookup -type=txt k1._domainkey.orthodoxmetrics.com
# Should return the DKIM public key
```

### Check DMARC:
```bash
nslookup -type=txt _dmarc.orthodoxmetrics.com
# Look for: "v=DMARC1; p=none..."
```

### Online Tools (Easier):
- **MXToolbox**: https://mxtoolbox.com/SuperTool.aspx?action=spf%3aorthodoxmetrics.com
- **DMARC Analyzer**: https://www.dmarcanalyzer.com/dmarc/dmarc-record-check/
- **Google Admin Toolbox**: https://toolbox.googleapps.com/apps/checkmx/

---

## ✅ APPLICATION VERIFICATION

The application is already correctly configured! Verified from database:

```sql
SELECT provider, smtp_host, smtp_port, smtp_user, sender_email, sender_name
FROM email_settings
WHERE is_active = TRUE;

-- Result:
-- provider: GoDaddy
-- smtp_host: smtpout.secureserver.net
-- smtp_port: 465
-- smtp_user: info@orthodoxmetrics.com
-- sender_email: info@orthodoxmetrics.com
-- sender_name: Orthodox Metrics AI
```

**No application changes needed** ✅

---

## 🧪 TESTING PROCEDURE

### 1. Send Test Email from Application

```bash
# SSH into server
ssh user@192.168.1.239

# Send test email via API
curl -X POST http://localhost:3001/api/settings/email/test \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{"test_email": "your-gmail@gmail.com"}'
```

**Or use the admin UI**:
1. Log into http://orthodoxmetrics.com/admin
2. Go to **Settings** → **Email Configuration**
3. Click **Test Email**
4. Enter your Gmail address
5. Check inbox (and spam folder)

### 2. Check Email Headers (Gmail)

1. Open the test email in Gmail
2. Click the **three dots** (⋮) → **Show original**
3. Look for these headers:

**✅ GOOD HEADERS**:
```
spf=pass (google.com: domain of info@orthodoxmetrics.com designates ... as permitted sender)
dkim=pass header.i=@orthodoxmetrics.com header.s=k1 header.b=...
dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=orthodoxmetrics.com
```

**❌ BAD HEADERS** (before fix):
```
spf=neutral (google.com: ... is neither permitted nor denied by domain of info@orthodoxmetrics.com)
dkim=none (no DKIM signature present)
dmarc=fail (p=NONE sp=NONE dis=NONE)
```

### 3. Test with Multiple Providers

Send test emails to:
- [ ] Gmail (your-email@gmail.com)
- [ ] Outlook (your-email@outlook.com)
- [ ] Yahoo (your-email@yahoo.com)
- [ ] Your church's email domain

**Expected Result**: All emails land in **Inbox**, not spam

---

## 🚨 TROUBLESHOOTING

### Issue 1: SPF Fails
**Symptom**: Email headers show `spf=fail` or `spf=softfail`

**Fix**:
- Verify SPF record exists: `nslookup -type=txt orthodoxmetrics.com`
- Ensure you're using `include:secureserver.net` (not `include:_spf.google.com`)
- Check for multiple SPF records (only ONE SPF record allowed per domain)

### Issue 2: DKIM Fails or Missing
**Symptom**: Email headers show `dkim=none` or `dkim=fail`

**Fix**:
- Contact GoDaddy Support: "I need DKIM enabled for info@orthodoxmetrics.com"
- Ask for: "DKIM public key TXT record for my domain"
- GoDaddy should provide a TXT record like:
  ```
  k1._domainkey.orthodoxmetrics.com TXT "v=DKIM1; k=rsa; p=MIGf..."
  ```
- Add it to your DNS

### Issue 3: DMARC Fails
**Symptom**: Email headers show `dmarc=fail`

**Fix**:
- DMARC requires EITHER SPF or DKIM to pass
- Fix SPF and DKIM first
- Ensure DMARC record has `adkim=r` and `aspf=r` (relaxed alignment)

### Issue 4: Still Going to Spam
**After DNS is correct:**

**Possible causes**:
1. **Domain Reputation**: New domain or recently flagged
   - Solution: Send emails gradually, avoid spam triggers
2. **Content Issues**: Email contains spam keywords
   - Solution: Review email templates, avoid ALL CAPS, excessive links
3. **No Reverse DNS**: GoDaddy should handle this
   - Check: `nslookup <server_ip>` should return a hostname
4. **Blacklisted IP**: GoDaddy's server IP might be blacklisted
   - Check: https://mxtoolbox.com/blacklists.aspx
   - If yes: Contact GoDaddy to resolve

---

## 📊 MONITORING

### DMARC Reports
After setup, you'll start receiving DMARC reports at `info@orthodoxmetrics.com`:

**Types of Reports**:
1. **Aggregate (RUA)**: Daily summary of all emails sent from your domain
2. **Forensic (RUF)**: Real-time alerts when emails fail authentication

**What to watch for**:
- SPF alignment rate should be 100%
- DKIM alignment rate should be 100%
- Any "fail" results indicate issues

**Tools to Parse Reports** (reports are XML format):
- **Postmark DMARC Digest**: https://dmarc.postmarkapp.com/
- **DMARC Analyzer**: https://www.dmarcanalyzer.com/
- **MXToolbox**: https://mxtoolbox.com/dmarc.aspx

---

## 🎯 SUCCESS CRITERIA

### ✅ All Checks Pass:
1. [ ] SPF record returns `v=spf1 include:secureserver.net -all`
2. [ ] DKIM record exists at `k1._domainkey.orthodoxmetrics.com`
3. [ ] DMARC record exists at `_dmarc.orthodoxmetrics.com`
4. [ ] Test email to Gmail shows:
   - SPF=PASS
   - DKIM=PASS
   - DMARC=PASS
5. [ ] Email lands in Inbox (not spam)
6. [ ] Email headers show "mailed-by: orthodoxmetrics.com"
7. [ ] Email headers show "signed-by: orthodoxmetrics.com"

### 📈 Long-term Success:
- [ ] Receiving DMARC aggregate reports daily
- [ ] 100% SPF pass rate in reports
- [ ] 100% DKIM pass rate in reports
- [ ] No spam complaints
- [ ] Emails consistently land in inbox

---

## 📞 SUPPORT CONTACTS

**GoDaddy Support** (for DKIM setup):
- Phone: 1-480-505-8877
- Chat: https://www.godaddy.com/contact-us
- Ask for: "DKIM configuration for Workspace Email"

**DNS Propagation Issues**:
- Wait 24-48 hours for full propagation
- Clear DNS cache: `ipconfig /flushdns` (Windows) or `sudo systemd-resolve --flush-caches` (Linux)

---

## 🔄 NEXT STEPS (IN ORDER)

1. **Add DNS Records** (15 minutes)
   - Add SPF record
   - Contact GoDaddy for DKIM setup
   - Add DMARC record

2. **Wait for Propagation** (30 minutes - 2 hours)
   - Check with online tools
   - Verify all 3 records exist

3. **Test Email Delivery** (10 minutes)
   - Send test email via admin UI
   - Check Gmail headers
   - Verify inbox delivery

4. **Monitor** (ongoing)
   - Check DMARC reports daily for 1 week
   - After 1 week: Change DMARC policy from `p=none` to `p=quarantine`
   - After 2 weeks: Change to `p=reject`

---

**STATUS**: Ready for DNS configuration  
**BLOCKER**: Need DKIM public key from GoDaddy  
**ETA**: 2-3 hours (including DNS propagation)
