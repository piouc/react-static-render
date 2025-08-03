import { watch, FSWatcher } from 'chokidar'
import { resolve, parse, dirname } from 'path'
import { glob } from 'glob'
import dependencyTree from 'dependency-tree'
import { RenderConfig } from './config.js'

type WatcherEventType = 'add' | 'change' | 'unlink'
type FileChangeHandler = (files: readonly string[]) => Promise<void>

interface WatcherOptions {
  readonly ignored?: RegExp | string
  readonly persistent?: boolean
  readonly ignoreInitial?: boolean
  readonly cwd?: string
  readonly depth?: number
  readonly followSymlinks?: boolean
}

export class FileWatcher {
  private readonly config: RenderConfig
  private watcher: FSWatcher | null = null
  private readonly dependencyGraph = new Map<string, Set<string>>()
  private readonly reverseDependencyGraph = new Map<string, Set<string>>()
  private readonly onFileChange: FileChangeHandler
  private readonly entryPointDependencies = new Map<string, Set<string>>()

  constructor(config: RenderConfig, onFileChange: FileChangeHandler) {
    this.config = config
    this.onFileChange = onFileChange
  }

  async start(): Promise<void> {
    await this.buildInitialDependencyGraph()

    // Get all unique directories that contain dependencies
    const watchDirs = this.getWatchDirectories()
    
    // Always watch entry points directory
    watchDirs.add(this.config.entryPointDir)
    
    // Add template directory if specified
    if (this.config.templateDir) {
      watchDirs.add(this.config.templateDir)
    }
    
    // Add any custom patterns
    if (this.config.patterns) {
      this.config.patterns.forEach(pattern => watchDirs.add(pattern))
    }
    
    const watchPatterns = Array.from(watchDirs)

    const watcherOptions: WatcherOptions = {
      ignored: /node_modules/,
      persistent: true,
      ignoreInitial: true,
      cwd: process.cwd(),
      // Force deep watching
      depth: 99,
      // Follow symlinks
      followSymlinks: true
    }

    if (this.config.verbose) {
      console.log(`Watching patterns: ${JSON.stringify(watchPatterns)}`)
      console.log(`Current working directory: ${process.cwd()}`)
    }

    this.watcher = watch(watchPatterns, watcherOptions)

    this.watcher.on('change', (filePath: string) => {
      if (this.config.verbose) {
        console.log(`[Chokidar] File changed: ${filePath}`)
      }
      this.handleFileChange('change', filePath)
    })

    this.watcher.on('add', (filePath: string) => {
      this.handleFileChange('add', filePath)
    })

    this.watcher.on('unlink', (filePath: string) => {
      this.handleFileChange('unlink', filePath)
    })

    this.watcher.on('error', (error: unknown) => {
      console.error('Watcher error:', error)
    })

    this.watcher.on('ready', () => {
      console.log('File watcher ready')
      if (this.config.verbose && this.watcher) {
        const watched = this.watcher.getWatched()
        console.log('Watched directories:')
        Object.keys(watched).forEach(dir => {
          const files = watched[dir]
          if (files && files.length > 0) {
            console.log(`  ${dir}: ${files.length} files`)
            // Show first few files for debugging
            if (files.length <= 5) {
              files.forEach(f => console.log(`    - ${f}`))
            }
          }
        })
        
        // Also show total watched paths
        const totalFiles = Object.values(watched).reduce((sum, files) => 
          sum + (files?.length || 0), 0)
        console.log(`Total files watched: ${totalFiles}`)
      }
    })
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.watcher) {
        resolve()
        return
      }

