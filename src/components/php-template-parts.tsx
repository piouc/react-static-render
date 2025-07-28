import React, { FunctionComponent, ReactNode } from 'react'

// Control Flow Components
type PhpIfProps = {
  condition: string
  children?: ReactNode
}
export const PhpIf: FunctionComponent<PhpIfProps> = ({ condition, children }) => {
  return (
    <>
      {`<?php if (${condition}) { ?>`}
      {children}
      {`<?php } ?>`}
    </>
  )
}

type PhpElseIfProps = {
  condition: string
  children?: ReactNode
}
export const PhpElseIf: FunctionComponent<PhpElseIfProps> = ({ condition, children }) => {
  return (
    <>
      {`<?php } elseif (${condition}) { ?>`}
      {children}
    </>
  )
}

type PhpElseProps = {
  children?: ReactNode
}
export const PhpElse: FunctionComponent<PhpElseProps> = ({ children }) => {
  return (
    <>
      {`<?php } else { ?>`}
      {children}
    </>
  )
}

type PhpSwitchProps = {
  variable: string
  children?: ReactNode
}
export const PhpSwitch: FunctionComponent<PhpSwitchProps> = ({ variable, children }) => {
  return (
    <>
      {`<?php switch (${variable}) { ?>`}
      {children}
      {`<?php } ?>`}
    </>
  )
}

type PhpCaseProps = {
  value: string
  children?: ReactNode
}
export const PhpCase: FunctionComponent<PhpCaseProps> = ({ value, children }) => {
  return (
    <>
      {`<?php case ${value}: ?>`}
      {children}
      {`<?php break; ?>`}
    </>
  )
}

type PhpDefaultProps = {
  children?: ReactNode
}
export const PhpDefault: FunctionComponent<PhpDefaultProps> = ({ children }) => {
  return (
    <>
      {`<?php default: ?>`}
      {children}
      {`<?php break; ?>`}
    </>
  )
}

// Iteration Components
type PhpForProps = {
  init: string
  condition: string
  increment: string
  children?: ReactNode
}
export const PhpFor: FunctionComponent<PhpForProps> = ({ init, condition, increment, children }) => {
  return (
    <>
      {`<?php for (${init}; ${condition}; ${increment}) { ?>`}
      {children}
      {`<?php } ?>`}
    </>
  )
}

type PhpWhileProps = {
  condition: string
  children?: ReactNode
}
export const PhpWhile: FunctionComponent<PhpWhileProps> = ({ condition, children }) => {
  return (
    <>
      {`<?php while (${condition}) { ?>`}
      {children}
      {`<?php } ?>`}
    </>
  )
}

type PhpForeachProps = {
  array: string
  variable: string
  keyVar?: string
  children?: ReactNode
}
export const PhpForeach: FunctionComponent<PhpForeachProps> = ({ array, variable, keyVar, children }) => {
  return (
    <>
      {keyVar 
        ? `<?php foreach (${array} as ${keyVar} => ${variable}) { ?>`
        : `<?php foreach (${array} as ${variable}) { ?>`
      }
      {children}
      {`<?php } ?>`}
    </>
  )
}


// Output Components
type PhpEchoProps = {
  value: string
  escape?: boolean
}
export const PhpEcho: FunctionComponent<PhpEchoProps> = ({ value, escape = false }) => (
  <>
    {escape 
      ? `<?php echo htmlspecialchars(${value}, ENT_QUOTES, 'UTF-8'); ?>`
      : `<?php echo ${value}; ?>`
    }
  </>
)

type PhpVarProps = {
  name: string
  value: string
}
export const PhpVar: FunctionComponent<PhpVarProps> = ({ name, value }) => (
  <>
    {`<?php ${name} = ${value}; ?>`}
  </>
)


// Include Components
type PhpIncludeProps = {
  file: string
  vars?: string
}
export const PhpInclude: FunctionComponent<PhpIncludeProps> = ({ file, vars }) => (
  <>
    {vars 
      ? `<?php include ${file}; ?>`
      : `<?php include '${file}'; ?>`
    }
  </>
)

type PhpRequireProps = {
  file: string
}
export const PhpRequire: FunctionComponent<PhpRequireProps> = ({ file }) => (
  <>
    {`<?php require '${file}'; ?>`}
  </>
)


// Comment Components
type PhpCommentProps = {
  children?: ReactNode
}
export const PhpComment: FunctionComponent<PhpCommentProps> = ({ children }) => (
  <>
    {`<?php /* `}
    {children}
    {` */ ?>`}
  </>
)

type PhpLineCommentProps = {
  comment: string
}
export const PhpLineComment: FunctionComponent<PhpLineCommentProps> = ({ comment }) => (
  <>
    {`<?php // ${comment} ?>`}
  </>
)

// Raw PHP Code
type PhpRawProps = {
  code: string
}
export const PhpRaw: FunctionComponent<PhpRawProps> = ({ code }) => (
  <>
    {`<?php ${code} ?>`}
  </>
)

export const php = (strings: TemplateStringsArray, ...placeholders: any[]) => {
  const code = strings.reduce((result, string, i) => {
    const placeholder = placeholders[i]
    const value = placeholder == null ? '' : String(placeholder)
    return result + string + value
  }, '')
  return `<?php ${code} ?>`
}

export const echo = (strings: TemplateStringsArray, ...placeholders: any[]) => {
  const code = strings.reduce((result, string, i) => {
    const placeholder = placeholders[i]
    const value = placeholder == null ? '' : String(placeholder)
    return result + string + value
  }, '')
  return `<?php echo ${code} ?>`
}

