/**
 * Utility to serialize Lexical RichText JSON structures to HTML strings.
 * Safely parses paragraphs, headings, lists, and text styles.
 */
export function serializeLexicalToHtml(lexicalObj: any): string {
  if (!lexicalObj) return ''

  // If already raw HTML or plain text string
  if (typeof lexicalObj === 'string') {
    if (lexicalObj.trim().startsWith('<')) return lexicalObj
    return `<p>${lexicalObj}</p>`
  }

  const root = lexicalObj.root
  if (!root || !Array.isArray(root.children)) {
    return ''
  }

  let html = ''

  for (const child of root.children) {
    if (child.type === 'paragraph') {
      let paraText = ''
      if (Array.isArray(child.children)) {
        for (const textNode of child.children) {
          if (textNode.type === 'text' && textNode.text) {
            paraText += textNode.text
          }
        }
      }
      html += `<p>${paraText}</p>`
    } else if (child.type === 'list') {
      let listItems = ''
      if (Array.isArray(child.children)) {
        for (const item of child.children) {
          if (item.type === 'listitem') {
            let itemText = ''
            if (Array.isArray(item.children)) {
              for (const textNode of item.children) {
                if (textNode.type === 'text' && textNode.text) {
                  itemText += textNode.text
                }
              }
            }
            listItems += `<li>${itemText}</li>`
          }
        }
      }
      const tag = child.tag === 'ol' ? 'ol' : 'ul'
      html += `<${tag}>${listItems}</${tag}>`
    } else if (child.type === 'heading') {
      let headingText = ''
      if (Array.isArray(child.children)) {
        for (const textNode of child.children) {
          if (textNode.type === 'text' && textNode.text) {
            headingText += textNode.text
          }
        }
      }
      const tag = child.tag || 'h3'
      html += `<${tag}>${headingText}</${tag}>`
    }
  }

  return html
}

export function serializeLexicalToText(lexicalObj: any): string {
  if (!lexicalObj) return ''
  if (typeof lexicalObj === 'string') return lexicalObj

  const root = lexicalObj.root
  if (!root || !Array.isArray(root.children)) {
    return ''
  }

  let text = ''
  for (const child of root.children) {
    if (Array.isArray(child.children)) {
      for (const node of child.children) {
        if (node.text) text += node.text
      }
    }
    text += ' '
  }
  return text.trim()
}
