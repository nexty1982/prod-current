# Email Deliverability Fix - Quick Start

**Goal**: Make emails from info@orthodoxmetrics.com deliver reliably to inboxes

---

## ✅ CURRENT STATUS

**Application Configuration**: ✅ **CORRECT**
- Provider: GoDaddy
- SMTP: smtpout.secureserver.net:465
- From: info@orthodoxmetrics.com
- **No application changes needed**

**DNS Configuration**: ⚠️ **NEEDS SETUP**

---

## 🚀 QUICK START (30 minutes)

### STEP 1: Add DNS Records (15 min)

Go to **GoDaddy DNS Manager**: https://dnsmanagement.godaddy.com/

#### A. Add SPF Record
```
Type: TXT
Host: @
Value: v=spf1 include:secureserver.net -all
```

#### B. Get DKIM Key from GoDaddy
**Call GoDaddy Support**: 1-480-505-8877  
**Say**: "I need to enable DKIM for info@orthodoxmetrics.com in Workspace Email"

They will either:
- Enable it automatically in your account, OR
- Give you a TXT record to add (like `k1._domainkey.orthodoxmetrics.com`)

#### C. Add DMARC Record
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:info@orthodoxmetrics.com; ruf=mailto:info@orthodoxmetrics.com; fo=1; adkim=r; aspf=r
```

---

### STEP 2: Verify DNS (Wait 30 min, then run)

```bash
# SSH into server
ssh user@192.168.1.239

# Run verification script
cd /var/www/orthodoxmetrics/prod
chmod +x server/scripts/verify-email-dns.sh
./server/scripts/verify-email-dns.sh
```

**Expected Output**:
```
✅ SPF: PASS
✅ DKIM: PASS  
✅ DMARC: PASS
```

---

### STEP 3: Test Email Delivery

#### Option A: Via Admin UI
1. Go to http://orthodoxmetrics.com/admin
2. Navigate to **Settings** → **Email Configuration**
3. Click **Test Email**
4. Enter your Gmail address
5. Check inbox

#### Option B: Via API
```bash
# Get your session cookie from browser (Chrome DevTools → Application → Cookies)
curl -X POST http://localhost:3001/api/settings/email/test \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{"test_email": "your-email@gmail.com"}'
```

---

### STEP 4: Check Email Headers

1. Open test email in Gmail
2. Click **⋮** (three dots) → **Show original**
3. Verify:
   - ✅ `spf=pass`
   - ✅ `dkim=pass` 
   - ✅ `dmarc=pass`
4. Email should be in **Inbox**, not spam

---

## 🎯 SUCCESS CRITERIA

- [ ] All 3 DNS records added
- [ ] Verification script shows ✅ ✅ ✅
- [ ] Test email received in Gmail inbox
- [ ] Email headers show all PASS

---

## 📚 Full Documentation

**Detailed Guide**: `docs/OPERATIONS/email-deliverability-fix.md`
- Complete DNS setup instructions
- Troubleshooting guide
- DMARC monitoring guide
- Support contacts

---

## ⏱️ Timeline

| Step | Time | Status |
|------|------|--------|
| Add DNS records | 15 min | ⏳ Pending |
| DNS propagation | 30 min - 2 hours | ⏳ Waiting |
| Test & verify | 10 min | ⏳ Pending |
| **Total** | **1-3 hours** | |

---

## 🆘 Quick Troubleshooting

**DNS records not showing up?**
- Wait 30-60 minutes for propagation
- Clear DNS cache: `sudo systemd-resolve --flush-caches`

**DKIM not found?**
- Contact GoDaddy support
- Ask for "DKIM public key for Workspace Email"

**Emails still go to spam?**
- Check email headers for failure reasons
- Verify all 3 checks are PASS
- Check domain reputation: https://mxtoolbox.com/blacklists.aspx

---

**Ready to start?** → Add DNS records now!
