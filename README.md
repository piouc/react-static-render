# React Static Render

A powerful CLI tool for rendering React components to static HTML with intelligent template engine integration. Seamlessly bridge React components with PHP and Liquid template systems.

## Features

- **Server-Side Rendering**: Convert React components to static HTML
- **Multi-Engine Support**: Native integration with PHP and Liquid templates
- **Smart Watch Mode**: Dependency-aware file monitoring with live reload
- **Process Isolation**: Concurrent rendering with worker processes for stability
- **TypeScript First**: Comprehensive type safety and IDE support
- **Flexible Configuration**: JSON-based configuration with intelligent defaults
- **Component Library**: Pre-built components for template patterns
- **Error Handling**: Detailed error reporting with file context

## Installation

```bash
npm install -g react-static-render
# or for project-specific usage
npm install --save-dev react-static-render
```

## Quick Start

### 1. Initialize Project

```bash
react-static-render init
```

This creates a `react-static-render.config.json` with defaults:

```json
{
  "entryPointsBase": "src/entry-points",
  "srcBase": "src",
  "outputDir": "dist",
  "templateEngine": "auto",
  "fileExtensions": ["js", "jsx", "ts", "tsx"],
  "maxConcurrentRenders": 4,
  "cacheEnabled": true
}
```

### 2. Create Your First Component

```tsx
// src/entry-points/hello.tsx
import React from 'react';

export default {
  node: (
    <div className="greeting">
      <h1>Hello, World!</h1>
      <p>Rendered with React Static Render</p>
    </div>
  ),
  rootElementId: 'hello-root'
};
```

### 3. Render Components

```bash
# Render all components
react-static-render

# Render specific files
react-static-render hello.tsx about.tsx

# Watch mode with live reload
react-static-render --watch --live-reload
```

## Configuration

### Complete Configuration Reference

```json
{
  "entryPointsBase": "src/entry-points",
  "srcBase": "src", 
  "outputDir": "dist",
  "templateDir": "src/templates",
  "templateEngine": "auto",
  "templateEngines": {
    "php": {
      "shortTags": false,
      "fileExtensions": [".php"]
    },
    "liquid": {
      "variableDelimiters": ["{{", "}}"],
      "tagDelimiters": ["{%", "%}"],
      "trimWhitespace": false,
      "fileExtensions": [".liquid", ".html"]
    }
  },
  "patterns": ["src/**/*"],
  "websocketPort": 8099,
  "mountInfoExport": "default",
  "templateExtension": ".php",
  "templateMergeStrategy": "replace",
  "fileExtensions": ["js", "jsx", "ts", "tsx"],
  "maxConcurrentRenders": 4,
  "cacheEnabled": true,
  "verbose": false,
  "prettierConfig": {
    "parser": "html",
    "printWidth": 120,
    "tabWidth": 2
  }
}
```

### Configuration in package.json

Alternatively, configure in your `package.json`:

```json
{
  "reactStaticRender": {
    "entryPointsBase": "src/components",
    "outputDir": "build",
    "templateEngine": "php"
  }
}
```

## Template Engines

### PHP Template Engine

The PHP engine provides intelligent integration with PHP templates.

#### Automatic Insertion Points
1. **Existing Div**: Replaces content in `<div id="rootElementId">`
2. **PHP Comments**: Inserts at `<?php /* rootElementId */ ?>`
3. **Body Tag**: Inserts before `</body>`
4. **End of File**: Appends to template

#### Example Usage

```tsx
// src/entry-points/user-list.tsx
import React from 'react';
import { PhpIf, PhpForeach, PhpEcho } from 'react-static-render/components/php';

export default {
  node: (
    <div className="user-list">
      <h1>Users</h1>
      <PhpIf condition="!empty($users)">
        <div className="user-grid">
          <PhpForeach array="$users" variable="$user">
            <div className="user-card">
              <h3><PhpEcho value="$user['name']" escape={true} /></h3>
              <p><PhpEcho value="$user['email']" escape={true} /></p>
            </div>
          </PhpForeach>
        </div>
      </PhpIf>
    </div>
  ),
  rootElementId: 'user-list'
};
```

#### Template Example
```php
<!-- src/templates/template.php -->
<!DOCTYPE html>
<html>
<head>
    <title><?php echo $page_title; ?></title>
</head>
<body>
    <header>
        <?php include 'header.php'; ?>
    </header>
    
    <main>
        <!-- React component will be inserted here -->
        <div id="user-list"></div>
    </main>
    
    <footer>
        <?php include 'footer.php'; ?>
    </footer>
</body>
</html>
```

