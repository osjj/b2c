import Image from 'next/image'

interface Block {
  id: string
  type: string
  data: Record<string, any>
}

interface EditorJSContent {
  time?: number
  version?: string
  blocks: Block[]
}

interface ContentRendererProps {
  content: EditorJSContent | null | undefined
}

export function ContentRenderer({ content }: ContentRendererProps) {
  if (!content?.blocks?.length) {
    return null
  }

  return (
    <div className="prose prose-sm md:prose-base max-w-none">
      {content.blocks.map((block) => {
        switch (block.type) {
          case 'header':
            return renderHeader(block)
          case 'paragraph':
            return renderParagraph(block)
          case 'list':
            return renderList(block)
          case 'image':
            return renderImage(block)
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

function renderHeader(block: Block) {
  const { text, level } = block.data
  const Tag = `h${level}` as keyof JSX.IntrinsicElements

  return (
    <Tag
      key={block.id}
      className="font-serif"
      dangerouslySetInnerHTML={{ __html: text }}
    />
  )
}

function renderParagraph(block: Block) {
  return (
    <p
      key={block.id}
      className="text-muted-foreground leading-relaxed"
      dangerouslySetInnerHTML={{ __html: block.data.text }}
    />
  )
}

function renderList(block: Block) {
  const { style, items } = block.data
  const Tag = style === 'ordered' ? 'ol' : 'ul'

  return (
    <Tag key={block.id} className="text-muted-foreground">
      {items.map((item: string, index: number) => (
        <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
      ))}
    </Tag>
  )
}

function renderImage(block: Block) {
  const { file, caption, stretched, withBorder, withBackground } = block.data
  const url = file?.url || block.data.url

  if (!url) return null

  return (
    <figure
      key={block.id}
      className={`my-6 ${stretched ? 'w-full' : ''} ${withBackground ? 'bg-muted p-4 rounded-lg' : ''}`}
    >
      <div className={`relative ${withBorder ? 'border rounded-lg overflow-hidden' : ''}`}>
        <Image
          src={url}
          alt={caption || 'Product detail image'}
          width={800}
          height={600}
          className="w-full h-auto object-contain"
          sizes="(max-width: 768px) 100vw, 800px"
        />
      </div>
      {caption && (
        <figcaption className="text-center text-sm text-muted-foreground mt-2">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

function renderDelimiter(block: Block) {
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

function renderQuote(block: Block) {
  const { text, caption, alignment } = block.data

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
