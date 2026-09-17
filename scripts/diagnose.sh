#!/bin/bash
# Diagnose why Worktree Menubar won't launch on this machine.
#
#   bash diagnose.sh                    # checks /Applications/Worktree Menubar.app
#   bash diagnose.sh "/path/to/Worktree Menubar.app"
#
# Run it and send back the FULL output. The last section launches the app
# directly so any crash/kill reason prints instead of failing silently.

APP="${1:-/Applications/Worktree Menubar.app}"
BIN="$APP/Contents/MacOS/Worktree Menubar"
LOG="$(mktemp -t wtmb-launch)"

section() { printf '\n===== %s =====\n' "$1"; }

section "Machine"
sw_vers
echo "arch: $(uname -m)   (the app is arm64-only — Intel Macs cannot run it)"

section "App bundle"
if [ ! -d "$APP" ]; then
  echo "NOT FOUND: $APP — pass the path as an argument if it lives elsewhere."
  exit 1
fi
echo "path: $APP"
echo "app version: $(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP/Contents/Info.plist" 2>&1)"
echo "needs macOS >= $(/usr/libexec/PlistBuddy -c 'Print :LSMinimumSystemVersion' "$APP/Contents/Info.plist" 2>&1)"
file "$BIN"

section "Quarantine / provenance attrs (should print nothing)"
xattr -rl "$APP" 2>/dev/null | grep -i -e quarantine -e provenance || echo "(none — xattr took)"

section "Broken symlinks inside the bundle (should print 0 — >0 means the zip was extracted badly)"
find "$APP" -type l ! -exec test -e {} \; -print | tee /dev/stderr | wc -l | tr -d ' '

section "Code signature (ad-hoc/linker-signed is EXPECTED for this app)"
codesign -dv "$APP" 2>&1 | grep -e '^Signature' -e 'flags='
codesign --verify --strict "$BIN" 2>&1 && echo "main binary signature: OK"

section "Security tooling that can silently block unsigned apps"
for t in /usr/local/bin/santactl /opt/santa/bin/santactl /Applications/Santa.app; do
  [ -e "$t" ] && echo "FOUND: $t (Santa may be blocking ad-hoc-signed apps)"
done
profiles status -type enrollment 2>/dev/null || echo "(couldn't read MDM enrollment without sudo)"

section "Is it already running? (a stuck instance makes new launches quit instantly + silently)"
pgrep -fl "Worktree Menubar" || echo "not running"

section "Pre-existing crash reports"
ls -t "$HOME/Library/Logs/DiagnosticReports" 2>/dev/null | grep -i -e worktree -e electron | head -5 || echo "(none)"

section "Launching the binary directly (watching for 12s)"
"$BIN" >"$LOG" 2>&1 &
PID=$!
sleep 12
if kill -0 "$PID" 2>/dev/null; then
  echo "STILL RUNNING after 12s (pid $PID) — the app launches fine."
  echo "Look for its icon in the MENU BAR (not the Dock — it never shows a Dock icon or window)."
  echo "If you don't see it: check behind the MacBook notch (unplug external display / remove other"
  echo "menu bar icons) and any menu-bar manager (Bartender, Ice, Hidden Bar)."
else
  wait "$PID"; CODE=$?
  echo "EXITED with code $CODE"
  case $CODE in
    137) echo "-> SIGKILL: macOS (Gatekeeper/AMFI or MDM/Santa policy) killed it. See log dump below." ;;
    0) echo "-> Clean instant exit: almost certainly the single-instance lock — another copy is running or wedged." ;;
  esac
fi
echo "--- app output ---"
cat "$LOG"
echo "--- new crash reports ---"
find "$HOME/Library/Logs/DiagnosticReports" -newer "$LOG" -name '*orktree*' 2>/dev/null | head -3

section "System log mentions from the last 2 minutes"
log show --last 2m --style compact \
  --predicate 'eventMessage CONTAINS[c] "worktree" OR processImagePath CONTAINS "Worktree Menubar"' 2>/dev/null | tail -30