### Liquid Template Engine

The Liquid engine supports standard Shopify/Jekyll syntax.

#### Insertion Strategies
1. **Existing Div**: Replaces content in `<div id="rootElementId">`
2. **Liquid Includes**: Replaces `{% include 'rootElementId' %}`
3. **Liquid Comments**: Replaces `{% comment %}rootElementId{% endcomment %}`
4. **Body Tag**: Inserts before `</body>`

#### Example Usage

```tsx
// src/entry-points/product-showcase.tsx
import React from 'react';
import { LiquidFor, LiquidIf, LiquidObject } from 'react-static-render/components/liquid';

export default {
  node: (
    <div className="product-showcase">
      <h1><LiquidObject>product.title</LiquidObject></h1>
      <LiquidIf condition="product.available">
        <div className="variants">
          <LiquidFor item="variant" collection="product.variants">
            <button className="variant-btn">
              <LiquidObject>variant.title</LiquidObject> - 
              <LiquidObject>variant.price | money</LiquidObject>
            </button>
          </LiquidFor>
        </div>
      </LiquidIf>
    </div>
  ),
  rootElementId: 'product-showcase'
};
```

#### Template Example
```liquid
<!-- src/templates/product.liquid -->
<!DOCTYPE html>
<html>
<head>
    <title>{{ product.title }}</title>
</head>
<body>
    <header>
        {% include 'header' %}
    </header>
    
    <main>
        <!-- React component insertion point -->
        {% comment %}product-showcase{% endcomment %}
    </main>
    
    <footer>
        {% include 'footer' %}
    </footer>
</body>
</html>
```

## Component Libraries

### PHP Components

Import PHP template components:

```tsx
import { 
  PhpIf, PhpElse, PhpFor, PhpForeach, PhpEcho,
  php, echo  // Template literal functions
} from 'react-static-render/components/php';

// Usage examples
<PhpIf condition="$user_authenticated">
  <PhpForeach array="$items" variable="$item">
    <article>
      <h2><PhpEcho value="$item['title']" escape={true} /></h2>
      <PhpEcho value="$item['content']" />
    </article>
  </PhpForeach>
</PhpIf>

// Template literals
{php`
  if ($user_logged_in) {
    echo 'Welcome back!';
  }
`}
```

#### Available PHP Components

- **Control Flow**: `PhpIf`, `PhpElse`, `PhpElseIf`, `PhpSwitch`, `PhpCase`, `PhpDefault`
- **Iteration**: `PhpFor`, `PhpWhile`, `PhpForeach`
- **Output**: `PhpEcho`, `PhpVar`
- **Include**: `PhpInclude`, `PhpRequire`
- **Comments**: `PhpComment`, `PhpLineComment`
- **Raw PHP**: `PhpRaw`, `php`, `echo` template literals

### Liquid Components

Import Shopify-compatible components:

```tsx
import {
  LiquidFor, LiquidIf, LiquidUnless, LiquidCase,
  LiquidObject, LiquidTag, LiquidComment, LiquidRaw
} from 'react-static-render/components/liquid';

// Usage examples
<LiquidIf condition="product.available">
  <LiquidFor item="variant" collection="product.variants">
    <div className="variant">
      <span><LiquidObject>variant.title</LiquidObject></span>
      <span><LiquidObject>variant.price | money</LiquidObject></span>
    </div>
  </LiquidFor>
</LiquidIf>
```

#### Available Liquid Components

- **Control Flow**: `LiquidIf`, `LiquidUnless`, `LiquidCase`
- **Iteration**: `LiquidFor`, `LiquidTablerow`
- **Template**: `LiquidComment`, `LiquidRaw`
- **Output**: `LiquidObject`, `LiquidTag`

## CLI Reference

### Commands

```bash
# Default command - render all entry points
react-static-render [files...] [options]

# Explicit render command (backward compatibility)
react-static-render render [files...] [options]

# Initialize configuration file
react-static-render init [--force]

# List all discovered entry points
react-static-render list [--config path]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--config` | `-c` | Configuration file path | Auto-discover |
| `--watch` | `-w` | Enable watch mode | false |
| `--live-reload` | `-l` | Enable live reload | false |
| `--port` | `-p` | WebSocket port | 8099 |
| `--output` | `-o` | Output directory | From config |
| `--verbose` | `-v` | Verbose logging | false |

### Examples

