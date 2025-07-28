export * from './base.js';

import { type TemplateEngine } from './base.js';
import { LiquidTemplateEngine } from './liquid.js';
import { PHPTemplateEngine } from './php.js';
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
      return new LiquidTemplateEngine();
    case 'php':
      return new PHPTemplateEngine();
    default:
      return new PHPTemplateEngine();
  }
};

export const selectEngineByFile = (
  filePath: string
): TemplateEngine => {
  const extension = getFileExtension(filePath);
  
  // Try Liquid first
  const liquidEngine = new LiquidTemplateEngine();
  if (liquidEngine.isSupported(extension as FileExtension)) {
    return liquidEngine;
  }
  
  // Try PHP
  const phpEngine = new PHPTemplateEngine();
  if (phpEngine.isSupported(extension as FileExtension)) {
    return phpEngine;
  }
  
  // Default to PHP for unknown extensions
  return phpEngine;
};

export const detectEngineFromTemplate = (templateContent: string): TemplateEngineType => {
  // Check for Liquid patterns
  if (LiquidTemplateEngine.isLiquidTemplate(templateContent)) {
    return 'liquid';
  }
  
  // Check for PHP patterns
  if (PHPTemplateEngine.isPHPTemplate(templateContent)) {
    return 'php';
  }
  
  // Default to auto
  return 'auto';
};

function getFileExtension(filePath: string): string {
  const parts = filePath.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}