# SDLC Configuration Steps - 10 Steps to Activate

## Date: January 27, 2026

Complete these 10 steps to activate your professional SDLC workflow.

---

## Step 1: Get FreeScout API Key

**Login to FreeScout**:
```
https://orthodoxmetrics.com/helpdesk/
```

**Navigate to**: Settings → API → Generate API Key

**Save the key** - you'll need it in Step 4

---

## Step 2: Get GitHub Personal Access Token

**Go to**: https://github.com/settings/tokens

**Generate new token (classic)** with scopes:
- ☑ repo (all)
- ☑ admin:repo_hook (all)

**Save the token** - you'll need it in Step 4

---

## Step 3: Generate Webhook Secret

```bash
openssl rand -hex 32
```

**Save the output** - you'll need it in Steps 4 and 6

---

## Step 4: Create .env File

```bash
cd /var/www/orthodoxmetrics/prod
cp config/environment.example .env
nano .env
```

**Add your values**:
```bash
FREESCOUT_API_KEY=<from Step 1>
GITHUB_TOKEN=<from Step 2>
GITHUB_WEBHOOK_SECRET=<from Step 3>
```

---

## Step 5: Install Nginx Configuration

```bash
sudo cp config/nginx-dual-track-routing.conf \
        /etc/nginx/sites-available/orthodoxmetrics.com
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 6: Configure GitHub Webhook

**Go to**: https://github.com/nexty1982/prod-current/settings/hooks

**Add webhook**:
- URL: `https://orthodoxmetrics.com/webhooks/github`
- Content type: `application/json`
- Secret: `<from Step 3>`
- Events: Pull requests, Issues, Pushes, Deployment statuses

---

## Step 7: Install Dependencies

```bash
cd /var/www/orthodoxmetrics/prod
npm install @octokit/rest axios
```

---

## Step 8: Update Server

Edit `server/index.js` and add:

```javascript
const githubWebhook = require('./webhooks/github-integration');
app.use('/webhooks', githubWebhook);
```

---

## Step 9: Restart Application

```bash
pm2 restart orthodoxmetrics
pm2 logs orthodoxmetrics --lines 50
```

---

## Step 10: Verify Installation

```bash
# Test webhook health
curl https://orthodoxmetrics.com/webhooks/health

# Test build info
curl https://orthodoxmetrics.com/build-info.json

# Test super_admin routing
curl -H "Cookie: user_role=super_admin" \
     https://orthodoxmetrics.com/build-info.json
```

**Expected**: All endpoints return valid JSON responses

---

## ✅ Configuration Complete!

Your SDLC workflow is now active. See full documentation in `/docs/SDLC_README.md`
