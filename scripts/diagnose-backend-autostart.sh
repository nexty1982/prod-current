#!/bin/bash
#
# Diagnostic script to identify what's automatically starting the backend
# Run this to find all processes/services that might be starting orthodox-backend
#

set -e

echo "═══════════════════════════════════════════════════════════"
echo "🔍 Backend Auto-Start Diagnostic"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check 1: PM2 startup script
echo "1️⃣  Checking PM2 startup configuration..."
if pm2 startup 2>&1 | grep -q "systemd\|upstart\|launchd"; then
    echo "   ⚠️  PM2 startup script is configured!"
    echo "   Run: pm2 startup"
    pm2 startup 2>&1 | head -5
    echo ""
else
    echo "   ✅ PM2 startup script not found"
    echo ""
fi

# Check 2: systemd services
echo "2️⃣  Checking systemd services..."
if systemctl list-units --type=service --all 2>/dev/null | grep -i "orthodox\|pm2\|node.*3001" > /tmp/systemd_check.txt; then
    echo "   ⚠️  Found potential systemd services:"
    cat /tmp/systemd_check.txt | while read line; do
        echo "      $line"
    done
    echo ""
else
    echo "   ✅ No obvious systemd services found"
    echo ""
fi

# Check 3: PM2 saved processes
echo "3️⃣  Checking PM2 saved process list..."
if [ -f ~/.pm2/dump.pm2 ]; then
    echo "   ⚠️  PM2 has saved processes (~/.pm2/dump.pm2 exists)"
    echo "   This means PM2 will try to restore processes on restart"
    echo "   To disable: pm2 unstartup"
    echo ""
else
    echo "   ✅ No PM2 dump file found"
    echo ""
fi

# Check 4: Cron jobs
echo "4️⃣  Checking cron jobs..."
if crontab -l 2>/dev/null | grep -i "pm2\|orthodox\|node.*3001\|backend" > /tmp/cron_check.txt; then
    echo "   ⚠️  Found cron jobs that might start backend:"
    crontab -l 2>/dev/null | grep -i "pm2\|orthodox\|node.*3001\|backend" | while read line; do
        echo "      $line"
    done
    echo ""
else
    echo "   ✅ No relevant cron jobs found in user crontab"
    echo ""
fi

# Check 5: System-wide cron
echo "5️⃣  Checking system-wide cron jobs..."
if [ -f /etc/crontab ] && grep -i "pm2\|orthodox\|node.*3001\|backend" /etc/crontab 2>/dev/null > /tmp/system_cron.txt; then
    echo "   ⚠️  Found system-wide cron jobs:"
    cat /tmp/system_cron.txt | while read line; do
        echo "      $line"
    done
    echo ""
else
    echo "   ✅ No relevant system cron jobs found"
    echo ""
fi

# Check 6: rc.local or similar startup scripts
echo "6️⃣  Checking startup scripts..."
STARTUP_FILES=(
    "/etc/rc.local"
    "/etc/rc.d/rc.local"
    "/etc/systemd/system/rc-local.service"
    "~/.bashrc"
    "~/.bash_profile"
    "~/.profile"
    "/etc/profile.d/*"
)

FOUND_STARTUP=false
for file in "${STARTUP_FILES[@]}"; do
    expanded_file=$(eval echo "$file")
    if [ -f "$expanded_file" ] && grep -i "pm2\|orthodox\|node.*3001\|backend" "$expanded_file" 2>/dev/null > /dev/null; then
        echo "   ⚠️  Found startup commands in: $expanded_file"
        grep -i "pm2\|orthodox\|node.*3001\|backend" "$expanded_file" 2>/dev/null | head -3 | while read line; do
            echo "      $line"
        done
        FOUND_STARTUP=true
    fi
done

if [ "$FOUND_STARTUP" = false ]; then
    echo "   ✅ No startup scripts found with backend commands"
fi
echo ""

# Check 7: Current processes on port 3001
echo "7️⃣  Checking current processes on port 3001..."
if command -v ss >/dev/null 2>&1; then
    PORT_PROCESSES=$(ss -lntp 2>/dev/null | grep ":3001" || true)
    if [ -n "$PORT_PROCESSES" ]; then
        echo "   ⚠️  Processes currently using port 3001:"
        echo "$PORT_PROCESSES" | while read line; do
            echo "      $line"
        done
    else
        echo "   ✅ No processes currently using port 3001"
    fi
elif command -v lsof >/dev/null 2>&1; then
    PORT_PROCESSES=$(lsof -i :3001 2>/dev/null || true)
    if [ -n "$PORT_PROCESSES" ]; then
        echo "   ⚠️  Processes currently using port 3001:"
        echo "$PORT_PROCESSES" | while read line; do
            echo "      $line"
        done
    else
        echo "   ✅ No processes currently using port 3001"
    fi
else
    echo "   ⚠️  Cannot check (ss/lsof not available)"
fi
echo ""

# Check 8: PM2 process list
echo "8️⃣  Checking PM2 process list..."
pm2 list 2>/dev/null || echo "   ⚠️  PM2 not running or not accessible"
echo ""

# Check 9: Supervisor or other process managers
echo "9️⃣  Checking for other process managers..."
if command -v supervisorctl >/dev/null 2>&1; then
    if supervisorctl status 2>/dev/null | grep -i "orthodox\|backend\|3001" > /tmp/supervisor_check.txt; then
        echo "   ⚠️  Supervisor found with relevant processes:"
        cat /tmp/supervisor_check.txt | while read line; do
            echo "      $line"
        done
    else
        echo "   ✅ Supervisor not managing backend"
    fi
else
    echo "   ✅ Supervisor not installed"
fi
echo ""

# Check 10: Docker containers
echo "🔟 Checking for Docker containers..."
if command -v docker >/dev/null 2>&1; then
    if docker ps -a 2>/dev/null | grep -i "orthodox\|backend\|3001" > /tmp/docker_check.txt; then
        echo "   ⚠️  Docker containers found:"
        cat /tmp/docker_check.txt | while read line; do
            echo "      $line"
        done
    else
        echo "   ✅ No relevant Docker containers found"
    fi
else
    echo "   ✅ Docker not installed"
fi
echo ""

# Summary and recommendations
echo "═══════════════════════════════════════════════════════════"
echo "📋 Summary & Recommendations"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "To stop auto-starting backend:"
echo ""
echo "1. Disable PM2 startup (if enabled):"
echo "   pm2 unstartup"
echo ""
echo "2. Stop and delete PM2 processes:"
echo "   pm2 stop orthodox-backend"
echo "   pm2 delete orthodox-backend"
echo ""
echo "3. Kill any processes on port 3001:"
echo "   sudo lsof -ti :3001 | xargs sudo kill -9"
echo "   # OR"
echo "   sudo ss -tlnp | grep :3001"
echo ""
echo "4. Check and remove cron jobs (if found above)"
echo ""
echo "5. Check and remove startup scripts (if found above)"
echo ""
echo "6. Check systemd services:"
echo "   systemctl list-units --type=service | grep orthodox"
echo "   sudo systemctl stop <service-name>"
echo "   sudo systemctl disable <service-name>"
echo ""

# Cleanup temp files
rm -f /tmp/systemd_check.txt /tmp/cron_check.txt /tmp/system_cron.txt /tmp/supervisor_check.txt /tmp/docker_check.txt 2>/dev/null
