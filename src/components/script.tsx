import React from 'react'

type ScriptProps<T extends any[] = any[]> = {
  fn: (...args: T) => void
} & (
  T extends [] ? {
    args?: T
  } : {
    args: T
  }
)

export const Script = <T extends any[]>({fn, args}: ScriptProps<T>) => {
  const js = `
    (${fn.toString()}).apply(null, ${JSON.stringify(args ?? [])})
  `
  return <script dangerouslySetInnerHTML={{__html: `window.addEventListener('DOMContentLoaded', () => {${js}})`}}></script>
}