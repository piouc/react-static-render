#!/usr/bin/env node
import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import { setTimeout } from 'timers/promises';

async function runTest() {
  console.log('=== Testing selective rendering based on dependencies ===\n');
  
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
  
  console.log('\n\n=== Test 1: Modifying Button component (used only by home.tsx) ===');
  output = ''; // Reset output
  
  // Modify the button component
  await writeFile('test-app/src/components/button.tsx', `import React from 'react';

export const Button = ({ children }: { children: React.ReactNode }) => {
  return (
    <button>
      {children} - Version 3 TEST
    </button>
  );
};`);

  await setTimeout(3000);
  
  // Check output
  if (output.includes('home.tsx') && !output.includes('about.tsx')) {
    console.log('✅ SUCCESS: Only home.tsx was re-rendered');
  } else {
    console.log('❌ FAIL: Expected only home.tsx to be re-rendered');
  }
  
  console.log('\n\n=== Test 2: Modifying Footer component (used only by about.tsx) ===');
  output = ''; // Reset output
  
  // Modify the footer component
  await writeFile('test-app/src/components/footer.tsx', `import React from 'react';

export const Footer = () => {
  return (
    <footer>
      <p>© 2024 My App - Version 2 UPDATED</p>
    </footer>
  );
};`);

  await setTimeout(3000);
  
  // Check output
  if (output.includes('about.tsx') && !output.includes('home.tsx')) {
    console.log('✅ SUCCESS: Only about.tsx was re-rendered');
  } else {
    console.log('❌ FAIL: Expected only about.tsx to be re-rendered');
  }
  
  console.log('\n\n=== Test 3: Modifying Header component (used only by home.tsx via navbar) ===');
  output = ''; // Reset output
  
  // Modify the header component
  await writeFile('test-app/src/components/header.tsx', `import React from 'react';
import { Navbar } from './navbar';

export const Header = () => {
  return (
    <header>
      <h1>My App - Version 4 CHANGED</h1>
      <Navbar />
    </header>
  );
};`);

  await setTimeout(3000);
  
  // Check output
  if (output.includes('home.tsx') && !output.includes('about.tsx')) {
    console.log('✅ SUCCESS: Only home.tsx was re-rendered');
  } else {
    console.log('❌ FAIL: Expected only home.tsx to be re-rendered');
  }
  
  // Kill the watcher
  watcher.kill();
  
  console.log('\n\n=== All tests complete ===');
}

runTest().catch(console.error);