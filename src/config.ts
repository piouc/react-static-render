import Joi from 'joi';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { Options as PrettierOptions } from 'prettier';
import { 
  RenderError, 
  type AsyncResult,
  type MountInfo
} from './types.js';

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
  prettierConfig?: PrettierOptions | false;
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

export type FileExtension = `.${string}`;

interface ConfigSource {
  readonly path: string;
  readonly content: string;
}

type ConfigLoadResult<T extends RenderConfig = RenderConfig> = AsyncResult<T, RenderError>;

const configSchema = Joi.object<RenderConfig>({
  // Core configuration
  entryPointsBase: Joi.string().required()
    .description('Base directory for entry point files'),
  
  srcBase: Joi.string().required()
    .description('Base directory for source files'),
  
  outputDir: Joi.string().default('dist')
    .description('Output directory for rendered files'),
  
  templateDir: Joi.string().optional()
    .description('Directory containing template files'),
  
  // Watch mode configuration
  patterns: Joi.array().items(Joi.string()).optional()
    .description('Glob patterns for files to watch'),
  
  websocketPort: Joi.number().integer().min(1024).max(65535).default(8099)
    .description('Port for WebSocket server in watch mode'),
  
  // Rendering configuration
  mountInfoExport: Joi.string().default('default')
    .description('Export name for mount info in entry files'),
  
  templateExtension: Joi.string().default('.php')
    .description('File extension for template files'),
  
  templateMergeStrategy: Joi.string().valid('replace', 'custom').default('replace')
    .description('Strategy for merging rendered content with templates'),
  
  customMergeFunction: Joi.function().optional()
    .when('templateMergeStrategy', {
      is: 'custom',
      then: Joi.required()
    })
    .description('Custom function for merging rendered content with templates'),
  
  // Template engine configuration
  templateEngine: Joi.string().valid('php', 'liquid', 'auto').default('auto')
    .description('Template engine to use for merging'),
  
  templateEngines: Joi.object({
    liquid: Joi.object({
      fileExtensions: Joi.array().items(Joi.string()).optional(),
      variableDelimiters: Joi.array().items(Joi.string()).length(2).optional(),
      tagDelimiters: Joi.array().items(Joi.string()).length(2).optional(),
      trimWhitespace: Joi.boolean().optional()
    }).optional(),
    php: Joi.object({
      fileExtensions: Joi.array().items(Joi.string()).optional()
    }).optional()
  }).optional().description('Template engine specific configurations'),
  
  // Build configuration
  prettierConfig: Joi.alternatives().try(
    Joi.object().unknown(true), // Allow any Prettier options
    Joi.boolean().valid(false)
  ).optional().description('Prettier configuration for formatting output'),
  
  fileExtensions: Joi.array().items(Joi.string()).default(['js', 'jsx', 'ts', 'tsx'])
    .description('File extensions to process'),
  
  // Advanced options
  workerPath: Joi.string().optional()
    .description('Custom path to worker script'),
  
  maxConcurrentRenders: Joi.number().integer().min(1).default(4)
    .description('Maximum number of concurrent render processes'),
  
  cacheEnabled: Joi.boolean().default(true)
    .description('Enable caching for improved performance'),
  
  verbose: Joi.boolean().default(false)
    .description('Enable verbose logging')
});

const DEFAULT_CONFIG_PATHS = [
  'react-static-render.config.json',
  '.react-static-renderrc.json',
  'package.json'
] as const;

const DEFAULT_FILE_EXTENSIONS: readonly string[] = ['js', 'jsx', 'ts', 'tsx'] as const;

function createDefaultConfig(): RenderConfig {
  return {
    entryPointsBase: 'src/entry-points',
    srcBase: 'src',
    outputDir: 'dist',
    websocketPort: 8099,
    mountInfoExport: 'default',
    templateExtension: '.php' as FileExtension,
    templateMergeStrategy: 'replace',
    templateEngine: 'auto',
    fileExtensions: DEFAULT_FILE_EXTENSIONS,
    maxConcurrentRenders: 4,
    cacheEnabled: true,
    verbose: false
  };
}

async function loadConfigSource(configPath?: string): Promise<ConfigSource> {
  if (configPath) {
    const absolutePath = resolve(process.cwd(), configPath);
    try {
      const content = await readFile(absolutePath, 'utf-8');
      return { path: absolutePath, content };
    } catch (error) {
      throw new RenderError(
        `Failed to load config from ${configPath}`,
        'CONFIG_READ_ERROR',
        absolutePath,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  for (const path of DEFAULT_CONFIG_PATHS) {
    try {
      const absolutePath = resolve(process.cwd(), path);
      const content = await readFile(absolutePath, 'utf-8');
      return { path: absolutePath, content };
    } catch {
      continue;
    }
  }

  throw new RenderError(
    'No configuration file found. Please create a react-static-render.config.json file or specify a config path.',
    'CONFIG_NOT_FOUND'
  );
}

function parseConfigData(source: ConfigSource): unknown {
  try {
    const data = JSON.parse(source.content);
    
    if (source.path.endsWith('package.json')) {
      if (!data.reactStaticRender) {
        throw new RenderError(
          'package.json does not contain reactStaticRender field',
          'CONFIG_FIELD_MISSING',
          source.path
        );
      }
      return data.reactStaticRender;
    }
    
    return data;
  } catch (error) {
    if (error instanceof RenderError) {
      throw error;
    }
    
    throw new RenderError(
      `Failed to parse JSON in configuration file`,
      'CONFIG_PARSE_ERROR',
      source.path,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

function validateConfig<T extends RenderConfig = RenderConfig>(config: unknown): T {
  const { error, value } = configSchema.validate(config, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const details = error.details
      .map((detail: Joi.ValidationErrorItem) => `  - ${detail.message}`)
      .join('\n');
    
    throw new RenderError(
      `Invalid configuration:\n${details}`,
      'CONFIG_VALIDATION_ERROR'
    );
  }

  return value as T;
}

export async function loadConfig<T extends RenderConfig = RenderConfig>(
  configPath?: string
): ConfigLoadResult<T> {
  try {
    const defaultConfig = createDefaultConfig();
    const source = await loadConfigSource(configPath);
    const configData = parseConfigData(source);
    const mergedConfig = Object.assign({}, defaultConfig, configData);
    const validatedConfig = validateConfig<T>(mergedConfig);
    
    return { success: true, data: validatedConfig };
  } catch (error) {
    if (error instanceof RenderError) {
      return { success: false, error };
    }
    
    return {
      success: false,
      error: new RenderError(
        'Unexpected error loading configuration',
        'CONFIG_UNKNOWN_ERROR',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      )
    };
  }
}

export const createConfig = (overrides: Partial<RenderConfig> = {}): RenderConfig => {
  const defaultConfig = createDefaultConfig();
  return validateConfig({ ...defaultConfig, ...overrides });
};

export const isValidTemplateEngineType = (value: string): value is TemplateEngineType => {
  return ['php', 'liquid', 'auto'].includes(value);
};

export { createDefaultConfig, validateConfig };