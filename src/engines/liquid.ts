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

interface LiquidEngineConfig extends TemplateEngineConfig {
  readonly fileExtensions?: readonly FileExtension[];
  readonly variableDelimiters?: readonly [string, string];
  readonly tagDelimiters?: readonly [string, string];
}

const DEFAULT_LIQUID_EXTENSIONS: readonly FileExtension[] = ['.liquid', '.html'];
const DEFAULT_VARIABLE_DELIMITERS: readonly [string, string] = ['{{', '}}'];
const DEFAULT_TAG_DELIMITERS: readonly [string, string] = ['{%', '%}'];

export function createLiquidTemplateEngine(config?: LiquidEngineConfig): TemplateEngine<LiquidEngineConfig> {
  const engineConfig = createDefaultEngineConfig(config, {
    fileExtensions: DEFAULT_LIQUID_EXTENSIONS,
    variableDelimiters: DEFAULT_VARIABLE_DELIMITERS,
    tagDelimiters: DEFAULT_TAG_DELIMITERS
  });

  return {
    name: 'liquid',
    fileExtensions: DEFAULT_LIQUID_EXTENSIONS,
    
    isSupported(extension: FileExtension): boolean {
      return isExtensionSupported(extension, engineConfig, DEFAULT_LIQUID_EXTENSIONS);
    },
    
    async merge(context: MergeContext): AsyncResult<string, RenderError> {
      try {
        validateMergeInputs(context);
        const result = await performLiquidMerge(context);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? 
            createTemplateError({ 
              message: error.message, 
              code: 'LIQUID_MERGE_ERROR', 
              cause: error 
            }) :
            createTemplateError({ 
              message: 'Unknown merge error', 
              code: 'LIQUID_MERGE_ERROR' 
            })
        };
      }
    },
    
    getConfig(): Readonly<LiquidEngineConfig> {
      return Object.freeze({ ...engineConfig });
    }
  };
}

async function performLiquidMerge(context: MergeContext): Promise<string> {
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
  
  throw new Error(`No div with id="${mountInfo.rootElementId}" found in template`);
}

// Helper function to check if content looks like Liquid template
export function isLiquidTemplate(content: string): boolean {
  const liquidPatterns = [
    /\{\{.*?\}\}/,  // Variables
    /\{%.*?%\}/,    // Tags
    /\{\%-.*?-%\}/  // Tags with whitespace trimming
  ];
  
  return liquidPatterns.some(pattern => pattern.test(content));
}

// Helper function to extract Liquid variables from template
export function extractLiquidVariables(
  template: string, 
  delimiters: readonly [string, string] = DEFAULT_VARIABLE_DELIMITERS
): string[] {
  const [openVar, closeVar] = delimiters;
  const regex = new RegExp(
    `${escapeRegex(openVar)}\\s*([^}]+?)\\s*${escapeRegex(closeVar)}`,
    'g'
  );
  
  const variables: string[] = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    const variable = match[1]?.trim().split('|')[0]?.trim(); // Remove filters
    if (variable && !variables.includes(variable)) {
      variables.push(variable);
    }
  }
  
  return variables;
}

// Helper function to extract Liquid tags from template
export function extractLiquidTags(
  template: string, 
  delimiters: readonly [string, string] = DEFAULT_TAG_DELIMITERS
): string[] {
  const [openTag, closeTag] = delimiters;
  const regex = new RegExp(
    `${escapeRegex(openTag)}\\s*([^%]+?)\\s*${escapeRegex(closeTag)}`,
    'g'
  );
  
  const tags: string[] = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    const tag = match[1]?.trim().split(' ')[0]; // Get tag name only
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  return tags;
}