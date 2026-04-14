import type { OutputData } from '@editorjs/editorjs'

type EditorBlock = NonNullable<OutputData['blocks']>[number]

const HTML_ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

export function htmlToText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|ul|ol|blockquote|h[1-6])>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function editorJsToEmailContent(content: OutputData | null | undefined) {
  const blocks = content?.blocks ?? []

  const htmlBody = blocks
    .map((block) => renderBlockHtml(block))
    .filter(Boolean)
    .join('\n')
    .trim()

  const textBody = blocks
    .map((block) => renderBlockText(block))
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return {
    htmlBody,
    textBody,
  }
}

function renderBlockHtml(block: EditorBlock) {
  switch (block.type) {
    case 'header': {
      const level = clampHeadingLevel(Number(block.data?.level) || 2)
      const text = String(block.data?.text || '')
      return `<h${level}>${text}</h${level}>`
    }
    case 'paragraph':
      return `<p>${String(block.data?.text || '')}</p>`
    case 'list': {
      const style = block.data?.style === 'ordered' ? 'ol' : 'ul'
      return `<${style}>${renderListHtml(block.data?.items)}</${style}>`
    }
    case 'quote': {
      const text = String(block.data?.text || '')
      const caption = String(block.data?.caption || '').trim()
      const captionHtml = caption ? `<footer>${caption}</footer>` : ''
      return `<blockquote><p>${text}</p>${captionHtml}</blockquote>`
    }
    case 'delimiter':
      return '<hr />'
    case 'image': {
      const url = String(block.data?.file?.url || block.data?.url || '').trim()
      if (!url) return ''
      const caption = String(block.data?.caption || '').trim()
      const captionHtml = caption ? `<figcaption>${caption}</figcaption>` : ''
      return `<figure><img src="${escapeAttribute(url)}" alt="${escapeAttribute(htmlToText(caption) || 'Email image')}" />${captionHtml}</figure>`
    }
    default:
      return ''
  }
}

function renderBlockText(block: EditorBlock) {
  switch (block.type) {
    case 'header':
      return htmlToText(String(block.data?.text || ''))
    case 'paragraph':
      return htmlToText(String(block.data?.text || ''))
    case 'list':
      return renderListText(block.data?.items)
    case 'quote': {
      const text = htmlToText(String(block.data?.text || ''))
      const caption = htmlToText(String(block.data?.caption || ''))
      return caption ? `${text}\n- ${caption}` : text
    }
    case 'delimiter':
      return '---'
    case 'image': {
      const url = String(block.data?.file?.url || block.data?.url || '').trim()
      const caption = htmlToText(String(block.data?.caption || ''))
      if (caption && url) return `${caption}\n${url}`
      return caption || url
    }
    default:
      return ''
  }
}

function renderListHtml(items: unknown): string {
  if (!Array.isArray(items)) return ''

  return items
    .map((item) => {
      if (typeof item === 'string') {
        return `<li>${item}</li>`
      }

      if (item && typeof item === 'object') {
        const content = String((item as { content?: unknown }).content || '')
        const nestedItems = (item as { items?: unknown }).items
        const nestedList = Array.isArray(nestedItems) && nestedItems.length
          ? `<ul>${renderListHtml(nestedItems)}</ul>`
          : ''
        return `<li>${content}${nestedList}</li>`
      }

      return ''
    })
    .join('')
}

function renderListText(items: unknown, depth = 0): string {
  if (!Array.isArray(items)) return ''

  return items
    .map((item, index) => {
      const prefix = `${'  '.repeat(depth)}${index + 1}. `

      if (typeof item === 'string') {
        return `${prefix}${htmlToText(item)}`
      }

      if (item && typeof item === 'object') {
        const content = htmlToText(String((item as { content?: unknown }).content || ''))
        const nestedItems = (item as { items?: unknown }).items
        const nestedText =
          Array.isArray(nestedItems) && nestedItems.length
            ? `\n${renderListText(nestedItems, depth + 1)}`
            : ''
        return `${prefix}${content}${nestedText}`
      }

      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function clampHeadingLevel(value: number) {
  if (value < 1) return 1
  if (value > 6) return 6
  return value
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (entity) => HTML_ENTITY_MAP[entity] || entity)
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
