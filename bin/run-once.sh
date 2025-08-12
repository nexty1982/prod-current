#!/usr/bin/env bash
set -euo pipefail
# Usage: bin/run-once.sh <timeout-seconds> <command...>
TO=${1:-900}; shift || true
LOG=".cursor-run-$(date +%s).log"

echo "==> Running (timeout ${TO}s): $*" | tee "$LOG"
# Buffer stdout/stderr line-by-line so Cursor sees progress, then hard-exit on completion
timeout --preserve-status "${TO}" stdbuf -oL -eL "$@" 2>&1 | tee -a "$LOG"
CODE=${PIPESTATUS[0]}
echo "==> Exit code: $CODE" | tee -a "$LOG"
exit "$CODE"
