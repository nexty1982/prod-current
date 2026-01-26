# Pivot to FreeScout - Migration Summary

## Date: 2026-01-23

## Why We Pivoted

### Zammad Issues

1. **Complexity**
   - Required 4 services: Postgres, Redis, Elasticsearch, Zammad
   - Complex volume mount issues overwriting application code
   - Difficult to diagnose and fix restart loops

2. **Restart Loops**
   - Persistent database authentication failures
   - Password synchronization issues between multiple env files
   - Bundler gem errors due to volume mounts overwriting app code
   - Container restarting every 30-60 seconds

3. **Credential Drift**
   - Password mismatches between:
     - `/opt/zammad/.env`
     - `/opt/zammad/.secrets.env`
     - PostgreSQL database role
   - Environment variable expansion issues
   - Difficult to maintain consistent credentials

4. **Time Investment**
   - Multiple fix attempts over several hours
   - Each fix revealed new issues
   - Not sustainable for internal help desk needs

## Why FreeScout Fits Better

### Advantages

1. **Simpler Stack**
   - Only 2 services: MySQL + FreeScout
   - No Redis required
   - No Elasticsearch required
   - No background workers needed to boot

2. **Easier Setup**
   - Standard PHP/Laravel application
   - Well-documented Docker setup
   - Straightforward environment configuration

3. **Reliability**
   - Less moving parts = fewer failure points
   - Standard MySQL (well-understood)
   - No complex volume mount issues

4. **Maintenance**
   - Easier to troubleshoot
   - Standard Laravel application patterns
   - Better documentation and community support

## Setup

### Location
- **Directory:** `/opt/freescout`
- **Port:** `127.0.0.1:3080:80` (internal only)
- **Public URL:** `https://orthodoxmetrics.com/helpdesk/`

### Services
1. **mysql** - MySQL 8.0
2. **freescout** - FreeScout PHP/Laravel app

### Volumes
- `freescout-mysql-data` - Database data
- `freescout-storage` - Application storage
- `freescout-uploads` - User uploads

### Configuration
- **Environment:** `/opt/freescout/.env`
- **Compose:** `/opt/freescout/docker-compose.yml`
- **Nginx:** Updated to proxy `/helpdesk/` → `http://127.0.0.1:3080/`

## Next Steps

### Immediate
1. ✅ Run setup script: `bash /tmp/setup-freescout.sh`
2. ✅ Update Nginx: `bash /tmp/update-nginx-freescout.sh`
3. ✅ Freeze Zammad: `bash /tmp/freeze-zammad.sh`

### Initial Configuration
1. Access installer: `https://orthodoxmetrics.com/helpdesk/`
2. Complete web-based setup
3. Create admin user
4. Configure mailbox: "OrthodoxMetrics Internal"
5. Disable public registration
6. Enable API access (for future OM-Ops integration)

### Future Integration
- **OM-Ops Enforcement:** Integrate FreeScout API with OM-Ops tools
- **Automated Ticket Creation:** From system alerts/monitoring
- **Work Order Management:** Use tickets for internal work orders

## Zammad Status

- **Status:** Stopped but preserved
- **Location:** `/opt/zammad`
- **Reason:** See `/opt/zammad/ABANDONED_REASON.md`
- **Rollback:** Possible if needed (see rollback instructions in ABANDONED_REASON.md)

## Files

- **Setup Script:** `/tmp/setup-freescout.sh`
- **Nginx Update:** `/tmp/update-nginx-freescout.sh`
- **Freeze Zammad:** `/tmp/freeze-zammad.sh`
- **Compose File:** `/tmp/freescout-docker-compose.yml`
- **Documentation:** `docs/dev/current-setup/2026-01-23_pivot-to-freescout.md`
