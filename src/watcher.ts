import { watch, FSWatcher } from 'chokidar';
import { resolve, parse } from 'path';
import { glob } from 'glob';
import dependencyTree from 'dependency-tree';
import type { RenderConfig } from './types.js';

type WatcherEventType = 'add' | 'change' | 'unlink';
type FileChangeHandler = (files: readonly string[]) => Promise<void>;

interface WatcherOptions {
  readonly ignored?: RegExp | string;
  readonly persistent?: boolean;
  readonly ignoreInitial?: boolean;
}

export class FileWatcher {
  private readonly config: RenderConfig;
  private watcher: FSWatcher | null = null;
  private readonly dependencyGraph = new Map<string, Set<string>>();
  private readonly reverseDependencyGraph = new Map<string, Set<string>>();
  private readonly onFileChange: FileChangeHandler;

  constructor(config: RenderConfig, onFileChange: FileChangeHandler) {
    this.config = config;
    this.onFileChange = onFileChange;
  }

  async start(): Promise<void> {
    await this.buildInitialDependencyGraph();

    const watchPatterns = this.config.patterns || [
      this.config.entryPointsBase,
      this.config.srcBase
    ];

    const watcherOptions: WatcherOptions = {
      ignored: /node_modules/,
      persistent: true,
      ignoreInitial: true
    };

    this.watcher = watch([...watchPatterns], watcherOptions);

    this.watcher.on('change', (filePath: string) => {
      this.handleFileChange('change', filePath);
    });

    this.watcher.on('add', (filePath: string) => {
      this.handleFileChange('add', filePath);
    });

    this.watcher.on('unlink', (filePath: string) => {
      this.handleFileChange('unlink', filePath);
    });

    this.watcher.on('error', (error: unknown) => {
      console.error('Watcher error:', error);
    });

    this.watcher.on('ready', () => {
      console.log('File watcher ready');
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.watcher) {
        resolve();
        return;
      }

      this.watcher.close().then(() => {
        this.watcher = null;
        resolve();
      });
    });
  }

  private async buildInitialDependencyGraph(): Promise<void> {
    const extensions = this.config.fileExtensions || ['js', 'jsx', 'ts', 'tsx'];
    const pattern = `**/*.{${extensions.join(',')}}`;
    
    const files = await glob(pattern, {
      cwd: this.config.entryPointsBase,
      absolute: true
    });

    this.buildDependencyGraph(Object.freeze(files));
  }

  private buildDependencyGraph(entryPoints: readonly string[]): void {
    this.dependencyGraph.clear();
    this.reverseDependencyGraph.clear();

    entryPoints.forEach(entryPoint => {
      try {
        const dependencies = dependencyTree({
          filename: entryPoint,
          directory: this.config.srcBase,
          filter: (path: string) => !path.includes('node_modules')
        });

        this.addDependencies(entryPoint, dependencies as Record<string, unknown>);
      } catch (error) {
        if (this.config.verbose) {
          console.warn(`Could not process dependencies for ${entryPoint}:`, error);
        }
      }
    });
  }

  private addDependencies(file: string, deps: Record<string, unknown>): void {
    const dependencies = new Set<string>();

    const traverse = (obj: Record<string, unknown>): void => {
      if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(dep => {
          const resolvedDep = resolve(dep);
          dependencies.add(resolvedDep);
          
          if (!this.reverseDependencyGraph.has(resolvedDep)) {
            this.reverseDependencyGraph.set(resolvedDep, new Set<string>());
          }
          this.reverseDependencyGraph.get(resolvedDep)!.add(file);
          
          const depValue = obj[dep];
          if (typeof depValue === 'object' && depValue !== null) {
            traverse(depValue as Record<string, unknown>);
          }
        });
      }
    };

    traverse(deps);
    this.dependencyGraph.set(file, dependencies);
  }

  private async handleFileChange(_action: WatcherEventType, filePath: string): Promise<void> {
    try {
      const absolutePath = resolve(filePath);

      if (filePath.includes(this.config.entryPointsBase)) {
        const relativePath = absolutePath.replace(resolve(this.config.entryPointsBase) + '/', '');
        await this.onFileChange(Object.freeze([relativePath]));
        await this.rebuildDependencyGraph();
        return;
      }

      if (this.config.templateDir && filePath.includes(this.config.templateDir)) {
        const fileName = parse(filePath).name;
        const extensions = this.config.fileExtensions || ['js', 'jsx', 'ts', 'tsx'];
        const pattern = `**/${fileName}.{${extensions.join(',')}}`;
        
        const matchingEntryPoints = await glob(pattern, {
          cwd: this.config.entryPointsBase,
          absolute: false
        });

        if (matchingEntryPoints.length > 0) {
          await this.onFileChange(Object.freeze(matchingEntryPoints));
        }
        return;
      }

      const affectedEntryPoints = this.getAffectedEntryPoints(absolutePath);
      if (affectedEntryPoints.length > 0) {
        const relativePaths = affectedEntryPoints.map(path => 
          path.replace(resolve(this.config.entryPointsBase) + '/', '')
        );
        await this.onFileChange(Object.freeze(relativePaths));
        await this.rebuildDependencyGraph();
      }
    } catch (error) {
      console.error('Error handling file change:', error);
    }
  }

  private getAffectedEntryPoints(changedFile: string): readonly string[] {
    const affected = this.reverseDependencyGraph.get(changedFile) || new Set<string>();
    return Object.freeze(Array.from(affected));
  }

  private async rebuildDependencyGraph(): Promise<void> {
    await this.buildInitialDependencyGraph();
  }
}