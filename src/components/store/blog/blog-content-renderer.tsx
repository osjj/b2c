import type { JSX } from 'react'
import Image from 'next/image'
import { slugifyHeading } from '@/lib/blog-toc'

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
    <div className={BLOG_LINK_SCOPE_CLASS}>
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
        className="scroll-mt-28 font-serif text-2xl sm:text-3xl leading-tight mt-14 mb-5 text-foreground"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    )
  }

  if (headingLevel === 3) {
    return (
      <h3
        key={key}
        className="font-serif text-xl sm:text-2xl leading-snug mt-10 mb-4 text-foreground"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    )
  }

  return (
    <h4
      key={key}
      className="font-sans font-semibold text-lg mt-8 mb-3 text-foreground"
      dangerouslySetInnerHTML={{ __html: text }}
    />
  )
}

function renderParagraph(block: Block, index: number) {
  return (
    <p
      key={block.id || `p-${index}`}
      className="my-5 text-base leading-[1.85] text-foreground/85"
      dangerouslySetInnerHTML={{ __html: String(block.data.text ?? '') }}
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
        <li key={idx} className="mb-2 leading-[1.85]">
          <span dangerouslySetInnerHTML={{ __html: content }} />
          {nestedItems && <Tag className="mt-2 ml-2">{renderItems(nestedItems)}</Tag>}
        </li>
      )
    })
  }

  const listClass =
    style === 'ordered'
      ? 'my-5 list-decimal pl-6 text-foreground/85 marker:text-primary marker:font-semibold'
      : 'my-5 list-disc pl-6 text-foreground/85 marker:text-primary'

  return (
    <Tag key={block.id || `l-${index}`} className={listClass}>
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
      className={`my-10 ${stretched ? 'w-full' : ''} ${
        withBackground ? 'bg-muted p-4 rounded-xl' : ''
      }`}
    >
      <div
        className={`relative overflow-hidden ${
          withBorder ? 'border rounded-xl' : 'rounded-xl'
        } shadow-sm`}
      >
        <Image
          src={trimmedUrl}
          alt={hasCaption ? caption : 'Article illustration'}
          width={1200}
          height={800}
          className="w-full h-auto object-cover"
          sizes="(max-width: 768px) 100vw, 800px"
        />
      </div>
      {hasCaption && (
        <figcaption
          className="text-center text-sm italic text-muted-foreground mt-3"
          dangerouslySetInnerHTML={{ __html: caption }}
        />
      )}
    </figure>
  )
}

function renderDelimiter(block: Block, index: number) {
  return (
    <div key={block.id || `d-${index}`} className="flex justify-center my-12">
      <div className="flex gap-2">
        <span className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
        <span className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
        <span className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
      </div>
    </div>
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
      className="my-8 overflow-x-auto rounded-xl border shadow-sm"
    >
      <table className="w-full border-collapse text-sm">
        {withHeadings && headerRow ? (
          <thead>
            <tr className="bg-muted/60">
              {headerRow.map((cell, idx) => (
                <th
                  key={idx}
                  className="border-b px-4 py-3 text-left font-semibold text-foreground"
                  dangerouslySetInnerHTML={{ __html: cell }}
                />
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {(withHeadings ? bodyRows : rows).map((row, rIdx) => (
            <tr
              key={rIdx}
              className="border-b last:border-b-0 odd:bg-background even:bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className={
                    cIdx === 0
                      ? 'px-4 py-3 align-top font-medium text-foreground'
                      : 'px-4 py-3 align-top text-foreground/85'
                  }
                  dangerouslySetInnerHTML={{ __html: cell }}
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
      className={`border-l-4 border-primary bg-primary/5 pl-5 pr-4 py-4 my-8 rounded-r-lg ${
        alignment === 'center' ? 'text-center' : ''
      }`}
    >
      <p
        className="text-lg italic text-foreground/90 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: text }}
      />
      {caption && (
        <cite className="block mt-3 text-sm text-muted-foreground not-italic">
          — {caption}
        </cite>
      )}
    </blockquote>
  )
}
