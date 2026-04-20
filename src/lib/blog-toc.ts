interface Block {
  id?: string
  type: string
  data: Record<string, unknown>
}

interface EditorJSContent {
  time?: number
  version?: string
  blocks: Block[]
}

export interface TocItem {
  id: string
  title: string
}

export function slugifyHeading(text: string): string {
  const plain = text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()

  return plain
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

export function extractTocFromContent(
  content: EditorJSContent | null | undefined,
): TocItem[] {
  if (!content?.blocks?.length) return []

  const items: TocItem[] = []
  const seen = new Set<string>()

  for (const block of content.blocks) {
    if (block.type !== 'header') continue
    const level = (block.data?.level ?? 2) as number
    if (level !== 2) continue

    const rawText = (block.data?.text ?? '') as string
    const title = stripHtml(rawText)
    if (!title) continue

    let id = slugifyHeading(rawText)
    if (!id) continue

    let suffix = 2
    while (seen.has(id)) {
      id = `${slugifyHeading(rawText)}-${suffix++}`
    }
    seen.add(id)

    items.push({ id, title })
  }

  return items
}
