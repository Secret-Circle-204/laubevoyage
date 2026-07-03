import React from 'react'

interface LexicalNode {
  type?: string
  text?: string
  format?: number | string
  children?: LexicalNode[]
  tag?: string
  listType?: string
  url?: string
  fields?: {
    url?: string
  }
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
}

// Recursive renderer for Lexical RichText content
export const SimpleRichText = ({
  content,
}: {
  content: LexicalNode | LexicalNode[] | { root: { children: LexicalNode[] } } | string | null | undefined
}) => {
  if (!content) return null
  if (typeof content === 'string') return <p>{content}</p>

  const nodes = Array.isArray(content)
    ? content
    : content && typeof content === 'object' && 'root' in content
      ? content.root.children
      : content && typeof content === 'object' && 'children' in content
        ? content.children
        : []

  if (!Array.isArray(nodes) || nodes.length === 0) return null

  return (
    <>
      {nodes.map((node: LexicalNode, i: number) => (
        <RenderNode key={i} node={node} />
      ))}
    </>
  )
}

function RenderNode({ node }: { node: LexicalNode }) {
  if (!node) return null

  // Text leaf node
  if (node.type === 'text' || (!node.type && node.text !== undefined)) {
    return <RenderTextLeaf node={node} />
  }

  // Linebreak
  if (node.type === 'linebreak') return <br />

  // Get rendered children
  const children = node.children?.length
    ? node.children.map((child: LexicalNode, i: number) => <RenderNode key={i} node={child} />)
    : null

  // Heading
  if (node.type === 'heading') {
    const tag = node.tag || 'h2'
    switch (tag) {
      case 'h1':
        return <h1 className="font-bold mt-6 mb-3 text-3xl">{children}</h1>
      case 'h2':
        return <h2 className="font-bold mt-6 mb-3 text-2xl">{children}</h2>
      case 'h3':
        return <h3 className="font-bold mt-6 mb-3 text-xl">{children}</h3>
      case 'h4':
        return <h4 className="font-bold mt-5 mb-2 text-lg">{children}</h4>
      case 'h5':
        return <h5 className="font-bold mt-4 mb-2">{children}</h5>
      case 'h6':
        return <h6 className="font-bold mt-4 mb-2">{children}</h6>
      default:
        return <h2 className="font-bold mt-6 mb-3 text-2xl">{children}</h2>
    }
  }

  // Paragraph
  if (node.type === 'paragraph') {
    return <p className="mb-4 last:mb-0">{children}</p>
  }

  // List (ul / ol)
  if (node.type === 'list') {
    if (node.listType === 'number') {
      return <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
    }
    if (node.listType === 'check') {
      return <ul className="pl-2 mb-4 space-y-2">{children}</ul>
    }
    return <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
  }

  // List item
  if (node.type === 'listitem') {
    return <li>{children}</li>
  }

  // Link
  if (node.type === 'link') {
    const url = node.fields?.url || node.url || '#'
    return (
      <a
        href={url}
        className="text-accent underline hover:text-primary transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    )
  }

  // Quote / blockquote
  if (node.type === 'quote') {
    return (
      <blockquote className="border-l-4 border-accent/40 pl-4 italic text-gray/70 mb-4">
        {children}
      </blockquote>
    )
  }

  // Horizontal rule
  if (node.type === 'horizontalrule') {
    return <hr className="my-6 border-gray/20" />
  }

  // Fallback: render children if they exist
  if (children) return <>{children}</>

  return null
}

function RenderTextLeaf({ node }: { node: LexicalNode }) {
  let el: React.ReactNode = node.text || ''

  if (node.format !== undefined && node.format !== null && node.format !== '') {
    // Lexical uses bitmask for format: 1=bold, 2=italic, 4=strikethrough, 8=underline, 16=code, 32=subscript, 64=superscript
    const format = typeof node.format === 'number' ? node.format : Number(node.format) || 0

    if (format & 1) el = <strong className="font-bold text-dark dark:text-white/80">{el}</strong>
    if (format & 2) el = <em>{el}</em>
    if (format & 4) el = <s>{el}</s>
    if (format & 8) el = <u>{el}</u>
    if (format & 16)
      el = (
        <code className="bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-sm font-mono">
          {el}
        </code>
      )
    if (format & 32) el = <sub>{el}</sub>
    if (format & 64) el = <sup>{el}</sup>
  }

  // Legacy format support
  if (node.bold) el = <strong className="font-bold text-dark dark:text-white/80">{el}</strong>
  if (node.italic) el = <em>{el}</em>
  if (node.underline) el = <u>{el}</u>
  if (node.strikethrough) el = <s>{el}</s>
  if (node.code)
    el = (
      <code className="bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-sm font-mono">
        {el}
      </code>
    )

  return <>{el}</>
}
