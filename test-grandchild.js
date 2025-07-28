#!/usr/bin/env node
import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import { setTimeout } from 'timers/promises';

async function runTest() {
  console.log('=== Grandchild component test ===\n');
  
  // Start the watcher
  const watcher = spawn('node', ['../dist/cli.js', '--watch', '--verbose'], {
    cwd: 'test-app',
    stdio: 'pipe'
  });

  let output = '';
  watcher.stdout.on('data', (data) => {
    const str = data.toString();
    output += str;
    console.log(str.trim());
  });

  watcher.stderr.on('data', (data) => {
    console.error('ERROR:', data.toString());
  });

  // Wait for initial build and watcher to be ready
  await setTimeout(4000);
  
  console.log('\n=== Modifying grandchild (Button) component ===');
  
  // Modify the button component (grandchild)
  await writeFile('test-app/src/components/button.tsx', `import React from 'react';

export const Button = ({ children }: { children: React.ReactNode }) => {
  return (
    <button>
      {children} - Version 2 UPDATED
    </button>
  );
};`);

  // Wait for potential re-render
  await setTimeout(3000);
  
  // Check if re-render happened
  const changeDetected = output.includes('[Chokidar] File changed:') && 
                         output.includes('button.tsx');
  
  if (changeDetected) {
    console.log('\n=== File change detected ===');
    const rerenderTriggered = output.includes('Dependency changed') || 
                             output.includes('re-rendering');
    if (rerenderTriggered) {
      console.log('=== SUCCESS: Re-render triggered ===');
    } else {
      console.log('=== FAIL: File change detected but no re-render ===');
    }
  } else {
    console.log('\n=== FAIL: File change not detected by watcher ===');
  }
  
  // Kill the watcher
  watcher.kill();
  
  console.log('\n=== Test complete ===');
}

runTest().catch(console.error);