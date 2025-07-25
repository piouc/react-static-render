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
- **Entry Point**: `src/index.ts` - Main library exports
- **CLI**: `src/cli.ts` - Command line interface
- **Rendering**: `src/render.ts` - Core rendering logic
- **Template Engines**: `src/engines/` - PHP and Liquid template processing
- **Components**: `src/components/` - React components for template syntax
- **Configuration**: `src/config.ts` - Configuration handling with Joi validation

### Template Engine System
The project uses a plugin-based template engine architecture:
- **Base Engine**: `src/engines/base.ts` - Abstract template engine interface
- **PHP Engine**: `src/engines/php.ts` - PHP template integration
- **Liquid Engine**: `src/engines/liquid.ts` - Shopify/Jekyll Liquid templates
- **Auto-detection**: Engines selected based on file extensions

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
  "entryPointsBase": "src/entry-points",
  "outputDir": "dist",
  "templateEngine": "auto"
}
```

Configuration can be placed in:
1. `react-static-render.config.json`
2. `package.json` under `reactStaticRender` key

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

The system intelligently merges React-rendered HTML into existing templates by:
1. Replacing content in `<div id="rootElementId">`
2. Using template-specific insertion points (PHP comments, Liquid includes)
3. Inserting before `</body>` as fallback
4. Appending to end of file if no insertion point found