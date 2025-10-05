# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `npm run build` - Compile TypeScript to JavaScript in `dist/`
- `npm run dev` - TypeScript watch mode for development
- `npm run prepublishOnly` - Pre-publish build step

### CLI Usage
- `react-static-render` - Render all entry points
- `react-static-render --watch --live-reload` - Development mode with file watching
- `react-static-render init` - Create configuration file
- `react-static-render list` - Show discovered entry points

## Project Architecture

### Core Structure
- **CLI**: `src/cli.ts` - Command line interface
- **Rendering**: `src/render.ts` - Core rendering logic
- **Template Engines**: `src/engines/` - PHP and Liquid template processing
- **Components**: `src/components/` - React components for template syntax
- **Configuration**: `src/config.ts` - Configuration handling with Zod validation

### Template Engine System
The project supports three template engines:
- **HTML Engine**: `src/engines/html.ts` - Plain HTML template integration (default)
- **PHP Engine**: `src/engines/php.ts` - PHP template integration
- **Liquid Engine**: `src/engines/liquid.ts` - Shopify/Jekyll Liquid templates

### Component Libraries
- **PHP Components**: `src/components/php-template-parts.tsx` - React components that render PHP syntax
- **Liquid Components**: `src/components/liquid-template-parts.tsx` - React components for Liquid templates

### Key Features
- **Watch Mode**: File system monitoring with dependency tracking (`src/watcher.ts`)
- **Live Reload**: WebSocket server for browser refresh (`src/websocket.ts`)
- **Process Isolation**: Worker processes for stable rendering (`src/worker.ts`)
- **Type Safety**: Full TypeScript support with strict configuration

## Configuration

Default configuration created by `react-static-render init`:
```json
{
  "entryPointDir": "src/entry-points",
  "outputDir": "dist",
  "templateDir": "templates",
  "templateEngine": "html",
  "templateExtension": ".html",
  "websocketPort": 3001,
  "defaultTemplate": "default.html"
}
```

Configuration should be placed in `react-static-render.config.json`

**Default Template**: When `defaultTemplate` is set, it will be used as a fallback when a specific template file is not found. The entry point's directory structure and filename are preserved in the output.

## TypeScript Configuration

- **Target**: ES2022 with NodeNext modules for full ESM support
- **Strict Mode**: Enabled with enhanced type checking options
- **Output**: `./dist` with source maps and declaration files
- **JSX**: React components with `jsx: "react"`

## Development Workflow

1. Run `npm run dev` for TypeScript watch mode
2. Use `react-static-render --watch --live-reload` for development
3. Test CLI functionality with local build artifacts
4. Build with `npm run build` before publishing

## Entry Points and Components

Entry point files export an object with:
```tsx
export default {
  node: <ReactComponent />,
  rootElementId: 'element-id'
}
```

Template components can be imported from:
- `react-static-render/components/php` - PHP template components
- `react-static-render/components/liquid` - Liquid template components

## Template Integration

All template engines (HTML, PHP, and Liquid) require `<div id="rootElementId"></div>` to exist in the template file. The engines will replace the content within this div with the rendered React component. If the div is not found, the build will fail with an error.