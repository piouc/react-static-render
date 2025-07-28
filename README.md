# react-static-render

React components to static HTML with template engine support (PHP, Liquid).

## Installation

```bash
npm install -D react-static-render
```

## Usage

```bash
# Initialize config
react-static-render init

# Render all entry points
react-static-render

# Render specific files
react-static-render file1.tsx file2.tsx

# Watch mode with live reload
react-static-render --watch --live-reload

# List discovered entry points
react-static-render list
```

## Configuration

Configuration should be placed in:
- `react-static-render.config.json`

### Configuration Options

#### Core Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entryPointsBase` | `string` | - | **Required**. Base directory where your React entry point files are located. The tool will search for files in this directory based on the configured file extensions. Path is relative to your project root |
| `outputDir` | `string` | - | **Required**. Directory where rendered HTML files will be written. The directory structure from entry points will be preserved. For example, `src/entry-points/pages/about.tsx` becomes `dist/pages/about.html` |
| `templateDir` | `string` | - | **Required**. Directory containing template files. Templates matching entry point names will be used for merging. Template files should have the same name as your entry point file (e.g., `about.php` for `about.tsx`) |

#### Rendering Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `templateEngine` | `"php" \| "liquid" \| "auto"` | `"auto"` | Specifies which template engine to use. `"auto"` automatically detects based on template file extension (`.php` for PHP, `.liquid`/`.html` for Liquid). Use specific engine names to force a particular engine regardless of file extension |
| `templateExtension` | `string` | `".php"` | Default file extension for template files when searching for matching templates. This is used when looking for template files that correspond to your entry points |
| `mountInfoExport` | `string` | `"default"` | The export name to look for in entry files. Entry files should export an object with `node` and `rootElementId` properties. Use named exports by specifying the export name here |
| `fileExtensions` | `string[]` | `["js", "jsx", "ts", "tsx"]` | File extensions to consider as React entry points when searching the entry points directory. Add custom extensions if using non-standard file types |

#### Watch Mode Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `patterns` | `string[]` | - | Additional glob patterns for files to watch beyond the default source directories. Useful for watching template files, shared components, or other dependencies. Example: `["src/**/*.tsx", "templates/**/*.php"]` |
| `websocketPort` | `number` | `8099` | Port number for the WebSocket server used by live reload. Must be between 1024 and 65535. Change this if port 8099 is already in use by another service |

#### Build Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prettierConfig` | `object \| false` | - | Prettier configuration object for formatting the generated HTML output. Set to `false` to disable formatting entirely. When enabled, uses Prettier's HTML parser. Supports all standard Prettier options like `printWidth`, `tabWidth`, `useTabs`, etc. |

#### Advanced Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxConcurrentRenders` | `number \| "auto"` | `"auto"` | Maximum number of files to render in parallel. Use `"auto"` to automatically use the number of CPU cores, or specify a number to override. Decrease if experiencing memory issues or system instability |
| `verbose` | `boolean` | `false` | Enable detailed logging output for debugging. Shows file processing steps, template matching logic, rendering progress, and error details. Useful for troubleshooting configuration issues |

### Example Configurations

#### Minimal Configuration
```json
{
  "entryPointsBase": "src/entry-points",
  "outputDir": "dist",
  "templateDir": "templates"
}
```

#### Full Configuration with All Options
```json
{
  "entryPointsBase": "src/entry-points",
  "outputDir": "dist",
  "templateDir": "src/templates",
  "templateEngine": "auto",
  "templateExtension": ".php",
  "mountInfoExport": "default",
  "fileExtensions": ["js", "jsx", "ts", "tsx"],
  "patterns": ["src/**/*.tsx", "src/**/*.jsx", "templates/**/*.php"],
  "websocketPort": 8099,
  "prettierConfig": {
    "printWidth": 120,
    "tabWidth": 2,
    "useTabs": false,
    "semi": true,
    "singleQuote": true
  },
  "maxConcurrentRenders": "auto",
  "verbose": false
}
```

