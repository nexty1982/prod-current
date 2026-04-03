#!/usr/bin/env bash
# om-check-updates.sh — Check if orthodoxmetrics & omai are running the latest code from GitHub
# Usage: ./scripts/om-check-updates.sh [--json]

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────
OM_DIR="/var/www/orthodoxmetrics/prod"
OMAI_DIR="/var/www/omai"
OM_SERVICE="orthodox-backend"
OMAI_SERVICE="omai"
OCR_SERVICE="om-ocr-worker"

# Colors (disabled if not a terminal or --json)
JSON_MODE=false
if [[ "${1:-}" == "--json" ]]; then
    JSON_MODE=true
fi

if [[ -t 1 ]] && ! $JSON_MODE; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    CYAN='\033[0;36m'
    BOLD='\033[1m'
    DIM='\033[2m'
    RESET='\033[0m'
else
    RED='' GREEN='' YELLOW='' CYAN='' BOLD='' DIM='' RESET=''
fi

# ── Helpers ─────────────────────────────────────────────────────────
header()  { echo -e "\n${BOLD}${CYAN}═══ $1 ═══${RESET}"; }
ok()      { echo -e "  ${GREEN}✓${RESET} $1"; }
warn()    { echo -e "  ${YELLOW}⚠${RESET} $1"; }
fail()    { echo -e "  ${RED}✗${RESET} $1"; }
info()    { echo -e "  ${DIM}$1${RESET}"; }
divider() { echo -e "${DIM}  ──────────────────────────────────────────${RESET}"; }

service_status() {
    local svc="$1"
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
        echo "running"
    elif systemctl is-enabled --quiet "$svc" 2>/dev/null; then
        echo "stopped"
    else
        echo "not-found"
    fi
}

# Fetch latest from remote, returns 0 on success
fetch_remote() {
    local dir="$1"
    git -C "$dir" fetch origin --quiet 2>/dev/null
}

# Get the deployed commit from .last-deploy.json
get_deploy_commit() {
    local dir="$1"
    local file="$dir/.last-deploy.json"
    if [[ -f "$file" ]]; then
        node -e "try { const d = JSON.parse(require('fs').readFileSync('$file','utf8')); console.log(d.head_commit_short || d.head_commit || d.commit || d.git_sha || ''); } catch(e) { console.log(''); }"
    fi
}

get_deploy_time() {
    local dir="$1"
    local file="$dir/.last-deploy.json"
    if [[ -f "$file" ]]; then
        node -e "try { const d = JSON.parse(require('fs').readFileSync('$file','utf8')); console.log(d.deployed_at || d.timestamp || ''); } catch(e) { console.log(''); }"
    fi
}

get_deploy_target() {
    local dir="$1"
    local file="$dir/.last-deploy.json"
    if [[ -f "$file" ]]; then
        node -e "try { const d = JSON.parse(require('fs').readFileSync('$file','utf8')); console.log(d.deploy_target || d.target || 'all'); } catch(e) { console.log('all'); }"
    fi
}

# ── Collect data ────────────────────────────────────────────────────
declare -A results

