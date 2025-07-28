#!/bin/bash

cd test-app

# Start watcher in background
echo "Starting watcher..."
node ../dist/cli.js --watch --verbose &
WATCHER_PID=$!

# Wait for watcher to start
sleep 3

echo -e "\n=== Touching header.tsx file ==="
touch src/components/header.tsx

# Wait to see if change is detected
sleep 2

echo -e "\n=== Modifying header.tsx content ==="
echo "// Added comment" >> src/components/header.tsx

# Wait for response
sleep 2

# Kill watcher
kill $WATCHER_PID 2>/dev/null

echo -e "\n=== Test complete ==="