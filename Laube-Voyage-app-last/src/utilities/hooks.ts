import type { CollectionBeforeChangeHook } from 'payload'

interface LexicalNode {
  children?: LexicalNode[]
  text?: string
  [key: string]: unknown
}

const manualSlugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
}

export const formatSlug =
  (fallback: string): CollectionBeforeChangeHook =>
  ({ data, operation }) => {
    if (operation === 'create' || (operation === 'update' && !data.slug)) {
      const value = data[fallback]
      if (value && typeof value === 'string') {
        return {
          ...data,
          slug: manualSlugify(value),
        }
      }
    }
    return data
  }

export const extractExcerpt =
  (contentField: string): CollectionBeforeChangeHook =>
  ({ data }) => {
    if (!data.excerpt && data[contentField]) {
      // Basic extraction from RichText or text
      // Payload 3 Lexical structure is complex, but we can try a simple text extraction
      try {
        const content = data[contentField]
        if (typeof content === 'string') {
          data.excerpt = content.substring(0, 160) + '...'
        } else if (content && typeof content === 'object' && 'root' in content) {
          // Attempt to extract text from Lexical JSON
          const root = (content as { root: { children: LexicalNode[] } }).root
          const text = root.children
            .map(
              (child: LexicalNode) =>
                child.children?.map((c: LexicalNode) => c.text).join('') || '',
            )
            .join(' ')
            .substring(0, 160)
          data.excerpt = text + '...'
        }
      } catch (e) {
        console.warn('Failed to auto-generate excerpt:', e)
      }
    }
    return data
  }