check_project() {
    local name="$1"
    local dir="$2"
    local service="$3"
    local deploy_script="$4"

    header "$name"

    # 1. Service status
    local svc_state
    svc_state=$(service_status "$service")
    case "$svc_state" in
        running) ok "Service ${BOLD}$service${RESET} is running" ;;
        stopped) fail "Service ${BOLD}$service${RESET} is stopped" ;;
        *)       fail "Service ${BOLD}$service${RESET} not found" ;;
    esac

    # 2. Current branch
    local current_branch
    current_branch=$(git -C "$dir" branch --show-current 2>/dev/null || echo "unknown")
    if [[ "$current_branch" == "main" ]]; then
        ok "On branch: ${BOLD}main${RESET}"
    else
        warn "On branch: ${BOLD}$current_branch${RESET} (expected main)"
    fi

    # 3. Fetch remote
    echo -e "  ${DIM}Fetching from origin...${RESET}"
    if ! fetch_remote "$dir"; then
        fail "Could not fetch from origin"
        return
    fi

    # 4. Local main vs origin/main
    local local_main origin_main
    local_main=$(git -C "$dir" rev-parse main 2>/dev/null || echo "")
    origin_main=$(git -C "$dir" rev-parse origin/main 2>/dev/null || echo "")

    if [[ -z "$local_main" || -z "$origin_main" ]]; then
        fail "Could not resolve main / origin/main"
        return
    fi

    local behind_count ahead_count
    behind_count=$(git -C "$dir" rev-list --count main..origin/main 2>/dev/null || echo "0")
    ahead_count=$(git -C "$dir" rev-list --count origin/main..main 2>/dev/null || echo "0")

    if [[ "$behind_count" -eq 0 && "$ahead_count" -eq 0 ]]; then
        ok "Local main is up-to-date with origin/main"
    else
        [[ "$behind_count" -gt 0 ]] && warn "Local main is ${BOLD}$behind_count commits behind${RESET} origin/main"
        [[ "$ahead_count" -gt 0 ]]  && warn "Local main is ${BOLD}$ahead_count commits ahead${RESET} of origin/main"
    fi

    # 5. Deployed commit vs origin/main
    local deployed_commit deployed_time deployed_target
    deployed_commit=$(get_deploy_commit "$dir")
    deployed_time=$(get_deploy_time "$dir")
    deployed_target=$(get_deploy_target "$dir")

    divider
    info "Last deploy: ${deployed_time:-unknown}"
    info "Deploy target: ${deployed_target:-all}"
    info "Deployed commit: ${deployed_commit:-unknown}"
    info "origin/main HEAD: $(echo "$origin_main" | head -c 8)"

    local deploy_behind="0"
    if [[ -n "$deployed_commit" ]]; then
        # How many commits is the deployed version behind origin/main?
        deploy_behind=$(git -C "$dir" rev-list --count "${deployed_commit}..origin/main" 2>/dev/null || echo "?")

        if [[ "$deploy_behind" == "0" ]]; then
            ok "Deployed code matches origin/main — ${GREEN}up to date${RESET}"
        elif [[ "$deploy_behind" == "?" ]]; then
            fail "Cannot compare deployed commit to origin/main (commit not found locally?)"
        else
            fail "Deployed code is ${BOLD}${RED}$deploy_behind commits behind${RESET} origin/main"

            echo ""
            echo -e "  ${BOLD}Commits not yet deployed:${RESET}"
            git -C "$dir" log --oneline --no-decorate "${deployed_commit}..origin/main" 2>/dev/null | while IFS= read -r line; do
                echo -e "    ${YELLOW}→${RESET} $line"
            done
        fi
    else
        warn "No deploy metadata found — cannot determine deployed version"
    fi

    # 6. Dirty working tree?
    local dirty_count
    dirty_count=$(git -C "$dir" status --porcelain 2>/dev/null | wc -l)
    if [[ "$dirty_count" -gt 0 ]]; then
        warn "Working tree has ${BOLD}$dirty_count uncommitted changes${RESET}"
    else
        ok "Working tree is clean"
    fi

    # 7. Unmerged remote branches with recent activity
    divider
    local remote_branches
    remote_branches=$(git -C "$dir" branch -r --no-merged origin/main 2>/dev/null | { grep -v HEAD 2>/dev/null || true; } | wc -l)
    info "Unmerged remote branches: $remote_branches"

    # Store results for instructions
    results["${name}_behind"]="${deploy_behind:-0}"
    results["${name}_branch"]="$current_branch"
    results["${name}_local_behind"]="$behind_count"
    results["${name}_deploy_script"]="$deploy_script"
    results["${name}_dir"]="$dir"
    results["${name}_dirty"]="$dirty_count"
}

