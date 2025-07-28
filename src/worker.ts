import { ServerStyleSheet } from 'styled-components';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { format, type Options as PrettierOptions } from 'prettier';
import { join, parse, resolve, dirname } from 'path';
import { pathToFileURL } from 'url';
import { 
  RenderError,
  type MountInfo, 
  type RenderConfig, 
  type ProcessingContext,
  type FileInfo,
  type FileExtension
} from './types.js';
import { 
  createTemplateEngine, 
  detectEngineFromTemplate
} from './engines/index.js';
import { type TemplateEngineType } from './types.js';

interface WorkerArgs {
  readonly filePath: string;
  readonly configJson: string;
}


interface ModuleWithMountInfo {
  [key: string]: unknown;
}

const HTML_ENTITIES: Record<string, string> = Object.freeze({
  '&amp;': '&',
  '&#x26;': '&',
  '&#39;': "'",
  '&#x27;': "'",
  '&quot;': '"',
  '&#x22;': '"',
  '&lt;': '<',
  '&#x3C;': '<',
  '&gt;': '>',
  '&#x3E;': '>',
  '&#x2F;': '/',
});

function createRenderError(
  message: string,
  code: string,
  filePath?: string,
  cause?: Error
): RenderError {
  return new RenderError(message, code, filePath, cause);
}

function unescapeHtml(html: string): string {
  return Object.entries(HTML_ENTITIES).reduce(
    (result, [escaped, char]) => result.replaceAll(escaped, char),
    html
  );
}

function parseWorkerArgs(): WorkerArgs {
  const filePath = process.argv[2];
  const configJson = process.argv[3];
  
  if (!filePath) {
    throw createRenderError(
      'File path is required as first argument',
      'WORKER_MISSING_FILEPATH'
    );
  }
  
  if (!configJson) {
    throw createRenderError(
      'Config JSON is required as second argument',
      'WORKER_MISSING_CONFIG'
    );
  }
  
  return { filePath, configJson };
}

