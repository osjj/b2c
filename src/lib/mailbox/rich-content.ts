import { createHash } from 'node:crypto'
import juice from 'juice'
import { simpleParser, type Attachment, type ParsedMail } from 'mailparser'
import sanitizeHtml from 'sanitize-html'
import { MAX_RAW_MIME_BYTES } from './config'
import { MailboxError } from './errors'

export type MailboxInlineImage = { cid: string; filename: string; contentType: string; buffer: Buffer }
export type RichMailboxContent = {
  html: string | null
  previewHtml: string | null
  inlineImages: MailboxInlineImage[]
  hasRemoteImages: boolean
  omittedImages: number
}

const MAX_HTML_BYTES = 1024 * 1024
const MAX_INLINE_BYTES = 18 * 1024 * 1024
const MAX_INLINE_IMAGES = 100
const MAX_PREVIEW_BYTES = 32 * 1024 * 1024
const emptyContent = (): RichMailboxContent => ({ html: null, previewHtml: null, inlineImages: [], hasRemoteImages: false, omittedImages: 0 })

const color = /^(?:#[\da-f]{3,8}|[a-z]+|rgba?\(\s*[\d.%]+\s*,\s*[\d.%]+\s*,\s*[\d.%]+(?:\s*,\s*[\d.]+)?\s*\)|hsla?\(\s*[\d.]+\s*,\s*[\d.%]+\s*,\s*[\d.%]+(?:\s*,\s*[\d.]+)?\s*\))$/i
const length = /^(?:0|\d+(?:\.\d+)?(?:px|pt|pc|em|rem|%|in|cm|mm)|auto)$/i
const spacingToken = '(?:0|\\d+(?:\\.\\d+)?(?:px|pt|pc|em|rem|%|in|cm|mm)|auto)'
const spacing = new RegExp(`^${spacingToken}(?:\\s+${spacingToken}){0,3}$`, 'i')
const borderToken = '(?:\\d+(?:\\.\\d+)?(?:px|pt|em)|0|none|hidden|solid|dashed|dotted|double|groove|ridge|inset|outset|thin|medium|thick|#[\\da-f]{3,8}|[a-z]+)'
const border = new RegExp(`^${borderToken}(?:\\s+${borderToken}){0,2}$`, 'i')

// Every permitted property has a bounded value grammar. In particular, no URL,
// CSS escapes, variables, expressions, positioning, or active content survives.
const allowedStyles: NonNullable<sanitizeHtml.IOptions['allowedStyles']> = {
  '*': {
    color: [color], 'background-color': [color], background: [color],
    font: [/^[\p{L}\p{N}\s,.%'"/_-]+$/u], 'font-family': [/^[\p{L}\p{N}\s,'"_-]+$/u], 'font-size': [length, /^(?:xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger)$/],
    'font-weight': [/^(?:normal|bold|bolder|lighter|[1-9]00)$/], 'font-style': [/^(?:normal|italic|oblique)$/],
    'line-height': [length, /^(?:normal|\d+(?:\.\d+)?)$/], 'letter-spacing': [length, /^normal$/],
    'text-align': [/^(?:left|right|center|justify|start|end)$/], 'text-decoration': [/^(?:(?:none|underline|overline|line-through)\s*){1,3}$/],
    'text-transform': [/^(?:none|capitalize|uppercase|lowercase)$/], 'text-indent': [length],
    'vertical-align': [/^(?:baseline|middle|top|bottom|text-top|text-bottom|sub|super)$/],
    'white-space': [/^(?:normal|nowrap|pre|pre-wrap|pre-line|break-spaces)$/],
    'word-break': [/^(?:normal|break-all|keep-all|break-word)$/], 'overflow-wrap': [/^(?:normal|break-word|anywhere)$/],
    width: [length], height: [length], 'min-width': [length], 'max-width': [length, /^none$/], 'min-height': [length], 'max-height': [length, /^none$/],
    margin: [spacing], padding: [spacing],
    ...Object.fromEntries(['top', 'right', 'bottom', 'left'].flatMap(side => [
      [`margin-${side}`, [length]], [`padding-${side}`, [length]], [`border-${side}`, [border]],
      [`border-${side}-color`, [color]], [`border-${side}-width`, [length]], [`border-${side}-style`, [/^(?:none|hidden|solid|dashed|dotted|double|groove|ridge|inset|outset)$/]],
    ])),
    border: [border], 'border-color': [color], 'border-width': [spacing], 'border-style': [/^(?:(?:none|hidden|solid|dashed|dotted|double|groove|ridge|inset|outset)\s*){1,4}$/],
    'border-collapse': [/^(?:collapse|separate)$/], 'border-spacing': [spacing], 'border-radius': [spacing],
    'table-layout': [/^(?:auto|fixed)$/], display: [/^(?:none|block|inline|inline-block|table|table-row|table-cell|table-row-group|table-header-group|table-footer-group|list-item)$/],
    'list-style-type': [/^(?:none|disc|circle|square|decimal|lower-alpha|upper-alpha|lower-roman|upper-roman)$/],
    'list-style-position': [/^(?:inside|outside)$/], direction: [/^(?:ltr|rtl)$/],
  },
}

function normalizedCid(value: string): string | null {
  const cid = value.trim().replace(/^<([^<>]+)>$/, '$1')
  return cid && cid.length <= 998 && !/[<>\s\x00-\x1f\x7f]/.test(cid) ? cid : null
}

function imageExtension(attachment: Attachment): string | null {
  const bytes = attachment.content
  const type = attachment.contentType.toLowerCase()
  if (type === 'image/png' && bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png'
  if (type === 'image/jpeg' && bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg'
  if (type === 'image/gif' && /^(?:GIF87a|GIF89a)$/.test(bytes.subarray(0, 6).toString('ascii'))) return 'gif'
  if (type === 'image/webp' && bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp'
  return null
}

function remoteImageUrl(value: string): string | null {
  if (/[\x00-\x20\x7f\\]/.test(value)) return null
  const source = value.startsWith('//') ? `https:${value}` : value
  try {
    const url = new URL(source)
    return ['https:', 'http:'].includes(url.protocol) && url.hostname && !url.username && !url.password ? url.href : null
  } catch { return null }
}

function safeLinkUrl(value: string): string | null {
  if (/[\x00-\x20\x7f\\]/.test(value)) return null
  try {
    const url = new URL(value)
    if (['http:', 'https:'].includes(url.protocol)) return url.hostname && !url.username && !url.password ? url.href : null
    return ['mailto:', 'tel:'].includes(url.protocol) ? value : null
  } catch { return null }
}

function safeAttributes(attributes: Record<string, string>): Record<string, string> {
  const result = { ...attributes }
  for (const [name, value] of Object.entries(result)) {
    if (['width', 'height', 'cellpadding', 'cellspacing', 'border', 'hspace', 'vspace'].includes(name) && !/^\d{1,5}(?:\.\d+)?%?$/.test(value)) delete result[name]
    if (['colspan', 'rowspan', 'span', 'start', 'value'].includes(name) && !/^\d{1,4}$/.test(value)) delete result[name]
    if (['color', 'bgcolor'].includes(name) && !color.test(value)) delete result[name]
    if (name === 'align' && !/^(?:left|right|center|justify|char)$/.test(value)) delete result[name]
    if (name === 'valign' && !/^(?:top|middle|bottom|baseline)$/.test(value)) delete result[name]
    if (name === 'size' && !/^[+-]?[1-7]$/.test(value)) delete result[name]
    if (name === 'face' && !/^[\p{L}\p{N}\s,'"_-]+$/u.test(value)) delete result[name]
    if (name === 'dir' && !/^(?:ltr|rtl|auto)$/.test(value)) delete result[name]
  }
  return result
}

/** Parse original MIME in memory. No remote resource or filesystem loader is used. */
export async function readRichMailboxContent(rawMime: Uint8Array | null): Promise<RichMailboxContent> {
  if (!rawMime) return emptyContent()
  if (rawMime.byteLength > MAX_RAW_MIME_BYTES) throw new MailboxError('MESSAGE_TOO_LARGE', '原邮件超过 25 MiB，无法读取原邮件排版。', 413)
  let parsed: ParsedMail
  try { parsed = await simpleParser(Buffer.from(rawMime), { skipHtmlToText: true, skipTextToHtml: true, skipImageLinks: true }) }
  catch { throw new MailboxError('INVALID_MIME', '原邮件格式无法解析，请取消引用后重试。', 422) }
  if (!parsed.html) return emptyContent()
  if (Buffer.byteLength(parsed.html) > MAX_HTML_BYTES) throw new MailboxError('MAILBOX_HTML_TOO_LARGE', '原邮件 HTML 超过 1 MiB，请取消引用后重试。', 413)

  const attachments = new Map<string, Attachment | null>()
  for (const attachment of parsed.attachments) {
    const cid = normalizedCid(attachment.contentId || attachment.cid || '')
    if (cid) attachments.set(cid, attachments.has(cid) ? null : attachment)
  }
  const usedImages = new Map<string, MailboxInlineImage>()
  let inlineBytes = 0
  let omittedImages = 0
  let hasRemoteImages = false
  let inlined: string
  try {
    // Synchronous juice() only parses the supplied string. juiceResources(),
    // webResources, and remote CSS/image retrieval are deliberately not used.
    inlined = juice(parsed.html, { removeStyleTags: true, preserveMediaQueries: false, preserveFontFaces: false, preserveKeyFrames: false, applyAttributesTableElements: false, applyWidthAttributes: false, applyHeightAttributes: false })
  } catch { throw new MailboxError('INVALID_MAILBOX_HTML', '原邮件 HTML 样式无法解析，请取消引用后重试。', 422) }
  if (Buffer.byteLength(inlined) > MAX_HTML_BYTES) throw new MailboxError('MAILBOX_HTML_TOO_LARGE', '原邮件展开后的 HTML 超过 1 MiB，请取消引用后重试。', 413)

  const html = sanitizeHtml(inlined, {
    allowedTags: ['div', 'span', 'p', 'br', 'hr', 'a', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'ins', 'small', 'sub', 'sup', 'font', 'center', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'colgroup', 'col', 'img'],
    nonTextTags: ['style', 'script', 'textarea', 'option', 'iframe', 'object', 'embed', 'svg', 'math', 'head', 'form'],
    allowedAttributes: {
      '*': ['style', 'title', 'align', 'dir', 'lang'], a: ['href', 'title'], img: ['src', 'alt', 'width', 'height', 'hspace', 'vspace', 'border', 'align', 'title', 'style'],
      table: ['width', 'height', 'border', 'cellpadding', 'cellspacing', 'align', 'bgcolor', 'style'],
      td: ['colspan', 'rowspan', 'width', 'height', 'align', 'valign', 'bgcolor', 'style'], th: ['colspan', 'rowspan', 'width', 'height', 'align', 'valign', 'bgcolor', 'style'],
      tr: ['align', 'valign', 'bgcolor', 'style'], col: ['span', 'width', 'style'], colgroup: ['span', 'width', 'style'],
      font: ['face', 'color', 'size', 'style'], ol: ['start', 'style'], li: ['value', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'], allowedSchemesByTag: { img: ['http', 'https', 'cid'] }, allowProtocolRelative: false,
    allowedStyles,
    transformTags: {
      '*': (tagName, attribs) => {
        const attributes = safeAttributes(attribs)
        if (tagName === 'a' && attributes.href) {
          const href = safeLinkUrl(attributes.href)
          if (href) attributes.href = href
          else delete attributes.href
        }
        if (tagName === 'html' || tagName === 'body') {
          // Preserve inherited font/background styles when stripping document tags.
          if (attributes.bgcolor) attributes.style = `${attributes.style || ''};background-color:${attributes.bgcolor}`
          if (attributes.text && color.test(attributes.text)) attributes.style = `${attributes.style || ''};color:${attributes.text}`
          return { tagName: 'div', attribs: attributes }
        }
        if (tagName !== 'img') return { tagName, attribs: attributes }
        const source = (attributes.src || '').trim()
        let image: MailboxInlineImage | undefined
        if (/^cid:/i.test(source)) {
          let originalCid: string | null = null
          try { originalCid = normalizedCid(decodeURIComponent(source.slice(4))) } catch { /* Invalid CID stays omitted. */ }
          const attachment = originalCid ? attachments.get(originalCid) : undefined
          const extension = attachment ? imageExtension(attachment) : null
          if (attachment && extension) {
            const hash = createHash('sha256').update(attachment.content).digest('hex')
            // SMTP2GO inlines resolve cid:<filename>; archive MIME uses the same ID.
            const filename = `quote-${hash}.${extension}`
            image = usedImages.get(filename)
            if (!image) {
              if (usedImages.size >= MAX_INLINE_IMAGES) throw new MailboxError('MAILBOX_INLINE_IMAGE_LIMIT', '引用图片超过 100 张，请取消引用后重试。', 413)
              inlineBytes += attachment.content.length
              if (inlineBytes > MAX_INLINE_BYTES) throw new MailboxError('MAILBOX_INLINE_IMAGES_TOO_LARGE', '引用图片总计超过 18 MiB，请取消引用后重试。', 413)
              image = { cid: filename, filename, contentType: attachment.contentType.toLowerCase(), buffer: attachment.content }
              usedImages.set(filename, image)
            }
          }
          if (image) return { tagName, attribs: { ...attributes, src: `cid:${image.cid}` } }
        } else {
          const remote = remoteImageUrl(source)
          if (remote) { hasRemoteImages = true; return { tagName, attribs: { ...attributes, src: remote } } }
        }
        omittedImages += 1
        return { tagName, attribs: { ...attributes, src: '' } }
      },
    },
    exclusiveFilter: frame => frame.tag === 'img' && !frame.attribs.src,
  })
  let previewBytes = Buffer.byteLength(html)
  const inlineImages = [...usedImages.values()].filter(image => html.includes(`src="cid:${image.cid}"`))
  for (const image of inlineImages) {
    const original = `src="cid:${image.cid}"`
    const replacementBytes = `src="data:${image.contentType};base64,"`.length + Math.ceil(image.buffer.length / 3) * 4
    let offset = html.indexOf(original)
    while (offset !== -1) {
      previewBytes += replacementBytes - original.length
      if (previewBytes > MAX_PREVIEW_BYTES) throw new MailboxError('MAILBOX_PREVIEW_TOO_LARGE', '原邮件图片展开后的预览超过 32 MiB，请取消引用后重试。', 413)
      offset = html.indexOf(original, offset + original.length)
    }
  }
  let previewHtml = html
  for (const image of inlineImages) previewHtml = previewHtml.split(`src="cid:${image.cid}"`).join(`src="data:${image.contentType};base64,${image.buffer.toString('base64')}"`)
  return { html, previewHtml, inlineImages, hasRemoteImages, omittedImages }
}
