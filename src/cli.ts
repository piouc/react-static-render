#!/usr/bin/env node

import { Command } from 'commander'
import { readFile, writeFile } from 'fs/promises'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { resolve } from 'path'
import inquirer from 'inquirer'
import pLimit from 'p-limit'
import { cpus } from 'os'
import { loadConfig, createDefaultConfig } from './config.js'
import { renderFile, findEntryPoints } from './render.js'
import { LiveReloadServer } from './websocket.js'
import { FileWatcher } from './watcher.js'
import type { RenderConfig, RenderOptions, RenderResult } from './config.js'

interface InitOptions {
  force?: boolean
}

interface ListOptions {
  config?: string
}

function getPackageVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const packageJsonPath = join(__dirname, '../package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    return packageJson.version
  } catch {
    return '1.0.0'
  }
}

const program = new Command()

program
  .name('react-static-render')
  .description('A CLI tool for rendering React components to static HTML files')
  .version(getPackageVersion())

async function handleConfigLoad(configPath?: string): Promise<RenderConfig> {
  const configResult = await loadConfig(configPath)
  
  if (!configResult.success) {
    const { error } = configResult
    console.error('Configuration Error:', error.message)
    if (error.filePath) console.error('File:', error.filePath)
    if (error.cause) console.error('Cause:', error.cause.message)
    process.exit(1)
  }
  
  return configResult.data
}

function applyCliOverrides(config: RenderConfig, options: RenderOptions): RenderConfig {
  const overrides: Partial<RenderConfig> = {}
  
  if (options.output) {
    overrides.outputDir = options.output
  }
  if (options.port) {
    overrides.websocketPort = options.port
  }
  if (options.verbose) {
    overrides.verbose = true
  }
  
  return { ...config, ...overrides }
}

async function renderWithConcurrency(
  files: readonly string[], 
  config: RenderConfig
): Promise<RenderResult<string>[]> {
  const maxConcurrent = config.maxConcurrentRenders === 'auto' || config.maxConcurrentRenders === undefined
    ? Math.max(1, cpus().length)
    : config.maxConcurrentRenders
    
  const limit = pLimit(maxConcurrent)
  
  const promises = files.map(file => 
    limit(() => renderFile(file, config))
  )
  
  return Promise.all(promises)
}

function reportResults(results: RenderResult<string>[]): void {
  const successful = results.filter(r => r.success).length
  const failed = results.length - successful
  
  console.log(`\nRender complete: ${successful} succeeded, ${failed} failed`)
  
  if (failed > 0) {
    console.error('\nFailed renders:')
    results.filter(r => !r.success).forEach(result => {
      console.error(`  - ${result.error.message}`)
      if (result.error.filePath) console.error(`    File: ${result.error.filePath}`)
      if (result.error.cause) console.error(result.error.cause)
    })
  }
}

async function startWatchMode(
  config: RenderConfig, 
  enableLiveReload: boolean
): Promise<void> {
  console.log('\nStarting watch mode...')
  
  const liveReloadServer = enableLiveReload ? new LiveReloadServer(config) : null
  if (liveReloadServer) {
    liveReloadServer.start()
    console.log('Live reload enabled')
  }
  
  const watcher = new FileWatcher(config, async (files: readonly string[]) => {
    console.log(`\nFiles changed, re-rendering ${files.length} file(s)...`)
    const results = await renderWithConcurrency(files, config)
    reportResults(results)
    liveReloadServer?.broadcastReload()
  })
  
  await watcher.start()
  console.log('Watching for changes... Press Ctrl+C to stop.')
  
  process.on('SIGINT', async () => {
    console.log('\nShutting down...')
    const shutdownTasks = [watcher.stop()]
    if (liveReloadServer) shutdownTasks.push(liveReloadServer.stop())
    await Promise.all(shutdownTasks)
    process.exit(0)
  })
}

async function renderAction(files: string[], options: RenderOptions): Promise<void> {
  try {
    const baseConfig = await handleConfigLoad(options.config)
    const config = applyCliOverrides(baseConfig, options)

    let results
    if (files.length > 0) {
      console.log(`Rendering ${files.length} file(s)...`)
      results = await renderWithConcurrency(files, config)
    } else {
      console.log('Rendering all entry points...')
      const entryPoints = await findEntryPoints(config)
      results = await renderWithConcurrency(entryPoints, config)
    }
    
    reportResults(results)

    if (options.watch) {
      await startWatchMode(config, options.liveReload || false)
    } else {
      process.exit(0)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

async function initAction(options: InitOptions): Promise<void> {
  const configPath = resolve(process.cwd(), 'react-static-render.config.json')
  
  try {
    if (!options.force) {
      await readFile(configPath)
      console.error('Configuration file already exists. Use --force to overwrite.')
      process.exit(1)
    }
  } catch {
    // File doesn't exist, we can create it
  }

  console.log('Welcome to React Static Render setup!\n')
  
  // Prompt for required configuration
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'entryPointDir',
      message: 'Where are your React entry point files located?',
      default: 'src/entry-points',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Entry points directory is required'
        }
        return true
      }
    },
    {
      type: 'input',
      name: 'outputDir',
      message: 'Where should the rendered HTML files be saved?',
      default: 'dist',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Output directory is required'
        }
        return true
      }
    },
    {
      type: 'input',
      name: 'templateDir',
      message: 'Where are your template files located?',
      default: 'templates',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Template directory is required'
        }
        return true
      }
    },
    {
      type: 'list',
      name: 'templateEngine',
      message: 'Which template engine are you using?',
      choices: [
        { name: 'HTML', value: 'html' },
        { name: 'PHP', value: 'php' },
        { name: 'Liquid (Shopify/Jekyll)', value: 'liquid' }
      ],
      default: 'html'
    }
  ])

  // Merge with default config
  const defaultConfig = createDefaultConfig()
  const config = {
    ...defaultConfig,
    ...answers
  }
  
  const content = JSON.stringify(config, null, 2)
  
  await writeFile(configPath, content, 'utf-8')
  console.log('\n✅ Created configuration file: react-static-render.config.json')
  console.log('\nNext steps:')
  console.log('1. Create your entry point files in the specified directory')
  console.log('2. Run "react-static-render" to render your components')
}

async function listAction(options: ListOptions): Promise<void> {
  try {
    const config = await handleConfigLoad(options.config)
    const entryPoints = await findEntryPoints(config)
    
    console.log(`Found ${entryPoints.length} entry point(s):`)
    entryPoints.forEach(file => console.log(`  - ${file}`))
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
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
  .action(renderAction)


// Init command to create config file
program
  .command('init')
  .description('Create a configuration file')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(initAction)

// List command to show all entry points
program
  .command('list')
  .description('List all entry points')
  .option('-c, --config <path>', 'Path to configuration file')
  .action(listAction)

// Parse command line arguments
program.parse(process.argv)