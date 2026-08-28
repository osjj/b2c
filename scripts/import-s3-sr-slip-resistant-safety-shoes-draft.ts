import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'
import { z } from 'zod'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const IMPORT_DIR = path.resolve('output/s3-sr-safety-shoes-draft')
const ENGLISH_DIR = path.join(IMPORT_DIR, 'english')
const FINAL_DIR = path.join(IMPORT_DIR, 'final')
const AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.json')
const PRE_DB_AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.pre-db.json')
const UPLOAD_MANIFEST_PATH = path.join(IMPORT_DIR, 'upload-manifest.json')

const NOTION_PAGE_ID = '3c2d505a-0030-807b-9586-df14ddf66964'
const NOTION_URL = 'https://app.notion.com/p/3c2d505a0030807b9586df14ddf66964?pvs=204'
const CATEGORY_SLUG = 'safety-shoes'
const PRODUCT_NAME = 'S3 SR防滑防砸防刺穿防静电安全鞋'
const PRODUCT_SLUG = 's3-sr-slip-resistant-steel-toe-antistatic-safety-shoes'
const PRODUCT_PRICE = new Prisma.Decimal('0.00')

const acceptedAssets = [
  { sourceIndex: 4, input: '04-hero-en.png', provenance: 'gallery' as const },
  { sourceIndex: 5, input: '05-antistatic-en.png', provenance: 'gallery' as const },
  { sourceIndex: 6, input: '06-applications-en.png', provenance: 'detail' as const },
  { sourceIndex: 7, input: '07-product-info-en.png', provenance: 'gallery' as const },
  { sourceIndex: 9, input: '09-protection-en.png', provenance: 'detail' as const },
  { sourceIndex: 10, input: '10-wear-resistant-en.png', provenance: 'detail' as const },
  { sourceIndex: 11, input: '11-slip-resistant-en.png', provenance: 'detail' as const },
  { sourceIndex: 12, input: '12-SR-slip-resistance-en.png', provenance: 'detail' as const },
  { sourceIndex: 13, input: '13-integrated-tongue-en.png', provenance: 'detail' as const },
  { sourceIndex: 14, input: '14-antistatic-tongue-en.png', provenance: 'detail' as const },
  { sourceIndex: 15, input: '15-cowhide-detail-en.png', provenance: 'detail' as const },
  { sourceIndex: 16, input: '16-lining-detail-en.png', provenance: 'detail' as const },
  { sourceIndex: 17, input: '17-sole-detail-en.png', provenance: 'detail' as const },
]

const rejectedAssets = [
  { sourceIndex: 1, reason: 'Supplier attribute screenshot contains supplier identity and internal listing fields' },
  { sourceIndex: 2, reason: 'Commercial screenshot contains source price and stock data that are not approved storefront values' },
  { sourceIndex: 3, reason: 'Commercial listing screenshot contains source price and marketplace interface content' },
  { sourceIndex: 8, reason: 'Size chart includes sizes 47-50, while the source sales range is limited to 36-46' },
]

const auditSchema = z.object({
  product: z.object({
    sourcePageId: z.literal(NOTION_PAGE_ID),
    notionUrl: z.literal(NOTION_URL),
    title: z.literal(PRODUCT_NAME),
    sellingPriceStatus: z.literal('Not provided; inactive draft price 0.00 is a schema placeholder only'),
    skuStatus: z.literal('Not provided; no SKU created'),
    stockStatus: z.literal('Not provided; inactive draft stock is 0'),
    variantStatus: z.literal('Not created; source sales sizes 36-46 remain a specification only'),
    complianceStatus: z.literal('S3, CE, SR and performance values are source claims; no product certificate or test report was provided'),
  }),
  sourceCoverage: z.object({
    notionImages: z.literal(17),
    selectedFinalAssets: z.literal(13),
    excludedSourceImages: z.literal(4),
    excluded: z.array(z.object({ sourceIndex: z.number().int(), reason: z.string().min(1) })).length(4),
  }),
  finalAssets: z.array(z.object({
    sourceIndex: z.number().int(),
    provenance: z.enum(['gallery', 'detail']),
    inputRef: z.string().min(1),
    outputRef: z.string().min(1),
    outputUrl: z.string().url().optional(),
    qa: z.literal('pass'),
  })).length(13),
  gate: z.object({
    phase: z.string().min(1),
    r2UploadAllowed: z.boolean(),
    databaseMutationAllowed: z.boolean(),
    reason: z.string().min(1),
  }),
})

