import { transformSync } from '@babel/core';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export function createBabelTransformer(projectRoot: string) {
  // Check if user has a babel config
  const babelConfigPaths = [
    join(projectRoot, '.babelrc'),
    join(projectRoot, '.babelrc.js'),
    join(projectRoot, '.babelrc.json'),
    join(projectRoot, 'babel.config.js'),
    join(projectRoot, 'babel.config.json'),
  ];
  
  let userBabelConfig: any = null;
  for (const configPath of babelConfigPaths) {
    if (existsSync(configPath)) {
      if (configPath.endsWith('.js')) {
        // For JS configs, we would need to import them
        // For now, skip JS configs
        continue;
      }
      const configContent = readFileSync(configPath, 'utf8');
      userBabelConfig = JSON.parse(configContent);
      break;
    }
  }

  return function transformCode(code: string, filename: string): string {
    const isTypeScript = filename.endsWith('.ts') || filename.endsWith('.tsx');
    
    // Base babel config
    const babelConfig = {
      filename,
      presets: [] as any[],
      plugins: [] as any[],
      // Don't use .babelrc files from the filesystem
      configFile: false,
      babelrc: false,
      // Keep modules as ES modules
      sourceType: 'module' as const,
    };

    // If user has babel config, use it but ensure modules stay as ESM
    if (userBabelConfig) {
      if (userBabelConfig.presets) {
        // Process user presets to ensure @babel/preset-env doesn't transform modules
        const processedPresets = userBabelConfig.presets.map((preset: any) => {
          if (preset === '@babel/preset-env') {
            return ['@babel/preset-env', { modules: false }];
          }
          if (Array.isArray(preset) && preset[0] === '@babel/preset-env') {
            return [preset[0], { ...preset[1], modules: false }];
          }
          return preset;
        });
        babelConfig.presets.push(...processedPresets);
      }
      if (userBabelConfig.plugins) {
        babelConfig.plugins.push(...userBabelConfig.plugins);
      }
    }

    // Ensure we have required presets
    const hasReactPreset = babelConfig.presets.some((preset: any) => 
      preset === '@babel/preset-react' || 
      (Array.isArray(preset) && preset[0] === '@babel/preset-react')
    );

    const hasTypescriptPreset = babelConfig.presets.some((preset: any) => 
      preset === '@babel/preset-typescript' || 
      (Array.isArray(preset) && preset[0] === '@babel/preset-typescript')
    );

    // First add TypeScript preset if needed
    if (isTypeScript && !hasTypescriptPreset) {
      babelConfig.presets.push(['@babel/preset-typescript', { 
        isTSX: true, 
        allExtensions: true,
        allowNamespaces: true
      }]);
    }

    // Then add React preset
    if (!hasReactPreset) {
      babelConfig.presets.push(['@babel/preset-react', {
        runtime: 'automatic' // Use React 17+ JSX transform
      }]);
    }

    // Finally, ensure we're not adding @babel/preset-env which would transform to CommonJS
    // Remove any existing @babel/preset-env that might transform modules
    babelConfig.presets = babelConfig.presets.filter((preset: any) => {
      if (Array.isArray(preset) && preset[0] === '@babel/preset-env') {
        // If it has modules: false, keep it
        if (preset[1] && preset[1].modules === false) {
          return true;
        }
        return false;
      }
      return preset !== '@babel/preset-env';
    });

    // Always add styled-components plugin if not present
    const hasStyledComponentsPlugin = babelConfig.plugins.some((plugin: any) => 
      plugin === 'babel-plugin-styled-components' || 
      (Array.isArray(plugin) && plugin[0] === 'babel-plugin-styled-components')
    );

    if (!hasStyledComponentsPlugin) {
      babelConfig.plugins.push([
        'babel-plugin-styled-components',
        {
          displayName: true,
          fileName: true,
          ssr: true,
          pure: true
        }
      ]);
    }

    const result = transformSync(code, babelConfig);
    
    if (!result || !result.code) {
      throw new Error(`Failed to transform ${filename}`);
    }

    return result.code;
  };
}