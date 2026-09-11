import { createHash, randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'
import { z } from 'zod'

import { getStorefrontVisibleProductSpecifications } from '../src/lib/product-specification-visibility'
import { assertR2Configured, deleteFromR2, uploadToR2 } from '../src/lib/r2'

const ROOT = path.resolve('output/notion-safety-shoes-english')
const AUDIT_PATH = path.join(ROOT, 'import-audit.json')
const PRE_DB_AUDIT_PATH = path.join(ROOT, 'import-audit.pre-db.json')
const UPLOAD_MANIFEST_PATH = path.join(ROOT, 'upload-manifest.json')
const VERIFICATION_PATH = path.join(ROOT, 'verification.json')
const UPLOAD_ATTEMPTS_PATH = path.join(ROOT, 'upload-attempts.json')
const CLEANUP_PATH = path.join(ROOT, 'cleanup.json')

const NOTION_PAGE_ID = '3d7d505a-0030-808a-bf4b-fbdffe4c157c'
const NOTION_URL = 'https://app.notion.com/p/3d7d505a0030808abf4bfbdffe4c157c'
const CATEGORY_SLUG = 'safety-shoes'
const CATEGORY_NAME = 'Safety Shoes'
const PRODUCT_NAME = 'Lightweight Breathable Steel-Toe Puncture-Resistant Safety Shoes'
const PRODUCT_SLUG = 'lightweight-breathable-steel-toe-puncture-resistant-safety-shoes'
const PRODUCT_PRICE = new Prisma.Decimal('0.00')
const ITEM_NUMBER = '610 Green-02'
const SOURCE_ITEM_NUMBER = '610绿色-02'

const hash = (buffer: Buffer): string => createHash('sha256').update(buffer).digest('hex')
const log = (event: string, data: unknown): void => {
  process.stdout.write(`${JSON.stringify({ event, data }, null, 2)}\n`)
}

const sourceDefinitions = [
  { sourceIndex: 1, sourceRef: 'source-01.png', decision: 'keep', reason: 'Approved clean gallery product photograph', categories: ['product-overview'] },
  { sourceIndex: 2, sourceRef: 'source-02.png', decision: 'keep', reason: 'Approved clean gallery product photograph', categories: ['product-overview'] },
  { sourceIndex: 3, sourceRef: 'source-03.png', decision: 'reject', reason: 'Marketplace screenshot contains commercial price, stock, and transaction interface values', categories: ['commercial-interface'] },
  { sourceIndex: 4, sourceRef: 'source-04.png', decision: 'reject', reason: 'Supplier attribute screenshot contains supplier brand and marketplace listing fields', categories: ['supplier-attributes'] },
  { sourceIndex: 5, sourceRef: 'source-05.png', decision: 'localize', reason: 'Buyer-useful product overview retained in the reviewed English version', categories: ['product-overview'] },
  { sourceIndex: 6, sourceRef: 'source-06.png', decision: 'localize', reason: 'Buyer-useful style, protection, and material summary retained in the reviewed English version', categories: ['feature-summary'] },
  { sourceIndex: 7, sourceRef: 'source-07.png', decision: 'localize', reason: 'Buyer-useful application scenes retained in the reviewed English version', categories: ['applications'] },
  { sourceIndex: 8, sourceRef: 'source-08.png', decision: 'localize', reason: 'Buyer-useful product specification table retained in the reviewed English version', categories: ['product-specifications'] },
  { sourceIndex: 9, sourceRef: 'source-09.png', decision: 'localize', reason: 'Buyer-useful impact and puncture protection explanation retained in the reviewed English version', categories: ['protection-overview'] },
  { sourceIndex: 10, sourceRef: 'source-10.png', decision: 'localize', reason: 'Buyer-useful outsole feature content retained in the reviewed English version', categories: ['outsole-feature'] },
  { sourceIndex: 11, sourceRef: 'source-11.png', decision: 'localize', reason: 'Buyer-useful microfiber upper feature content retained in the reviewed English version', categories: ['upper-feature'] },
  { sourceIndex: 12, sourceRef: 'source-12.png', decision: 'localize', reason: 'Buyer-useful product construction close-ups retained in the reviewed English version', categories: ['product-details'] },
  { sourceIndex: 13, sourceRef: 'source-13.png', decision: 'localize', reason: 'Buyer-useful multi-angle product views retained in the reviewed English version', categories: ['multi-angle-view'] },
  { sourceIndex: 14, sourceRef: 'source-14.png', decision: 'keep', reason: 'Approved clean gallery side-view product photograph', categories: ['product-view'] },
  { sourceIndex: 15, sourceRef: 'source-15.png', decision: 'keep', reason: 'Approved clean gallery outsole-view product photograph', categories: ['outsole-view'] },
] as const

const assetDefinitions = [
  { key: 'gallery-01', finalIndex: 1, sourceIndex: 1, role: 'gallery', inputRef: 'source-01.png', outputRef: 'final/green-safety-shoes-01.webp', alt: 'Green lightweight breathable steel-toe safety shoes, three-quarter view' },
  { key: 'gallery-02', finalIndex: 2, sourceIndex: 2, role: 'gallery', inputRef: 'source-02.png', outputRef: 'final/green-safety-shoes-02.webp', alt: 'Green low-cut lace-up safety shoes, side view' },
  { key: 'gallery-03', finalIndex: 3, sourceIndex: 14, role: 'gallery', inputRef: 'source-14.png', outputRef: 'final/green-safety-shoes-03.webp', alt: 'Green microfiber industrial safety shoe, profile view' },
  { key: 'gallery-04', finalIndex: 4, sourceIndex: 15, role: 'gallery', inputRef: 'source-15.png', outputRef: 'final/green-safety-shoes-04.webp', alt: 'PU outsole of green lightweight safety shoe' },
  { key: 'detail-05', finalIndex: 5, sourceIndex: 5, role: 'detail', inputRef: 'english-05.png', outputRef: 'final/green-safety-shoes-05.webp', alt: 'Green lightweight breathable safety shoes product overview' },
  { key: 'detail-06', finalIndex: 6, sourceIndex: 6, role: 'detail', inputRef: 'english-06.png', outputRef: 'final/green-safety-shoes-06.webp', alt: 'Safety shoe protection icons and material summary' },
  { key: 'detail-07', finalIndex: 7, sourceIndex: 7, role: 'detail', inputRef: 'english-07.png', outputRef: 'final/green-safety-shoes-07.webp', alt: 'Construction welding automotive and logistics application scenes' },
  { key: 'detail-08', finalIndex: 8, sourceIndex: 8, role: 'detail', inputRef: 'english-08.png', outputRef: 'final/green-safety-shoes-08.webp', alt: 'Green lightweight safety shoes product specifications' },
  { key: 'detail-09', finalIndex: 9, sourceIndex: 9, role: 'detail', inputRef: 'english-09.png', outputRef: 'final/green-safety-shoes-09.webp', alt: 'Source-stated impact and puncture protection details' },
  { key: 'detail-10', finalIndex: 10, sourceIndex: 10, role: 'detail', inputRef: 'english-10.png', outputRef: 'final/green-safety-shoes-10.webp', alt: 'PU outsole construction and tread detail' },
  { key: 'detail-11', finalIndex: 11, sourceIndex: 11, role: 'detail', inputRef: 'english-11.png', outputRef: 'final/green-safety-shoes-11.webp', alt: 'Green microfiber safety shoe upper detail' },
  { key: 'detail-12', finalIndex: 12, sourceIndex: 12, role: 'detail', inputRef: 'english-12.png', outputRef: 'final/green-safety-shoes-12.webp', alt: 'Steel safety toe laces reflective detail and outsole close-ups' },
  { key: 'detail-13', finalIndex: 13, sourceIndex: 13, role: 'detail', inputRef: 'english-13.png', outputRef: 'final/green-safety-shoes-13.webp', alt: 'Multi-angle product views of green safety shoes' },
] as const

const sourceSchema = z.object({
  sourceIndex: z.number().int().min(1).max(15),
  sourceRef: z.string().min(1),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  decision: z.enum(['keep', 'localize', 'reject']),
  reason: z.string().min(10),
  categories: z.array(z.string().min(1)).min(1),
})

const assetSchema = z.object({
  key: z.string().min(1),
  finalIndex: z.number().int().min(1).max(13),
  sourceIndex: z.number().int().min(1).max(15),
  role: z.enum(['gallery', 'detail']),
  inputRef: z.string().min(1),
  inputSha256: z.string().regex(/^[a-f0-9]{64}$/),
  outputRef: z.string().min(1),
  outputSha256: z.string().regex(/^[a-f0-9]{64}$/),
  alt: z.string().min(1),
  qa: z.literal('pass'),
  outputUrl: z.string().url().optional(),
})

const auditSchema = z.object({
  product: z.object({
    sourcePageId: z.literal(NOTION_PAGE_ID),
    notionUrl: z.literal(NOTION_URL),
    name: z.literal(PRODUCT_NAME),
    slug: z.literal(PRODUCT_SLUG),
    itemNumber: z.literal(ITEM_NUMBER),
    storefrontPrice: z.literal('0.00 placeholder for an inactive draft'),
    purchasePrice: z.literal('43 (currency and unit not stated)'),
    minimumOrderQuantity: z.literal('100 (unit not stated)'),
    inventory: z.literal('Source inventory rejected; inactive draft stock is 0'),
    variants: z.literal('Size range 36-46 remains a specification; no variants or price tiers are created'),
    claimBoundary: z.literal('Protection and performance statements are source-image claims; no certification, standard, or test report was provided'),
  }),
  authorization: z.literal('User requested one inactive product draft; apply still requires the explicit --apply flag'),
  sources: z.array(sourceSchema).length(15),
  assets: z.array(assetSchema).length(13),
  gate: z.object({
    phase: z.enum(['pre-upload-reviewed', 'pre-db-verified']),
    r2UploadAllowed: z.boolean(),
    databaseMutationAllowed: z.boolean(),
    reason: z.string().min(10),
  }),
})

const manifestSchema = z.object({
  slug: z.literal(PRODUCT_SLUG),
  runId: z.string().uuid(),
  createdAt: z.string().datetime(),
  assets: z.array(assetSchema.extend({ outputUrl: z.string().url() })).length(13),
})

const editorContentSchema = z.object({
  time: z.number(),
  version: z.string(),
  blocks: z.array(z.object({
    id: z.string(),
    type: z.literal('image'),
    data: z.object({
      file: z.object({ url: z.string().url() }),
      caption: z.string(),
      withBorder: z.boolean(),
      stretched: z.boolean(),
      withBackground: z.boolean(),
    }),
  })).length(9),
})

type Audit = z.infer<typeof auditSchema>
type Asset = z.infer<typeof assetSchema>
type Manifest = z.infer<typeof manifestSchema>

const prisma = new PrismaClient()

const specifications: Prisma.InputJsonValue = [
  { name: 'Product Type', value: 'Lightweight Breathable Low-Cut Safety Shoes' },
  { name: 'Item Number', value: ITEM_NUMBER },
  { name: 'Color', value: 'Green' },
  { name: 'Size Range', value: '36-46 (source sizing system not stated; no selectable variants created)' },
  { name: 'Upper Material', value: 'Microfiber' },
  { name: 'Toe Cap', value: 'Iron / steel toe cap (source-stated terminology; exact material not independently verified)' },
  { name: 'Outsole', value: 'PU' },
  { name: 'Construction', value: 'Injection-molded' },
  { name: 'Style', value: 'Low-cut, lace-up' },
  { name: 'Listed Weight', value: '480 (source unit not stated; not mapped to the product weight field)' },
  { name: 'Source-Stated Features', value: 'Impact protection, puncture resistance, breathability, slip resistance, abrasion resistance, water resistance, and dust resistance; supporting certificates, standards, and test reports were not provided' },
  { name: 'Applications', value: 'Construction, welding, automotive repair, and logistics (source-stated)' },
  { name: 'Minimum Order Quantity', value: '100 (unit not stated)' },
  { name: 'Purchase Price', value: '43 (currency and unit not stated; current purchase quote unconfirmed)' },
  { name: 'Verification Note', value: 'Protection, slip resistance, abrasion resistance, water resistance, and dust resistance are source-image claims. No certification, standard, or test report was provided.' },
  { name: 'Source', value: NOTION_URL },
  { name: 'Origin', value: 'China' },
]

function localFile(ref: string): string {
  const resolved = path.resolve(ROOT, ref)
  const relative = path.relative(ROOT, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`File path escapes the import directory: ${ref}`)
  }
  return resolved
}