# ── OCR Worker ──────────────────────────────────────────────────────
check_ocr_worker() {
    header "OCR Worker"
    local svc_state
    svc_state=$(service_status "$OCR_SERVICE")
    case "$svc_state" in
        running) ok "Service ${BOLD}$OCR_SERVICE${RESET} is running" ;;
        stopped) fail "Service ${BOLD}$OCR_SERVICE${RESET} is stopped" ;;
        *)       fail "Service ${BOLD}$OCR_SERVICE${RESET} not found" ;;
    esac
    info "OCR worker runs from the same codebase as orthodoxmetrics backend"
    info "Updating orthodoxmetrics will also update the OCR worker"
}

# ── Frontend build freshness ────────────────────────────────────────
check_frontend_builds() {
    header "Frontend Build Freshness"

    # OM frontend
    local om_build_info="$OM_DIR/front-end/dist/build-info.json"
    if [[ -f "$om_build_info" ]]; then
        local fe_sha fe_time
        fe_sha=$(node -e "try { const d = JSON.parse(require('fs').readFileSync('$om_build_info','utf8')); console.log(d.gitSha || d.git_sha || ''); } catch(e) { console.log(''); }")
        fe_time=$(node -e "try { const d = JSON.parse(require('fs').readFileSync('$om_build_info','utf8')); console.log(d.buildTime || d.build_time || ''); } catch(e) { console.log(''); }")
        info "OM frontend build: ${fe_sha:-?} (${fe_time:-?})"

        if [[ -n "$fe_sha" ]]; then
            local fe_behind
            fe_behind=$(git -C "$OM_DIR" rev-list --count "${fe_sha}..origin/main" 2>/dev/null || echo "?")
            if [[ "$fe_behind" == "0" ]]; then
                ok "OM frontend is current"
            elif [[ "$fe_behind" != "?" ]]; then
                warn "OM frontend is ${BOLD}$fe_behind commits behind${RESET} origin/main"
            fi
        fi
    else
        warn "No OM frontend build-info.json found"
    fi

    # OMAI berry frontend
    local omai_version="$OMAI_DIR/berry/dist/version.json"
    if [[ -f "$omai_version" ]]; then
        local berry_time
        berry_time=$(node -e "try { const d = JSON.parse(require('fs').readFileSync('$omai_version','utf8')); console.log(d.version || ''); } catch(e) { console.log(''); }")
        info "OMAI Berry build: ${berry_time:-?}"
    else
        warn "No OMAI Berry version.json found"
    fi
}

# ── Nginx config sync check ────────────────────────────────────────
check_nginx_sync() {
    header "Nginx Config Sync"

    # Internal .239
    local live_239="/etc/nginx/sites-enabled/orthodoxmetrics.com"
    local repo_239="$OM_DIR/config/nginx-internal-239.conf"
    if [[ -f "$live_239" && -f "$repo_239" ]]; then
        # Normalize whitespace for comparison
        if diff <(sed 's/[[:space:]]*$//' "$live_239") <(sed 's/[[:space:]]*$//' "$repo_239") > /dev/null 2>&1; then
            ok "Internal .239 nginx config matches repo"
        else
            warn "Internal .239 nginx config differs from repo"
        fi
    else
        warn "Could not compare .239 nginx configs (file missing)"
    fi

    # External .221
    local repo_221="$OM_DIR/config/nginx-external-221.conf"
    if [[ -f "$repo_221" ]]; then
        local live_221
        live_221=$(ssh -o ConnectTimeout=3 192.168.1.221 "cat /etc/nginx/sites-enabled/orthodoxmetrics.com" 2>/dev/null || echo "")
        if [[ -n "$live_221" ]]; then
            if diff <(echo "$live_221" | sed 's/[[:space:]]*$//') <(sed 's/[[:space:]]*$//' "$repo_221") > /dev/null 2>&1; then
                ok "External .221 nginx config matches repo"
            else
                warn "External .221 nginx config differs from repo"
            fi
        else
            warn "Could not reach .221 to compare nginx config"
        fi
    fi
}

# ── Run all checks ──────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║   Orthodox Metrics — Deployment Status Check ║"
echo "  ║   $(date '+%Y-%m-%d %H:%M:%S %Z')                  ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${RESET}"

