import type { MountInfo } from '../config.js'

export interface MergeContext {
  readonly template: string
  readonly content: string
  readonly styles: string
  readonly mountInfo: MountInfo
}

export async function mergeLiquidTemplate(
  context: MergeContext
): Promise<string> {
  const { template, content, styles, mountInfo } = context
  
  if (!template) {
    throw new Error('Template content is required')
  }
  
  if (!content) {
    throw new Error('Rendered content is required')
  }
  
  if (!mountInfo?.rootElementId) {
    throw new Error('Mount info with rootElementId is required')
  }
  
  // Replace the content in the root element with styles + content
  const divRegex = new RegExp(
    `<div\\s+id=["']${escapeRegex(mountInfo.rootElementId)}["'][^>]*>.*?</div>`,
    'is'
  )
  
  if (divRegex.test(template)) {
    return template.replace(divRegex, (match) => {
      const openTagMatch = match.match(/^<div[^>]*>/i)
      if (openTagMatch) {
        return `${openTagMatch[0]}${styles}${content}</div>`
      }
      return match
    })
  }
  
  throw new Error(`No div with id="${mountInfo.rootElementId}" found in template`)
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

