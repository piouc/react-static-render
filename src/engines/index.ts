export * from './base.js';

import { type TemplateEngine } from './base.js';
import { createLiquidTemplateEngine, isLiquidTemplate } from './liquid.js';
import { createPHPTemplateEngine } from './php.js';
import { type TemplateEngineType, type FileExtension } from '../types.js';

export const createTemplateEngine = (
  type: TemplateEngineType, 
  filePath?: string
): TemplateEngine => {
  if (type === 'auto' && filePath) {
    return selectEngineByFile(filePath);
  }
  
  switch (type) {
    case 'liquid':
      return createLiquidTemplateEngine();
    case 'php':
      return createPHPTemplateEngine();
    default:
      return createPHPTemplateEngine();
  }
};

export const selectEngineByFile = (
  filePath: string
): TemplateEngine => {
  const extension = getFileExtension(filePath);
  
  // Try Liquid first
  const liquidEngine = createLiquidTemplateEngine();
  if (liquidEngine.isSupported(extension as FileExtension)) {
    return liquidEngine;
  }
  
  // Try PHP
  const phpEngine = createPHPTemplateEngine();
  if (phpEngine.isSupported(extension as FileExtension)) {
    return phpEngine;
  }
  
  // Default to PHP for unknown extensions
  return phpEngine;
};

export const detectEngineFromTemplate = (templateContent: string): TemplateEngineType => {
  if (isLiquidTemplate(templateContent)) return 'liquid';
  if (/<\?(?:php|=|\s)/.test(templateContent)) return 'php';
  return 'auto';
};

function getFileExtension(filePath: string): string {
  const parts = filePath.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}