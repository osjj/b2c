import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { buildPageTitle } from '../src/lib/seo-title'

config()

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})

const MAX_META_TITLE_LENGTH = 60
const DEFAULT_OUTPUT_PATH = 'scripts/product-meta-title-candidates.json'

type ProductRecord = {
  id: string
  name: string
  slug: string
  metaTitle: string | null
  updatedAt: Date
  category: {
    name: string
  } | null
}

type CandidateItem = {
  id: string
  slug: string
  categoryName: string | null
  originalName: string
  originalLength: number
  currentMetaTitle: string | null
  currentMetaTitleLength: number
  recommendedMetaTitle: string
  recommendedLength: number
  finalTitlePreview: string
  finalPreviewLength: number
  candidates: string[]
}

const CATEGORY_TYPE_MAP: Record<string, string> = {
  'head protection': 'Safety Helmet',
  'hand protection': 'Work Gloves',
  'eye protection': 'Safety Goggles',
  'respiratory protection': 'Respirator',
  'foot protection': 'Safety Shoes',
  'body protection': 'Protective Coverall',
}

const PRODUCT_TYPE_RULES: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /welding gloves?/i, value: 'Welding Gloves' },
  { pattern: /mechanic gloves?/i, value: 'Mechanic Gloves' },
  { pattern: /gloves?/i, value: 'Work Gloves' },
  { pattern: /goggles?/i, value: 'Safety Goggles' },
  { pattern: /glasses?/i, value: 'Safety Glasses' },
  { pattern: /half[- ]face.*respirator|half[- ]face.*gas mask/i, value: 'Half Face Respirator' },
  { pattern: /respirator|gas mask/i, value: 'Respirator' },
  { pattern: /wellington boots?|work boots?|safety boots?/i, value: 'Work Boots' },
  { pattern: /safety shoes?|work shoes?/i, value: 'Safety Shoes' },
  { pattern: /helmet|hard hat/i, value: 'Safety Helmet' },
  { pattern: /coveralls?/i, value: 'Protective Coverall' },
  { pattern: /earmuffs?/i, value: 'Noise-Reduction Earmuffs' },
]

const FEATURE_RULES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /cut[- ]resistant|a\d+\s*cut[- ]resistant/i, label: 'Cut-Resistant' },
  { pattern: /anti[- ]slip/i, label: 'Anti-Slip' },
  { pattern: /nitrile/i, label: 'Nitrile' },
  { pattern: /waterproof/i, label: 'Waterproof' },
  { pattern: /steel toe/i, label: 'Steel Toe' },
  { pattern: /puncture[- ]resistant/i, label: 'Puncture-Resistant' },
  { pattern: /anti[- ]fog/i, label: 'Anti-Fog' },
  { pattern: /dustproof|dust[- ]proof/i, label: 'Dustproof' },
  { pattern: /dual filters?|double filter/i, label: 'Dual-Filter' },
  { pattern: /chemical protection|chemical[- ]resistant/i, label: 'Chemical Protection' },
  { pattern: /reusable/i, label: 'Reusable' },
  { pattern: /disposable/i, label: 'Disposable' },
  { pattern: /reflective/i, label: 'Reflective' },
  { pattern: /flame[- ]retardant/i, label: 'Flame-Retardant' },
  { pattern: /noise[- ]reduction|noise[- ]proof/i, label: 'Noise-Reduction' },
  { pattern: /breathable/i, label: 'Breathable' },
  { pattern: /cowhide|leather|suede/i, label: 'Leather' },
  { pattern: /ratchet adjustment/i, label: 'Ratchet Adjustment' },
  { pattern: /6[- ]point suspension|6[- ]point/i, label: '6-Point Suspension' },
  { pattern: /ventilation|switchable vents?|ventilated/i, label: 'Ventilated' },
  { pattern: /chin strap/i, label: 'Chin Strap' },
  { pattern: /kevlar midsole/i, label: 'Kevlar Midsole' },
  { pattern: /pc lens/i, label: 'PC Lens' },
  { pattern: /\babs\b/i, label: 'ABS' },
  { pattern: /\bhdpe\b/i, label: 'HDPE' },
  { pattern: /\bfrp\b|fiberglass/i, label: 'FRP' },
  { pattern: /\bpvc\b/i, label: 'PVC' },
]

const CONTEXT_RULES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /food processing/i, label: 'for Food Processing' },
  { pattern: /construction/i, label: 'for Construction' },
  { pattern: /mining/i, label: 'for Mining' },
  { pattern: /chemical/i, label: 'for Chemical Work' },
  { pattern: /welding/i, label: 'for Welding' },
  { pattern: /warehousing|warehouse/i, label: 'for Warehousing' },
]

function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeCategoryName(value: string | null | undefined): string {
  return normalizeWhitespace(value || '').toLowerCase()
}

function unique(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const normalized = value.toLowerCase()
    if (seen.has(normalized)) {
      continue
    }

    seen.add(normalized)
    result.push(value)
  }

  return result
}

