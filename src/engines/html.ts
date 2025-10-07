import type { MergeContext } from './liquid.js'

export async function mergeHTMLTemplate(
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
  
  throw new Error(`Could not find <div id="${mountInfo.rootElementId}"> in template`)
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