      this.watcher.close().then(() => {
        this.watcher = null
        resolve()
      })
    })
  }

  private async buildInitialDependencyGraph(): Promise<void> {
    const extensions = this.config.fileExtensions || ['js', 'jsx', 'ts', 'tsx']
    const pattern = `**/*.{${extensions.join(',')}}`
    
    const entryPoints = await glob(pattern, {
      cwd: this.config.entryPointDir,
      absolute: true
    })

    if (this.config.verbose) {
      console.log(`Building dependency graph for ${entryPoints.length} entry points...`)
    }

    this.buildDependencyGraph(Object.freeze(entryPoints))
    
    if (this.config.verbose) {
      console.log(`Dependency graph built:`)
      console.log(`  - ${this.dependencyGraph.size} files with dependencies`)
      console.log(`  - ${this.reverseDependencyGraph.size} files are dependencies`)
    }
  }

  private buildDependencyGraph(entryPoints: readonly string[]): void {
    this.dependencyGraph.clear()
    this.reverseDependencyGraph.clear()
    this.entryPointDependencies.clear()

    entryPoints.forEach(entryPoint => {
      try {
        const dependencies = dependencyTree({
          filename: entryPoint,
          directory: process.cwd(),
          filter: (path: string) => !path.includes('node_modules')
        })

        // Store all dependencies for this entry point
        const allDeps = new Set<string>()
        this.collectAllDependencies(dependencies as Record<string, unknown>, allDeps)
        this.entryPointDependencies.set(entryPoint, allDeps)

        this.addDependencies(entryPoint, dependencies as Record<string, unknown>)
      } catch (error) {
        if (this.config.verbose) {
          console.warn(`Could not process dependencies for ${entryPoint}:`, error)
        }
      }
    })
  }

  private addDependencies(file: string, deps: Record<string, unknown>): void {
    const dependencies = new Set<string>()

    const traverse = (obj: Record<string, unknown>): void => {
      if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(dep => {
          const resolvedDep = resolve(dep)
          dependencies.add(resolvedDep)
          
          if (!this.reverseDependencyGraph.has(resolvedDep)) {
            this.reverseDependencyGraph.set(resolvedDep, new Set<string>())
          }
          this.reverseDependencyGraph.get(resolvedDep)!.add(file)
          
          if (this.config.verbose) {
            console.log(`    ${file} depends on ${resolvedDep}`)
          }
          
          const depValue = obj[dep]
          if (typeof depValue === 'object' && depValue !== null) {
            traverse(depValue as Record<string, unknown>)
          }
        })
      }
    }

    traverse(deps)
    this.dependencyGraph.set(file, dependencies)
  }

  private async handleFileChange(action: WatcherEventType, filePath: string): Promise<void> {
    try {
      const absolutePath = resolve(filePath)
      const entryPointDir = resolve(this.config.entryPointDir)

      if (this.config.verbose) {
        console.log(`File ${action}: ${filePath}`)
      }

      // Check if this is an entry point file
      if (absolutePath.startsWith(entryPointDir + '/')) {
        const fileExt = parse(filePath).ext.slice(1)
        const supportedExtensions = this.config.fileExtensions || ['js', 'jsx', 'ts', 'tsx']
        if (!supportedExtensions.includes(fileExt)) {
          if (this.config.verbose) {
            console.log(`  Ignoring entry point file with unsupported extension: ${fileExt}`)
          }
          return
        }
        
        const relativePath = absolutePath.substring(entryPointDir.length + 1)
        if (this.config.verbose) {
          console.log(`  Entry point changed: ${relativePath}`)
        }
        await this.onFileChange(Object.freeze([relativePath]))
        await this.rebuildDependencyGraph()
        return
      }

      // Check if this is a template file
      if (this.config.templateDir) {
        const templateDir = resolve(this.config.templateDir)
        if (absolutePath.startsWith(templateDir + '/')) {
          const fileName = parse(filePath).name
          const extensions = this.config.fileExtensions || ['js', 'jsx', 'ts', 'tsx']
          const pattern = `**/${fileName}.{${extensions.join(',')}}`
          
          if (this.config.verbose) {
            console.log(`  Template changed: ${fileName}`)
            console.log(`  Looking for entry points matching pattern: ${pattern}`)
          }
          
          const matchingEntryPoints = await glob(pattern, {
            cwd: this.config.entryPointDir,
            absolute: false
          })

          if (matchingEntryPoints.length > 0) {
            if (this.config.verbose) {
              console.log(`  Found ${matchingEntryPoints.length} matching entry points:`)
              matchingEntryPoints.forEach(ep => console.log(`    - ${ep}`))
            }
            await this.onFileChange(Object.freeze(matchingEntryPoints))
          } else if (this.config.verbose) {
            console.log(`  No matching entry points found for template: ${fileName}`)
          }
          return
        }
      }

      // Check if this file is a dependency of any entry point
      const fileExt = parse(filePath).ext.slice(1)
      const supportedExtensions = this.config.fileExtensions || ['js', 'jsx', 'ts', 'tsx']
      if (!supportedExtensions.includes(fileExt)) {
        if (this.config.verbose) {
          console.log(`  Ignoring file with unsupported extension: ${fileExt}`)
        }
        return
      }
      
      const affectedEntryPoints = this.getAffectedEntryPoints(absolutePath)
      if (affectedEntryPoints.length > 0) {
        const relativePaths = affectedEntryPoints.map(path => {
          if (path.startsWith(entryPointDir + '/')) {
            return path.substring(entryPointDir.length + 1)
          }
          return path
        }).filter(path => !path.startsWith('/'))
        
        if (relativePaths.length > 0) {
          if (this.config.verbose) {
            console.log(`  Dependency changed, re-rendering ${relativePaths.length} entry points:`)
            relativePaths.forEach(path => console.log(`    - ${path}`))
          }
          await this.onFileChange(Object.freeze(relativePaths))
          await this.rebuildDependencyGraph()
        }
      } else if (this.config.verbose) {
        console.log(`  File not in dependency graph, ignoring`)
      }
    } catch (error) {
      console.error('Error handling file change:', error)
    }
  }

  private getAffectedEntryPoints(changedFile: string): readonly string[] {
    const affected = new Set<string>()
    const visited = new Set<string>()
    
    // Find all entry points affected by this file change
    const findAffected = (file: string): void => {
      if (visited.has(file)) return
      visited.add(file)
      
      const dependents = this.reverseDependencyGraph.get(file)
      if (dependents) {
        dependents.forEach(dependent => {
          // Check if this is an entry point
          const entryPointDir = resolve(this.config.entryPointDir)
          if (dependent.startsWith(entryPointDir + '/')) {
            affected.add(dependent)
          }
          // Continue traversing up the dependency tree
          findAffected(dependent)
        })
      }
    }
    
    findAffected(changedFile)
    return Object.freeze(Array.from(affected))
  }

  private async rebuildDependencyGraph(): Promise<void> {
    await this.buildInitialDependencyGraph()
  }

  private getWatchDirectories(): Set<string> {
    const dirs = new Set<string>()
    
    // Get all directories containing dependencies
    for (const deps of this.entryPointDependencies.values()) {
      deps.forEach(dep => {
        const dir = dirname(dep)
        dirs.add(dir)
      })
    }
    
    // Also add directories from the dependency graph
    for (const file of this.dependencyGraph.keys()) {
      const dir = dirname(file)
      dirs.add(dir)
    }
    
    for (const file of this.reverseDependencyGraph.keys()) {
      const dir = dirname(file)
      dirs.add(dir)
    }
    
    if (this.config.verbose) {
      console.log(`Watch directories from dependency graph: ${Array.from(dirs).join(', ')}`)
    }
    
    return dirs
  }

  private collectAllDependencies(deps: Record<string, unknown>, result: Set<string>): void {
    if (typeof deps === 'object' && deps !== null) {
      Object.keys(deps).forEach(dep => {
        const resolvedDep = resolve(dep)
        result.add(resolvedDep)
        
        const depValue = deps[dep]
        if (typeof depValue === 'object' && depValue !== null) {
          this.collectAllDependencies(depValue as Record<string, unknown>, result)
        }
      })
    }
  }
}