function parseConfig(configJson: string): RenderConfig {
  try {
    const config = JSON.parse(configJson) as RenderConfig;
    return config;
  } catch (error) {
    throw createRenderError(
      'Failed to parse configuration JSON',
      'WORKER_CONFIG_PARSE_ERROR',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

function createFileInfo(filePath: string): FileInfo {
  const { dir, name, ext } = parse(filePath);
  
  return {
    path: filePath,
    name,
    extension: ext as FileExtension,
    directory: dir
  };
}

async function loadModule(
  absolutePath: string,
  filePath: string
): Promise<ModuleWithMountInfo> {
  try {
    const moduleUrl = pathToFileURL(absolutePath).href + `?t=${Date.now()}`;
    const module = await import(moduleUrl) as ModuleWithMountInfo;
    return module;
  } catch (error) {
    throw createRenderError(
      'Failed to import React component module',
      'WORKER_MODULE_IMPORT_ERROR',
      filePath,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

function extractMountInfo(
  module: ModuleWithMountInfo,
  exportName: string,
  filePath: string
): MountInfo {
  const mountInfo = module[exportName];
  
  if (!mountInfo || typeof mountInfo !== 'object') {
    throw createRenderError(
      `Module does not export ${exportName} or export is not an object`,
      'WORKER_MISSING_MOUNT_INFO',
      filePath
    );
  }
  
  const typedMountInfo = mountInfo as MountInfo;
  
  if (!typedMountInfo.node || !typedMountInfo.rootElementId) {
    throw createRenderError(
      `Mount info is missing required properties (node, rootElementId)`,
      'WORKER_INVALID_MOUNT_INFO',
      filePath
    );
  }
  
  return typedMountInfo;
}

async function renderReactComponent(
  mountInfo: MountInfo,
  filePath: string
): Promise<{ html: string; styles: string }> {
  const sheet = new ServerStyleSheet();
  
  try {
    const html = unescapeHtml(
      renderToStaticMarkup(
        sheet.collectStyles(createElement(() => mountInfo.node))
      )
    );
    const styles = sheet.getStyleTags();
    
    return { html, styles };
  } catch (error) {
    throw createRenderError(
      'Failed to render React component to HTML',
      'WORKER_REACT_RENDER_ERROR',
      filePath,
      error instanceof Error ? error : new Error(String(error))
    );
  } finally {
    sheet.seal();
  }
}

async function loadTemplate(
  templatePath: string,
  filePath: string
): Promise<string | null> {
  try {
    return await readFile(templatePath, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null; // Template file not found
    }
    
    throw createRenderError(
      'Failed to read template file',
      'WORKER_TEMPLATE_READ_ERROR',
      filePath,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

async function mergeWithTemplate(
  template: string,
  html: string,
  styles: string,
  mountInfo: MountInfo,
  config: RenderConfig,
  templatePath: string,
  filePath: string
): Promise<string> {
  try {
    
    const engineType = config.templateEngine || detectEngineFromTemplate(template);
    const engine = createTemplateEngine(
      engineType as TemplateEngineType,
      templatePath
    );
    
    const mergeResult = await engine.merge(template, html, styles, mountInfo);
    if (!mergeResult.success) {
      throw mergeResult.error;
    }
    return mergeResult.data;
  } catch (error) {
    throw createRenderError(
      'Failed to merge rendered content with template',
      'WORKER_TEMPLATE_MERGE_ERROR',
      filePath,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

function createStandaloneHtml(
  html: string, 
  styles: string, 
  mountInfo: MountInfo
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Static Render</title>
  ${styles}
</head>
<body>
  <div id="${mountInfo.rootElementId}">${html}</div>
</body>
</html>`;
}

async function formatWithPrettier(
  html: string,
  prettierConfig: PrettierOptions | false | undefined,
  filePath: string
): Promise<string> {
  if (prettierConfig === false) {
    return html;
  }
  
  try {
    const config = prettierConfig || {
      parser: 'html' as const,
      printWidth: 120
    };
    
    return await format(html, config);
  } catch (error) {
    throw createRenderError(
      'Failed to format HTML with Prettier',
      'WORKER_PRETTIER_ERROR',
      filePath,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

async function writeOutput(
  content: string,
  outputPath: string,
  filePath: string
): Promise<void> {
  try {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content, 'utf8');
  } catch (error) {
    throw createRenderError(
      'Failed to write output file',
      'WORKER_FILE_WRITE_ERROR',
      filePath,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

async function renderWorker(filePath: string, config: RenderConfig): Promise<void> {
  const fileInfo = createFileInfo(filePath);
  const outputExtension = config.templateExtension || '.html';
  const outputFileName = `${fileInfo.name}${outputExtension}`;
  const outputPath = join(fileInfo.directory, outputFileName);
  const absoluteInputPath = resolve(config.entryPointsBase, filePath);
  const absoluteOutputPath = join(config.outputDir, outputPath);
  
  // Create processing context
  const context: ProcessingContext = {
    config,
    fileInfo,
    mountInfo: {} as MountInfo // Will be set later
  };
  
  // Load and validate module
  const module = await loadModule(absoluteInputPath, filePath);
  const mountInfo = extractMountInfo(module, config.mountInfoExport || 'default', filePath);
  context.mountInfo = mountInfo;
  
  // Render React component
  const { html, styles } = await renderReactComponent(mountInfo, filePath);
  
  let finalHtml: string;
  
  // Handle template merging
  if (config.templateDir) {
    const templatePath = join(config.templateDir, outputPath);
    const template = await loadTemplate(templatePath, filePath);
    
    if (template) {
      finalHtml = await mergeWithTemplate(
        template, 
        html, 
        styles, 
        mountInfo, 
        config, 
        templatePath, 
        filePath
      );
    } else {
      finalHtml = createStandaloneHtml(html, styles, mountInfo);
    }
  } else {
    finalHtml = createStandaloneHtml(html, styles, mountInfo);
  }
  
  // Format with Prettier
  finalHtml = await formatWithPrettier(finalHtml, config.prettierConfig, filePath);
  
  // Write output
  await writeOutput(finalHtml, absoluteOutputPath, filePath);
  
  console.log(`Rendered: ${outputPath}`);
}

async function main(): Promise<void> {
  try {
    const { filePath, configJson } = parseWorkerArgs();
    const config = parseConfig(configJson);
    
    await renderWorker(filePath, config);
    process.exit(0);
  } catch (error) {
    if (error instanceof RenderError) {
      console.error(`Render Error [${error.code}]: ${error.message}`);
      if (error.filePath) {
        console.error(`File: ${error.filePath}`);
      }
      if (error.cause) {
        console.error(`Cause: ${error.cause.message}`);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main();
}