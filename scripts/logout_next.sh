#!/bin/bash
set -Eeuo pipefail

USER_TO_KILL="next"
CURRENT_TTY="$(tty | sed 's#/dev/##')"

who | awk -v user="$USER_TO_KILL" -v tty="$CURRENT_TTY" '
  $1 == user && $2 != tty { print $2 }
' | while read -r pts; do
  pkill -HUP -t "$pts"
done
