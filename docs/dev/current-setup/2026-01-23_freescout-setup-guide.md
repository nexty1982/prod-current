# FreeScout Setup Guide

## Quick Start (Run as ROOT)

```bash
# Step 1: Setup FreeScout
bash /tmp/setup-freescout.sh

# Step 2: Update Nginx (simple method)
bash /tmp/update-nginx-simple.sh

# Step 3: Freeze Zammad
bash /tmp/freeze-zammad.sh
```

## Step-by-Step

### Step 1: Setup FreeScout

**Script:** `/tmp/setup-freescout.sh`

**What it does:**
1. Creates `/opt/freescout` directory
2. Generates passwords and creates `.env` file
3. Creates `docker-compose.yml` with MySQL + FreeScout
4. Starts containers
5. Verifies port 3080 is listening
6. Tests HTTP response

**Expected output:**
- ✓ Containers Up
- ✓ Port 3080 listening
- ✓ HTTP 200/302

### Step 2: Update Nginx

**Script:** `/tmp/update-nginx-simple.sh`

**What it does:**
1. Backs up current Nginx config
2. Changes proxy_pass from `127.0.0.1:3030` to `127.0.0.1:3080`
3. Updates comment from "Zammad" to "FreeScout"
4. Tests and reloads Nginx
5. Verifies public route

**Expected output:**
- ✓ Nginx config valid
- ✓ Nginx reloaded
- ✓ Public route working

### Step 3: Freeze Zammad

**Script:** `/tmp/freeze-zammad.sh`

**What it does:**
1. Stops all Zammad containers (`docker compose down`)
2. Creates `/opt/zammad/ABANDONED_REASON.md` documenting why
3. Preserves all data and configuration

**Result:**
- Zammad stopped but preserved
- All volumes intact
- Can be restored if needed

## FreeScout Configuration

### Initial Setup

1. **Access installer:**
   - URL: `https://orthodoxmetrics.com/helpdesk/`
   - Should show FreeScout installer/setup page

2. **Complete web-based setup:**
   - Database connection (auto-configured via env vars)
   - Admin user creation
   - Site configuration

3. **Post-setup configuration:**
   - Mailbox name: "OrthodoxMetrics Internal"
   - Disable public registration
   - Enable API access (for OM-Ops integration)

### Environment Variables

**Location:** `/opt/freescout/.env`

**Variables:**
- `MYSQL_ROOT_PASSWORD` - MySQL root password
- `MYSQL_DATABASE` - Database name (freescout)
- `MYSQL_USER` - Database user (freescout)
- `MYSQL_PASSWORD` - Database password
- `ADMIN_PASS` - Initial admin password

## Verification

After setup:

```bash
# Container status
docker compose -f /opt/freescout/docker-compose.yml ps

# Port check
ss -tlnp | grep 3080

# Local HTTP
curl -I http://127.0.0.1:3080/

# Public HTTP
curl -I https://orthodoxmetrics.com/helpdesk/
```

## Why FreeScout Over Zammad

### Simplicity
- **2 services** vs 4 (MySQL + FreeScout vs Postgres + Redis + Elasticsearch + Zammad)
- **No Redis** - Not required
- **No Elasticsearch** - Not required
- **Standard PHP/Laravel** - Easier to understand and debug

### Reliability
- **Fewer moving parts** - Less to break
- **Standard MySQL** - Well-understood database
- **No volume mount issues** - Proper volume usage from start
- **Better documentation** - Clear setup instructions

### Maintenance
- **Easier troubleshooting** - Standard Laravel patterns
- **Active community** - Good support
- **Docker image** - Well-maintained (tiredofit/freescout)

## Files

- **Setup:** `/tmp/setup-freescout.sh`
- **Nginx Update:** `/tmp/update-nginx-simple.sh`
- **Freeze Zammad:** `/tmp/freeze-zammad.sh`
- **Compose:** `/tmp/freescout-docker-compose.yml`
- **Directory:** `/opt/freescout/`

## Next Steps

1. ✅ Complete FreeScout web installer
2. ✅ Configure mailbox and settings
3. ✅ Test ticket creation
4. ✅ Plan OM-Ops API integration
