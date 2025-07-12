import { BaseTemplateEngine } from './base.js';
import type { MountInfo, FileExtension, AsyncResult, RenderError, LiquidEngineConfig } from '../types.js';

export class LiquidTemplateEngine extends BaseTemplateEngine<LiquidEngineConfig> {
  readonly name = 'liquid';
  readonly fileExtensions: readonly FileExtension[] = ['.liquid', '.html'];
  
  private readonly variableDelimiters: readonly [string, string];
  private readonly tagDelimiters: readonly [string, string];
  
  constructor(config: LiquidEngineConfig = {}) {
    super(config);
    this.variableDelimiters = config.variableDelimiters || ['{{', '}}'];
    this.tagDelimiters = config.tagDelimiters || ['{%', '%}'];
  }
  
  protected createDefaultConfig(userConfig?: LiquidEngineConfig): LiquidEngineConfig {
    return {
      fileExtensions: this.fileExtensions,
      variableDelimiters: ['{{', '}}'],
      tagDelimiters: ['{%', '%}'],
      trimWhitespace: false,
      ...userConfig
    };
  }
  
  async merge(template: string, content: string, styles: string, mountInfo: MountInfo): AsyncResult<string, RenderError> {
    try {
      const context = this.createMergeContext(template, content, styles, mountInfo);
      this.validateMergeInputs(context);
      
      const result = await this.performMerge(template, content, styles, mountInfo);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? 
          this.createTemplateError(error.message, 'LIQUID_MERGE_ERROR', error) :
          this.createTemplateError('Unknown merge error', 'LIQUID_MERGE_ERROR')
      };
    }
  }
  
  private async performMerge(template: string, content: string, styles: string, mountInfo: MountInfo): Promise<string> {
    // Try to find div with rootElementId
    const divRegex = new RegExp(
      `<div\\s+id=["']${this.escapeRegex(mountInfo.rootElementId)}["'][^>]*>.*?</div>`,
      'is'
    );
    
    if (divRegex.test(template)) {
      // Replace content inside the div
      return template.replace(divRegex, (match) => {
        const openTagMatch = match.match(/^<div[^>]*>/i);
        if (openTagMatch) {
          return `${openTagMatch[0]}${styles}${content}</div>`;
        }
        return match;
      });
    }
    
    // Try to find Liquid include or section for the rootElementId
    const liquidIncludeRegex = new RegExp(
      `${this.escapeRegex(this.tagDelimiters[0])}\\s*(?:include|section)\\s+['"]${this.escapeRegex(mountInfo.rootElementId)}['"].*?${this.escapeRegex(this.tagDelimiters[1])}`,
      'is'
    );
    
    if (liquidIncludeRegex.test(template)) {
      return template.replace(liquidIncludeRegex, 
        `<div id="${mountInfo.rootElementId}">${styles}${content}</div>`
      );
    }
    
    // Try to find a Liquid comment indicating where to insert content
    const commentRegex = new RegExp(
      `${this.escapeRegex(this.tagDelimiters[0])}\\s*comment\\s*${this.escapeRegex(this.tagDelimiters[1])}\\s*${this.escapeRegex(mountInfo.rootElementId)}\\s*${this.escapeRegex(this.tagDelimiters[0])}\\s*endcomment\\s*${this.escapeRegex(this.tagDelimiters[1])}`,
      'is'
    );
    
    if (commentRegex.test(template)) {
      return template.replace(commentRegex, 
        `<div id="${mountInfo.rootElementId}">${styles}${content}</div>`
      );
    }
    
    // If no specific insertion point found, try to insert before closing body tag
    const bodyRegex = /<\/body>/i;
    if (bodyRegex.test(template)) {
      return template.replace(bodyRegex, 
        `  <div id="${mountInfo.rootElementId}">${styles}${content}</div>\n</body>`
      );
    }
    
    // Fallback: append to end of template
    return template + `\n<div id="${mountInfo.rootElementId}">${styles}${content}</div>`;
  }
  
  // Helper method to check if content looks like Liquid template
  static isLiquidTemplate(content: string): boolean {
    const liquidPatterns = [
      /\{\{.*?\}\}/,  // Variables
      /\{%.*?%\}/,    // Tags
      /\{\%-.*?-%\}/  // Tags with whitespace trimming
    ];
    
    return liquidPatterns.some(pattern => pattern.test(content));
  }
  
  // Helper method to extract Liquid variables from template
  extractVariables(template: string): string[] {
    const [openVar, closeVar] = this.variableDelimiters;
    const regex = new RegExp(
      `${this.escapeRegex(openVar)}\\s*([^}]+?)\\s*${this.escapeRegex(closeVar)}`,
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
  
  // Helper method to extract Liquid tags from template
  extractTags(template: string): string[] {
    const [openTag, closeTag] = this.tagDelimiters;
    const regex = new RegExp(
      `${this.escapeRegex(openTag)}\\s*([^%]+?)\\s*${this.escapeRegex(closeTag)}`,
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
}