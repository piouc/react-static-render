import { ReactNode } from 'react';

export type TemplateEngineType = 'php' | 'liquid' | 'auto';

export interface TemplateEngineConfigs {
  liquid?: LiquidEngineConfig;
  php?: PHPEngineConfig;
}

export interface LiquidEngineConfig {
  fileExtensions?: readonly FileExtension[];
  variableDelimiters?: readonly [string, string];
  tagDelimiters?: readonly [string, string];
  trimWhitespace?: boolean;
}

export interface PHPEngineConfig {
  fileExtensions?: readonly FileExtension[];
  shortTags?: boolean;
}

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

export interface PrettierConfig {
  parser?: 'html' | 'css' | 'scss' | 'less';
  printWidth?: number;
  tabWidth?: number;
  useTabs?: boolean;
  semi?: boolean;
  singleQuote?: boolean;
  quoteProps?: 'as-needed' | 'consistent' | 'preserve';
  trailingComma?: 'none' | 'es5' | 'all';
  bracketSpacing?: boolean;
  bracketSameLine?: boolean;
  arrowParens?: 'always' | 'avoid';
  rangeStart?: number;
  rangeEnd?: number;
  requirePragma?: boolean;
  insertPragma?: boolean;
  proseWrap?: 'always' | 'never' | 'preserve';
  htmlWhitespaceSensitivity?: 'css' | 'strict' | 'ignore';
  endOfLine?: 'lf' | 'crlf' | 'cr' | 'auto';
  embeddedLanguageFormatting?: 'auto' | 'off';
  singleAttributePerLine?: boolean;
  [key: string]: unknown;
}

export interface AdvancedOptions {
  workerPath?: string;
  maxConcurrentRenders?: number;
  cacheEnabled?: boolean;
  verbose?: boolean;
}

export interface WatchConfiguration {
  patterns?: readonly string[];
  websocketPort?: number;
}

export interface RenderConfiguration<TEngine extends TemplateEngineType = TemplateEngineType> {
  mountInfoExport?: string;
  templateExtension?: string;
  templateMergeStrategy?: 'replace' | 'custom';
  customMergeFunction?: (
    template: string, 
    rendered: string, 
    styles: string, 
    mountInfo: MountInfo
  ) => string;
  templateEngine?: TEngine;
  templateEngines?: TemplateEngineConfigs;
}

export interface BuildConfiguration {
  prettierConfig?: PrettierConfig | false;
  fileExtensions?: readonly string[];
}

export interface CoreConfiguration {
  entryPointsBase: string;
  srcBase: string;
  outputDir: string;
  templateDir?: string;
}

export interface RenderConfig<TEngine extends TemplateEngineType = TemplateEngineType> 
  extends CoreConfiguration, 
          WatchConfiguration, 
          RenderConfiguration<TEngine>, 
          BuildConfiguration, 
          AdvancedOptions {}

export interface RenderOptions {
  watch?: boolean;
  liveReload?: boolean;
  config?: string;
  port?: number;
  output?: string;
  verbose?: boolean;
}

export interface DependencyGraph {
  dependencies: Map<string, Set<string>>;
  reverseDependencies: Map<string, Set<string>>;
}

export type FileExtension = `.${string}`;

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