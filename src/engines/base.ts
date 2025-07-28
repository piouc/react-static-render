import type { MountInfo, FileExtension, AsyncResult, RenderError } from '../types.js';

export interface TemplateEngine<TConfig extends TemplateEngineConfig = TemplateEngineConfig> {
  readonly name: string;
  readonly fileExtensions: readonly FileExtension[];
  
  isSupported(extension: FileExtension): boolean;
  merge(context: MergeContext): AsyncResult<string, RenderError>;
  
  getConfig(): Readonly<TConfig>;
}

export interface TemplateEngineConfig {
  readonly fileExtensions?: readonly FileExtension[];
}

export interface TemplateEngineOptions<TConfig extends TemplateEngineConfig> {
  readonly config?: TConfig;
}

export interface MergeContext {
  readonly template: string;
  readonly content: string;
  readonly styles: string;
  readonly mountInfo: MountInfo;
}

export interface ErrorContext {
  readonly message: string;
  readonly code: string;
  readonly filePath?: string;
  readonly cause?: Error;
}

export function createTemplateError(context: ErrorContext): RenderError {
  return new (class extends Error implements RenderError {
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
  })(context.message, context.code, context.filePath, context.cause);
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function validateMergeInputs(context: MergeContext): void {
  if (!context.template) {
    throw createTemplateError({
      message: 'Template content is required',
      code: 'TEMPLATE_EMPTY'
    });
  }
  
  if (!context.content) {
    throw createTemplateError({
      message: 'Rendered content is required',
      code: 'CONTENT_EMPTY'
    });
  }
  
  if (!context.mountInfo?.rootElementId) {
    throw createTemplateError({
      message: 'Mount info with rootElementId is required',
      code: 'MOUNT_INFO_INVALID'
    });
  }
}

export function isExtensionSupported(
  extension: FileExtension, 
  config: TemplateEngineConfig,
  defaultExtensions: readonly FileExtension[]
): boolean {
  const extensions = config.fileExtensions || defaultExtensions;
  return extensions.includes(extension);
}

export function createDefaultEngineConfig<TConfig extends TemplateEngineConfig>(
  userConfig?: TConfig,
  defaultConfig?: TConfig
): TConfig {
  return { ...defaultConfig, ...userConfig } as TConfig;
}