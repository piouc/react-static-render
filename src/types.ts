import { ReactNode } from 'react';
import type { FileExtension, RenderConfig } from './config.js';

export {
  type TemplateEngineType,
  type AdvancedOptions,
  type WatchConfiguration,
  type RenderConfiguration,
  type BuildConfiguration,
  type CoreConfiguration,
  type RenderConfig,
  type RenderOptions,
  type FileExtension
} from './config.js';

export interface MountInfo {
  node: ReactNode;
  rootElementId: string;
}

export type RenderResult<T = string> = 
  | { success: true; data: T; outputPath?: string }
  | { success: false; error: RenderError };

export class RenderError extends Error {
  public override readonly name = 'RenderError';
  public readonly code: string;
  public readonly filePath?: string;
  public override readonly cause?: Error;
  
  constructor(
    message: string,
    code: string,
    filePath?: string,
    cause?: Error
  ) {
    super(message);
    this.code = code;
    if (filePath !== undefined) {
      this.filePath = filePath;
    }
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export interface DependencyGraph {
  dependencies: Map<string, Set<string>>;
  reverseDependencies: Map<string, Set<string>>;
}

export interface FileInfo {
  readonly path: string;
  readonly name: string;
  readonly extension: FileExtension;
  readonly directory: string;
}

export interface ProcessingContext<TConfig extends RenderConfig = RenderConfig> {
  config: TConfig;
  fileInfo: FileInfo;
  mountInfo: MountInfo;
}

export type AsyncResult<T, E = RenderError> = Promise<
  | { success: true; data: T }
  | { success: false; error: E }
>;

export interface ProcessResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}