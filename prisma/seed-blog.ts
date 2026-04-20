/**
 * Seeds the first blog post (`construction-safety-footwear-guide`) from the
 * markdown file at the project root. Idempotent — re-runnable via
 * `npm run db:seed:blog` without creating duplicates (upsert on slug).
 *
 * Parses a restricted markdown subset into EditorJS OutputData blocks:
 *   - `#` / `##` / `###` -> header block
 *   - `---`              -> delimiter block
 *   - `- ` / `* `        -> unordered list block (consecutive items grouped)
 *   - blank line         -> paragraph break
 *   - everything else    -> paragraph block
 *
 * Inline formatting: **bold**, *italic*, `code` -> <strong>, <em>, <code>.
 *
 * After each H2 section introduction, an Unsplash illustration is injected.
 */

import { PrismaClient } from '@prisma/client'
import { readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const prisma = new PrismaClient()

const SLUG = 'construction-safety-footwear-guide'
const MARKDOWN_PATH = join(process.cwd(), 'construction-safety-footwear-guide.md')
const GENERATED_IMAGES_PATH = join(__dirname, 'blog-images.generated.json')

// Load AI-generated image URLs if available (from `npm run db:gen:blog-images`).
// Falls back to Unsplash defaults below when the JSON is missing or incomplete.
function loadGeneratedImages(): Record<string, string> {
  if (!existsSync(GENERATED_IMAGES_PATH)) return {}
  try {
    const raw = readFileSync(GENERATED_IMAGES_PATH, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter(
          ([, v]) => typeof v === 'string' && v.length > 0,
        ) as [string, string][],
      )
    }
  } catch (err) {
    console.warn('Could not parse blog-images.generated.json:', err)
  }
  return {}
}

const generatedImages = loadGeneratedImages()

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Unsplash fallbacks — used when no AI-generated image exists for a given key.
const UNSPLASH_HERO =
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1600&q=80'

const HERO_IMAGE = generatedImages['hero'] || UNSPLASH_HERO

const SECTION_IMAGES: Record<string, { url: string; caption: string }> = {
  'Foot Hazards on a Construction Site': {
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
    caption: 'Active construction sites present a wider range of foot hazards than almost any other workplace.',
  },
  'OSHA Safety Footwear Requirements for Construction': {
    url: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?w=1200&q=80',
    caption: 'OSHA 29 CFR 1926.95/96 mandates protective footwear wherever falling objects, punctures or electrical hazards are possible.',
  },
  'Understanding ASTM F2413: The US Safety Footwear Standard': {
    url: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?w=1200&q=80',
    caption: 'ASTM F2413 specifies impact, compression, puncture and electrical hazard protection for North American safety footwear.',
  },
  'Understanding EN ISO 20345: The European Safety Footwear Standard': {
    url: 'https://images.unsplash.com/photo-1521334884684-d80222895322?w=1200&q=80',
    caption: 'EN ISO 20345 uses S1–S5 classes to bundle common feature sets for European safety boots.',
  },
  'Steel Toe vs Composite Toe vs Aluminium Toe: Which to Choose': {
    url: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=1200&q=80',
    caption: 'Modern safety boots offer steel, composite, or aluminium toe caps — each with distinct trade-offs.',
  },
  'Matching Safety Footwear to Construction Sub-Trades': {
    url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1200&q=80',
    caption: 'Each construction sub-trade — electrician, scaffolder, concrete worker — has its own footwear priorities.',
  },
  'How to Read the Boot Label: A Practical Checklist': {
    url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=1200&q=80',
    caption: 'A safety boot label tells you, in minutes, whether it matches your hazard assessment.',
  },
  'Common Mistakes in Construction Safety Footwear Selection': {
    url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
    caption: 'Most construction foot injuries trace back to avoidable mistakes in selection and fit.',
  },
  'Care and Maintenance of Construction Safety Boots': {
    url: 'https://images.unsplash.com/photo-1449247709967-d4461a6a6103?w=1200&q=80',
    caption: 'Routine cleaning, inspection and re-waterproofing extend the protective life of safety boots.',
  },
  'Regulatory Summary: OSHA and EU Requirements Side by Side': {
    url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
    caption: 'US OSHA and EU Regulation 2016/425 overlap substantially but differ in the detailed standards they reference.',
  },
}

