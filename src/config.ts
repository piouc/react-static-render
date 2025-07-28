import Joi from 'joi';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { Options as PrettierOptions } from 'prettier';
import { 
  RenderError, 
  type AsyncResult,
} from './types.js';

export type TemplateEngineType = 'php' | 'liquid' | 'auto';


export interface AdvancedOptions {
  maxConcurrentRenders?: number | 'auto';
  verbose?: boolean;
}

export interface WatchConfiguration {
  patterns?: readonly string[];
  websocketPort?: number;
}

export interface RenderConfiguration<TEngine extends TemplateEngineType = TemplateEngineType> {
  mountInfoExport?: string;
  templateExtension?: string;
  templateEngine?: TEngine;
}

export interface BuildConfiguration {
  prettierConfig?: PrettierOptions | false;
  fileExtensions?: readonly string[];
}

export interface CoreConfiguration {
  entryPointsBase: string;
  outputDir: string;
  templateDir: string;
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
  
  outputDir: Joi.string().required()
    .description('Output directory for rendered files'),
  
  templateDir: Joi.string().required()
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
  
  
  // Template engine configuration
  templateEngine: Joi.string().valid('php', 'liquid', 'auto').default('auto')
    .description('Template engine to use for merging'),
  
  
  // Build configuration
  prettierConfig: Joi.alternatives().try(
    Joi.object().unknown(true), // Allow any Prettier options
    Joi.boolean().valid(false)
  ).optional().description('Prettier configuration for formatting output'),
  
  fileExtensions: Joi.array().items(Joi.string()).default(['js', 'jsx', 'ts', 'tsx'])
    .description('File extensions to process'),
  
  // Advanced options
  maxConcurrentRenders: Joi.alternatives().try(
    Joi.number().integer().min(1),
    Joi.string().valid('auto')
  ).default('auto')
    .description('Maximum number of concurrent render processes, or "auto" for CPU core count'),
  
  
  verbose: Joi.boolean().default(false)
    .description('Enable verbose logging')
});

const DEFAULT_CONFIG_PATHS = [
  'react-static-render.config.json'
] as const;

const DEFAULT_FILE_EXTENSIONS: readonly string[] = ['js', 'jsx', 'ts', 'tsx'] as const;

function createPartialDefaultConfig(): Omit<RenderConfig, 'entryPointsBase' | 'outputDir' | 'templateDir'> {
  return {
    websocketPort: 8099,
    mountInfoExport: 'default',
    templateExtension: '.php' as FileExtension,
    templateEngine: 'auto',
    fileExtensions: DEFAULT_FILE_EXTENSIONS,
    maxConcurrentRenders: 'auto',
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
    return JSON.parse(source.content);
  } catch (error) {
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
    const defaultConfig = createPartialDefaultConfig();
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

export function createDefaultConfig(): RenderConfig {
  return Object.freeze({
    entryPointsBase: 'src/entry-points',
    outputDir: 'dist',
    templateDir: 'templates',
    mountInfoExport: 'default',
    templateExtension: '.html',
    templateEngine: 'auto',
    prettierConfig: {
      parser: 'html',
      printWidth: 120
    },
    fileExtensions: ['js', 'jsx', 'ts', 'tsx'],
    maxConcurrentRenders: 'auto',
    verbose: false,
    websocketPort: 3001
  } as RenderConfig);
}

export { validateConfig };