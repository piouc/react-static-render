import { join, dirname } from 'path';
import { glob } from 'glob';
import { cpus } from 'os';
import { fileURLToPath } from 'url';
import { packageUp } from 'package-up';
import { execa } from 'execa';
import { 
  RenderError,
  type RenderConfig, 
  type RenderResult
} from './types.js';

export class Renderer<TConfig extends RenderConfig = RenderConfig> {
  private readonly config: TConfig;
  private readonly workerPath: string;
  private packageRoot: string | null = null;

  constructor(config: TConfig) {
    this.config = config;
    this.workerPath = this.getDefaultWorkerPath();
  }

  private async getPackageRoot(): Promise<string> {
    if (this.packageRoot === null) {
      try {
        const currentFile = fileURLToPath(import.meta.url);
        const packageJsonPath = await packageUp({ cwd: dirname(currentFile) });
        this.packageRoot = packageJsonPath ? dirname(packageJsonPath) : join(new URL('.', import.meta.url).pathname, '..');
      } catch {
        // Fallback if package-up fails
        this.packageRoot = join(new URL('.', import.meta.url).pathname, '..');
      }
    }
    return this.packageRoot!;
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

  async renderFile(filePath: string): Promise<RenderResult<string>> {
    try {
      const packageRoot = await this.getPackageRoot();
      const workerTsConfig = join(packageRoot, 'tsconfig.worker.json');
      
      await execa('npx', [
        'tsx',
        '--tsconfig',
        workerTsConfig,
        this.workerPath,
        filePath,
        JSON.stringify(this.config)
      ], {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_PATH: process.cwd() + '/node_modules'
        }
      });
      
      const outputPath = join(this.config.outputDir, filePath);
      
      return {
        success: true,
        data: outputPath,
        outputPath
      };
      
    } catch (processError: any) {
      const error = new RenderError(
        processError.message || 'Render process failed',
        processError.exitCode ? 'PROCESS_EXIT_ERROR' : 'PROCESS_SPAWN_ERROR',
        filePath,
        processError
      );
      
      return {
        success: false,
        error
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
    // No active processes to manage with execa since we await each process
    return Promise.resolve();
  }

  private chunkArray<T>(array: readonly T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  getConfig(): Readonly<TConfig> {
    return this.config;
  }
}