check_project "OrthodoxMetrics" "$OM_DIR" "$OM_SERVICE" "./scripts/om-deploy.sh"
check_project "OMAI" "$OMAI_DIR" "$OMAI_SERVICE" "/var/www/omai/scripts/omai-deploy.sh"
check_ocr_worker
check_frontend_builds
check_nginx_sync

# ── Update instructions ─────────────────────────────────────────────
needs_update=false
om_needs="${results[OrthodoxMetrics_behind]:-0}"
omai_needs="${results[OMAI_behind]:-0}"
om_branch="${results[OrthodoxMetrics_branch]:-main}"
omai_branch="${results[OMAI_branch]:-main}"
om_dirty="${results[OrthodoxMetrics_dirty]:-0}"
omai_dirty="${results[OMAI_dirty]:-0}"

if [[ "$om_needs" != "0" && "$om_needs" != "?" ]] || [[ "$omai_needs" != "0" && "$omai_needs" != "?" ]]; then
    needs_update=true
fi
if [[ "$om_branch" != "main" ]] || [[ "$omai_branch" != "main" ]]; then
    needs_update=true
fi

if $needs_update; then
    header "Update Instructions"
    echo ""

    # OrthodoxMetrics
    if [[ "$om_needs" != "0" && "$om_needs" != "?" ]] || [[ "$om_branch" != "main" ]]; then
        echo -e "  ${BOLD}OrthodoxMetrics:${RESET}"
        echo ""

        om_cmd="cd $OM_DIR"
        if [[ "$om_branch" != "main" ]]; then
            [[ "$om_dirty" -gt 0 ]] && om_cmd+=" && git stash"
            om_cmd+=" && git checkout main"
        fi
        if [[ "$om_needs" != "0" && "$om_needs" != "?" ]]; then
            om_cmd+=" && git pull origin main && ./scripts/om-deploy.sh"
        fi

        echo -e "    ${YELLOW}Full update:${RESET}"
        echo -e "    ${DIM}${om_cmd}${RESET}"
        echo ""
        if [[ "$om_needs" != "0" && "$om_needs" != "?" ]]; then
            echo -e "    ${YELLOW}Or backend/frontend only:${RESET}"
            echo -e "    ${DIM}${om_cmd/ && .\/scripts\/om-deploy.sh/} && ./scripts/om-deploy.sh be${RESET}"
            echo -e "    ${DIM}${om_cmd/ && .\/scripts\/om-deploy.sh/} && ./scripts/om-deploy.sh fe${RESET}"
            echo ""
        fi
    fi

    # OMAI
    if [[ "$omai_needs" != "0" && "$omai_needs" != "?" ]] || [[ "$omai_branch" != "main" ]]; then
        echo -e "  ${BOLD}OMAI:${RESET}"
        echo ""

        omai_cmd="cd $OMAI_DIR"
        if [[ "$omai_branch" != "main" ]]; then
            [[ "$omai_dirty" -gt 0 ]] && omai_cmd+=" && git stash"
            omai_cmd+=" && git checkout main"
        fi
        if [[ "$omai_needs" != "0" && "$omai_needs" != "?" ]]; then
            omai_cmd+=" && git pull origin main && ./scripts/omai-deploy.sh"
        fi

        echo -e "    ${YELLOW}Full update:${RESET}"
        echo -e "    ${DIM}${omai_cmd}${RESET}"
        echo ""
        if [[ "$omai_needs" != "0" && "$omai_needs" != "?" ]]; then
            echo -e "    ${YELLOW}Or backend/frontend only:${RESET}"
            echo -e "    ${DIM}${omai_cmd/ && .\/scripts\/omai-deploy.sh/} && ./scripts/omai-deploy.sh be${RESET}"
            echo -e "    ${DIM}${omai_cmd/ && .\/scripts\/omai-deploy.sh/} && ./scripts/omai-deploy.sh fe${RESET}"
            echo ""
        fi
    fi
else
    header "Status"
    echo ""
    echo -e "  ${GREEN}${BOLD}All deployments are up to date.${RESET}"
    echo ""
fi

echo -e "${DIM}  Done. $(date '+%H:%M:%S')${RESET}"
echo ""