```bash
# Basic rendering
react-static-render

# Render specific files
react-static-render header.tsx footer.tsx

# Development mode with live reload
react-static-render --watch --live-reload --verbose

# Custom configuration
react-static-render --config custom.config.json

# Override output directory
react-static-render --output build/templates
```

## Watch Mode & Live Reload

### Smart Dependency Tracking

The watch mode uses intelligent dependency tracking:

- **Dependency Graph**: Builds complete file dependency maps
- **Smart Re-rendering**: Only re-renders affected entry points
- **Template Coordination**: Automatically detects template changes
- **Pattern Matching**: Configurable file watching patterns

### Live Reload Setup

Enable live reload in your templates by including the client script:

```html
<!-- Auto-generated live reload script -->
<script>
(function() {
  if (typeof window === 'undefined') return;
  
  let ws;
  let reconnectInterval = 1000;
  
  function connect() {
    ws = new WebSocket('ws://localhost:8099');
    
    ws.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'reload') {
          window.location.reload();
        }
      } catch (error) {
        console.warn('Invalid message from live reload server:', error);
      }
    };
    
    ws.onclose = function() {
      setTimeout(connect, reconnectInterval);
    };
    
    ws.onerror = function(error) {
      console.warn('WebSocket error:', error);
    };
  }
  
  connect();
})();
</script>
```

## Programmatic API

### Import Specific Engines

```typescript
// Import specific template engines
import { LiquidTemplateEngine } from 'react-static-render/engines/liquid';
import { PHPTemplateEngine } from 'react-static-render/engines/php';
import { BaseTemplateEngine } from 'react-static-render/engines/base';

// Create engine instances
const liquidEngine = new LiquidTemplateEngine({
  variableDelimiters: ['{{', '}}'],
  tagDelimiters: ['{%', '%}'],
  trimWhitespace: true
});

const phpEngine = new PHPTemplateEngine({
  shortTags: false
});

// Use engines programmatically
const result = await liquidEngine.merge(template, content, styles, mountInfo);
if (result.success) {
  console.log('Merged template:', result.data);
} else {
  console.error('Merge failed:', result.error.message);
}
```

### Available Exports

```typescript
// Main exports
import { Renderer, loadConfig, createConfig } from 'react-static-render';

// Template engines
import { LiquidTemplateEngine } from 'react-static-render/engines/liquid';
import { PHPTemplateEngine } from 'react-static-render/engines/php';

// Components
import * as LiquidComponents from 'react-static-render/components/liquid';
import * as PHPComponents from 'react-static-render/components/php';
```

### Basic Usage

```typescript
import { Renderer, loadConfig } from 'react-static-render';

// Load configuration
const configResult = await loadConfig();
if (!configResult.success) {
  throw new Error('Failed to load config');
}

// Create renderer
const renderer = new Renderer(configResult.data);

// Render all entry points
await renderer.renderAll();

// Render specific files
await renderer.render(['component1.tsx', 'component2.tsx']);
```

## Error Handling

The tool provides comprehensive error handling with detailed context:

### Error Types

- **Configuration Errors**: Invalid config files or options
- **Template Errors**: Template parsing or merging failures  
- **Render Errors**: React component rendering issues
- **File Errors**: Missing files or permission issues
- **Process Errors**: Worker process failures

### Error Information

Each error includes:
- **Error Code**: Categorized error identifier
- **File Path**: Specific file that caused the error
- **Cause Chain**: Original error context
- **Suggestions**: Helpful resolution hints

## Performance

### Optimization Features

- **Concurrent Processing**: Configurable worker process limits
- **Smart Caching**: Dependency-aware caching system
- **Process Isolation**: Prevents memory leaks and crashes
- **Incremental Rebuilds**: Only processes changed files
- **Hot Reloading**: Near-instant browser updates

### Performance Tuning

```json
{
  "maxConcurrentRenders": 8,
  "cacheEnabled": true,
  "patterns": ["src/entry-points/**/*"],
  "prettierConfig": false
}
```

## Use Cases

### Shopify Theme Development

Ideal for Shopify themes where React components integrate with Liquid templates.

### PHP Applications

Perfect for PHP-based applications requiring modern React components.

### Static Site Generation

Use for static sites that need React component rendering with template integration.

### Hybrid Applications

Combine React's component model with traditional server-side templating.

## Contributing

We welcome contributions! Please see our contributing guidelines for:

- Code style requirements
- Testing procedures  
- Pull request process
- Issue reporting

## License

MIT License - see LICENSE file for details.

---

**React Static Render** bridges the gap between modern React development and traditional template systems, enabling powerful hybrid applications with the best of both worlds.