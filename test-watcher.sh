#!/bin/bash

# Start watcher in background
cd test-app
node ../dist/cli.js --watch --verbose &
WATCHER_PID=$!

# Wait for watcher to start
sleep 3

echo "=== Initial render complete ==="

# Test 1: Modify the header component
echo "=== Test 1: Modifying header component ==="
cat > src/components/header.tsx << 'EOF'
import React from 'react';

export const Header = () => {
  return (
    <header>
      <h1>My App - Version 2 UPDATED</h1>
    </header>
  );
};
EOF

# Wait for re-render
sleep 2

# Test 2: Check the output
echo "=== Checking output for update ==="
grep -q "Version 2 UPDATED" dist/home.html && echo "SUCCESS: Component update triggered re-render" || echo "FAIL: Component update did not trigger re-render"

# Kill watcher
kill $WATCHER_PID

# Show the generated HTML
echo "=== Generated HTML ==="
cat dist/home.html