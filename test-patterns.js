#!/usr/bin/env node
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function runTest() {
  const watcher = spawn('node', ['../dist/cli.js', '--watch', '--verbose'], {
    cwd: 'test-app',
    stdio: 'pipe'
  });

  let output = '';
  let foundPatterns = false;
  
  watcher.stdout.on('data', (data) => {
    const str = data.toString();
    output += str;
    console.log(str);
    
    if (str.includes('Watching patterns:')) {
      foundPatterns = true;
      // Kill after we see the patterns
      setTimeout(1000).then(() => watcher.kill());
    }
  });

  watcher.stderr.on('data', (data) => {
    console.error('ERROR:', data.toString());
  });

  watcher.on('exit', () => {
    if (!foundPatterns) {
      console.log('\n=== Watch patterns not found in output ===');
    }
  });
}

runTest().catch(console.error);