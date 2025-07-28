import { BaseTemplateEngine } from './base.js';
import type { MountInfo, FileExtension, AsyncResult, RenderError } from '../types.js';

export class PHPTemplateEngine extends BaseTemplateEngine<any> {
  readonly name = 'php';
  readonly fileExtensions: readonly FileExtension[] = ['.php'];
  
  constructor() {
    super({});
  }
  
  protected createDefaultConfig(): any {
    return {
      fileExtensions: this.fileExtensions
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
          this.createTemplateError(error.message, 'PHP_MERGE_ERROR', error) :
          this.createTemplateError('Unknown merge error', 'PHP_MERGE_ERROR')
      };
    }
  }
  
  private async performMerge(template: string, content: string, styles: string, mountInfo: MountInfo): Promise<string> {
    // Only use div replacement strategy
    const divRegex = new RegExp(
      `<div\\s+id=["']${this.escapeRegex(mountInfo.rootElementId)}["'][^>]*>.*?</div>`,
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
  
  // Helper method to check if content looks like PHP template
  static isPHPTemplate(content: string): boolean {
    const phpPatterns = [
      /<\?php/i,
      /<\?=/i,
      /<\?/i
    ];
    
    return phpPatterns.some(pattern => pattern.test(content));
  }
  
  // Helper method to extract PHP variables from template
  extractVariables(template: string): string[] {
    const regex = /\$([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      const variable = match[1];
      if (variable && !variables.includes(variable)) {
        variables.push(variable);
      }
    }
    
    return variables;
  }
  
}