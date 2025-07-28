import type { 
  FileExtension, 
  RenderConfig, 
  MountInfo
} from './config.js';

export {
  type TemplateEngineType,
  type AdvancedOptions,
  type WatchConfiguration,
  type RenderConfiguration,
  type BuildConfiguration,
  type CoreConfiguration,
  type RenderConfig,
  type RenderOptions,
  type FileExtension,
  type MountInfo,
  type RenderResult,
  type AsyncResult,
  RenderError
} from './config.js';

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

export interface ProcessResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}