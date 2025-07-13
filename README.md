# react-static-render

React components to static HTML with template engine support (PHP, Liquid).

## Installation

```bash
npm install -g react-static-render
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

Create `react-static-render.config.json`:

```json
{
  "entryPointsBase": "src/entry-points",
  "srcBase": "src",
  "outputDir": "dist",
  "templateDir": "src/templates",
  "templateEngine": "auto",
  "templateEngines": {
    "php": {
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

## Programmatic API

```typescript
import { Renderer, loadConfig } from 'react-static-render';
import { LiquidTemplateEngine } from 'react-static-render/engines/liquid';
import { PHPTemplateEngine } from 'react-static-render/engines/php';

const config = await loadConfig();
const renderer = new Renderer(config.data);
await renderer.renderAll();
```

## License

MIT