async function save(ref: string, value: unknown): Promise<void> {
  await writeFile(localFile(ref), `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function buildAudit(): Promise<Audit> {
  const sources = await Promise.all(sourceDefinitions.map(async (source) => {
    const sourceBuffer = await readFile(localFile(source.sourceRef))
    return { ...source, sourceSha256: hash(sourceBuffer) }
  }))
  const assets = await Promise.all(assetDefinitions.map(async (asset) => {
    const [inputBuffer, outputBuffer] = await Promise.all([
      readFile(localFile(asset.inputRef)),
      readFile(localFile(asset.outputRef)),
    ])
    return {
      ...asset,
      inputSha256: hash(inputBuffer),
      outputSha256: hash(outputBuffer),
      qa: 'pass' as const,
    }
  }))
  return auditSchema.parse({
    product: {
      sourcePageId: NOTION_PAGE_ID,
      notionUrl: NOTION_URL,
      name: PRODUCT_NAME,
      slug: PRODUCT_SLUG,
      itemNumber: ITEM_NUMBER,
      storefrontPrice: '0.00 placeholder for an inactive draft',
      purchasePrice: '43 (currency and unit not stated)',
      minimumOrderQuantity: '100 (unit not stated)',
      inventory: 'Source inventory rejected; inactive draft stock is 0',
      variants: 'Size range 36-46 remains a specification; no variants or price tiers are created',
      claimBoundary: 'Protection and performance statements are source-image claims; no certification, standard, or test report was provided',
    },
    authorization: 'User requested one inactive product draft; apply still requires the explicit --apply flag',
    sources,
    assets,
    gate: {
      phase: 'pre-upload-reviewed',
      r2UploadAllowed: true,
      databaseMutationAllowed: false,
      reason: 'All approved final WebPs must pass local integrity checks before any upload.',
    },
  })
}

async function readAudit(): Promise<Audit> {
  const parsed: unknown = JSON.parse(await readFile(AUDIT_PATH, 'utf8'))
  return auditSchema.parse(parsed)
}

async function readManifest(): Promise<Manifest> {
  const parsed: unknown = JSON.parse(await readFile(UPLOAD_MANIFEST_PATH, 'utf8'))
  return manifestSchema.parse(parsed)
}

function expectedPublicPrefix(): string {
  return `${(process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com').replace(/\/$/, '')}/products/`
}

function hasTemporaryMediaUrl(url: string): boolean {
  return /prod-files-secure|X-Amz-|file:\/\//i.test(url)
}

async function validateAudit(audit: Audit, phase: 'pre-upload' | 'pre-db'): Promise<void> {
  const expectedSourceIndexes = Array.from({ length: 15 }, (_, index) => index + 1)
  const sourceIndexes = audit.sources.map((source) => source.sourceIndex).sort((a, b) => a - b)
  if (sourceIndexes.join(',') !== expectedSourceIndexes.join(',')) {
    throw new Error('Source coverage must reconcile all 15 Notion images exactly once')
  }
  if (new Set(audit.assets.map((asset) => asset.key)).size !== 13) {
    throw new Error('Final asset keys must be unique')
  }
  if (new Set(audit.assets.map((asset) => asset.finalIndex)).size !== 13) {
    throw new Error('Final asset indexes must be unique')
  }
  const orderedAssets = [...audit.assets].sort((a, b) => a.finalIndex - b.finalIndex)
  const expectedMapping = assetDefinitions.map((asset) => `${asset.finalIndex}:${asset.sourceIndex}:${asset.role}:${asset.outputRef}`)
  const actualMapping = orderedAssets.map((asset) => `${asset.finalIndex}:${asset.sourceIndex}:${asset.role}:${asset.outputRef}`)
  if (actualMapping.join('|') !== expectedMapping.join('|')) {
    throw new Error('Final asset mapping differs from the approved gallery/detail contract')
  }
  const represented = new Set(audit.assets.map((asset) => asset.sourceIndex))
  audit.sources.forEach((source) => {
    if ((source.decision === 'reject') === represented.has(source.sourceIndex)) {
      throw new Error(`Source decision disagrees with final media mapping: ${source.sourceIndex}`)
    }
  })
  const gallery = orderedAssets.filter((asset) => asset.role === 'gallery')
  const details = orderedAssets.filter((asset) => asset.role === 'detail')
  if (gallery.map((asset) => asset.sourceIndex).join(',') !== '1,2,14,15') {
    throw new Error('Gallery must use source indexes 1, 2, 14, and 15 in that order')
  }
  if (details.map((asset) => asset.sourceIndex).join(',') !== '5,6,7,8,9,10,11,12,13') {
    throw new Error('Details must use source indexes 5 through 13 in source order')
  }
  await Promise.all(audit.sources.map(async (source) => {
    const currentHash = hash(await readFile(localFile(source.sourceRef)))
    if (currentHash !== source.sourceSha256) {
      throw new Error(`Source file changed after audit: ${source.sourceRef}`)
    }
  }))
  await Promise.all(orderedAssets.map(async (asset) => {
    const [inputBuffer, outputBuffer] = await Promise.all([
      readFile(localFile(asset.inputRef)),
      readFile(localFile(asset.outputRef)),
    ])
    const metadata = await sharp(outputBuffer).metadata()
    if (hash(inputBuffer) !== asset.inputSha256) {
      throw new Error(`Approved input changed after audit: ${asset.inputRef}`)
    }
    if (hash(outputBuffer) !== asset.outputSha256 || metadata.format !== 'webp' || !metadata.width || !metadata.height) {
      throw new Error(`Final image failed WebP integrity validation: ${asset.outputRef}`)
    }
    if (/[^\x00-\x7F]/u.test(asset.alt)) {
      throw new Error(`Image alt text must use English ASCII text: ${asset.key}`)
    }
    if (phase === 'pre-db') {
      if (!asset.outputUrl || !asset.outputUrl.startsWith(expectedPublicPrefix()) || hasTemporaryMediaUrl(asset.outputUrl)) {
        throw new Error(`Asset lacks an approved durable public URL: ${asset.key}`)
      }
    }
  }))
  if (phase === 'pre-upload' && (!audit.gate.r2UploadAllowed || audit.gate.databaseMutationAllowed || audit.gate.phase !== 'pre-upload-reviewed')) {
    throw new Error('Pre-upload audit gate must allow R2 upload and forbid database mutation')
  }
  if (phase === 'pre-db' && (!audit.gate.r2UploadAllowed || !audit.gate.databaseMutationAllowed || audit.gate.phase !== 'pre-db-verified')) {
    throw new Error('Pre-db audit gate must allow database mutation only after public media verification')
  }
  log('audit_passed', { phase, sourceCount: 15, galleryCount: gallery.length, detailCount: details.length })
}

async function retry<T>(operation: () => Promise<T>, attempt = 1): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (attempt >= 3) throw error
    await new Promise((resolve) => setTimeout(resolve, attempt * 750))
    return retry(operation, attempt + 1)
  }
}

async function publicImage(asset: Asset): Promise<void> {
  const outputUrl = asset.outputUrl
  if (!outputUrl || !outputUrl.startsWith(expectedPublicPrefix()) || hasTemporaryMediaUrl(outputUrl)) {
    throw new Error(`Unexpected public media URL: ${asset.key}`)
  }
  const response = await fetch(outputUrl, { redirect: 'follow', signal: AbortSignal.timeout(30_000) })
  const contentType = response.headers.get('content-type') ?? ''
  if (response.status !== 200 || !contentType.toLowerCase().includes('image/webp')) {
    throw new Error(`Public image check failed for ${asset.key}: HTTP ${response.status} ${contentType || 'no content type'}`)
  }
  const publicBuffer = Buffer.from(await response.arrayBuffer())
  if (hash(publicBuffer) !== asset.outputSha256) {
    throw new Error(`Public image bytes do not match the reviewed WebP: ${asset.key}`)
  }
}

function duplicateWhere(): Prisma.ProductWhereInput {
  return {
    OR: [
      { slug: PRODUCT_SLUG },
      { name: { equals: PRODUCT_NAME, mode: 'insensitive' } },
      { specifications: { array_contains: [{ name: 'Source', value: NOTION_URL }] } },
      { specifications: { array_contains: [{ name: 'Item Number', value: ITEM_NUMBER }] } },
      { specifications: { array_contains: [{ name: 'Item Number', value: SOURCE_ITEM_NUMBER }] } },
    ],
  }
}

async function preflight(): Promise<{ category: { id: string; name: string; slug: string; isActive: boolean } }> {
  const [category, duplicates, redirect] = await Promise.all([
    prisma.category.findUnique({
      where: { slug: CATEGORY_SLUG },
      select: { id: true, name: true, slug: true, isActive: true },
    }),
    prisma.product.findMany({
      where: duplicateWhere(),
      select: { id: true, name: true, slug: true, isActive: true },
    }),
    prisma.productSlugRedirect.findUnique({
      where: { slug: PRODUCT_SLUG },
      select: { productId: true },
    }),
  ])
  if (!category || category.name !== CATEGORY_NAME || !category.isActive) {
    throw new Error('Active Safety Shoes category is missing or incompatible')
  }
  if (duplicates.length > 0) {
    throw new Error('A matching name, slug, Notion source, or item number already exists; refusing to create a duplicate draft')
  }
  if (redirect) {
    throw new Error('Product slug is reserved by an existing redirect')
  }
  return { category }
}

function productContent(details: Manifest['assets']): Prisma.InputJsonValue {
  return {
    time: Date.now(),
    version: '2.31.1',
    blocks: details.map((asset) => ({
      id: asset.key,
      type: 'image',
      data: {
        file: { url: asset.outputUrl },
        caption: asset.alt,
        withBorder: false,
        stretched: true,
        withBackground: false,
      },
    })),
  }
}

async function createDraft(manifest: Manifest, expectedCategoryId: string): Promise<{ id: string }> {
  const gallery = manifest.assets.filter((asset) => asset.role === 'gallery').sort((a, b) => a.finalIndex - b.finalIndex)
  const details = manifest.assets.filter((asset) => asset.role === 'detail').sort((a, b) => a.finalIndex - b.finalIndex)
  const primaryImage = gallery[0]
  if (gallery.length !== 4 || details.length !== 9 || !primaryImage) {
    throw new Error('Upload manifest asset counts are inconsistent')
  }
  return prisma.$transaction(async (tx) => {
    const [category, duplicate, redirect] = await Promise.all([
      tx.category.findUnique({ where: { slug: CATEGORY_SLUG } }),
      tx.product.findFirst({ where: duplicateWhere(), select: { id: true } }),
      tx.productSlugRedirect.findUnique({ where: { slug: PRODUCT_SLUG }, select: { productId: true } }),
    ])
    if (!category || !category.isActive || category.name !== CATEGORY_NAME || category.id !== expectedCategoryId) {
      throw new Error('Safety Shoes category changed after preflight')
    }
    if (duplicate || redirect) {
      throw new Error('Product identity became unavailable after preflight')
    }
    return tx.product.create({
      data: {
        name: PRODUCT_NAME,
        slug: PRODUCT_SLUG,
        description: 'Lightweight green low-cut lace-up safety shoes with a microfiber upper, source-stated iron or steel toe cap, puncture-resistant construction and a PU outsole. Protection and performance statements require product-specific documentation before publication.',
        price: PRODUCT_PRICE,
        comparePrice: null,
        cost: null,
        sku: null,
        stock: 0,
        weight: null,
        categoryId: category.id,
        isActive: false,
        isFeatured: false,
        specifications,
        content: productContent(details),
        usageScenes: ['construction', 'welding', 'automotive-repair', 'logistics'],
        metaTitle: 'Lightweight Breathable Steel-Toe Safety Shoes',
        metaDescription: 'Green low-cut microfiber safety shoes with source-stated toe and puncture protection, breathable construction and a PU outsole. Sizes 36-46.',
        metaKeywords: 'lightweight safety shoes, breathable safety shoes, green safety shoes, steel toe work shoes, puncture resistant safety shoes',
        ogTitle: PRODUCT_NAME,
        ogDescription: 'Lightweight green microfiber safety shoes with a breathable low-cut design and PU outsole.',
        ogImage: primaryImage.outputUrl,
        images: {
          create: gallery.map((asset, sortOrder) => ({
            url: asset.outputUrl,
            alt: asset.alt,
            sortOrder,
          })),
        },
      },
      select: { id: true },
    })
  }, { isolationLevel: 'Serializable', timeout: 30_000 })
}

function referencedAttemptedUrl(product: { images: Array<{ url: string }>; content: Prisma.JsonValue }, attemptedUrls: string[]): boolean {
  const serialized = JSON.stringify({ images: product.images, content: product.content })
  return attemptedUrls.some((url) => serialized.includes(url))
}

async function cleanupUploads(attemptedUrls: string[]): Promise<void> {
  const results = await Promise.allSettled(attemptedUrls.map((url) => deleteFromR2(url)))
  await save(path.basename(CLEANUP_PATH), results.map((result, index) => ({
    url: attemptedUrls[index],
    status: result.status,
    reason: result.status === 'rejected' ? String(result.reason) : undefined,
  })))
}

async function apply(audit: Audit): Promise<void> {
  const preflightResult = await preflight()
  await validateAudit(audit, 'pre-upload')
  assertR2Configured()
  const runId = randomUUID()
  const attemptedUrls: string[] = []
  let transactionStarted = false
  let committed = false
  try {
    await audit.assets.reduce<Promise<void>>(async (previous, asset) => {
      await previous
      const filename = `20260911-green-breathable-safety-shoes-${runId}-${asset.key}.webp`
      const expectedUrl = `${expectedPublicPrefix()}${filename}`
      attemptedUrls.push(expectedUrl)
      await save(path.basename(UPLOAD_ATTEMPTS_PATH), { runId, urls: attemptedUrls })
      const buffer = await readFile(localFile(asset.outputRef))
      if (hash(buffer) !== asset.outputSha256) {
        throw new Error(`Final WebP changed before upload: ${asset.key}`)
      }
      const outputUrl = await retry(() => uploadToR2(buffer, filename, 'image/webp'))
      if (outputUrl !== expectedUrl) {
        throw new Error(`R2 returned an unexpected public URL for ${asset.key}`)
      }
      asset.outputUrl = outputUrl
      await retry(() => publicImage(asset))
      log('image_uploaded', { key: asset.key, sourceIndex: asset.sourceIndex })
    }, Promise.resolve())
    audit.gate = {
      phase: 'pre-db-verified',
      r2UploadAllowed: true,
      databaseMutationAllowed: true,
      reason: 'All 13 reviewed WebPs have durable public URLs and passed HTTP, content-type, and byte-integrity checks.',
    }
    await validateAudit(audit, 'pre-db')
    const manifest = manifestSchema.parse({
      slug: PRODUCT_SLUG,
      runId,
      createdAt: new Date().toISOString(),
      assets: audit.assets,
    })
    await Promise.all([
      save(path.basename(PRE_DB_AUDIT_PATH), audit),
      save(path.basename(UPLOAD_MANIFEST_PATH), manifest),
    ])
    transactionStarted = true
    const product = await createDraft(manifest, preflightResult.category.id)
    committed = true
    await save('created-product.json', { ...product, runId, slug: PRODUCT_SLUG })
    log('created', product)
    await verify()
  } catch (error) {
    if (!committed && attemptedUrls.length > 0) {
      const transactionOutcome = transactionStarted
        ? await prisma.product.findUnique({
            where: { slug: PRODUCT_SLUG },
            select: { images: { select: { url: true } }, content: true },
          }).catch(() => undefined)
        : null
      if (transactionOutcome === undefined || (transactionOutcome && referencedAttemptedUrl(transactionOutcome, attemptedUrls))) {
        log('cleanup_deferred', { reason: 'Database outcome needs verification; uploaded media were retained to avoid breaking a committed product.' })
      } else {
        await cleanupUploads(attemptedUrls)
      }
    }
    throw error
  }
}

async function verify(): Promise<void> {
  const [product, manifest] = await Promise.all([
    prisma.product.findUnique({
      where: { slug: PRODUCT_SLUG },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        priceTiers: true,
      },
    }),
    readManifest(),
  ])
  if (!product) {
    throw new Error('Imported product draft was not found')
  }
  const content = editorContentSchema.parse(product.content)
  const detailUrls = content.blocks.map((block) => block.data.file.url)
  const galleryAssets = manifest.assets.filter((asset) => asset.role === 'gallery').sort((a, b) => a.finalIndex - b.finalIndex)
  const detailAssets = manifest.assets.filter((asset) => asset.role === 'detail').sort((a, b) => a.finalIndex - b.finalIndex)
  const allUrls = [...product.images.map((image) => image.url), ...detailUrls]
  const visibleSpecifications = JSON.stringify(getStorefrontVisibleProductSpecifications(product.specifications))
  const storedSpecifications = JSON.stringify(product.specifications)
  const publicText = JSON.stringify({
    name: product.name,
    description: product.description,
    content: product.content,
    specifications: product.specifications,
  })
  const assertions = {
    exactIdentity: product.name === PRODUCT_NAME && product.slug === PRODUCT_SLUG,
    category: product.category?.slug === CATEGORY_SLUG && product.category.name === CATEGORY_NAME && product.category.isActive,
    inactive: !product.isActive && !product.isFeatured,
    placeholderPrice: product.price.toString() === '0',
    noInventedCommerce: product.comparePrice === null && product.cost === null && product.sku === null && product.stock === 0 && product.weight === null,
    noVariants: product.variants.length === 0,
    noPriceTiers: product.priceTiers.length === 0,
    exactSpecifications: storedSpecifications === JSON.stringify(specifications),
    ambiguousPurchasePricePreserved: storedSpecifications.includes('43 (currency and unit not stated; current purchase quote unconfirmed)'),
    ambiguousMoqPreserved: storedSpecifications.includes('100 (unit not stated)'),
    itemNumber: storedSpecifications.includes(ITEM_NUMBER) && !storedSpecifications.includes(SOURCE_ITEM_NUMBER),
    claimBoundary: storedSpecifications.includes('source-image claims') && storedSpecifications.includes('No certification, standard, or test report was provided'),
    gallery: product.images.length === 4 && product.images.every((image, index) => image.url === galleryAssets[index]?.outputUrl && image.alt === galleryAssets[index]?.alt && image.sortOrder === index),
    details: detailUrls.length === 9 && detailUrls.every((url, index) => url === detailAssets[index]?.outputUrl),
    ogImage: product.ogImage === galleryAssets[0]?.outputUrl,
    uniqueDurableMedia: allUrls.length === 13 && new Set(allUrls).size === 13 && allUrls.every((url) => url.startsWith(expectedPublicPrefix()) && !hasTemporaryMediaUrl(url)),
    internalSpecificationsHidden: !visibleSpecifications.includes(NOTION_URL) && !visibleSpecifications.includes('43 (currency and unit not stated'),
    englishProductContent: !/[\u3400-\u9fff]/u.test(publicText),
    noProcessText: !/(rebuilt|localized|supplier markings removed|AI-generated)/i.test(publicText),
    noMarketplaceValues: !/stock available|marketplace price|CNY\s*35|CNY\s*43/i.test(publicText),
  }
  const failed = Object.entries(assertions).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length > 0) {
    throw new Error(`Draft verification failed: ${failed.join(', ')}`)
  }
  await manifest.assets.reduce<Promise<void>>(async (previous, asset) => {
    await previous
    await retry(() => publicImage(asset))
  }, Promise.resolve())
  const storefrontUrl = `https://www.laifappe.com/products/${PRODUCT_SLUG}`
  const storefront = await fetch(storefrontUrl, { redirect: 'follow', signal: AbortSignal.timeout(30_000) })
  await storefront.body?.cancel()
  if (storefront.status !== 404) {
    throw new Error(`Expected unpublished storefront 404, received ${storefront.status}`)
  }
  const result = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category?.name,
    price: product.price.toString(),
    stock: product.stock,
    sku: product.sku,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    variantCount: product.variants.length,
    priceTierCount: product.priceTiers.length,
    galleryCount: product.images.length,
    detailCount: detailUrls.length,
    publicMediaVerified: manifest.assets.length,
    storefrontUrl,
    storefrontStatus: storefront.status,
    assertions,
    adminUrl: `https://www.laifappe.com/admin/products/${product.id}`,
  }
  await writeFile(VERIFICATION_PATH, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  log('verified', result)
}

