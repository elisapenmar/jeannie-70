#!/bin/bash
# Runs the export once a day. Two jobs, not one:
#
#   1. Keeps a copy of every RSVP, memory and photograph in Google Drive.
#      The November 2026 loss happened because no copy existed anywhere.
#   2. Touches the database, which keeps a free-tier Supabase project from
#      pausing itself after a week of quiet.
#
# The service key lives in the macOS Keychain, never in this repo.

set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$HOME/Library/Logs/jeannie70-export.log"
mkdir -p "$(dirname "$LOG")"

echo "=== $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOG"

KEY=$(security find-generic-password -a "$USER" -s jeannie70-supabase -w 2>/dev/null)
if [ -z "$KEY" ]; then
  echo "No key in the Keychain under 'jeannie70-supabase'. See README." >> "$LOG"
  exit 1
fi

export SUPABASE_SERVICE_KEY="$KEY"
/usr/bin/python3 "$REPO/scripts/export.py" >> "$LOG" 2>&1
echo "exit $?" >> "$LOG"
