#!/usr/bin/env node
import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import { setTimeout } from 'timers/promises';

async function runTest() {
  console.log('=== Starting watcher test ===');
  
  // Start the watcher
  const watcher = spawn('node', ['../dist/cli.js', '--watch', '--verbose'], {
    cwd: 'test-app',
    stdio: 'pipe'
  });

  let output = '';
  watcher.stdout.on('data', (data) => {
    const str = data.toString();
    output += str;
    console.log(str);
  });

  watcher.stderr.on('data', (data) => {
    console.error('ERROR:', data.toString());
  });

  // Wait for initial build
  await setTimeout(3000);
  
  console.log('\n=== Modifying header component ===');
  
  // Modify the header component
  await writeFile('test-app/src/components/header.tsx', `import React from 'react';

export const Header = () => {
  return (
    <header>
      <h1>My App - Version 3 CHANGED</h1>
    </header>
  );
};`);

  // Wait for re-render
  await setTimeout(3000);
  
  // Check if re-render happened
  if (output.includes('File change:') && output.includes('header.tsx')) {
    console.log('\n=== SUCCESS: File change detected ===');
  } else {
    console.log('\n=== FAIL: File change not detected ===');
  }
  
  // Kill the watcher
  watcher.kill();
  
  console.log('\n=== Test complete ===');
}

runTest().catch(console.error);