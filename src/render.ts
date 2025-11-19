import { join } from 'path'
import { glob } from 'glob'
import { execa } from 'execa'
import { 
  RenderError,
  type RenderConfig, 
  type RenderResult
} from './config.js'

function getDefaultWorkerPath(): string {
  const currentFileUrl = new URL(import.meta.url)
  const currentDir = new URL('.', currentFileUrl)
  const workerUrl = new URL('worker.js', currentDir)
  return workerUrl.pathname
}

export async function renderFile(
  filePath: string, 
  config: RenderConfig
): Promise<RenderResult<string>> {
  const workerPath = getDefaultWorkerPath()
  
  try {
    await execa('node', [
      workerPath,
      filePath,
      JSON.stringify(config)
    ], {
      stdio: ['inherit', 'inherit', 'pipe'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_PATH: process.cwd() + '/node_modules'
      }
    })
    
    const outputPath = join(config.outputDir, filePath)
    
    return {
      success: true,
      data: outputPath,
      outputPath
    }
    
  } catch (processError: unknown) {
    const err = processError as { stderr?: string, exitCode?: number }
    let errorMessage = err.stderr?.trim() || 'Render process failed'

    if (errorMessage) {
      const lines = errorMessage.split('\n')
      const filteredLines = lines.filter(line => {
        const trimmed = line.trim()
        if (trimmed === 'Failed to load module') return false
        if (trimmed === 'Failed to render React component') return false
        if (trimmed.startsWith('File:')) return false
        if (trimmed.startsWith('code:')) return false
        if (trimmed.startsWith('url:')) return false
        if (trimmed === '}') return false
        return true
      })
      errorMessage = filteredLines.join('\n').trim()
    }

    const error = new RenderError(
      errorMessage,
      err.exitCode ? 'PROCESS_EXIT_ERROR' : 'PROCESS_SPAWN_ERROR',
      filePath
    )

    return {
      success: false,
      error
    }
  }
}

export async function findEntryPoints(
  config: RenderConfig
): Promise<readonly string[]> {
  const extensions = config.fileExtensions || ['js', 'jsx', 'ts', 'tsx']
  const pattern = `**/*.{${extensions.join(',')}}`
  
  try {
    const files = await glob(pattern, {
      cwd: config.entryPointDir,
      nodir: true
    })
    
    return Object.freeze(files)
  } catch (error) {
    if (config.verbose) {
      console.warn('Failed to find entry points:', error)
    }
    return Object.freeze([])
  }
}