const manifestSchema = z.object({
  productSlug: z.literal(PRODUCT_SLUG),
  createdAt: z.string().datetime(),
  assets: z.array(z.object({
    sourceIndex: z.number().int(),
    provenance: z.enum(['gallery', 'detail']),
    outputRef: z.string().min(1),
    outputUrl: z.string().url(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })).length(13),
})

type ImportAudit = z.infer<typeof auditSchema>
type UploadManifest = z.infer<typeof manifestSchema>
type UploadedAsset = UploadManifest['assets'][number]

const prisma = new PrismaClient()

const specifications: Prisma.InputJsonValue = [
  { name: 'Product Type', value: 'Slip-Resistant Steel-Toe, Puncture-Resistant and Antistatic Safety Shoes' },
  { name: 'Style', value: 'Low- to Mid-Cut, Lace-Up' },
  { name: 'Safety Classification', value: 'S3 (source-stated; exact standard/version and certificate not provided)' },
  { name: 'Certification', value: 'CE (source-stated; certificate number, issuing body and supporting document not provided)' },
  { name: 'Upper Material', value: 'Lychee-Grain Cowhide' },
  { name: 'Toe Protection', value: 'Steel Toe Cap' },
  { name: 'Impact Resistance', value: '≥200 J (source-stated; test report not provided)' },
  { name: 'Compression Resistance', value: '≥15 kN (source-stated; test report not provided)' },
  { name: 'Puncture Protection', value: 'Steel puncture-resistant midsole' },
  { name: 'Puncture Resistance', value: '≥1100 N (source-stated; test report not provided)' },
  { name: 'Outsole', value: 'Double-Density Injected Solid PU Sole' },
  { name: 'Manufacturing Process', value: 'PU Injection' },
  { name: 'Lining', value: 'Honeycomb breathable lining; source-stated absorbent and breathable construction' },
  { name: 'Tongue', value: 'Integrated tongue; source imagery states it helps block water, dust and sand' },
  { name: 'Slip Resistance', value: 'Deep-tread solid outsole; SR level is source-stated and supporting test documentation was not provided' },
  { name: 'Other Source-Stated Features', value: 'Wear resistance and antistatic performance; supporting test documentation not provided' },
  { name: 'Sales Size Range', value: '36-46 (source sizing system not stated; no selectable variants created)' },
  { name: 'Source Weight', value: '1000 (source unit not stated; not mapped to the product weight field)' },
  { name: 'Applications', value: 'Wet environments, construction, machinery manufacturing, semiconductor, glass processing, automotive repair, logistics and metalworking' },
  { name: 'Purchase Price', value: 'CNY 54-55 per pair; source screenshot also states MOQ 1 pair; verify current quotation, unit basis and availability' },
  { name: 'Verification Note', value: 'S3, CE, SR, antistatic, water-blocking and performance values are source claims. No product certificate number, exact standard, issuing body or test report was provided.' },
  { name: 'Source', value: NOTION_URL },
  { name: 'Origin', value: 'China' },
]

function initialAudit(): ImportAudit {
  return auditSchema.parse({
    product: {
      sourcePageId: NOTION_PAGE_ID,
      notionUrl: NOTION_URL,
      title: PRODUCT_NAME,
      sellingPriceStatus: 'Not provided; inactive draft price 0.00 is a schema placeholder only',
      skuStatus: 'Not provided; no SKU created',
      stockStatus: 'Not provided; inactive draft stock is 0',
      variantStatus: 'Not created; source sales sizes 36-46 remain a specification only',
      complianceStatus: 'S3, CE, SR and performance values are source claims; no product certificate or test report was provided',
    },
    sourceCoverage: {
      notionImages: 17,
      selectedFinalAssets: 13,
      excludedSourceImages: 4,
      excluded: rejectedAssets,
    },
    finalAssets: acceptedAssets.map((asset, index) => ({
      sourceIndex: asset.sourceIndex,
      provenance: asset.provenance,
      inputRef: path.join('english', asset.input),
      outputRef: path.join('final', `s3-sr-safety-shoes-${String(index + 1).padStart(2, '0')}.webp`),
      qa: 'pass',
    })),
    gate: {
      phase: 'pre-upload-approved',
      r2UploadAllowed: true,
      databaseMutationAllowed: false,
      reason: 'The user explicitly requested an inactive product draft and English-localized product images.',
    },
  })
}

function resolveWithin(base: string, relativeRef: string): string {
  const resolved = path.resolve(base, relativeRef)
  const relative = path.relative(base, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path resolves outside the expected directory: ${relativeRef}`)
  }
  return resolved
}

async function validateAudit(audit: ImportAudit, phase: 'pre-upload' | 'pre-db'): Promise<void> {
  const indexes = [...audit.finalAssets.map((asset) => asset.sourceIndex), ...audit.sourceCoverage.excluded.map((asset) => asset.sourceIndex)]
    .sort((a, b) => a - b)
  if (indexes.join(',') !== Array.from({ length: 17 }, (_, index) => index + 1).join(',')) {
    throw new Error('Audit must reconcile all 17 Notion source images exactly once')
  }
  if (audit.finalAssets.filter((asset) => asset.provenance === 'gallery').length !== 3) {
    throw new Error('Exactly three gallery assets are required')
  }
  if (audit.finalAssets.filter((asset) => asset.provenance === 'detail').length !== 10) {
    throw new Error('Exactly ten detail assets are required')
  }
  for (const asset of audit.finalAssets) {
    const filePath = resolveWithin(IMPORT_DIR, asset.outputRef)
    const metadata = await sharp(filePath).metadata()
    if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
      throw new Error(`Invalid final WebP: ${asset.outputRef}`)
    }
    if (phase === 'pre-db' && (!asset.outputUrl || asset.outputUrl.includes('prod-files-secure'))) {
      throw new Error(`Asset ${asset.sourceIndex} lacks a durable R2 URL`)
    }
  }
  if (phase === 'pre-upload' && (!audit.gate.r2UploadAllowed || audit.gate.databaseMutationAllowed)) {
    throw new Error('Pre-upload gate must allow upload and forbid database mutation')
  }
  if (phase === 'pre-db' && (!audit.gate.r2UploadAllowed || !audit.gate.databaseMutationAllowed)) {
    throw new Error('Pre-db gate must allow both R2 upload and database mutation')
  }
}

async function prepareAssets(): Promise<ImportAudit> {
  const audit = initialAudit()
  await mkdir(FINAL_DIR, { recursive: true })
  for (const asset of audit.finalAssets) {
    const inputPath = resolveWithin(IMPORT_DIR, asset.inputRef)
    if (path.dirname(inputPath) !== ENGLISH_DIR) {
      throw new Error(`Approved asset is outside the English review directory: ${asset.inputRef}`)
    }
    await sharp(inputPath)
      .rotate()
      .webp({ quality: 90, effort: 6, smartSubsample: true })
      .toFile(resolveWithin(IMPORT_DIR, asset.outputRef))
  }
  await validateAudit(audit, 'pre-upload')
  await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, 'utf8')
  return audit
}

async function withRetry<T>(label: string, operation: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 750))
    }
  }
  throw new Error(`${label} failed after 3 attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}

async function assertPublicWebp(url: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' })
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.toLowerCase().includes('image/webp')) {
    throw new Error(`Uploaded asset returned HTTP ${response.status} with ${contentType || 'no content type'}`)
  }
  await response.body?.cancel()
}

async function cleanupUrls(urls: string[]): Promise<string[]> {
  const results = await Promise.allSettled(urls.map((url) => deleteFromR2(url)))
  return results.flatMap((result, index) => result.status === 'rejected' ? [urls[index] ?? 'unknown'] : [])
}

async function uploadAssets(audit: ImportAudit): Promise<UploadManifest> {
  await validateAudit(audit, 'pre-upload')
  const uploaded: UploadedAsset[] = []
  try {
    for (const asset of audit.finalAssets) {
      const filePath = resolveWithin(IMPORT_DIR, asset.outputRef)
      const [buffer, metadata] = await Promise.all([readFile(filePath), sharp(filePath).metadata()])
      if (!metadata.width || !metadata.height) throw new Error(`Missing dimensions: ${asset.outputRef}`)
      const role = asset.provenance === 'gallery' ? 'g' : 'd'
      const filename = `20260823-s3-sr-safety-shoes-v1-${role}${String(asset.sourceIndex).padStart(2, '0')}-${randomUUID().slice(0, 8)}.webp`
      const outputUrl = await withRetry(`R2 upload for source ${asset.sourceIndex}`, () => uploadToR2(buffer, filename, 'image/webp'))
      await withRetry(`Public verification for source ${asset.sourceIndex}`, () => assertPublicWebp(outputUrl))
      asset.outputUrl = outputUrl
      uploaded.push({
        sourceIndex: asset.sourceIndex,
        provenance: asset.provenance,
        outputRef: asset.outputRef,
        outputUrl,
        width: metadata.width,
        height: metadata.height,
      })
    }
    audit.gate = {
      phase: 'pre-db-approved',
      r2UploadAllowed: true,
      databaseMutationAllowed: true,
      reason: 'All 13 approved English WebPs have durable R2 URLs and passed public HTTP verification.',
    }
    await validateAudit(audit, 'pre-db')
    const manifest = manifestSchema.parse({ productSlug: PRODUCT_SLUG, createdAt: new Date().toISOString(), assets: uploaded })
    await Promise.all([
      writeFile(PRE_DB_AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, 'utf8'),
      writeFile(UPLOAD_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    ])
    return manifest
  } catch (error) {
    const failedCleanup = await cleanupUrls(uploaded.map((asset) => asset.outputUrl))
    const cleanup = failedCleanup.length ? `Manual cleanup required: ${failedCleanup.join(', ')}` : 'New uploads were cleaned up.'
    throw new Error(`Asset upload failed: ${error instanceof Error ? error.message : String(error)}. ${cleanup}`)
  }
}

async function preflight() {
  const [category, products, redirect] = await Promise.all([
    prisma.category.findUnique({ where: { slug: CATEGORY_SLUG } }),
    prisma.product.findMany({
      where: { OR: [{ slug: PRODUCT_SLUG }, { name: { equals: PRODUCT_NAME, mode: 'insensitive' } }] },
      select: { id: true, slug: true, isActive: true },
    }),
    prisma.productSlugRedirect.findUnique({ where: { slug: PRODUCT_SLUG }, select: { productId: true } }),
  ])
  if (!category || category.name !== 'Safety Shoes' || !category.isActive) {
    throw new Error('Active Safety Shoes category is missing or incompatible')
  }
  if (products.length) throw new Error('A matching product already exists; refusing to create a duplicate draft')
  if (redirect) throw new Error('Product slug is reserved by an existing redirect')
  return { category }
}

function productContent(details: UploadedAsset[]): Prisma.InputJsonValue {
  return {
    time: Date.now(),
    version: '2.31.1',
    blocks: details.map((asset) => ({
      id: `s3-sr-safety-shoes-${asset.sourceIndex}`,
      type: 'image',
      data: {
        file: { url: asset.outputUrl },
        caption: '',
        withBorder: false,
        stretched: true,
        withBackground: false,
      },
    })),
  }
}

const galleryAlt = new Map<number, string>([
  [4, 'Black S3 SR slip-resistant steel-toe antistatic safety shoes'],
  [5, 'Black antistatic safety shoes for industrial work'],
  [7, 'Black cowhide steel-toe safety shoes product information view'],
])

async function writeProduct(manifest: UploadManifest, categoryId: string) {
  const gallery = manifest.assets.filter((asset) => asset.provenance === 'gallery').sort((a, b) => a.sourceIndex - b.sourceIndex)
  const details = manifest.assets.filter((asset) => asset.provenance === 'detail').sort((a, b) => a.sourceIndex - b.sourceIndex)
  if (gallery.length !== 3 || details.length !== 10) throw new Error('Upload manifest asset counts are inconsistent')
  return prisma.$transaction(async (tx) => {
    const [category, productConflict, redirectConflict] = await Promise.all([
      tx.category.findUnique({ where: { slug: CATEGORY_SLUG } }),
      tx.product.findUnique({ where: { slug: PRODUCT_SLUG }, select: { id: true } }),
      tx.productSlugRedirect.findUnique({ where: { slug: PRODUCT_SLUG }, select: { productId: true } }),
    ])
    if (!category || !category.isActive || category.id !== categoryId) throw new Error('Safety Shoes category changed after preflight')
    if (productConflict || redirectConflict) throw new Error('Product slug became unavailable after preflight')
    return tx.product.create({
      data: {
        name: PRODUCT_NAME,
        slug: PRODUCT_SLUG,
        description: 'Low- to mid-cut lace-up safety shoes with a lychee-grain cowhide upper, steel toe cap, steel puncture-resistant midsole and double-density injected solid PU outsole. Source imagery states S3, CE, SR slip resistance and antistatic performance; supporting certificates and test reports have not been provided.',
        price: PRODUCT_PRICE,
        comparePrice: null,
        cost: null,
        sku: null,
        stock: 0,
        categoryId: category.id,
        isActive: false,
        isFeatured: false,
        specifications,
        content: productContent(details),
        usageScenes: ['wet-environments', 'construction', 'machinery-manufacturing', 'semiconductor', 'glass-processing', 'automotive-repair', 'logistics', 'metalworking'],
        metaTitle: 'S3 SR Slip-Resistant Antistatic Safety Shoes',
        metaDescription: 'Cowhide S3 safety shoes with steel toe, puncture-resistant midsole and PU outsole. Source-stated SR, CE and antistatic claims require documentation.',
        metaKeywords: 'S3 safety shoes, SR slip resistant safety shoes, steel toe work shoes, puncture resistant shoes, antistatic safety footwear',
        ogTitle: PRODUCT_NAME,
        ogDescription: 'Cowhide steel-toe safety shoes with puncture-resistant construction and a source-stated SR slip-resistance level.',
        ogImage: gallery[0]?.outputUrl ?? null,
        images: {
          create: gallery.map((asset, index) => ({
            url: asset.outputUrl,
            alt: galleryAlt.get(asset.sourceIndex) ?? PRODUCT_NAME,
            sortOrder: index,
          })),
        },
      },
      include: { images: true, variants: true, priceTiers: true, category: true },
    })
  }, { isolationLevel: 'Serializable', timeout: 30_000 })
}

async function verifyImportedDraft(): Promise<Record<string, unknown>> {
  const product = await prisma.product.findUnique({
    where: { slug: PRODUCT_SLUG },
    include: { category: true, images: { orderBy: { sortOrder: 'asc' } }, variants: true, priceTiers: true },
  })
  if (!product) throw new Error('Imported product draft was not found')
  const content = product.content as { blocks?: Array<{ data?: { file?: { url?: string } } }> } | null
  const detailUrls = content?.blocks?.flatMap((block) => block.data?.file?.url ? [block.data.file.url] : []) ?? []
  const allUrls = [...product.images.map((image) => image.url), ...detailUrls]
  const assertions = {
    requestedName: product.name === PRODUCT_NAME,
    placeholderPrice: product.price.toString() === '0',
    inactive: !product.isActive && !product.isFeatured,
    category: product.category?.slug === CATEGORY_SLUG,
    galleryCount: product.images.length === 3,
    detailCount: detailUrls.length === 10,
    noVariants: product.variants.length === 0,
    noPriceTiers: product.priceTiers.length === 0,
    noSku: product.sku === null,
    zeroStock: product.stock === 0,
    noTemporaryNotionImages: allUrls.every((url) => !url.includes('prod-files-secure')),
    sourceCaveatPresent: JSON.stringify(product.specifications).includes('test report not provided'),
  }
  const failed = Object.entries(assertions).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length) throw new Error(`Draft verification failed: ${failed.join(', ')}`)
  await Promise.all(allUrls.map(assertPublicWebp))
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price.toString(),
    stock: product.stock,
    sku: product.sku,
    category: product.category?.name,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    galleryCount: product.images.length,
    detailCount: detailUrls.length,
    variantCount: product.variants.length,
    priceTierCount: product.priceTiers.length,
    assertions,
  }
}