function fitTitleParts(parts: string[], maxLength = MAX_META_TITLE_LENGTH): string | null {
  const filtered = parts.filter(Boolean)
  if (filtered.length === 0) {
    return null
  }

  for (let length = filtered.length; length > 0; length -= 1) {
    const candidate = normalizeWhitespace(filtered.slice(0, length).join(' '))
    if (candidate.length <= maxLength) {
      return candidate
    }
  }

  return null
}

function cleanOriginalName(name: string): string {
  return normalizeWhitespace(
    name
      .replace(/\b(ce certification|ce certified|factory hot sale|factory wholesale)\b/gi, '')
      .replace(/\b(custom logo|general purpose|for safe handling)\b/gi, '')
      .replace(/\s*-\s*/g, ' ')
      .replace(/[(),]/g, ' ')
  )
}

function inferProductType(name: string, categoryName: string | null): string {
  for (const rule of PRODUCT_TYPE_RULES) {
    if (rule.pattern.test(name)) {
      return rule.value
    }
  }

  const categoryType = CATEGORY_TYPE_MAP[normalizeCategoryName(categoryName)]
  if (categoryType) {
    return categoryType
  }

  return 'Safety Equipment'
}

function extractFeatures(name: string, type: string): string[] {
  const features = FEATURE_RULES
    .filter((rule) => rule.pattern.test(name))
    .map((rule) => rule.label)
    .filter((label) => !type.toLowerCase().includes(label.toLowerCase()))

  return unique(features)
}

function extractContext(name: string): string[] {
  return unique(
    CONTEXT_RULES.filter((rule) => rule.pattern.test(name)).map((rule) => rule.label)
  )
}

function buildMetaTitleCandidates(product: ProductRecord): string[] {
  const normalizedName = normalizeWhitespace(product.name)
  const cleanedName = cleanOriginalName(product.name)
  const type = inferProductType(normalizedName, product.category?.name ?? null)
  const features = extractFeatures(normalizedName, type)
  const contexts = extractContext(normalizedName)

  const candidates = unique([
    fitTitleParts([...features.slice(0, 2), type]),
    fitTitleParts([...features.slice(0, 3), type]),
    fitTitleParts([type, ...features.slice(0, 2)]),
    fitTitleParts([features[0], type, contexts[0]].filter(Boolean) as string[]),
    fitTitleParts([type, contexts[0]].filter(Boolean) as string[]),
    cleanedName.length <= MAX_META_TITLE_LENGTH ? cleanedName : null,
  ].filter((value): value is string => Boolean(value)))

  if (candidates.length > 0) {
    return candidates
  }

  return [normalizedName.slice(0, MAX_META_TITLE_LENGTH).trim()]
}

function parseArgs(argv: string[]): { outputPath: string } {
  const outputIndex = argv.findIndex((arg) => arg === '--output')
  if (outputIndex >= 0 && argv[outputIndex + 1]) {
    return { outputPath: argv[outputIndex + 1] }
  }

  return { outputPath: DEFAULT_OUTPUT_PATH }
}

async function main() {
  const { outputPath } = parseArgs(process.argv.slice(2))
  const absoluteOutputPath = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(process.cwd(), outputPath)

  console.log('Generating product meta title candidates...')

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      metaTitle: true,
      updatedAt: true,
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  const items: CandidateItem[] = products
    .filter((product) => {
      const hasMetaTitle = typeof product.metaTitle === 'string' && product.metaTitle.trim() !== ''
      return product.name.length > MAX_META_TITLE_LENGTH || (hasMetaTitle && product.metaTitle!.length > MAX_META_TITLE_LENGTH)
    })
    .map((product) => {
      const candidates = buildMetaTitleCandidates(product)
      const recommendedMetaTitle = candidates[0]
      const finalTitlePreview = buildPageTitle(recommendedMetaTitle)

      return {
        id: product.id,
        slug: product.slug,
        categoryName: product.category?.name ?? null,
        originalName: product.name,
        originalLength: product.name.length,
        currentMetaTitle: product.metaTitle,
        currentMetaTitleLength: product.metaTitle?.length ?? 0,
        recommendedMetaTitle,
        recommendedLength: recommendedMetaTitle.length,
        finalTitlePreview,
        finalPreviewLength: finalTitlePreview.length,
        candidates,
      }
    })
    .sort((a, b) => b.originalLength - a.originalLength || a.slug.localeCompare(b.slug))

  const payload = {
    generatedAt: new Date().toISOString(),
    threshold: MAX_META_TITLE_LENGTH,
    totalProducts: products.length,
    matchedProducts: items.length,
    outputDescription: 'Products whose current product name or meta title exceeds the meta title threshold.',
    items,
  }

  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true })
  fs.writeFileSync(absoluteOutputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')

  console.log(`Matched products: ${items.length}`)
  console.log(`Output: ${absoluteOutputPath}`)

  for (const item of items.slice(0, 5)) {
    console.log(`- ${item.slug}`)
    console.log(`  original:    ${item.originalName}`)
    console.log(`  recommended: ${item.recommendedMetaTitle}`)
    console.log(`  preview:     ${item.finalTitlePreview}`)
  }
}

main()
  .catch((error) => {
    console.error('Failed to generate meta title candidates:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
