import type { BlogContentRenderer } from '@/components/store/blog/blog-content-renderer'
import type { EditorJSData } from './content-editor'

const INLINE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'MARK', 'BR', 'CODE', 'SUB', 'SUP', 'A'])
const OMITTED_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE'])
const IMAGE_URL_BASE = 'https://preview.invalid'
const RASTER_DATA_URL = /^data:image\/(?:png|jpe?g|webp|gif|avif|bmp|x-icon);base64,[a-z0-9+/]+={0,2}$/i

// Parse into an inert template so discarded elements cannot load subresources.
export function sanitizeInline(value: unknown): string {
  if (typeof value !== 'string') return ''
  const template = document.createElement('template')
  template.innerHTML = value
  const result = document.createElement('div')

  const copyChildren = (source: Node, destination: Node) => {
    for (const child of source.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        destination.appendChild(document.createTextNode(child.textContent ?? ''))
      } else if (child instanceof Element && !OMITTED_TAGS.has(child.tagName)) {
        if (!INLINE_TAGS.has(child.tagName)) {
          copyChildren(child, destination)
          continue
        }
        const safeElement = document.createElement(child.tagName.toLowerCase())
        if (child.tagName === 'A') {
          const href = child.getAttribute('href')
          if (href) {
            try {
              const url = new URL(href, window.location.href)
              if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
                safeElement.setAttribute('href', href)
                safeElement.setAttribute('rel', 'noopener noreferrer')
              }
            } catch {
              // Invalid draft links remain visible as text.
            }
          }
        }
        copyChildren(child, safeElement)
        destination.appendChild(safeElement)
      }
    }
  }

  copyChildren(template.content, result)
  return result.innerHTML
}

interface PreviewListItem {
  content: string
  items: PreviewListItem[]
}

export function sanitizeListItems(value: unknown, depth = 0): PreviewListItem[] {
  if (!Array.isArray(value) || depth > 20) return []
  return value.map((item: unknown) => {
    if (typeof item === 'string') return { content: sanitizeInline(item), items: [] }
    if (item && typeof item === 'object' && 'content' in item) {
      return {
        content: sanitizeInline(item.content),
        items: sanitizeListItems('items' in item ? item.items : [], depth + 1),
      }
    }
    return { content: '', items: [] }
  })
}

export function getPreviewImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return
  const src = value.trim()
  if (RASTER_DATA_URL.test(src)) return `data:${src.slice(5)}`

  try {
    if (src.startsWith('/') && !src.startsWith('//')) {
      const url = new URL(src, IMAGE_URL_BASE)
      if (url.origin === IMAGE_URL_BASE && !url.pathname.startsWith('//')) {
        return `${url.pathname}${url.search}${url.hash}`
      }
    } else if (/^https?:\/\//i.test(src)) {
      const url = new URL(src)
      if (!url.username && !url.password) return url.href
    }
  } catch {
    // Invalid image sources are omitted from the preview.
  }
}

type BlogPreviewContent = NonNullable<Parameters<typeof BlogContentRenderer>[0]['content']>

export function prepareBlogPreviewContent(content: EditorJSData): BlogPreviewContent {
  const blocks = content.blocks.flatMap((block, index): BlogPreviewContent['blocks'] => {
    const data: Record<string, unknown> = block.data ?? {}
    const base = { id: block.id || `preview-block-${index}`, type: block.type }

    switch (block.type) {
      case 'header': {
        const level = typeof data.level === 'number' || typeof data.level === 'string' ? data.level : undefined
        return [{ ...base, data: { text: sanitizeInline(data.text), level } }]
      }
      case 'paragraph':
        return [{ ...base, data: { text: sanitizeInline(data.text) } }]
      case 'quote':
        return [{ ...base, data: {
          text: sanitizeInline(data.text),
          caption: typeof data.caption === 'string' ? data.caption : '',
          alignment: data.alignment,
        } }]
      case 'list':
        return [{ ...base, data: { style: data.style, items: sanitizeListItems(data.items) } }]
      case 'table': {
        const rows = Array.isArray(data.content) ? data.content.filter(Array.isArray) : []
        return [{ ...base, data: {
          withHeadings: data.withHeadings,
          content: rows.map((row) => row.map(sanitizeInline)),
        } }]
      }
      case 'image': {
        const fileUrl = data.file && typeof data.file === 'object' && 'url' in data.file ? data.file.url : undefined
        const url = getPreviewImageUrl(fileUrl) ?? getPreviewImageUrl(data.url)
        if (!url) return []
        return [{ ...base, data: {
          file: { url },
          caption: sanitizeInline(data.caption),
          stretched: data.stretched,
          withBorder: data.withBorder,
          withBackground: data.withBackground,
        } }]
      }
      case 'delimiter':
        return [{ ...base, data: {} }]
      default:
        return []
    }
  })

  return { ...content, blocks }
}
