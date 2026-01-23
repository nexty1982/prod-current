#!/bin/bash
# Freeze Zammad - stop but preserve for rollback - run as ROOT
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Freezing Zammad"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "=== Stopping Zammad Containers ==="
docker compose down
echo "✓ Zammad containers stopped"
echo ""

echo "=== Current State ==="
echo "Zammad directory: /opt/zammad"
echo "Status: Stopped (preserved for rollback)"
echo ""

echo "=== Why Zammad Was Abandoned ==="
cat > /opt/zammad/ABANDONED_REASON.md << 'EOF'
# Zammad Abandoned - Migration to FreeScout

## Date: 2026-01-23

## Reasons for Abandonment

### 1. Complexity
- Multiple services required (Postgres, Redis, Elasticsearch, Zammad)
- Complex volume mount issues (overwriting app code)
- Difficult to diagnose restart loops

### 2. Restart Loops
- Persistent database authentication failures
- Password synchronization issues between .env and database
- Bundler gem errors due to volume mounts
- Container restarting every 30-60 seconds

### 3. Credential Drift
- Password mismatches between:
  - /opt/zammad/.env
  - /opt/zammad/.secrets.env
  - PostgreSQL database role
- Environment variable expansion issues in docker-compose.yml
- Difficult to maintain consistent credentials

### 4. Time Investment
- Multiple fix attempts over several hours
- Each fix revealed new issues
- Not sustainable for internal help desk needs

## Migration Path

- **Replaced with:** FreeScout
- **Location:** /opt/freescout
- **Endpoint:** https://orthodoxmetrics.com/helpdesk/
- **Status:** Active

## Rollback Instructions

If needed, Zammad can be restored:

```bash
cd /opt/zammad
# Fix any credential issues
docker compose up -d
# Update Nginx to point /helpdesk/ back to 127.0.0.1:3030
```

## Data Preservation

- All volumes preserved:
  - zammad-postgres-data
  - zammad-elasticsearch-data
  - zammad-redis-data
  - zammad-storage
  - zammad-log

- Compose file preserved: /opt/zammad/docker-compose.yml
- Environment files preserved: /opt/zammad/.env, .secrets.env
EOF

echo "✓ Created ABANDONED_REASON.md"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  Zammad Frozen"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Zammad is stopped but preserved at /opt/zammad"
echo "All data and configuration files remain intact"
echo "See /opt/zammad/ABANDONED_REASON.md for details"