async function main(): Promise<void> {
  if (process.argv.includes('--verify')) {
    process.stdout.write(`${JSON.stringify({ mode: 'verify', product: await verifyImportedDraft() }, null, 2)}\n`)
    return
  }
  const preflightResult = await preflight()
  const audit = await prepareAssets()
  if (!process.argv.includes('--execute')) {
    process.stdout.write(`${JSON.stringify({
      mode: 'dry-run',
      category: { id: preflightResult.category.id, name: preflightResult.category.name },
      proposed: { name: PRODUCT_NAME, slug: PRODUCT_SLUG, price: PRODUCT_PRICE.toString(), galleryCount: 3, detailCount: 10, isActive: false, isFeatured: false },
      sourceCoverage: audit.sourceCoverage,
    }, null, 2)}\n`)
    return
  }
  const manifest = await uploadAssets(audit)
  let product: Awaited<ReturnType<typeof writeProduct>>
  try {
    product = await writeProduct(manifest, preflightResult.category.id)
  } catch (error) {
    const failedCleanup = await cleanupUrls(manifest.assets.map((asset) => asset.outputUrl))
    const cleanup = failedCleanup.length ? `Manual cleanup required: ${failedCleanup.join(', ')}` : 'New uploads were cleaned up.'
    throw new Error(`Database write failed: ${error instanceof Error ? error.message : String(error)}. ${cleanup}`)
  }
  process.stdout.write(`${JSON.stringify({
    mode: 'execute',
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price.toString(),
      stock: product.stock,
      sku: product.sku,
      category: product.category?.name,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      galleryCount: product.images.length,
      variantCount: product.variants.length,
      priceTierCount: product.priceTiers.length,
    },
  }, null, 2)}\n`)
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Import failed: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
