#!/bin/bash
# Installs the daily export as a launchd agent. Run once.
set -eu
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.jeannie70.export.plist"

if ! security find-generic-password -a "$USER" -s jeannie70-supabase -w >/dev/null 2>&1; then
  echo "Supabase service_role key needed. Find it at:"
  echo "  https://supabase.com/dashboard/project/rjnfvyjghybutgrtbbeu/settings/api-keys"
  echo "Pick service_role, not anon and not publishable."
  echo
  # -s so the key is not echoed to the screen and does not reach the shell
  # history the way a typed command would.
  printf "Paste it here and press return: "
  read -rs KEY
  echo
  if [ -z "$KEY" ]; then echo "Nothing pasted. Stopping."; exit 1; fi
  security add-generic-password -a "$USER" -s jeannie70-supabase -w "$KEY"
  unset KEY
  echo "Stored in your Keychain."
  echo
fi

mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.jeannie70.export</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${REPO}/scripts/daily-export.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>15</integer></dict>
  <key>RunAtLoad</key><true/>
</dict>
</plist>
PLISTEOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "Installed. Runs daily at 09:15, and once now."
echo "Log: ~/Library/Logs/jeannie70-export.log"
