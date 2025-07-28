import { 
  type TemplateEngine, 
  type TemplateEngineConfig,
  type MergeContext,
  validateMergeInputs,
  escapeRegex,
  createTemplateError,
  isExtensionSupported,
  createDefaultEngineConfig
} from './base.js';
import type { FileExtension, AsyncResult, RenderError } from '../types.js';

interface PHPEngineConfig extends TemplateEngineConfig {
  readonly fileExtensions?: readonly FileExtension[];
}

const DEFAULT_PHP_EXTENSIONS: readonly FileExtension[] = ['.php'];

export function createPHPTemplateEngine(config?: PHPEngineConfig): TemplateEngine<PHPEngineConfig> {
  const engineConfig = createDefaultEngineConfig(config, {
    fileExtensions: DEFAULT_PHP_EXTENSIONS
  });

  return {
    name: 'php',
    fileExtensions: DEFAULT_PHP_EXTENSIONS,
    
    isSupported(extension: FileExtension): boolean {
      return isExtensionSupported(extension, engineConfig, DEFAULT_PHP_EXTENSIONS);
    },
    
    async merge(context: MergeContext): AsyncResult<string, RenderError> {
      try {
        validateMergeInputs(context);
        const result = await performPHPMerge(context);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? 
            createTemplateError({ 
              message: error.message, 
              code: 'PHP_MERGE_ERROR', 
              cause: error 
            }) :
            createTemplateError({ 
              message: 'Unknown merge error', 
              code: 'PHP_MERGE_ERROR' 
            })
        };
      }
    },
    
    getConfig(): Readonly<PHPEngineConfig> {
      return Object.freeze({ ...engineConfig });
    }
  };
}

async function performPHPMerge(context: MergeContext): Promise<string> {
  const { template, content, styles, mountInfo } = context;
  
  // Replace the content in the root element with styles + content
  const divRegex = new RegExp(
    `<div\\s+id=["']${escapeRegex(mountInfo.rootElementId)}["'][^>]*>.*?</div>`,
    'is'
  );
  
  if (divRegex.test(template)) {
    return template.replace(divRegex, (match) => {
      const openTagMatch = match.match(/^<div[^>]*>/i);
      if (openTagMatch) {
        return `${openTagMatch[0]}${styles}${content}</div>`;
      }
      return match;
    });
  }
  
  // Look for PHP comment insertion point
  const phpCommentRegex = /<!--\s*react-static-render\s*-->/i;
  if (phpCommentRegex.test(template)) {
    return template.replace(phpCommentRegex, `${styles}${content}`);
  }
  
  // Try to insert before closing body tag
  const bodyRegex = /<\/body>/i;
  if (bodyRegex.test(template)) {
    return template.replace(bodyRegex, `${styles}${content}</body>`);
  }
  
  // Fallback: append at the end
  return `${template}${styles}${content}`;
}