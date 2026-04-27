#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${1:-}"
PING_INTERVAL_SECONDS="${2:-300}"
PING_COUNT="${3:-1}"

if [[ -z "$TARGET_URL" ]]; then
  echo "ERROR: Missing URL argument."
  echo "Usage: ./scripts/ping-render.sh <url> [interval_seconds] [count]"
  exit 1
fi

echo "Starting ping job"
echo "Target URL: $TARGET_URL"
echo "Interval: ${PING_INTERVAL_SECONDS}s"
echo "Count: $PING_COUNT"
echo "Started at (UTC): $(date -u +'%Y-%m-%dT%H:%M:%SZ')"

for ((i=1; i<=PING_COUNT; i++)); do
  started="$(date +%s)"
  timestamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

  # Capture status code while keeping logs readable.
  status_code="$(
    curl -L --silent --show-error --max-time 30 \
      --output /dev/null --write-out "%{http_code}" \
      "$TARGET_URL" || echo "000"
  )"

  finished="$(date +%s)"
  duration="$((finished - started))"

  if [[ "$status_code" =~ ^2|3 ]]; then
    echo "[$timestamp] Ping $i/$PING_COUNT SUCCESS status=$status_code duration=${duration}s"
  else
    echo "[$timestamp] Ping $i/$PING_COUNT FAILED status=$status_code duration=${duration}s"
  fi

  if [[ "$i" -lt "$PING_COUNT" ]]; then
    sleep "$PING_INTERVAL_SECONDS"
  fi
done

echo "Finished at (UTC): $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