const commandSchema = z.enum(['--audit', '--preflight', '--apply', '--verify'])

async function main(): Promise<void> {
  const flags = process.argv.slice(2)
  if (flags.length > 1) {
    throw new Error('Use only one mode: --audit, --preflight, --apply, or --verify')
  }
  const command = flags[0] ? commandSchema.parse(flags[0]) : undefined
  if (command === '--audit') {
    const audit = await buildAudit()
    await validateAudit(audit, 'pre-upload')
    await save(path.basename(AUDIT_PATH), audit)
    log('audit_saved', { path: AUDIT_PATH, assets: audit.assets.length })
    return
  }
  if (command === '--preflight') {
    log('preflight', await preflight())
    return
  }
  if (command === '--verify') {
    await verify()
    return
  }
  const audit = await readAudit()
  await validateAudit(audit, 'pre-upload')
  if (command === '--apply') {
    await apply(audit)
    return
  }
  const preflightResult = await preflight()
  log('dry_run', {
    category: preflightResult.category.name,
    name: PRODUCT_NAME,
    slug: PRODUCT_SLUG,
    price: PRODUCT_PRICE.toString(),
    purchasePrice: '43 (currency and unit not stated)',
    minimumOrderQuantity: '100 (unit not stated)',
    galleryCount: 4,
    detailCount: 9,
    isActive: false,
    applyRequired: true,
  })
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({ event: 'import_failed', message: error instanceof Error ? error.message : String(error) })}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
