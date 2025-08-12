#!/usr/bin/env bash
set -euo pipefail
# Usage: bin/run-detached.sh <name> <command...>
NAME="${1:?name required}"; shift
LOG="logs/${NAME}.log"
mkdir -p logs
# Run detached so terminal returns. Use nohup to sever TTY and disown to detach shell job.
( nohup bash -lc "$* >> '$LOG' 2>&1" & disown ) || true
echo "Started '$NAME' (detached). Logs: $LOG"

