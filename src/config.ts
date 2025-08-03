import { z } from 'zod'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import type { Options as PrettierOptions } from 'prettier'
import { ReactNode } from 'react'

export type TemplateEngineType = 'php' | 'liquid'


export interface AdvancedOptions {
  maxConcurrentRenders?: number | 'auto'
  verbose?: boolean
}

export interface WatchConfiguration {
  patterns?: readonly string[]
  websocketPort?: number
}

export interface RenderConfiguration<TEngine extends TemplateEngineType = TemplateEngineType> {
  mountInfoExport?: string
  templateExtension?: string
  templateEngine: TEngine
}

export interface BuildConfiguration {
  prettierConfig?: PrettierOptions | false
  fileExtensions?: readonly string[]
}

export interface CoreConfiguration {
  entryPointDir: string
  outputDir: string
  templateDir: string
}

export interface RenderConfig<TEngine extends TemplateEngineType = TemplateEngineType> 
  extends CoreConfiguration, 
          WatchConfiguration, 
          RenderConfiguration<TEngine>, 
          BuildConfiguration, 
          AdvancedOptions {}

export interface RenderOptions {
  watch?: boolean
  liveReload?: boolean
  config?: string
  port?: number
  output?: string
  verbose?: boolean
}

export type FileExtension = `.${string}`

export class RenderError extends Error {
  public override readonly name = 'RenderError'
  public readonly code: string
  public readonly filePath?: string
  public override readonly cause?: Error
  
  constructor(
    message: string,
    code: string,
    filePath?: string,
    cause?: Error
  ) {
    super(message)
    this.code = code
    if (filePath !== undefined) {
      this.filePath = filePath
    }
    if (cause !== undefined) {
      this.cause = cause
    }
  }
}

export type AsyncResult<T, E = RenderError> = Promise<
  | { success: true; data: T }
  | { success: false; error: E }
>

export type RenderResult<T = string> = 
  | { success: true; data: T; outputPath?: string }
  | { success: false; error: RenderError }

export interface MountInfo {
  node: ReactNode
  rootElementId: string
}

interface ConfigSource {
  readonly path: string
  readonly content: string
}

type ConfigLoadResult<T extends RenderConfig = RenderConfig> = AsyncResult<T, RenderError>

const DEFAULT_CONFIG_PATHS = ['react-static-render.config.json'] as const
const DEFAULT_FILE_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx'] as const
const DEFAULT_WEBSOCKET_PORT = 8099
const DEFAULT_MOUNT_INFO_EXPORT = 'default'

const configSchema = z.object({
  // Core configuration
  entryPointDir: z.string().describe('Directory containing React entry point files'),
  outputDir: z.string().describe('Output directory for rendered files'),
  templateDir: z.string().describe('Directory containing template files'),
  
  // Watch mode configuration
  patterns: z.array(z.string()).optional().describe('Glob patterns for files to watch'),
  websocketPort: z.number().int().min(1024).max(65535).default(DEFAULT_WEBSOCKET_PORT)
    .describe('Port for WebSocket server in watch mode'),
  
  // Rendering configuration
  mountInfoExport: z.string().default(DEFAULT_MOUNT_INFO_EXPORT)
    .describe('Export name for mount info in entry files'),
  templateExtension: z.string().default('.php')
    .describe('File extension for template files'),
  
  // Template engine configuration
  templateEngine: z.enum(['php', 'liquid'])
    .describe('Template engine to use for merging'),
  
  // Build configuration
  prettierConfig: z.union([
    z.record(z.string(), z.unknown()), // Allow any Prettier options
    z.literal(false)
  ]).optional().describe('Prettier configuration for formatting output'),
  
  fileExtensions: z.array(z.string()).default(['js', 'jsx', 'ts', 'tsx'])
    .describe('File extensions to process'),
  
  // Advanced options
  maxConcurrentRenders: z.union([
    z.number().int().min(1),
    z.literal('auto')
  ]).default('auto')
    .describe('Maximum number of concurrent render processes, or "auto" for CPU core count'),
  
  verbose: z.boolean().default(false)
    .describe('Enable verbose logging')
})

function createPartialDefaultConfig(): Omit<RenderConfig, 'entryPointDir' | 'outputDir' | 'templateDir'> {
  return {
    websocketPort: DEFAULT_WEBSOCKET_PORT,
    mountInfoExport: DEFAULT_MOUNT_INFO_EXPORT,
    templateExtension: '.php' as FileExtension,
    templateEngine: 'php',
    fileExtensions: DEFAULT_FILE_EXTENSIONS,
    maxConcurrentRenders: 'auto',
    verbose: false
  }
}

async function loadConfigSource(configPath?: string): Promise<ConfigSource> {
  if (configPath) {
    const absolutePath = resolve(process.cwd(), configPath)
    try {
      const content = await readFile(absolutePath, 'utf-8')
      return { path: absolutePath, content }
    } catch (error) {
      throw new RenderError(
        `Failed to load config from ${configPath}`,
        'CONFIG_READ_ERROR',
        absolutePath,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  for (const path of DEFAULT_CONFIG_PATHS) {
    try {
      const absolutePath = resolve(process.cwd(), path)
      const content = await readFile(absolutePath, 'utf-8')
      return { path: absolutePath, content }
    } catch {
      continue
    }
  }

  throw new RenderError(
    'No configuration file found. Please create a react-static-render.config.json file or specify a config path.',
    'CONFIG_NOT_FOUND'
  )
}

function parseConfigData(source: ConfigSource): unknown {
  try {
    return JSON.parse(source.content)
  } catch (error) {
    throw new RenderError(
      `Failed to parse JSON in configuration file`,
      'CONFIG_PARSE_ERROR',
      source.path,
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

function validateConfig<T extends RenderConfig = RenderConfig>(config: unknown): T {
  try {
    const result = configSchema.parse(config)
    return result as unknown as T
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n')
      
      throw new RenderError(
        `Invalid configuration:\n${details}`,
        'CONFIG_VALIDATION_ERROR'
      )
    }
    
    throw new RenderError(
      'Failed to validate configuration',
      'CONFIG_VALIDATION_ERROR',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

export async function loadConfig<T extends RenderConfig = RenderConfig>(
  configPath?: string
): ConfigLoadResult<T> {
  try {
    const defaultConfig = createPartialDefaultConfig()
    const source = await loadConfigSource(configPath)
    const configData = parseConfigData(source)
    const mergedConfig = Object.assign({}, defaultConfig, configData)
    const validatedConfig = validateConfig<T>(mergedConfig)
    
    return { success: true, data: validatedConfig }
  } catch (error) {
    if (error instanceof RenderError) {
      return { success: false, error }
    }
    
    return {
      success: false,
      error: new RenderError(
        'Unexpected error loading configuration',
        'CONFIG_UNKNOWN_ERROR',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }
}


export function createDefaultConfig(): RenderConfig {
  return {
    entryPointDir: 'src/entry-points',
    outputDir: 'dist',
    templateDir: 'templates',
    ...createPartialDefaultConfig(),
    templateExtension: '.html',
    prettierConfig: {
      parser: 'html',
      printWidth: 120
    },
    websocketPort: 3001
  } as RenderConfig
}

export { validateConfig }