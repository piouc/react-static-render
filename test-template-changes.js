#!/usr/bin/env node
import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import { setTimeout } from 'timers/promises';

async function runTest() {
  console.log('=== Testing template change detection ===\n');
  
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

  // Wait for initial build
  await setTimeout(4000);
  
  console.log('\n\n=== Test 1: Modifying home.php template ===');
  output = ''; // Reset output
  
  // Modify the home template
  await writeFile('test-app/templates/home.php', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Home Page - Updated Template</title>
</head>
<body>
  <h1>PHP Template for Home - VERSION 2</h1>
  <div id="root"></div>
  <footer>
    <p>Template Version 2 - UPDATED</p>
  </footer>
</body>
</html>`);

  await setTimeout(3000);
  
  // Check output
  const homeRendered = output.includes('home.tsx') || output.includes('home.php');
  const aboutRendered = output.includes('about.tsx') || output.includes('about.php');
  
  if (homeRendered && !aboutRendered) {
    console.log('✅ SUCCESS: Only home.tsx was re-rendered');
  } else if (!homeRendered) {
    console.log('❌ FAIL: home.tsx was not re-rendered');
  } else {
    console.log('❌ FAIL: Both home.tsx and about.tsx were re-rendered');
  }
  
  console.log('\n\n=== Test 2: Modifying about.php template ===');
  output = ''; // Reset output
  
  // Modify the about template
  await writeFile('test-app/templates/about.php', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About Page - Updated Template</title>
</head>
<body>
  <h1>PHP Template for About - VERSION 2</h1>
  <div id="root"></div>
  <footer>
    <p>About Template Version 2 - UPDATED</p>
  </footer>
</body>
</html>`);

  await setTimeout(3000);
  
  // Check output
  const homeRendered2 = output.includes('home.tsx') || output.includes('home.php');
  const aboutRendered2 = output.includes('about.tsx') || output.includes('about.php');
  
  if (aboutRendered2 && !homeRendered2) {
    console.log('✅ SUCCESS: Only about.tsx was re-rendered');
  } else if (!aboutRendered2) {
    console.log('❌ FAIL: about.tsx was not re-rendered');
  } else {
    console.log('❌ FAIL: Both home.tsx and about.tsx were re-rendered');
  }
  
  console.log('\n\n=== Test 3: Modifying contact.php template (no matching entry point) ===');
  output = ''; // Reset output
  
  // Modify the contact template
  await writeFile('test-app/templates/contact.php', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact Page - Updated Template</title>
</head>
<body>
  <h1>PHP Template for Contact - VERSION 2</h1>
  <div id="root"></div>
  <footer>
    <p>Contact Template Version 2 - Still no matching entry point</p>
  </footer>
</body>
</html>`);

  await setTimeout(3000);
  
  // Check output
  const anyRendered = output.includes('.tsx') || output.includes('Rendered:');
  
  if (!anyRendered) {
    console.log('✅ SUCCESS: No entry points were re-rendered (as expected)');
  } else {
    console.log('❌ FAIL: Some entry points were re-rendered unexpectedly');
  }
  
  // Kill the watcher
  watcher.kill();
  
  console.log('\n\n=== All tests complete ===');
}

runTest().catch(console.error);