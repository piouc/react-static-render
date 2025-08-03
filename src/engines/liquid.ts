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

// Helper function to extract Liquid variables from template
export function extractLiquidVariables(template: string): string[] {
  const regex = /\{\{\s*([^}]+?)\s*\}\}/g
  const variables: string[] = []
  let match
  
  while ((match = regex.exec(template)) !== null) {
    const variable = match[1]?.trim().split('|')[0]?.trim() // Remove filters
    if (variable && !variables.includes(variable)) {
      variables.push(variable)
    }
  }
  
  return variables
}

// Helper function to extract Liquid tags from template
export function extractLiquidTags(template: string): string[] {
  const regex = /\{%\s*([^%]+?)\s*%\}/g
  const tags: string[] = []
  let match
  
  while ((match = regex.exec(template)) !== null) {
    const tag = match[1]?.trim().split(' ')[0] // Get tag name only
    if (tag && !tags.includes(tag)) {
      tags.push(tag)
    }
  }
  
  return tags
}