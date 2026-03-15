import { join, parse } from 'path'
import type { RenderConfig } from './config.js'

export interface ResolvedOutputPath {
  readonly outputPath: string
  readonly templateLookupPath: string
}

export function resolveOutputPath(filePath: string, config: RenderConfig): ResolvedOutputPath {
  const { dir, name } = parse(filePath)
  const outputExtension = config.templateExtension || '.html'
  const outputFilename = (config.outputFilename || '[name]').replace('[name]', name)
  return {
    outputPath: join(dir, `${outputFilename}${outputExtension}`),
    templateLookupPath: join(dir, `${name}${outputExtension}`)
  }
}
