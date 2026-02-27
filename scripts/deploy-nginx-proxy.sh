#!/bin/bash
# ============================================================================
# Deploy Nginx Config & Maintenance Page to External Proxy (.221)
# ============================================================================
# Pushes the nginx config and updating.html from this server (.239)
# to the external proxy server (.221) and reloads nginx.
#
# Usage:
#   deploy-nginx-proxy.sh           — Deploy both nginx config + updating.html
#   deploy-nginx-proxy.sh nginx     — Deploy nginx config only
#   deploy-nginx-proxy.sh page      — Deploy updating.html only
#   deploy-nginx-proxy.sh --dry-run — Show what would be done without doing it
# ============================================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
PROXY_HOST="192.168.1.221"
PROXY_USER="next"
PROXY_SSH="${PROXY_USER}@${PROXY_HOST}"

# Source files (on this server, .239)
NGINX_CONF_SRC="/var/www/orthodoxmetrics/prod/config/nginx-external-221.conf"
UPDATING_HTML_SRC="/var/www/html/updating.html"

# Destination files (on .221)
NGINX_CONF_DST="/etc/nginx/sites-available/orthodoxmetrics.com"
UPDATING_HTML_DST="/var/www/html/updating.html"

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# ── Parse arguments ─────────────────────────────────────────────────────────
TARGET="${1:-all}"
DRY_RUN=false

case "$TARGET" in
  nginx)     DEPLOY_NGINX=true;  DEPLOY_PAGE=false ;;
  page)      DEPLOY_NGINX=false; DEPLOY_PAGE=true  ;;
  all|"")    DEPLOY_NGINX=true;  DEPLOY_PAGE=true  ;;
  --dry-run) DEPLOY_NGINX=true;  DEPLOY_PAGE=true; DRY_RUN=true ;;
  -h|--help)
    echo -e "${BOLD}Deploy Nginx Config to External Proxy (.221)${NC}"
    echo ""
    echo -e "${BOLD}Usage:${NC}"
    echo -e "  deploy-nginx-proxy.sh           Deploy nginx config + updating.html"
    echo -e "  deploy-nginx-proxy.sh ${GREEN}nginx${NC}     Deploy nginx config only"
    echo -e "  deploy-nginx-proxy.sh ${GREEN}page${NC}      Deploy updating.html only"
    echo -e "  deploy-nginx-proxy.sh ${YELLOW}--dry-run${NC} Show what would be done"
    echo ""
    echo -e "${BOLD}Files:${NC}"
    echo -e "  nginx config:   $NGINX_CONF_SRC"
    echo -e "  updating page:  $UPDATING_HTML_SRC"
    echo -e "  proxy server:   $PROXY_SSH"
    exit 0
    ;;
  *)
    echo -e "${RED}Unknown target: $TARGET${NC}" >&2
    echo "Usage: deploy-nginx-proxy.sh [nginx|page|--dry-run]" >&2
    exit 1
    ;;
esac

# ── Helpers ──────────────────────────────────────────────────────────────────
log_step()    { echo -e "  ${CYAN}→${NC} $1"; }
log_success() { echo -e "  ${GREEN}✓${NC} $1"; }
log_error()   { echo -e "  ${RED}✗${NC} $1" >&2; }
log_info()    { echo -e "  ${BLUE}ℹ${NC} $1"; }
log_warn()    { echo -e "  ${YELLOW}⚠${NC} $1"; }

echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  Deploy to External Proxy (${PROXY_HOST})${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

$DRY_RUN && log_warn "${YELLOW}DRY RUN — no changes will be made${NC}\n"

# ── Preflight checks ────────────────────────────────────────────────────────
log_step "Checking source files..."

ERRORS=0
if $DEPLOY_NGINX && [[ ! -f "$NGINX_CONF_SRC" ]]; then
  log_error "Nginx config not found: $NGINX_CONF_SRC"
  ((ERRORS++))
fi
if $DEPLOY_PAGE && [[ ! -f "$UPDATING_HTML_SRC" ]]; then
  log_error "Updating page not found: $UPDATING_HTML_SRC"
  ((ERRORS++))
fi
[[ $ERRORS -gt 0 ]] && exit 1
log_success "Source files exist"

log_step "Testing SSH connection to ${PROXY_HOST}..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$PROXY_SSH" "echo ok" >/dev/null 2>&1; then
  log_error "Cannot SSH to ${PROXY_SSH}"
  log_info "Ensure SSH key auth is configured: ssh-copy-id ${PROXY_SSH}"
  exit 1
fi
log_success "SSH connection OK"
echo ""

# ── Deploy nginx config ─────────────────────────────────────────────────────
if $DEPLOY_NGINX; then
  echo -e "${BOLD}${CYAN}▶ Nginx Configuration${NC}"

  log_step "Backing up current config on ${PROXY_HOST}..."
  if ! $DRY_RUN; then
    ssh "$PROXY_SSH" "sudo cp ${NGINX_CONF_DST} ${NGINX_CONF_DST}.bak.$(date +%Y%m%d-%H%M%S) 2>/dev/null || true"
  fi
  log_success "Backup created"

  log_step "Copying nginx config..."
  if ! $DRY_RUN; then
    scp -q "$NGINX_CONF_SRC" "${PROXY_SSH}:/tmp/om-nginx-external.conf"
    ssh "$PROXY_SSH" "sudo mv /tmp/om-nginx-external.conf ${NGINX_CONF_DST} && sudo chown root:root ${NGINX_CONF_DST}"
  fi
  log_success "$NGINX_CONF_SRC → ${PROXY_HOST}:${NGINX_CONF_DST}"

  log_step "Testing nginx config on ${PROXY_HOST}..."
  if ! $DRY_RUN; then
    NGINX_TEST=$(ssh "$PROXY_SSH" "sudo nginx -t 2>&1")
    if echo "$NGINX_TEST" | grep -q "syntax is ok"; then
      log_success "nginx -t passed"
    else
      log_error "nginx -t FAILED:"
      echo "$NGINX_TEST"
      log_warn "Rolling back to backup..."
      LATEST_BAK=$(ssh "$PROXY_SSH" "ls -t ${NGINX_CONF_DST}.bak.* 2>/dev/null | head -1")
      if [[ -n "$LATEST_BAK" ]]; then
        ssh "$PROXY_SSH" "sudo cp ${LATEST_BAK} ${NGINX_CONF_DST}"
        log_success "Rolled back to ${LATEST_BAK}"
      fi
      exit 1
    fi
  else
    log_info "(skipped — dry run)"
  fi

  log_step "Reloading nginx on ${PROXY_HOST}..."
  if ! $DRY_RUN; then
    ssh "$PROXY_SSH" "sudo systemctl reload nginx"
    log_success "nginx reloaded"
  else
    log_info "(skipped — dry run)"
  fi
  echo ""
fi

# ── Deploy updating.html ────────────────────────────────────────────────────
if $DEPLOY_PAGE; then
  echo -e "${BOLD}${CYAN}▶ Updating Page${NC}"

  log_step "Copying updating.html..."
  if ! $DRY_RUN; then
    scp -q "$UPDATING_HTML_SRC" "${PROXY_SSH}:/tmp/om-updating.html"
    ssh "$PROXY_SSH" "sudo mv /tmp/om-updating.html ${UPDATING_HTML_DST} && sudo chown root:root ${UPDATING_HTML_DST} && sudo chmod 644 ${UPDATING_HTML_DST}"
  fi
  log_success "$UPDATING_HTML_SRC → ${PROXY_HOST}:${UPDATING_HTML_DST}"

  # Also sync the template copy in the project
  log_step "Syncing template copy in config/..."
  if ! $DRY_RUN; then
    cp "$UPDATING_HTML_SRC" /var/www/orthodoxmetrics/prod/config/updating.html 2>/dev/null || true
  fi
  log_success "config/updating.html synced"
  echo ""
fi

# ── Verify ───────────────────────────────────────────────────────────────────
if ! $DRY_RUN; then
  echo -e "${BOLD}${CYAN}▶ Verification${NC}"

  log_step "Checking nginx status on ${PROXY_HOST}..."
  NGINX_STATUS=$(ssh "$PROXY_SSH" "sudo systemctl is-active nginx 2>/dev/null")
  if [[ "$NGINX_STATUS" == "active" ]]; then
    log_success "nginx is active on ${PROXY_HOST}"
  else
    log_error "nginx status: $NGINX_STATUS"
  fi

  if $DEPLOY_PAGE; then
    log_step "Verifying updating.html is served..."
    # Request a path that would trigger an error page (direct test not possible without stopping backend)
    TITLE=$(ssh "$PROXY_SSH" "head -5 ${UPDATING_HTML_DST}" 2>/dev/null | grep -o '<title>[^<]*</title>' || echo "")
    if [[ -n "$TITLE" ]]; then
      log_success "Page title: $TITLE"
    else
      log_warn "Could not read page title"
    fi
  fi
  echo ""
fi

# ── Done ─────────────────────────────────────────────────────────────────────
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════════════${NC}"
if $DRY_RUN; then
  echo -e "${BOLD}${YELLOW}  Dry run complete — no changes were made${NC}"
else
  echo -e "${BOLD}${GREEN}  Deployment to ${PROXY_HOST} complete${NC}"
fi
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════════════${NC}\n"