// Override each section's URL with the AI-generated image if available.
for (const title of Object.keys(SECTION_IMAGES)) {
  const key = slugifyHeading(title)
  const generated = generatedImages[key]
  if (generated) {
    SECTION_IMAGES[title].url = generated
  }
}

// ---------- Types ----------

type EditorBlock =
  | { type: 'header'; data: { text: string; level: 1 | 2 | 3 | 4 } }
  | { type: 'paragraph'; data: { text: string } }
  | { type: 'list'; data: { style: 'unordered' | 'ordered'; items: string[] } }
  | { type: 'delimiter'; data: Record<string, never> }
  | {
      type: 'image'
      data: { file: { url: string }; caption: string; withBorder: boolean; stretched: boolean; withBackground: boolean }
    }
  | { type: 'table'; data: { withHeadings: boolean; content: string[][] } }

type BlockWithId = EditorBlock & { id: string }

// ---------- Parser ----------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Converts a subset of inline markdown (bold / italic / code / links) to HTML. */
function inlineMarkdownToHtml(raw: string): string {
  let text = escapeHtml(raw)

  // Links: [text](url)
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label: string, url: string) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  )

  // Inline code: `code`
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Bold: **bold**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Italic: *italic* (avoid matching **) — negative lookarounds for *
  text = text.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')

  return text
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 12)
}

function parseMarkdown(md: string): BlockWithId[] {
  const lines = md.split(/\r?\n/)
  const blocks: BlockWithId[] = []

  // Skip everything before the first H1 (meta header block + separator).
  let startIdx = lines.findIndex((line) => /^#\s+/.test(line))
  if (startIdx === -1) startIdx = 0

  let listBuffer: string[] | null = null
  let paragraphBuffer: string[] = []

  const flushList = () => {
    if (listBuffer && listBuffer.length > 0) {
      blocks.push({
        id: makeId(),
        type: 'list',
        data: {
          style: 'unordered',
          items: listBuffer.map((item) => inlineMarkdownToHtml(item)),
        },
      })
    }
    listBuffer = null
  }

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const text = inlineMarkdownToHtml(paragraphBuffer.join(' ').trim())
      if (text) {
        blocks.push({
          id: makeId(),
          type: 'paragraph',
          data: { text },
        })
      }
      paragraphBuffer = []
    }
  }

  const flushAll = () => {
    flushList()
    flushParagraph()
  }

  for (let i = startIdx; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    // Blank line -> break paragraph / list
    if (line === '') {
      flushAll()
      continue
    }

    // Horizontal rule -> delimiter (only if it's a standalone line of dashes)
    if (/^-{3,}$/.test(line)) {
      flushAll()
      blocks.push({ id: makeId(), type: 'delimiter', data: {} })
      continue
    }

    // Markdown table: a line starting with `|` followed on the next line by
    // a separator row like `|---|---|` indicates a GFM-style table.
    const nextLine = (lines[i + 1] || '').trim()
    if (
      line.startsWith('|') &&
      /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(nextLine)
    ) {
      flushAll()
      const tableRows: string[][] = []
      tableRows.push(parseTableRow(line))
      // Skip the separator row
      i += 2
      while (i < lines.length) {
        const rowLine = lines[i].trim()
        if (!rowLine.startsWith('|')) break
        tableRows.push(parseTableRow(rowLine))
        i++
      }
      i-- // back up one so the outer loop increment lands us on the first non-table line
      if (tableRows.length > 0) {
        blocks.push({
          id: makeId(),
          type: 'table',
          data: {
            withHeadings: true,
            content: tableRows.map((row) =>
              row.map((cell) => inlineMarkdownToHtml(cell)),
            ),
          },
        })
      }
      continue
    }

    // Headers
    const headerMatch = /^(#{1,4})\s+(.+)$/.exec(line)
    if (headerMatch) {
      flushAll()
      const level = headerMatch[1].length as 1 | 2 | 3 | 4
      const text = inlineMarkdownToHtml(headerMatch[2].trim())
      blocks.push({ id: makeId(), type: 'header', data: { text, level } })
      continue
    }

    // List items
    const listMatch = /^[-*]\s+(.+)$/.exec(line)
    if (listMatch) {
      flushParagraph()
      if (listBuffer === null) listBuffer = []
      listBuffer.push(listMatch[1].trim())
      continue
    }

    // Regular paragraph text
    flushList()
    paragraphBuffer.push(line)
  }

  flushAll()
  return blocks
}

