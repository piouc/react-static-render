#!/usr/bin/env node
import { spawn } from 'child_process';
import { writeFile, readFile } from 'fs/promises';
import { setTimeout } from 'timers/promises';
import { resolve } from 'path';

async function runTest() {
  const headerPath = resolve('test-app/src/components/header.tsx');
  
  // Read original content
  const original = await readFile(headerPath, 'utf8');
  
  const watcher = spawn('node', ['../dist/cli.js', '--watch', '--verbose'], {
    cwd: 'test-app',
    stdio: 'pipe'
  });

  let output = '';
  let changeDetected = false;
  
  watcher.stdout.on('data', (data) => {
    const str = data.toString();
    output += str;
    console.log(str.trim());
    
    if (str.includes('File change:') || str.includes('Dependency changed')) {
      changeDetected = true;
    }
  });

  watcher.stderr.on('data', (data) => {
    console.error('ERROR:', data.toString());
  });

  // Wait for watcher to be ready
  await setTimeout(2000);
  
  console.log('\n=== Making file change ===');
  console.log(`Path: ${headerPath}`);
  
  // Make a change using fs directly (not through shell)
  await writeFile(headerPath, `import React from 'react';

export const Header = () => {
  return (
    <header>
      <h1>My App - Version 4 UPDATED BY TEST</h1>
    </header>
  );
};`);

  // Wait for change detection
  await setTimeout(3000);
  
  if (changeDetected) {
    console.log('\n=== SUCCESS: Change detected ===');
  } else {
    console.log('\n=== FAIL: Change not detected ===');
    console.log('Output:', output);
  }
  
  // Restore original
  await writeFile(headerPath, original);
  
  watcher.kill();
}

runTest().catch(console.error);