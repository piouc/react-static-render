export * from './base.js';
export * from './liquid.js';
export * from './php.js';

import { type TemplateEngine } from './base.js';
import { LiquidTemplateEngine } from './liquid.js';
import { PHPTemplateEngine } from './php.js';
import { type TemplateEngineType, type TemplateEngineConfigs, type FileExtension } from '../types.js';

export const createTemplateEngine = (
  type: TemplateEngineType, 
  configs: TemplateEngineConfigs = {},
  filePath?: string
): TemplateEngine => {
  if (type === 'auto' && filePath) {
    return selectEngineByFile(filePath, configs);
  }
  
  switch (type) {
    case 'liquid':
      return new LiquidTemplateEngine(configs.liquid);
    case 'php':
      return new PHPTemplateEngine(configs.php);
    default:
      return new PHPTemplateEngine(configs.php);
  }
};

export const selectEngineByFile = (
  filePath: string, 
  configs: TemplateEngineConfigs = {}
): TemplateEngine => {
  const extension = getFileExtension(filePath);
  
  // Try Liquid first
  const liquidEngine = new LiquidTemplateEngine(configs.liquid);
  if (liquidEngine.isSupported(extension as FileExtension)) {
    return liquidEngine;
  }
  
  // Try PHP
  const phpEngine = new PHPTemplateEngine(configs.php);
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