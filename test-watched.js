#!/usr/bin/env node
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function runTest() {
  const watcher = spawn('node', ['../dist/cli.js', '--watch', '--verbose'], {
    cwd: 'test-app',
    stdio: 'pipe'
  });

  watcher.stdout.on('data', (data) => {
    const str = data.toString();
    console.log(str.trim());
    
    if (str.includes('Watched directories:')) {
      // Wait a bit to capture all output then exit
      setTimeout(1000).then(() => {
        watcher.kill();
        process.exit(0);
      });
    }
  });

  watcher.stderr.on('data', (data) => {
    console.error('ERROR:', data.toString());
  });
  
  // Timeout after 10 seconds
  await setTimeout(10000);
  watcher.kill();
  console.log('\nTimeout reached');
}

runTest().catch(console.error);