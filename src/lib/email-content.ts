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
const PARAGRAPH_STYLE = 'margin:0 0 16px; font-size:15px; line-height:24px; color:#243142;'
const SMALL_TEXT_STYLE = 'margin:0; font-size:13px; line-height:20px; color:#64748b;'

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

  const blockHtml = blocks
    .map((block) => renderBlockHtml(block))
    .filter(Boolean)
    .join('\n')
    .trim()
  const htmlBody = blockHtml ? wrapEditorJsEmailHtml(blockHtml) : ''

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
      const style =
        level <= 2
          ? 'margin:0 0 18px; font-size:22px; line-height:30px; color:#0f172a; font-weight:700;'
          : 'margin:24px 0 12px; font-size:16px; line-height:24px; color:#0f172a; font-weight:700;'
      return `<h${level} style="${style}">${text}</h${level}>`
    }
    case 'paragraph':
      return `<p style="${PARAGRAPH_STYLE}">${String(block.data?.text || '')}</p>`
    case 'list': {
      const style = block.data?.style === 'ordered' ? 'ol' : 'ul'
      const listStyle = `margin:0 0 20px; padding-left:22px; font-size:15px; line-height:24px; color:#243142;`
      return `<${style} style="${listStyle}">${renderListHtml(block.data?.items)}</${style}>`
    }
    case 'quote': {
      const text = String(block.data?.text || '')
      const caption = String(block.data?.caption || '').trim()
      const captionHtml = caption ? `<footer style="${SMALL_TEXT_STYLE}">${caption}</footer>` : ''
      return `<blockquote style="margin:20px 0; padding:14px 18px; border-left:4px solid #0f3f6e; background:#f8fafc;"><p style="${PARAGRAPH_STYLE}">${text}</p>${captionHtml}</blockquote>`
    }
    case 'delimiter':
      return '<hr style="margin:24px 0; border:0; border-top:1px solid #d9e2ec;" />'
    case 'image': {
      const url = String(block.data?.file?.url || block.data?.url || '').trim()
      if (!url) return ''
      const caption = String(block.data?.caption || '').trim()
      const isLogo = isLaifappeLogoUrl(url)
      const width = isLogo ? 260 : 560
      const captionHtml = caption
        ? `<figcaption style="margin-top:8px; font-size:12px; line-height:18px; color:#64748b;">${caption}</figcaption>`
        : ''
      return `<figure style="margin:${isLogo ? '12px 0 14px' : '20px 0'};"><img src="${escapeAttribute(url)}" width="${width}" alt="${escapeAttribute(htmlToText(caption) || 'Email image')}" style="display:block; width:${width}px; max-width:100%; height:auto; border:0;" />${captionHtml}</figure>`
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
        return `<li style="margin:0 0 6px;">${item}</li>`
      }

      if (item && typeof item === 'object') {
        const content = String((item as { content?: unknown }).content || '')
        const nestedItems = (item as { items?: unknown }).items
        const nestedList = Array.isArray(nestedItems) && nestedItems.length
          ? `<ul style="margin:8px 0 0; padding-left:20px;">${renderListHtml(nestedItems)}</ul>`
          : ''
        return `<li style="margin:0 0 6px;">${content}${nestedList}</li>`
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

function wrapEditorJsEmailHtml(content: string) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0; padding:0; background:#ffffff;">
  <tr>
    <td align="left" style="padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px; margin:0; background:#ffffff;">
        <tr>
          <td style="padding:0 0 4px; font-family:Arial, Helvetica, sans-serif; color:#243142;">
            ${content}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

function isLaifappeLogoUrl(value: string) {
  return /\/logo2?\.png(?:$|\?)/i.test(value)
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
