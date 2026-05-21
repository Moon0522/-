#!/bin/bash
set -euo pipefail

# Only run in remote (web) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 120000}'

cd "$CLAUDE_PROJECT_DIR"

# Install dependencies if node_modules is missing or stale
if [ ! -d "node_modules" ]; then
  npm install --legacy-peer-deps
fi

# Kill any stale Next.js processes on ports 3000-3002
for port in 3000 3001 3002; do
  pid=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null || true
  fi
done

sleep 1

# Start the dev server in the background
nohup npm run dev > /tmp/nextjs-dev.log 2>&1 &

# Wait until it responds
for i in $(seq 1 20); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200\|304"; then
    echo "TradeDesk dev server ready on :3000" >&2
    break
  fi
  sleep 1
done
