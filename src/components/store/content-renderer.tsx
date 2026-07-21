import type { JSX } from 'react'
import Image from 'next/image'

export interface ContentBlock {
  id: string
  type: string
  data: Record<string, unknown>
}

interface EditorJSContent {
  time?: number
  version?: string
  blocks: ContentBlock[]
}

interface ContentRendererProps {
  content: EditorJSContent | null | undefined
  seamlessDetailImages?: boolean
}

export function ContentRenderer({
  content,
  seamlessDetailImages = false,
}: ContentRendererProps) {
  if (!content?.blocks?.length) {
    return null
  }

  return (
    <div className="prose prose-sm md:prose-base max-w-none">
      {content.blocks.map((block, index) => {
        switch (block.type) {
          case 'header':
            return renderHeader(block)
          case 'paragraph':
            return renderParagraph(block)
          case 'list':
            return renderList(block)
          case 'image':
            return renderImage(
              block,
              getImageSpacingClass(
                block,
                content.blocks[index - 1],
                content.blocks[index + 1],
                seamlessDetailImages
              )
            )
          case 'delimiter':
            return renderDelimiter(block)
          case 'quote':
            return renderQuote(block)
          default:
            return null
        }
      })}
    </div>
  )
}

function renderHeader(block: ContentBlock) {
  const text = typeof block.data.text === 'string' ? block.data.text : ''
  const level =
    typeof block.data.level === 'number' && block.data.level >= 1 && block.data.level <= 6
      ? block.data.level
      : 2
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

  return (
    <Tag
      key={block.id}
      className="font-serif"
      dangerouslySetInnerHTML={{ __html: text }}
    />
  )
}

function renderParagraph(block: ContentBlock) {
  const text = typeof block.data.text === 'string' ? block.data.text : ''

  return (
    <p
      key={block.id}
      className="text-muted-foreground leading-relaxed"
      dangerouslySetInnerHTML={{ __html: text }}
    />
  )
}

function renderList(block: ContentBlock) {
  const { style, items } = block.data
  const Tag = style === 'ordered' ? 'ol' : 'ul'

  // Handle both old format (string[]) and new format (object[])
  const renderItems = (listItems: unknown[]): JSX.Element[] => {
    return listItems.map((item, index) => {
      const content =
        typeof item === 'string'
          ? item
          : isRecord(item) && typeof item.content === 'string'
            ? item.content
            : ''
      const nestedItems =
        isRecord(item) && Array.isArray(item.items) && item.items.length > 0
          ? item.items
          : null

      return (
        <li key={index}>
          <span dangerouslySetInnerHTML={{ __html: content }} />
          {nestedItems && (
            <Tag className="mt-1">
              {renderItems(nestedItems)}
            </Tag>
          )}
        </li>
      )
    })
  }

  return (
    <Tag key={block.id} className="text-muted-foreground">
      {renderItems(Array.isArray(items) ? items : [])}
    </Tag>
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasMeaningfulCaption(caption: unknown): caption is string {
  return (
    typeof caption === 'string' &&
    caption.replace(/<br\s*\/?>/gi, '').trim().length > 0
  )
}

function getValidImageUrl(block: ContentBlock): string | null {
  const file = block.data.file
  const fileUrl = isRecord(file) && typeof file.url === 'string' ? file.url : undefined
  const url = fileUrl || block.data.url

  if (!url || typeof url !== 'string' || !url.trim()) return null

  const trimmedUrl = url.trim()
  const isValidUrl =
    trimmedUrl.startsWith('/') ||
    trimmedUrl.startsWith('http://') ||
    trimmedUrl.startsWith('https://') ||
    trimmedUrl.startsWith('data:')

  return isValidUrl ? trimmedUrl : null
}

export function isJoinableDetailImageBlock(
  block: ContentBlock | null | undefined
): boolean {
  if (!block || block.type !== 'image' || !getValidImageUrl(block)) return false

  return (
    block.data.stretched === true &&
    !Boolean(block.data.withBorder) &&
    !Boolean(block.data.withBackground) &&
    !hasMeaningfulCaption(block.data.caption)
  )
}

export function getImageSpacingClass(
  block: ContentBlock,
  previousBlock: ContentBlock | undefined,
  nextBlock: ContentBlock | undefined,
  seamlessDetailImages: boolean
): string {
  if (!seamlessDetailImages || !isJoinableDetailImageBlock(block)) return 'my-6'

  const joinsPrevious = isJoinableDetailImageBlock(previousBlock)
  const joinsNext = isJoinableDetailImageBlock(nextBlock)
  if (!joinsPrevious && !joinsNext) return 'my-6'

  return `${joinsPrevious ? 'mt-0' : 'mt-6'} ${joinsNext ? 'mb-0' : 'mb-6'}`
}

function renderImage(block: ContentBlock, spacingClass: string) {
  const { caption, stretched, withBorder, withBackground } = block.data
  const trimmedUrl = getValidImageUrl(block)
  if (!trimmedUrl) return null

  const captionText = hasMeaningfulCaption(caption) ? caption : null

  return (
    <figure
      key={block.id}
      className={`${spacingClass} leading-none ${stretched === true ? 'w-full' : ''} ${withBackground ? 'bg-muted p-4 rounded-lg' : ''}`}
    >
      <div className={`relative ${withBorder ? 'border rounded-lg overflow-hidden' : ''}`}>
        <Image
          src={trimmedUrl}
          alt={captionText ?? 'Product detail image'}
          width={800}
          height={600}
          className="block w-full h-auto object-contain"
          sizes="(max-width: 768px) 100vw, 800px"
        />
      </div>
      {captionText && (
        <figcaption
          className="text-center text-sm leading-normal text-muted-foreground mt-2"
          dangerouslySetInnerHTML={{ __html: captionText }}
        />
      )}
    </figure>
  )
}

function renderDelimiter(block: ContentBlock) {
  return (
    <div key={block.id} className="flex justify-center my-8">
      <div className="flex gap-2">
        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full" />
        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full" />
        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full" />
      </div>
    </div>
  )
}

function renderQuote(block: ContentBlock) {
  const text = typeof block.data.text === 'string' ? block.data.text : ''
  const caption = typeof block.data.caption === 'string' ? block.data.caption : null
  const alignment = block.data.alignment

  return (
    <blockquote
      key={block.id}
      className={`border-l-4 border-primary pl-4 my-6 ${alignment === 'center' ? 'text-center' : ''}`}
    >
      <p
        className="text-lg italic text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: text }}
      />
      {caption && (
        <cite className="text-sm text-muted-foreground/70 not-italic">
          — {caption}
        </cite>
      )}
    </blockquote>
  )
}
