import React, { FunctionComponent, ReactNode } from 'react'

// Control Flow Components
type LiquidIfProps = {
  condition: string
  children?: ReactNode
}
export const LiquidIf: FunctionComponent<LiquidIfProps> = ({ condition, children }) => (
  <>
    {`{% if ${condition} %}`}
    {children}
    {`{% endif %}`}
  </>
)

type LiquidUnlessProps = {
  condition: string
  children?: ReactNode
}
export const LiquidUnless: FunctionComponent<LiquidUnlessProps> = ({ condition, children }) => (
  <>
    {`{% unless ${condition} %}`}
    {children}
    {`{% endunless %}`}
  </>
)

type LiquidCaseProps = {
  condition: string
  children?: ReactNode
}
export const LiquidCase: FunctionComponent<LiquidCaseProps> = ({ condition, children }) => (
  <>
    {`{% case ${condition} %}`}
      {children}
    {`{% endcase %}`}
  </>
)

// Iteration Components
type LiquidForProps = {
  item: string
  collection: string
  children?: ReactNode
}
export const LiquidFor: FunctionComponent<LiquidForProps> = ({ item, collection, children }) => (
  <>
    {`{% for ${item} in ${collection} %}`}
    {children}
    {`{% endfor %}`}
  </>
)

type LiquidTablerowProps = {
  item: string
  collection: string
  children?: ReactNode
}
export const LiquidTablerow: FunctionComponent<LiquidTablerowProps> = ({ item, collection, children }) => (
  <>
    {`{% tablerow ${item} in ${collection} %}`}
    {children}
    {`{% endtablerow %}`}
  </>
)

// Template Components
type LiquidCommentProps = {
  children?: ReactNode
}
export const LiquidComment: FunctionComponent<LiquidCommentProps> = ({ children }) => (
  <>
    {`{% comment %}`}
    {children}
    {`{% endcomment %}`}
  </>
)

type LiquidRawProps = {
  children?: ReactNode
}
export const LiquidRaw: FunctionComponent<LiquidRawProps> = ({ children }) => (
  <>
    {`{% raw %}`}
    {children}
    {`{% endraw %}`}
  </>
)

type LiquidObjectProps = {
  children?: string
}
export const LiquidObject: FunctionComponent<LiquidObjectProps> = ({ children }) => (
  <>
    {`{{ ${children || ''} }}`}
  </>
)

type LiquidTagProps = {
  children?: string
}
export const LiquidTag: FunctionComponent<LiquidTagProps> = ({ children }) => (
  <>
    {`{% ${children || ''} %}`}
  </>
)