import type { JSX } from 'react'
import Image from 'next/image'
import { slugifyHeading } from '@/lib/blog-toc'
import { rewriteInternalAttributionLinksInHtml } from '@/lib/seo-links'
import styles from './blog-content-renderer.module.css'

interface Block {
  id?: string
  type: string
  data: Record<string, unknown>
}

interface ListItemObject {
  content?: string
  items?: ListItemObject[] | string[]
}

type ListItem = string | ListItemObject

interface EditorJSContent {
  time?: number
  version?: string
  blocks: Block[]
}

interface BlogContentRendererProps {
  content: EditorJSContent | null | undefined
}

const BLOG_LINK_SCOPE_CLASS = 'blog-prose content-link-scope'

export function BlogContentRenderer({ content }: BlogContentRendererProps) {
  if (!content?.blocks?.length) {
    return null
  }

  const usedHeadingIds = new Set<string>()

  return (
    <div className={`${BLOG_LINK_SCOPE_CLASS} ${styles.content}`}>
      {content.blocks.map((block, index) => {
        switch (block.type) {
          case 'header':
            return renderHeader(block, index, usedHeadingIds)
          case 'paragraph':
            return renderParagraph(block, index)
          case 'list':
            return renderList(block, index)
          case 'image':
            return renderImage(block, index)
          case 'delimiter':
            return renderDelimiter(block, index)
          case 'quote':
            return renderQuote(block, index)
          case 'table':
            return renderTable(block, index)
          default:
            return null
        }
      })}
    </div>
  )
}

function renderHeader(block: Block, index: number, usedIds: Set<string>) {
  const text = String(block.data.text ?? '')
  const level = block.data.level
  const headingLevel = Math.max(2, Math.min(4, Number(level) || 2))

  let id: string | undefined
  if (headingLevel === 2) {
    const base = slugifyHeading(text)
    if (base) {
      id = base
      let suffix = 2
      while (usedIds.has(id)) {
        id = `${base}-${suffix++}`
      }
      usedIds.add(id)
    }
  }

  const key = block.id || `h-${index}`

  if (headingLevel === 2) {
    return (
      <h2
        key={key}
        id={id}
        dangerouslySetInnerHTML={{ __html: rewriteInternalAttributionLinksInHtml(text) }}
      />
    )
  }

  if (headingLevel === 3) {
    return (
      <h3
        key={key}
        dangerouslySetInnerHTML={{ __html: rewriteInternalAttributionLinksInHtml(text) }}
      />
    )
  }

  return (
    <h4
      key={key}
      dangerouslySetInnerHTML={{ __html: rewriteInternalAttributionLinksInHtml(text) }}
    />
  )
}

function renderParagraph(block: Block, index: number) {
  return (
    <p
      key={block.id || `p-${index}`}
      dangerouslySetInnerHTML={{
        __html: rewriteInternalAttributionLinksInHtml(String(block.data.text ?? '')),
      }}
    />
  )
}

function renderList(block: Block, index: number) {
  const style = block.data.style
  const items = (block.data.items as ListItem[]) || []
  const Tag = style === 'ordered' ? 'ol' : 'ul'

  const renderItems = (listItems: ListItem[]): JSX.Element[] => {
    return listItems.map((item, idx) => {
      const content = typeof item === 'string' ? item : item.content || ''
      const nestedItems =
        typeof item === 'object' && Array.isArray(item.items) && item.items.length > 0
          ? (item.items as ListItem[])
          : null

      return (
        <li key={idx}>
          <span
            dangerouslySetInnerHTML={{
              __html: rewriteInternalAttributionLinksInHtml(content),
            }}
          />
          {nestedItems && <Tag>{renderItems(nestedItems)}</Tag>}
        </li>
      )
    })
  }

  return (
    <Tag key={block.id || `l-${index}`}>
      {renderItems(items)}
    </Tag>
  )
}

function renderImage(block: Block, index: number) {
  const file = block.data.file as { url?: string } | undefined
  const caption = (block.data.caption as string | undefined) || ''
  const stretched = Boolean(block.data.stretched)
  const withBorder = Boolean(block.data.withBorder)
  const withBackground = Boolean(block.data.withBackground)
  const url = file?.url || (block.data.url as string | undefined)

  if (!url || typeof url !== 'string' || !url.trim()) return null
  const trimmedUrl = url.trim()

  const isValidUrl =
    trimmedUrl.startsWith('/') ||
    trimmedUrl.startsWith('http://') ||
    trimmedUrl.startsWith('https://') ||
    trimmedUrl.startsWith('data:')
  if (!isValidUrl) return null

  const hasCaption = caption && caption.replace(/<br\s*\/?>/gi, '').trim().length > 0

  return (
    <figure
      key={block.id || `i-${index}`}
      className={styles.figure}
      data-stretched={stretched || undefined}
      data-with-background={withBackground || undefined}
    >
      <div
        className={styles.figureImage}
        data-with-border={withBorder || undefined}
      >
        <Image
          src={trimmedUrl}
          alt={hasCaption ? caption : 'Article illustration'}
          width={1200}
          height={800}
          sizes="(max-width: 768px) 94vw, 800px"
        />
      </div>
      {hasCaption && (
        <figcaption
          dangerouslySetInnerHTML={{
            __html: rewriteInternalAttributionLinksInHtml(caption),
          }}
        />
      )}
    </figure>
  )
}

function renderDelimiter(block: Block, index: number) {
  return (
    <div key={block.id || `d-${index}`} className={styles.delimiter} aria-hidden="true" />
  )
}

function renderTable(block: Block, index: number) {
  const rawRows = block.data.content
  if (!Array.isArray(rawRows) || rawRows.length === 0) return null

  const rows = rawRows.filter((row): row is string[] => Array.isArray(row))
  if (rows.length === 0) return null

  const withHeadings = block.data.withHeadings !== false
  const [headerRow, ...bodyRows] = rows

  return (
    <div
      key={block.id || `t-${index}`}
      className={styles.tableFrame}
      role="group"
      aria-label="Article table"
      tabIndex={0}
    >
      <table>
        {withHeadings && headerRow ? (
          <thead>
            <tr>
              {headerRow.map((cell, idx) => (
                <th
                  key={idx}
                  scope="col"
                  dangerouslySetInnerHTML={{
                    __html: rewriteInternalAttributionLinksInHtml(cell),
                  }}
                />
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {(withHeadings ? bodyRows : rows).map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  dangerouslySetInnerHTML={{
                    __html: rewriteInternalAttributionLinksInHtml(cell),
                  }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderQuote(block: Block, index: number) {
  const text = String(block.data.text ?? '')
  const caption = (block.data.caption as string | undefined) || ''
  const alignment = block.data.alignment as string | undefined

  return (
    <blockquote
      key={block.id || `q-${index}`}
      className={styles.quote}
      data-alignment={alignment === 'center' ? 'center' : undefined}
    >
      <p
        dangerouslySetInnerHTML={{ __html: rewriteInternalAttributionLinksInHtml(text) }}
      />
      {caption && (
        <cite>
          — {caption}
        </cite>
      )}
    </blockquote>
  )
}
