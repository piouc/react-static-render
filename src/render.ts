import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { glob } from 'glob';
import { cpus } from 'os';
import { 
  RenderError,
  type RenderConfig, 
  type RenderResult
} from './types.js';

type RenderProcess = ChildProcess;

export class Renderer<TConfig extends RenderConfig = RenderConfig> {
  private readonly config: TConfig;
  private readonly activeProcesses = new Set<RenderProcess>();
  private readonly workerPath: string;

  constructor(config: TConfig) {
    this.config = config;
    this.workerPath = this.getDefaultWorkerPath();
  }

  private getDefaultWorkerPath(): string {
    const currentFileUrl = new URL(import.meta.url);
    const currentDir = new URL('.', currentFileUrl);
    const workerUrl = new URL('worker.js', currentDir);
    return workerUrl.pathname;
  }

  private getMaxConcurrentRenders(): number {
    const configured = this.config.maxConcurrentRenders;
    if (configured === 'auto' || configured === undefined) {
      return Math.max(1, cpus().length);
    }
    return configured;
  }

  private createRenderError(
    message: string,
    code: string,
    filePath?: string,
    cause?: Error
  ): RenderError {
    return new RenderError(message, code, filePath, cause);
  }

  private createRenderProcess(filePath: string): RenderProcess {
    return spawn('npx', [
      'tsx',
      this.workerPath,
      filePath,
      JSON.stringify(this.config)
    ], {
      stdio: ['inherit', 'inherit', 'inherit'],
      cwd: process.cwd()
    });
  }

  private async handleProcessResult(
    process: RenderProcess,
    filePath: string
  ): Promise<RenderResult<string>> {
    return new Promise((resolve) => {
      this.activeProcesses.add(process);

      const cleanup = () => {
        this.activeProcesses.delete(process);
      };

      process.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
        cleanup();
        
        if (code === 0) {
          const outputPath = join(this.config.outputDir, filePath);
          resolve({
            success: true,
            data: outputPath,
            outputPath
          });
        } else {
          const error = this.createRenderError(
            `Render process exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`,
            'PROCESS_EXIT_ERROR',
            filePath
          );
          resolve({
            success: false,
            error
          });
        }
      });

      process.on('error', (processError: Error) => {
        cleanup();
        const error = this.createRenderError(
          'Failed to spawn render process',
          'PROCESS_SPAWN_ERROR',
          filePath,
          processError
        );
        resolve({
          success: false,
          error
        });
      });
    });
  }

  async renderFile(filePath: string): Promise<RenderResult<string>> {
    try {
      const process = this.createRenderProcess(filePath);
      return await this.handleProcessResult(process, filePath);
    } catch (error) {
      const renderError = this.createRenderError(
        'Unexpected error during render',
        'RENDER_UNEXPECTED_ERROR',
        filePath,
        error instanceof Error ? error : new Error(String(error))
      );
      
      return {
        success: false,
        error: renderError
      };
    }
  }

  async renderFiles(filePaths: readonly string[]): Promise<RenderResult<string>[]> {
    if (filePaths.length === 0) {
      return [];
    }

    const maxConcurrent = this.getMaxConcurrentRenders();
    const chunks = this.chunkArray([...filePaths], maxConcurrent);
    const results: RenderResult<string>[] = [];

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(file => this.renderFile(file))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  async renderAll(): Promise<RenderResult<string>[]> {
    const entryPoints = await this.findEntryPoints();
    return this.renderFiles(entryPoints);
  }

  async findEntryPoints(): Promise<readonly string[]> {
    const extensions = this.config.fileExtensions || ['js', 'jsx', 'ts', 'tsx'];
    const pattern = `**/*.{${extensions.join(',')}}`;
    
    try {
      const files = await glob(pattern, {
        cwd: this.config.entryPointsBase,
        nodir: true
      });
      
      return Object.freeze(files);
    } catch (error) {
      if (this.config.verbose) {
        console.warn('Failed to find entry points:', error);
      }
      return Object.freeze([]);
    }
  }

  async stop(): Promise<void> {
    if (this.activeProcesses.size === 0) {
      return;
    }

    const shutdownPromises = Array.from(this.activeProcesses).map(
      (process): Promise<void> => 
        new Promise((resolve) => {
          const timeout = setTimeout(() => {
            process.kill('SIGKILL');
            resolve();
          }, 5000); // 5 second timeout for graceful shutdown

          process.on('close', () => {
            clearTimeout(timeout);
            resolve();
          });

          process.kill('SIGTERM');
        })
    );

    await Promise.all(shutdownPromises);
    this.activeProcesses.clear();
  }

  private chunkArray<T>(array: readonly T[], size: number): readonly (readonly T[])[] {
    const chunks: T[][] = [];
    
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    
    return Object.freeze(chunks.map(chunk => Object.freeze(chunk)));
  }

  getConfig(): Readonly<TConfig> {
    return Object.freeze({ ...this.config });
  }

  getActiveProcessCount(): number {
    return this.activeProcesses.size;
  }
}