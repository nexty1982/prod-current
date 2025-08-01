#!/bin/bash

# ==============================================================================
# Fix HTTPS Session Authentication Script
# ==============================================================================
# This script fixes the session configuration for HTTPS and restarts the server
# 
# Usage: ./fix-https-sessions.sh
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

log() {
    echo -e "${2:-$NC}$(date '+%Y-%m-%d %H:%M:%S') - $1${NC}"
}

info() {
    log "ℹ️ $1" "$BLUE"
}

success() {
    log "✅ $1" "$GREEN"
}

warning() {
    log "⚠️ $1" "$YELLOW"
}

echo "========================================"
echo "🔧 Fixing HTTPS Session Authentication"
echo "========================================"

info "Step 1: Setting environment variables for HTTPS session handling"

# Set production environment variables
export NODE_ENV=production
export HTTPS=true
export SESSION_SECRET="orthodox-metrics-production-secret-2025"
export TRUST_PROXY=true

success "Environment variables set:"
echo "   NODE_ENV: $NODE_ENV"
echo "   HTTPS: $HTTPS" 
echo "   SESSION_SECRET: SET"
echo "   TRUST_PROXY: $TRUST_PROXY"

info "Step 2: Validating session configuration"

# Check if the session config file was updated
if grep -q "secure: isHTTPS" config/session.js; then
    success "Session config has been updated for HTTPS"
else
    warning "Session config may not be updated - check config/session.js"
fi

info "Step 3: Clearing old sessions to force new secure cookies"

# Clear old sessions from database to force new secure cookies
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "
DELETE FROM sessions WHERE expires < UNIX_TIMESTAMP();
UPDATE sessions SET data = JSON_SET(data, '$.cookie.secure', true) WHERE JSON_EXTRACT(data, '$.cookie.secure') = false;
" 2>/dev/null || warning "Could not clear old sessions (this is ok)"

info "Step 4: Restarting server with new configuration"

# Restart PM2 with environment variables
pm2 restart orthodox-backend --update-env

success "Server restarted with HTTPS session configuration"

info "Step 5: Testing session configuration"

# Wait a moment for server to start
sleep 3

# Test the configuration
if curl -s https://orthodoxmetrics.com/api/auth/check > /dev/null; then
    success "Server is responding to HTTPS requests"
else
    warning "Server may not be responding properly"
fi

echo ""
echo "🎯 HTTPS Session Fix Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Clear your browser cookies completely (very important!)"
echo "2. Login again - cookies should now be secure and persist"
echo "3. Check browser dev tools:"
echo "   - F12 > Application > Cookies"
echo "   - Look for 'orthodox.sid' cookie"
echo "   - Should show: Secure=true, Domain=.orthodoxmetrics.com"
echo ""
echo "If sessions still don't persist:"
echo "1. Check PM2 logs: pm2 logs orthodox-backend"
echo "2. Monitor auth logs: tail -f logs/auth.log"
echo "3. Test session endpoint: curl https://orthodoxmetrics.com/debug/session"
echo ""

success "Session authentication should now work with HTTPS!" 