function parseTableRow(line: string): string[] {
  // Strip leading/trailing `|` and two-space-EOL markdown line-break markers,
  // then split on unescaped `|`.
  const trimmed = line.replace(/^\|/, '').replace(/\|$/, '').trim()
  return trimmed.split('|').map((cell) => cell.trim())
}

/**
 * After each H2 header introductory paragraph, inject the matching illustration
 * (if we have one). "Introductory paragraph" = the first paragraph that follows
 * the H2 before any other H2/H3 or list.
 */
function injectSectionImages(blocks: BlockWithId[]): BlockWithId[] {
  const output: BlockWithId[] = []
  let injectedForH2: string | null = null
  let waitingParagraphAfterH2: string | null = null

  for (const block of blocks) {
    output.push(block)

    if (block.type === 'header' && block.data.level === 2) {
      const plainTitle = stripHtml(block.data.text).trim()
      if (SECTION_IMAGES[plainTitle] && injectedForH2 !== plainTitle) {
        waitingParagraphAfterH2 = plainTitle
      } else {
        waitingParagraphAfterH2 = null
      }
      continue
    }

    if (waitingParagraphAfterH2 && block.type === 'paragraph') {
      const meta = SECTION_IMAGES[waitingParagraphAfterH2]
      if (meta) {
        output.push({
          id: makeId(),
          type: 'image',
          data: {
            file: { url: meta.url },
            caption: meta.caption,
            withBorder: true,
            stretched: false,
            withBackground: false,
          },
        })
        injectedForH2 = waitingParagraphAfterH2
      }
      waitingParagraphAfterH2 = null
    }
  }

  return output
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

// ---------- Main ----------

async function main() {
  const md = await readFile(MARKDOWN_PATH, 'utf8')

  const rawBlocks = parseMarkdown(md)
  const blocksWithImages = injectSectionImages(rawBlocks)

  // Drop the first H1 from the body (it becomes the post title instead).
  const h1Index = blocksWithImages.findIndex(
    (b) => b.type === 'header' && b.data.level === 1,
  )
  const afterH1 =
    h1Index === -1 ? blocksWithImages : blocksWithImages.slice(h1Index + 1)

  // Drop the SEO meta block that sits between the H1 and the first delimiter
  // (Meta Title / Meta Description / Target URL / Target Keywords). The first
  // `---` in the source marks the end of that block.
  const firstDelimiterIdx = afterH1.findIndex((b) => b.type === 'delimiter')
  const metaBlockIsMeta =
    firstDelimiterIdx !== -1 &&
    afterH1.slice(0, firstDelimiterIdx).every(
      (b) =>
        b.type === 'paragraph' &&
        /Meta Title|Meta Description|Target URL|Target Keywords/i.test(
          (b.data as { text: string }).text,
        ),
    )
  const bodyBlocks = metaBlockIsMeta
    ? afterH1.slice(firstDelimiterIdx + 1)
    : afterH1

  const content = {
    time: Date.now(),
    version: '2.31.1',
    blocks: bodyBlocks,
  }

  const title = 'Safety Footwear Guide for Construction Workers'
  const excerpt =
    'Choose the right construction safety boots the first time. A complete guide covering ASTM F2413, EN ISO 20345 S1–S5 ratings, steel vs composite toe, and how to match footwear to every construction hazard.'
  const seoTitle =
    'Safety Footwear Guide for Construction Workers | ASTM & EN ISO 20345 Explained'
  const seoDescription =
    'Choose the right construction safety boots the first time. Complete guide covering ASTM F2413, EN ISO 20345 S1–S5 ratings, steel vs composite toe, and how to match footwear to every construction hazard.'
  const seoKeywords =
    'construction safety footwear, construction safety boots, steel toe boots construction, ASTM F2413, EN ISO 20345, safety boots for construction workers, composite toe vs steel toe, puncture resistant boots construction'

  const post = await prisma.blogPost.upsert({
    where: { slug: SLUG },
    update: {
      title,
      excerpt,
      coverImage: HERO_IMAGE,
      content,
      seoTitle,
      seoDescription,
      seoKeywords,
    },
    create: {
      slug: SLUG,
      title,
      excerpt,
      coverImage: HERO_IMAGE,
      content,
      isPublished: true,
      publishedAt: new Date(),
      seoTitle,
      seoDescription,
      seoKeywords,
    },
  })

  console.log(`✔ Seeded blog post: ${post.slug} (${bodyBlocks.length} blocks)`)
}

main()
  .catch((err) => {
    console.error('✖ Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
