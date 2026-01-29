# OrthodoxMetrics SDLC Implementation

## Overview
This document describes the Software Development Lifecycle (SDLC) automation implemented for OrthodoxMetrics.

## Components

### 1. Dual-Track Build System
**File:** `/scripts/build-dual-track.sh`

Routes builds based on git branch:
- `main/master/production` → `dist-stable` (production)
- `dev/develop/*` → `dist-latest` (development)

Generates `build-info.json` with version, commit, and track info.

**Usage:**
```bash
./scripts/build-dual-track.sh              # Auto-detect track from branch
./scripts/build-dual-track.sh --stable     # Force production track
./scripts/build-dual-track.sh --latest     # Force development track
```

### 2. FreeScout Integration
**File:** `/server/integrations/freescout-api.js`

Helpdesk ticket management:
- Create tickets from code/GitHub issues
- Add replies/notes to tickets
- Sync ticket status

**Environment Variables:**
- `FREESCOUT_API_URL` - API endpoint
- `FREESCOUT_API_KEY` - API authentication key
- `FREESCOUT_MAILBOX_ID` - Default mailbox

### 3. GitHub Webhook Integration
**File:** `/server/webhooks/github-integration.js`

Handles GitHub events:
- Pull Request events (validates [FS-XXX] references)
- Issue events (auto-creates FreeScout tickets)
- Push events (updates related tickets)

**Environment Variables:**
- `GITHUB_WEBHOOK_SECRET` - Webhook signature verification
- `FREESCOUT_ENABLED` - Enable FreeScout sync

### 4. PR Gate Middleware
**File:** `/server/middleware/pr-gate.js`

Enforces ticket reference requirement:
- PR titles must include `[FS-XXX]` format
- Bypass options for hotfixes and specific users
- API endpoint protection with ticket references

### 5. Nginx Dual-Track Routing
**File:** `/config/nginx-dual-track-routing.conf`

Cookie-based routing:
- `user_role=super_admin` → `dist-latest`
- `user_role=developer` → `dist-latest`
- Others → `dist-stable`
- `feature_track` cookie for manual override

## Directory Structure
```
/var/www/orthodoxmetrics/prod/
├── config/
│   └── nginx-dual-track-routing.conf
├── docs/
│   └── SDLC-IMPLEMENTATION.md
├── scripts/
│   └── build-dual-track.sh
├── server/
│   ├── integrations/
│   │   └── freescout-api.js
│   ├── middleware/
│   │   └── pr-gate.js
│   └── webhooks/
│       └── github-integration.js
└── front-end/
    ├── dist/
    ├── dist-stable/
    ├── dist-latest/
    └── dist-active -> dist-stable|dist-latest
```

## Setup Instructions

1. **Configure Environment Variables:**
   ```bash
   export FREESCOUT_API_URL="https://support.orthodoxmetrics.com/api"
   export FREESCOUT_API_KEY="your-api-key"
   export GITHUB_WEBHOOK_SECRET="your-webhook-secret"
   export FREESCOUT_ENABLED="true"
   ```

2. **Register GitHub Webhook:**
   - URL: `https://orthodoxmetrics.com/webhooks/github`
   - Content type: `application/json`
   - Secret: Match `GITHUB_WEBHOOK_SECRET`
   - Events: Pull requests, Issues, Push

3. **Deploy Nginx Config:**
   ```bash
   sudo cp config/nginx-dual-track-routing.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/nginx-dual-track-routing.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. **Run Dual-Track Build:**
   ```bash
   ./scripts/build-dual-track.sh --stable
   ```
