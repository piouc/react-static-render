// Export main rendering functions
export { renderFile, findEntryPoints } from './render.js'

// Export configuration types and functions
export {
  loadConfig,
  createDefaultConfig,
  validateConfig,
  type RenderConfig,
  type RenderOptions,
  type RenderResult,
  type RenderError,
  type MountInfo,
  type TemplateEngineType,
  type CoreConfiguration,
  type WatchConfiguration,
  type RenderConfiguration,
  type BuildConfiguration,
  type AdvancedOptions,
  type AsyncResult,
  type FileExtension
} from './config.js'

// Export watcher and websocket server
export { FileWatcher } from './watcher.js'
export { LiveReloadServer } from './websocket.js'

// Export template engine functions
export { mergeHTMLTemplate } from './engines/html.js'
export { mergePHPTemplate } from './engines/php.js'
export { mergeLiquidTemplate, type MergeContext } from './engines/liquid.js'
