/**
 * Seeds blog posts from markdown files at the project root.
 *
 * Current supported posts:
 *   - construction-safety-footwear-guide
 *   - osha-ppe-requirements-construction
 *   - bulk-construction-ppe-procurement
 *
 * Idempotent: safe to re-run via `npm run db:seed:blog` because each post is
 * upserted on `slug`.
 *
 * Supported markdown subset:
 *   - `#` / `##` / `###` / `####` -> header block
 *   - `---`                       -> delimiter block
 *   - `- ` / `* `                 -> unordered list block
 *   - `1. ` / `2. `               -> ordered list block
 *   - `> quote`                   -> quote block
 *   - GFM-style tables            -> table block
 *   - blank line                  -> paragraph/list/quote break
 *   - everything else             -> paragraph block
 *
 * Inline formatting:
 *   - **bold**
 *   - *italic*
 *   - `code`
 *   - [link](url)
 *
 * For posts that define section image mappings, an illustration is injected
 * after the first paragraph following each H2 heading.
 */

import { PrismaClient } from '@prisma/client'
import { readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const prisma = new PrismaClient()

type SectionImageMap = Record<string, { url: string; caption: string }>

interface BlogSeedConfig {
  slug: string
  markdownPath: string
  generatedImagesPath: string
  title: string
  excerpt: string
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  heroFallback: string
  sectionImages?: SectionImageMap
}

const BLOG_POSTS: BlogSeedConfig[] = [
  {
    slug: 'construction-safety-footwear-guide',
    markdownPath: join(process.cwd(), 'construction-safety-footwear-guide.md'),
    generatedImagesPath: join(__dirname, 'blog-images.generated.json'),
    title: 'Safety Footwear Guide for Construction Workers',
    excerpt:
      'Choose the right construction safety boots the first time. A complete guide covering ASTM F2413, EN ISO 20345 S1–S5 ratings, steel vs composite toe, and how to match footwear to every construction hazard.',
    seoTitle:
      'Safety Footwear Guide for Construction Workers | ASTM & EN ISO 20345 Explained',
    seoDescription:
      'Choose the right construction safety boots the first time. Complete guide covering ASTM F2413, EN ISO 20345 S1–S5 ratings, steel vs composite toe, and how to match footwear to every construction hazard.',
    seoKeywords:
      'construction safety footwear, construction safety boots, steel toe boots construction, ASTM F2413, EN ISO 20345, safety boots for construction workers, composite toe vs steel toe, puncture resistant boots construction',
    heroFallback:
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1600&q=80',
    sectionImages: {
      'Foot Hazards on a Construction Site': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Active construction sites present a wider range of foot hazards than almost any other workplace.',
      },
      'OSHA Safety Footwear Requirements for Construction': {
        url: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?w=1200&q=80',
        caption:
          'OSHA 29 CFR 1926.95/96 mandates protective footwear wherever falling objects, punctures or electrical hazards are possible.',
      },
      'Understanding ASTM F2413: The US Safety Footwear Standard': {
        url: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?w=1200&q=80',
        caption:
          'ASTM F2413 specifies impact, compression, puncture and electrical hazard protection for North American safety footwear.',
      },
      'Understanding EN ISO 20345: The European Safety Footwear Standard': {
        url: 'https://images.unsplash.com/photo-1521334884684-d80222895322?w=1200&q=80',
        caption:
          'EN ISO 20345 uses S1–S5 classes to bundle common feature sets for European safety boots.',
      },
      'Steel Toe vs Composite Toe vs Aluminium Toe: Which to Choose': {
        url: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=1200&q=80',
        caption:
          'Modern safety boots offer steel, composite, or aluminium toe caps — each with distinct trade-offs.',
      },
      'Matching Safety Footwear to Construction Sub-Trades': {
        url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1200&q=80',
        caption:
          'Each construction sub-trade — electrician, scaffolder, concrete worker — has its own footwear priorities.',
      },
      'How to Read the Boot Label: A Practical Checklist': {
        url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=1200&q=80',
        caption:
          'A safety boot label tells you, in minutes, whether it matches your hazard assessment.',
      },
      'Common Mistakes in Construction Safety Footwear Selection': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'Most construction foot injuries trace back to avoidable mistakes in selection and fit.',
      },
      'Care and Maintenance of Construction Safety Boots': {
        url: 'https://images.unsplash.com/photo-1449247709967-d4461a6a6103?w=1200&q=80',
        caption:
          'Routine cleaning, inspection and re-waterproofing extend the protective life of safety boots.',
      },
      'Regulatory Summary: OSHA and EU Requirements Side by Side': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'US OSHA and EU Regulation 2016/425 overlap substantially but differ in the detailed standards they reference.',
      },
    },
  },
  {
    slug: 'construction-ppe-checklist',
    markdownPath: join(process.cwd(), 'construction-ppe-checklist.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.construction-ppe-checklist.generated.json',
    ),
    title: 'Construction PPE Checklist: What Every Worker Needs on Site',
    excerpt:
      'A practical construction PPE checklist for site managers, safety officers, and contractors. Covers hard hats, eye protection, gloves, boots, hi-vis, fall protection, respirators, and start-of-shift checks.',
    seoTitle: 'Construction PPE Checklist: What Every Worker Needs on Site',
    seoDescription:
      'A practical construction PPE checklist for site managers, safety officers, and contractors. Covers hard hats, eye protection, gloves, boots, hi-vis, fall protection, respirators, and start-of-shift checks.',
    seoKeywords:
      'construction PPE checklist, PPE checklist for construction workers, construction site PPE checklist, what PPE is required on a construction site, construction worker PPE list',
    heroFallback:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
    sectionImages: {
      'Section 1: Universal Construction PPE Checklist': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'A usable construction PPE checklist starts with a strong baseline layer before task-specific hazards are added.',
      },
      'Section 2: Quick Reference By Common Construction Exposure': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'Different construction exposures call for different PPE combinations, even when workers share the same site.',
      },
      'Section 3: Task-Based Add-Ons That Sites Commonly Miss': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Most PPE gaps happen when sites stop at the baseline bundle and forget task-specific add-ons like fall, dust, or electrical protection.',
      },
      'Section 4: A Supervisor Start-Of-Shift PPE Checklist': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'A short supervisor pre-start routine does more for PPE execution than a long checklist nobody uses in the field.',
      },
      'Section 5: Employer And Program-Level PPE Checklist': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Construction PPE becomes more defensible when the site can connect field issue, fit, training, and replacement back to a real program.',
      },
      'Section 6: Common Construction PPE Mistakes': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'Construction PPE failures usually come from repetition and routine, not from dramatic one-off mistakes.',
      },
    },
  },
  {
    slug: 'osha-ppe-requirements-construction',
    markdownPath: join(process.cwd(), 'osha-ppe-requirements-construction.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.osha-ppe-requirements-construction.generated.json',
    ),
    title: 'OSHA PPE Requirements for Construction: Complete Compliance Guide',
    excerpt:
      'A regulation-first guide to OSHA PPE requirements for construction covering 29 CFR 1926 Subpart E, the January 13, 2025 proper-fit rule, hazard assessment, training, inspections, and citation risk.',
    seoTitle: 'OSHA PPE Requirements for Construction: Complete Compliance Guide 2025',
    seoDescription:
      'A regulation-first guide to OSHA PPE requirements for construction: 29 CFR 1926 Subpart E, the January 13, 2025 proper-fit rule, hazard assessment, training, inspections, and citation risk.',
    seoKeywords:
      'OSHA PPE requirements construction, 29 CFR 1926 PPE, OSHA construction PPE standards, construction PPE compliance, OSHA 1926.95, PPE hazard assessment construction, OSHA construction safety regulations 2025',
    heroFallback:
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1600&q=80',
    sectionImages: {
      'The 2025 Update: Proper Fit Is Now Explicit': {
        url: 'https://images.unsplash.com/photo-1541976590-713941681591?w=1200&q=80',
        caption:
          'The 2025 fit-rule update turned PPE sizing from a procurement detail into an explicit compliance issue on construction sites.',
      },
      'Hazard Assessment: The Step That Drives Everything Else': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'A defensible PPE program starts with a written, task-specific hazard assessment instead of a generic site checklist.',
      },
      'The PPE Areas That Create the Most Compliance Exposure': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Fall exposure, respirators, visibility, and high-noise tasks are the areas where construction employers most often create OSHA risk.',
      },
      'What OSHA Inspectors Commonly Look For': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'PPE inspections are usually a mix of documentation review, direct worker observation, and visible equipment condition checks.',
      },
      'Penalties and Citation Exposure in 2025': {
        url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80',
        caption:
          'For contractors, the real penalty risk comes from multiplication across workers, tasks, and standards rather than a single top-line fine.',
      },
    },
  },
  {
    slug: 'construction-gloves-selection-guide',
    markdownPath: join(process.cwd(), 'construction-gloves-selection-guide.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.construction-gloves-selection-guide.generated.json',
    ),
    title: 'Construction Gloves: How to Choose the Right Hand Protection',
    excerpt:
      'A practical guide to choosing construction gloves by hazard, task, grip, dexterity, cut risk, impact exposure, chemical contact, hot work, and electrical PPE requirements.',
    seoTitle: 'Construction Gloves: How to Choose the Right Hand Protection',
    seoDescription:
      'Learn how to choose construction gloves by hazard, task, coating, cut resistance, impact protection, chemical exposure, heat, and electrical work. Practical guide for contractors, supervisors, and PPE buyers.',
    seoKeywords:
      'construction gloves how to choose, construction hand protection, construction work gloves, cut resistant gloves construction, impact gloves construction, gloves for masonry work, welding gloves construction, electrical gloves construction',
    heroFallback:
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1600&q=80',
    sectionImages: {
      'What OSHA Requires for Construction Gloves': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Construction glove compliance starts with hazard matching, fit, and task-specific PPE selection rather than a generic issue policy.',
      },
      'The Main Glove Hazards on Construction Sites': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Construction hand hazards often overlap, which is why glove choice has to balance cut, abrasion, impact, wet work, and dexterity together.',
      },
      'The Main Types of Construction Gloves': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'General handling gloves, cut gloves, impact gloves, chemical gloves, welding gloves, and insulating gloves all serve different construction tasks.',
      },
      'How To Read Construction Glove Labels and Standards': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Standards only help when the buyer knows which test result actually maps to the hand hazard on site.',
      },
      'Glove Materials and Coatings: What They Usually Do Well': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Material and coating choices often decide whether a glove performs well in wet, oily, abrasive, or sharp construction conditions.',
      },
      'How To Choose Gloves by Construction Task': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'A stronger glove program starts by matching the glove family to the real task instead of forcing one glove across the whole site.',
      },
      'Common Glove Buying Mistakes on Construction Sites': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'Most glove failures come from oversimplified buying decisions, not from a lack of PPE on paper.',
      },
    },
  },
  {
    slug: 'construction-eye-face-protection',
    markdownPath: join(process.cwd(), 'construction-eye-face-protection.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.construction-eye-face-protection.generated.json',
    ),
    title: 'Eye and Face Protection for Construction Sites',
    excerpt:
      'A practical guide to choosing eye and face protection for construction by task, hazard, side protection, splash exposure, dust, grinding, welding, and face shield use.',
    seoTitle:
      'Eye and Face Protection for Construction Sites: How to Choose the Right PPE',
    seoDescription:
      'Learn how to choose eye and face protection for construction by task, hazard, side protection, splash exposure, dust, grinding, welding, and face shield use. Practical guide for contractors, supervisors, and PPE buyers.',
    seoKeywords:
      'eye and face protection construction, construction safety glasses, construction goggles, face shield construction, welding eye protection construction, eye PPE for construction sites, construction eye protection requirements',
    heroFallback:
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1600&q=80',
    sectionImages: {
      'What OSHA Requires for Construction Eye and Face Protection': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Construction eye and face PPE selection starts with matching the protector to the actual task hazard, fit, and surrounding equipment.',
      },
      'The Main Eye and Face Hazards on Construction Sites': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Flying chips, dust, splash, sparks, and face-level debris often overlap on construction sites, which is why one default eyewear choice is rarely enough.',
      },
      'Safety Glasses, Goggles, Face Shields, and Welding Helmets: What Each One Actually Does': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'Safety glasses, goggles, face shields, and welding helmets solve different problems and should not be treated as interchangeable.',
      },
      'What To Choose by Construction Task': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'A better construction eye PPE program starts by matching the protector to the task rather than forcing one product across the whole site.',
      },
      'Face Shield Use: The Point Many Sites Get Wrong': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'A face shield can add important coverage, but it often belongs over primary eye protection rather than replacing it.',
      },
      'Common Buying Mistakes in Construction Eye and Face Protection': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Most eye and face PPE failures come from oversimplified buying decisions, fit problems, and using the wrong device category for the task.',
      },
    },
  },
  {
    slug: 'bulk-construction-ppe-procurement',
    markdownPath: join(process.cwd(), 'bulk-construction-ppe-procurement.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.bulk-construction-ppe-procurement.generated.json',
    ),
    title: 'How to Buy Construction PPE in Bulk: Procurement Guide',
    excerpt:
      'A practical guide for buying construction PPE in bulk: crew packages, standards, sizing, supplier evaluation, replacement stock, RFQ fields, and site issue controls.',
    seoTitle: 'How to Buy Construction PPE in Bulk: Procurement Guide',
    seoDescription:
      'Learn how to buy construction PPE in bulk with a practical procurement guide covering crew packages, standards, sizing, suppliers, replacement stock, RFQs, and site issue controls.',
    seoKeywords:
      'bulk construction PPE, buy construction PPE in bulk, construction PPE procurement, construction safety equipment supplier, bulk PPE supplier construction, PPE purchasing guide, construction PPE ordering checklist',
    heroFallback:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80',
    sectionImages: {
      'Start With A Site PPE Scope, Not A Product List': {
        url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80',
        caption:
          'Bulk construction PPE procurement starts with the site scope, trade mix, and hazard profile before any product list is finalized.',
      },
      'Build The Baseline Construction PPE Package': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'A baseline PPE package gives every worker a consistent entry layer before task-specific hazards are added.',
      },
      'Add Task-Specific PPE By Trade And Exposure': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Role-based PPE buying reduces waste while keeping protection matched to the actual construction task.',
      },
      'Verify Standards Before You Compare Prices': {
        url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
        caption:
          'Certification documents, product markings, and test reports should be checked before price comparison starts.',
      },
      'Account For The 2025 Proper-Fit Requirement': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Bulk orders need real size planning because fit-sensitive PPE has to work for every affected employee.',
      },
      'Compare Suppliers On More Than Unit Price': {
        url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80',
        caption:
          'Supplier reliability, documentation, packaging, sizing, and repeat order support matter as much as unit price.',
      },
      'A Practical Bulk PPE Request-For-Quote Template': {
        url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80',
        caption:
          'A clear RFQ helps suppliers quote the same requirements and reduces costly substitutions later.',
      },
      'Bulk Construction PPE Purchasing Checklist': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'A procurement checklist connects site hazards, standards, sizing, packaging, replacement stock, and issue control.',
      },
    },
  },
]

