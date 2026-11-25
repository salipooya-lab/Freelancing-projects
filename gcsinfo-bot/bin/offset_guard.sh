#!/bin/bash
# Validates ~/workspace/telegram-bot/state/offset.txt before a poller run.
# Telegram update_ids are at most 10 digits. The offset file has corrupted
# three times (2026-11-07, 2026-11-08 00:xx, 2026-11-08 15:36 UTC) by having
# a Unix-epoch timestamp appended to the real offset, e.g. 9143715321794152543.
# A corrupted offset makes getUpdates silently return nothing, so the bot
# would miss messages. This guard repairs it from the last known-good offset
# recorded in poll.log / poll_ok.log and prints the valid offset on stdout.
set -u
STATE="$HOME/workspace/telegram-bot/state"
F="$STATE/offset.txt"
cur="$(cat "$F" 2>/dev/null | tr -d '[:space:]')"
if printf '%s' "$cur" | grep -qE '^[0-9]{1,10}$'; then
  printf '%s\n' "$cur"
  exit 0
fi
good="$(grep -ohE 'offset [0-9]{1,10}' "$STATE/poll.log" "$STATE/poll_ok.log" 2>/dev/null | grep -oE '[0-9]+$' | tail -1)"
if [ -n "$good" ]; then
  echo "offset_guard: repaired corrupted offset '$cur' -> '$good' (from poll logs)" >&2
  printf '%s\n' "$good" > "$F"
  printf '%s\n' "$good"
  exit 0
fi
echo "offset_guard: offset file corrupted ('$cur') and no known-good offset in logs" >&2
exit 1
