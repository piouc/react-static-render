import type { MountInfo, FileExtension, AsyncResult, RenderError } from '../types.js';

export interface TemplateEngine<TConfig extends TemplateEngineConfig = TemplateEngineConfig> {
  readonly name: string;
  readonly fileExtensions: readonly FileExtension[];
  
  isSupported(extension: FileExtension): boolean;
  merge(
    template: string, 
    content: string, 
    styles: string, 
    mountInfo: MountInfo
  ): AsyncResult<string, RenderError>;
  
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

export abstract class BaseTemplateEngine<TConfig extends TemplateEngineConfig = TemplateEngineConfig> 
  implements TemplateEngine<TConfig> {
  
  abstract readonly name: string;
  abstract readonly fileExtensions: readonly FileExtension[];
  
  protected readonly config: TConfig;
  
  constructor(config?: TConfig) {
    this.config = this.createDefaultConfig(config);
  }
  
  protected abstract createDefaultConfig(userConfig?: TConfig): TConfig;
  
  isSupported(extension: FileExtension): boolean {
    const extensions = this.config.fileExtensions || this.fileExtensions;
    return extensions.includes(extension);
  }
  
  abstract merge(
    template: string, 
    content: string, 
    styles: string, 
    mountInfo: MountInfo
  ): AsyncResult<string, RenderError>;
  
  getConfig(): Readonly<TConfig> {
    return Object.freeze({ ...this.config });
  }
  
  protected createMergeContext(
    template: string,
    content: string,
    styles: string,
    mountInfo: MountInfo
  ): MergeContext {
    return Object.freeze({
      template,
      content,
      styles,
      mountInfo
    });
  }
  
  protected escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  protected createTemplateError(
    message: string,
    code: string,
    cause?: Error
  ): RenderError {
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
    })(message, code, undefined, cause);
  }
  
  protected validateMergeInputs(context: MergeContext): void {
    if (!context.template) {
      throw this.createTemplateError(
        'Template content is required',
        'TEMPLATE_EMPTY'
      );
    }
    
    if (!context.content) {
      throw this.createTemplateError(
        'Rendered content is required',
        'CONTENT_EMPTY'
      );
    }
    
    if (!context.mountInfo?.rootElementId) {
      throw this.createTemplateError(
        'Mount info with rootElementId is required',
        'MOUNT_INFO_INVALID'
      );
    }
  }
}