function loadGeneratedImages(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {}

  try {
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter(
          ([, value]) => typeof value === 'string' && value.length > 0,
        ) as [string, string][],
      )
    }
  } catch (err) {
    console.warn(`Could not parse generated blog image file: ${filePath}`, err)
  }

  return {}
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

type EditorBlock =
  | { type: 'header'; data: { text: string; level: 1 | 2 | 3 | 4 } }
  | { type: 'paragraph'; data: { text: string } }
  | { type: 'list'; data: { style: 'unordered' | 'ordered'; items: string[] } }
  | { type: 'delimiter'; data: Record<string, never> }
  | {
      type: 'image'
      data: {
        file: { url: string }
        caption: string
        withBorder: boolean
        stretched: boolean
        withBackground: boolean
      }
    }
  | { type: 'table'; data: { withHeadings: boolean; content: string[][] } }
  | { type: 'quote'; data: { text: string; caption: string; alignment: 'left' } }

type BlockWithId = EditorBlock & { id: string }

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inlineMarkdownToHtml(raw: string): string {
  let text = escapeHtml(raw)

  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label: string, url: string) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  )

  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')

  return text
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 12)
}

function parseTableRow(line: string): string[] {
  const trimmed = line.replace(/^\|/, '').replace(/\|$/, '').trim()
  return trimmed.split('|').map((cell) => cell.trim())
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function parseMarkdown(md: string): BlockWithId[] {
  const lines = md.split(/\r?\n/)
  const blocks: BlockWithId[] = []

  let startIdx = lines.findIndex((line) => /^#\s+/.test(line))
  if (startIdx === -1) startIdx = 0

  let listBuffer: { style: 'unordered' | 'ordered'; items: string[] } | null = null
  let paragraphBuffer: string[] = []
  let quoteBuffer: string[] = []

  const flushList = () => {
    if (listBuffer && listBuffer.items.length > 0) {
      blocks.push({
        id: makeId(),
        type: 'list',
        data: {
          style: listBuffer.style,
          items: listBuffer.items.map((item) => inlineMarkdownToHtml(item)),
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

  const flushQuote = () => {
    if (quoteBuffer.length > 0) {
      const text = inlineMarkdownToHtml(quoteBuffer.join(' ').trim())
      if (text) {
        blocks.push({
          id: makeId(),
          type: 'quote',
          data: {
            text,
            caption: '',
            alignment: 'left',
          },
        })
      }
      quoteBuffer = []
    }
  }

  const flushAll = () => {
    flushList()
    flushParagraph()
    flushQuote()
  }

  for (let i = startIdx; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    if (line === '') {
      flushAll()
      continue
    }

    if (/^-{3,}$/.test(line)) {
      flushAll()
      blocks.push({ id: makeId(), type: 'delimiter', data: {} })
      continue
    }

    const nextLine = (lines[i + 1] || '').trim()
    if (
      line.startsWith('|') &&
      /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(nextLine)
    ) {
      flushAll()
      const tableRows: string[][] = []
      tableRows.push(parseTableRow(line))
      i += 2
      while (i < lines.length) {
        const rowLine = lines[i].trim()
        if (!rowLine.startsWith('|')) break
        tableRows.push(parseTableRow(rowLine))
        i++
      }
      i--
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

    const headerMatch = /^(#{1,4})\s+(.+)$/.exec(line)
    if (headerMatch) {
      flushAll()
      const level = headerMatch[1].length as 1 | 2 | 3 | 4
      const text = inlineMarkdownToHtml(headerMatch[2].trim())
      blocks.push({ id: makeId(), type: 'header', data: { text, level } })
      continue
    }

    const quoteMatch = /^>\s?(.*)$/.exec(line)
    if (quoteMatch) {
      flushList()
      flushParagraph()
      quoteBuffer.push(quoteMatch[1].trim())
      continue
    }

    const unorderedListMatch = /^[-*]\s+(.+)$/.exec(line)
    if (unorderedListMatch) {
      flushParagraph()
      flushQuote()
      if (!listBuffer || listBuffer.style !== 'unordered') {
        flushList()
        listBuffer = { style: 'unordered', items: [] }
      }
      listBuffer.items.push(unorderedListMatch[1].trim())
      continue
    }

    const orderedListMatch = /^\d+\.\s+(.+)$/.exec(line)
    if (orderedListMatch) {
      flushParagraph()
      flushQuote()
      if (!listBuffer || listBuffer.style !== 'ordered') {
        flushList()
        listBuffer = { style: 'ordered', items: [] }
      }
      listBuffer.items.push(orderedListMatch[1].trim())
      continue
    }

    flushList()
    flushQuote()
    paragraphBuffer.push(line)
  }

  flushAll()
  return blocks
}

function injectSectionImages(
  blocks: BlockWithId[],
  sectionImages?: SectionImageMap,
  generatedImages?: Record<string, string>,
): BlockWithId[] {
  if (!sectionImages || Object.keys(sectionImages).length === 0) {
    return blocks
  }

  const effectiveSectionImages: SectionImageMap = Object.fromEntries(
    Object.entries(sectionImages).map(([title, image]) => {
      const override = generatedImages?.[slugifyHeading(title)]
      return [
        title,
        {
          ...image,
          url: override || image.url,
        },
      ]
    }),
  )

  const output: BlockWithId[] = []
  let injectedForH2: string | null = null
  let waitingParagraphAfterH2: string | null = null

  for (const block of blocks) {
    output.push(block)

    if (block.type === 'header' && block.data.level === 2) {
      const plainTitle = stripHtml(block.data.text).trim()
      if (effectiveSectionImages[plainTitle] && injectedForH2 !== plainTitle) {
        waitingParagraphAfterH2 = plainTitle
      } else {
        waitingParagraphAfterH2 = null
      }
      continue
    }

    if (waitingParagraphAfterH2 && block.type === 'paragraph') {
      const meta = effectiveSectionImages[waitingParagraphAfterH2]
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

function buildEditorContent(md: string, config: BlogSeedConfig): { blocks: BlockWithId[] } & {
  time: number
  version: string
} {
  const generatedImages = loadGeneratedImages(config.generatedImagesPath)
  const rawBlocks = parseMarkdown(md)
  const blocksWithImages = injectSectionImages(
    rawBlocks,
    config.sectionImages,
    generatedImages,
  )

  const h1Index = blocksWithImages.findIndex(
    (block) => block.type === 'header' && block.data.level === 1,
  )
  const afterH1 =
    h1Index === -1 ? blocksWithImages : blocksWithImages.slice(h1Index + 1)

  const firstDelimiterIdx = afterH1.findIndex((block) => block.type === 'delimiter')
  const metaBlockIsMeta =
    firstDelimiterIdx !== -1 &&
    afterH1.slice(0, firstDelimiterIdx).every(
      (block) =>
        block.type === 'paragraph' &&
        /Meta Title|Meta Description|Target URL|Target Keywords/i.test(
          (block.data as { text: string }).text,
        ),
    )

  const bodyBlocks = metaBlockIsMeta
    ? afterH1.slice(firstDelimiterIdx + 1)
    : afterH1

  return {
    time: Date.now(),
    version: '2.31.1',
    blocks: bodyBlocks,
  }
}

async function seedPost(config: BlogSeedConfig) {
  const md = await readFile(config.markdownPath, 'utf8')
  const generatedImages = loadGeneratedImages(config.generatedImagesPath)
  const content = buildEditorContent(md, config)
  const coverImage = generatedImages.hero || config.heroFallback

  const post = await prisma.blogPost.upsert({
    where: { slug: config.slug },
    update: {
      title: config.title,
      excerpt: config.excerpt,
      coverImage,
      content,
      seoTitle: config.seoTitle,
      seoDescription: config.seoDescription,
      seoKeywords: config.seoKeywords,
    },
    create: {
      slug: config.slug,
      title: config.title,
      excerpt: config.excerpt,
      coverImage,
      content,
      isPublished: true,
      publishedAt: new Date(),
      seoTitle: config.seoTitle,
      seoDescription: config.seoDescription,
      seoKeywords: config.seoKeywords,
    },
  })

  console.log(`Seeded blog post: ${post.slug} (${content.blocks.length} blocks)`)
}

async function main() {
  const slugArg = process.argv
    .slice(2)
    .find((arg) => arg.startsWith('--slug='))
    ?.slice('--slug='.length)
    .trim()

  const postsToSeed = slugArg
    ? BLOG_POSTS.filter((post) => post.slug === slugArg)
    : BLOG_POSTS

  if (slugArg && postsToSeed.length === 0) {
    throw new Error(`Unknown blog slug: ${slugArg}`)
  }

  for (const post of postsToSeed) {
    await seedPost(post)
  }
}

main()
  .catch((err) => {
    console.error('Blog seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