#### Configuration for Liquid Templates
```json
{
  "entryPointsBase": "src/entry-points",
  "outputDir": "dist",
  "templateDir": "templates",
  "templateEngine": "liquid",
  "templateExtension": ".liquid",
  "patterns": ["templates/**/*.liquid", "src/**/*.tsx"]
}
```

#### Performance-Optimized Configuration
```json
{
  "entryPointsBase": "src/entry-points",
  "outputDir": "dist",
  "templateDir": "templates",
  "maxConcurrentRenders": 8,
  "prettierConfig": false,
  "verbose": false
}
```

### Configuration Details

#### File Discovery and Processing

The tool discovers entry points by:
1. Scanning `entryPointsBase` directory recursively
2. Finding files matching `fileExtensions` (default: js, jsx, ts, tsx)
3. Loading files that export the required mount info structure
4. Matching template files in `templateDir` with same base name

#### Template Engine Selection

The `templateEngine` option controls how templates are processed:
- `"auto"` - Automatically detects based on file extension:
  - `.php` files → PHP engine
  - `.liquid` or `.html` files → Liquid engine
- `"php"` - Forces PHP template processing regardless of extension
- `"liquid"` - Forces Liquid template processing regardless of extension

When using `"auto"`, ensure your template files have the correct extension.

#### Watch Mode Patterns

The watch mode monitors:
- All files in `entryPointsBase` directory (automatic)
- Additional paths specified in `patterns` array
- Template files if `templateDir` is configured

Example patterns:
```json
{
  "patterns": [
    "src/components/**/*.tsx",    // Watch all TSX files in components
    "src/styles/**/*.css",        // Watch CSS files
    "templates/**/*.php",         // Watch PHP template files
    "!**/*.test.tsx"             // Exclude test files
  ]
}
```

#### Prettier Configuration

The `prettierConfig` option accepts:
- `false` - Disable formatting entirely
- Prettier options object - Configure HTML formatting

Common Prettier options:
```json
{
  "prettierConfig": {
    "printWidth": 120,
    "tabWidth": 2,
    "useTabs": false,
    "htmlWhitespaceSensitivity": "css",
    "bracketSameLine": false
  }
}
```

#### Performance Tuning

- **`maxConcurrentRenders`**: Defaults to `"auto"` (CPU core count)
  - Use `"auto"` for automatic CPU core detection (recommended)
  - Override with a specific number if needed (e.g., 2, 4, 8)
  - Reduce for memory-constrained environments
- **`prettierConfig: false`**: Disable formatting for faster builds
- **`verbose: true`**: Enable only when debugging issues

## Entry Point Format

```tsx
// src/entry-points/example.tsx
export default {
  node: <div>Hello World</div>,
  rootElementId: 'root'
};
```

## CLI Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--config` | `-c` | Configuration file path | Auto-discover |
| `--watch` | `-w` | Enable watch mode | false |
| `--live-reload` | `-l` | Enable live reload | false |
| `--port` | `-p` | WebSocket port | 8099 |
| `--output` | `-o` | Output directory | From config |
| `--verbose` | `-v` | Verbose logging | false |

## Template Components

### PHP Components

```tsx
import { PhpIf, PhpForeach, PhpEcho } from 'react-static-render/components/php';

<PhpIf condition="$users">
  <PhpForeach array="$users" variable="$user">
    <div>
      <PhpEcho value="$user['name']" escape={true} />
    </div>
  </PhpForeach>
</PhpIf>
```

### Liquid Components

```tsx
import { LiquidFor, LiquidIf, LiquidObject } from 'react-static-render/components/liquid';

<LiquidIf condition="product.available">
  <LiquidFor item="variant" collection="product.variants">
    <div>
      <LiquidObject>variant.title</LiquidObject>
    </div>
  </LiquidFor>
</LiquidIf>
```

## Template Insertion

Both PHP and Liquid engines replace content in `<div id="rootElementId"></div>`. The div must exist in the template file.

## License

SIC