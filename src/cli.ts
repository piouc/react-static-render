#!/usr/bin/env node

import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import inquirer from 'inquirer';
import { loadConfig, createDefaultConfig } from './config.js';
import { Renderer } from './render.js';
import { LiveReloadServer } from './websocket.js';
import { FileWatcher } from './watcher.js';
import type { RenderConfig, RenderOptions, RenderResult } from './types.js';

interface InitOptions {
  force?: boolean;
}

interface ListOptions {
  config?: string;
}

const program = new Command();

program
  .name('react-static-render')
  .description('A CLI tool for rendering React components to static HTML files')
  .version('1.0.0');

async function handleConfigLoad(configPath?: string): Promise<RenderConfig> {
  const configResult = await loadConfig(configPath);
  
  if (!configResult.success) {
    console.error('Configuration Error:', configResult.error.message);
    if (configResult.error.filePath) {
      console.error('File:', configResult.error.filePath);
    }
    if (configResult.error.cause) {
      console.error('Cause:', configResult.error.cause.message);
    }
    process.exit(1);
  }
  
  return configResult.data;
}

function applyCliOverrides(config: RenderConfig, options: RenderOptions): RenderConfig {
  const overrides: Partial<RenderConfig> = {};
  
  if (options.output) {
    overrides.outputDir = options.output;
  }
  if (options.port) {
    overrides.websocketPort = options.port;
  }
  if (options.verbose) {
    overrides.verbose = true;
  }
  
  return { ...config, ...overrides };
}

function reportResults(results: RenderResult<string>[]): void {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\nRender complete: ${successful} succeeded, ${failed} failed`);
  
  if (failed > 0) {
    console.error('\nFailed renders:');
    results.forEach((result) => {
      if (!result.success) {
        console.error(`  - ${result.error.message}`);
        if (result.error.filePath) {
          console.error(`    File: ${result.error.filePath}`);
        }
      }
    });
  }
}

async function startWatchMode(
  config: RenderConfig, 
  renderer: Renderer, 
  enableLiveReload: boolean
): Promise<void> {
  console.log('\nStarting watch mode...');
  
  let liveReloadServer: LiveReloadServer | null = null;
  if (enableLiveReload) {
    liveReloadServer = new LiveReloadServer(config);
    liveReloadServer.start();
    console.log('Live reload enabled');
  }
  
  const watcher = new FileWatcher(config, async (files: readonly string[]) => {
    console.log(`\nFiles changed, re-rendering ${files.length} file(s)...`);
    const results = await renderer.renderFiles(files);
    reportResults(results);
    if (liveReloadServer) {
      liveReloadServer.broadcastReload();
    }
  });
  
  await watcher.start();
  
  console.log('Watching for changes... Press Ctrl+C to stop.');
  
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    const shutdownTasks: Promise<void>[] = [
      renderer.stop(),
      watcher.stop()
    ];
    if (liveReloadServer) {
      shutdownTasks.push(liveReloadServer.stop());
    }
    await Promise.all(shutdownTasks);
    process.exit(0);
  });
}

async function renderAction(files: string[], options: RenderOptions): Promise<void> {
  try {
    const baseConfig = await handleConfigLoad(options.config);
    const config = applyCliOverrides(baseConfig, options);
    const renderer = new Renderer(config);

    if (files.length > 0) {
      console.log(`Rendering ${files.length} file(s)...`);
      const results = await renderer.renderFiles(files);
      reportResults(results);
    } else {
      console.log('Rendering all entry points...');
      const results = await renderer.renderAll();
      reportResults(results);
    }

    if (options.watch) {
      await startWatchMode(config, renderer, options.liveReload || false);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function initAction(options: InitOptions): Promise<void> {
  const configPath = resolve(process.cwd(), 'react-static-render.config.json');
  
  try {
    if (!options.force) {
      await readFile(configPath);
      console.error('Configuration file already exists. Use --force to overwrite.');
      process.exit(1);
    }
  } catch {
    // File doesn't exist, we can create it
  }

  console.log('Welcome to React Static Render setup!\n');
  
  // Prompt for required configuration
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'entryPointsBase',
      message: 'Where are your React entry point files located?',
      default: 'src/entry-points',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Entry points directory is required';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'outputDir',
      message: 'Where should the rendered HTML files be saved?',
      default: 'dist',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Output directory is required';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'templateDir',
      message: 'Where are your template files located?',
      default: 'templates',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Template directory is required';
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'templateEngine',
      message: 'Which template engine are you using?',
      choices: [
        { name: 'Auto-detect based on file extension', value: 'auto' },
        { name: 'PHP', value: 'php' },
        { name: 'Liquid (Shopify/Jekyll)', value: 'liquid' }
      ],
      default: 'auto'
    }
  ]);

  // Merge with default config
  const defaultConfig = createDefaultConfig();
  const config = {
    ...defaultConfig,
    ...answers
  };
  
  const content = JSON.stringify(config, null, 2);
  
  await writeFile(configPath, content, 'utf-8');
  console.log('\n✅ Created configuration file: react-static-render.config.json');
  console.log('\nNext steps:');
  console.log('1. Create your entry point files in the specified directory');
  console.log('2. Run "react-static-render" to render your components');
}

async function listAction(options: ListOptions): Promise<void> {
  try {
    const config = await handleConfigLoad(options.config);
    const renderer = new Renderer(config);
    const entryPoints = await renderer.findEntryPoints();
    
    console.log(`Found ${entryPoints.length} entry point(s):`);
    entryPoints.forEach(file => console.log(`  - ${file}`));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Default action (render without explicit command)
program
  .argument('[files...]', 'Files to render (optional)')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-w, --watch', 'Enable watch mode')
  .option('-l, --live-reload', 'Enable live reload via WebSocket')
  .option('-p, --port <number>', 'WebSocket port for live reload', parseInt)
  .option('-o, --output <dir>', 'Output directory')
  .option('-v, --verbose', 'Enable verbose output')
  .action(renderAction);


// Init command to create config file
program
  .command('init')
  .description('Create a configuration file')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(initAction);

// List command to show all entry points
program
  .command('list')
  .description('List all entry points')
  .option('-c, --config <path>', 'Path to configuration file')
  .action(listAction);

// Parse command line arguments
program.parse(process.argv);