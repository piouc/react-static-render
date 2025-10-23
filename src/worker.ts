#!/usr/bin/env node
import register from '@babel/register'
import { join, parse, resolve, dirname } from 'path'
import { readFile, mkdir, writeFile } from 'fs/promises'
import { createRequire } from 'module'
import { format } from 'prettier'
import { decode } from 'html-entities'
import { packageDirectorySync } from 'package-directory'
import { MountInfo, RenderConfig } from './config.js'
import { mergeLiquidTemplate, type MergeContext } from './engines/liquid.js'
import { mergePHPTemplate } from './engines/php.js'
import { mergeHTMLTemplate } from './engines/html.js'

// Register babel for worker's module imports
register({
  configFile: join(packageDirectorySync({cwd: import.meta.dirname})!, 'babel.config.json'),
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  ignore: ['node_modules'],
  only: [process.cwd()],
  cache: false
})

// Create require from cwd for loading user modules
const requireFromCwd = createRequire(join(process.cwd(), 'dummy.js'))
const ReactDOMServer = requireFromCwd('react-dom/server')
const { renderToStaticMarkup } = ReactDOMServer


interface WorkerModule {
  default?: MountInfo
  [key: string]: unknown
}

interface StyledComponentsSheet {
  collectStyles: (element: unknown) => unknown
  getStyleTags: () => string
  seal: () => void
}

function exitWithError(message: string, filePath?: string, cause?: Error): never {
  console.error(message)
  if (filePath) console.error(`File: ${filePath}`)
  if (cause) console.error(cause)
  process.exit(1)
}

async function main(): Promise<void> {
  // Parse arguments
  const [,, filePath, configJson] = process.argv
  if (!filePath || !configJson) {
    exitWithError('Required arguments: filePath configJson')
  }

  // Parse config
  let config: RenderConfig
  try {
    config = JSON.parse(configJson)
  } catch (error) {
    exitWithError('Invalid config JSON', undefined, error instanceof Error ? error : undefined)
  }

  // Parse file info
  const { dir, name } = parse(filePath)

  // Calculate paths
  const outputExtension = config.templateExtension || '.html'
  const outputPath = join(dir, `${name}${outputExtension}`)
  const absoluteInputPath = resolve(config.entryPointDir, filePath)
  const absoluteOutputPath = join(config.outputDir, outputPath)

  // Load module
  let module: WorkerModule
  try {
    module = requireFromCwd(absoluteInputPath)
  } catch (error) {
    exitWithError('Failed to load module', filePath, error instanceof Error ? error : undefined)
  }

  // Extract mount info
  const exportName = config.mountInfoExport || 'default'
  const exportedValue = module[exportName]
  
  if (!exportedValue || typeof exportedValue !== 'object' || !('node' in exportedValue) || !('rootElementId' in exportedValue)) {
    exitWithError(`Invalid export '${exportName}': must contain node and rootElementId`, filePath)
  }
  
  const mountInfo: MountInfo = {
    node: exportedValue.node as React.ReactNode,
    rootElementId: exportedValue.rootElementId as string
  }

  // Render React component with optional styled-components
  let html: string
  let styles = ''
  
  try {
    // Check if styled-components is available
    let styledSheet: StyledComponentsSheet | undefined
    
    try {
      const { ServerStyleSheet } = requireFromCwd('styled-components')
      styledSheet = new ServerStyleSheet()
    } catch {
      // styled-components not available, continue without it
    }

    if (styledSheet) {
      try {
        html = decode(renderToStaticMarkup(styledSheet.collectStyles(mountInfo.node)))
        styles = styledSheet.getStyleTags()
      } finally {
        styledSheet.seal()
      }
    } else {
      html = decode(renderToStaticMarkup(mountInfo.node))
    }
  } catch (error) {
    exitWithError('Failed to render React component', filePath, error instanceof Error ? error : undefined)
  }

  // Format with Prettier if enabled
  if (config.prettierConfig !== false) {
    const prettierOptions = config.prettierConfig || { parser: 'html', printWidth: 120 }
    try {
      html = await format(html, prettierOptions)
      if (styles) {
        styles = await format(styles, prettierOptions)
      }
    } catch (error) {
      exitWithError('Prettier formatting failed', filePath, error instanceof Error ? error : undefined)
    }
  }

  // Load and merge template
  if (!config.templateDir) {
    exitWithError('Template directory not configured', filePath)
  }

  const templatePath = join(config.templateDir, outputPath)
  let template: string

  try {
    template = await readFile(templatePath, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      // Try to use default template if configured
      if (config.defaultTemplate) {
        const defaultTemplatePath = join(config.templateDir, config.defaultTemplate)
        try {
          template = await readFile(defaultTemplatePath, 'utf8')
        } catch (defaultError) {
          exitWithError(`Template not found: ${templatePath} and default template not found: ${defaultTemplatePath}`, filePath)
        }
      } else {
        exitWithError(`Template not found: ${templatePath}`, filePath)
      }
    } else {
      exitWithError('Failed to read template', filePath, error instanceof Error ? error : undefined)
    }
  }

  // Merge with template
  let finalHtml: string
  try {
    const mergeContext: MergeContext = {
      template,
      content: html,
      styles,
      mountInfo
    }
    
    switch (config.templateEngine) {
      case 'liquid':
        finalHtml = await mergeLiquidTemplate(mergeContext)
        break
      case 'php':
        finalHtml = await mergePHPTemplate(mergeContext)
        break
      case 'html':
        finalHtml = await mergeHTMLTemplate(mergeContext)
        break
      default:
        throw new Error(`Unknown template engine type: ${config.templateEngine}`)
    }
  } catch (error) {
    exitWithError('Template merge failed', filePath, error instanceof Error ? error : undefined)
  }

  // Write output
  try {
    await mkdir(dirname(absoluteOutputPath), { recursive: true })
    await writeFile(absoluteOutputPath, finalHtml, 'utf8')
  } catch (error) {
    exitWithError('Failed to write output', filePath, error instanceof Error ? error : undefined)
  }

  console.log(`Rendered: ${outputPath}`)
  process.exit(0)
}

main()