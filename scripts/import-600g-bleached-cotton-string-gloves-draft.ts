import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'
import { z } from 'zod'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const IMPORT_DIR = path.resolve('output/600g-bleached-cotton-string-gloves')
const REVIEW_DIR = path.resolve('tmp/notion-600g-cotton-gloves/review-v2')
const FINAL_DIR = path.join(IMPORT_DIR, 'final')
const AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.json')
const PRE_DB_AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.pre-db.json')
const UPLOAD_MANIFEST_PATH = path.join(IMPORT_DIR, 'upload-manifest.json')

const CATEGORY_SLUG = 'knit-gloves'
const CATEGORY_NAME = 'Knit Gloves'
const PRODUCT_NAME = '600g Thick Bleached Cotton String Work Gloves'
const PRODUCT_SLUG = '600g-thick-bleached-cotton-string-work-gloves'
const PRODUCT_PRICE = new Prisma.Decimal('0.00')
const NOTION_PAGE_ID = '3bdd505a-0030-808b-8b32-fa934f655219'
const NOTION_URL = 'https://app.notion.com/p/3bdd505a0030808b8b32fa934f655219'

const FINAL_SOURCE_FILES = new Map<number, string>([
  [1, '01-pair-front-back.png'],
  [2, '02-knit-detail.png'],
  [3, '03-hand-worn-front-cleaned.png'],
  [4, '04-hand-worn-angle.png'],
  [5, '05-hand-worn-back.png'],
  [6, '06-en-thick-dense-knit.png'],
  [7, '07-en-work-gloves.png'],
  [8, '08-en-comfort.png'],
  [9, '09-en-material-detail.png'],
  [10, '10-en-flexibility.png'],
  [11, '11-en-applications.png'],
])

const sourceDecisionSchema = z.enum(['keep', 'localize', 'rebuild', 'reject'])
const finalDecisionSchema = z.enum(['keep', 'localize', 'rebuild'])
const provenanceSchema = z.enum(['gallery', 'detail'])

const sourceAssetSchema = z.object({
  sourceIndex: z.number().int().min(1),
  sourceRef: z.string().min(1),
  decision: sourceDecisionSchema,
  categories: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1),
})

const finalAssetSchema = z.object({
  finalIndex: z.number().int().min(1),
  provenance: provenanceSchema,
  decision: finalDecisionSchema,
  categories: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1),
  derivedFromSourceIndexes: z.array(z.number().int().min(1)).min(1),
  inputRef: z.string().min(1),
  outputRef: z.string().min(1),
  outputUrl: z.string().url().optional(),
  qa: z.literal('pass'),
})

const importAuditSchema = z.object({
  product: z.object({
    sourcePageId: z.string().min(1),
    notionUrl: z.string().url(),
    title: z.string().min(1),
    purchasePriceEvidence: z.string().min(1),
    minimumOrderQuantity: z.string().min(1),
    sellingPriceStatus: z.string().min(1),
    draftPricePlaceholder: z.literal('0.00'),
    storefrontStockStatus: z.string().min(1),
    supplierStockEvidence: z.string().min(1),
    skuStatus: z.string().min(1),
    variantStatus: z.string().min(1),
    priceTierStatus: z.string().min(1),
  }),
  sourceTotals: z.object({
    notionImages: z.literal(13),
    approvedFinalAssets: z.literal(11),
    rejectedSourceImages: z.literal(5),
  }),
  sourceAssets: z.array(sourceAssetSchema),
  finalAssets: z.array(finalAssetSchema),
  gate: z.object({
    phase: z.string().min(1),
    sourceCoverage: z.string().min(1),
    databaseMutationAllowed: z.boolean(),
    r2UploadAllowed: z.boolean(),
    reason: z.string().min(1),
  }),
})

const uploadManifestSchema = z.object({
  productSlug: z.literal(PRODUCT_SLUG),
  createdAt: z.string().datetime(),
  assets: z.array(z.object({
    finalIndex: z.number().int().min(1),
    provenance: provenanceSchema,
    outputRef: z.string().min(1),
    outputUrl: z.string().url(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })),
})

const editorContentSchema = z.object({
  blocks: z.array(z.object({
    data: z.object({
      file: z.object({
        url: z.string().url(),
      }),
    }),
  })),
})

type ImportAudit = z.infer<typeof importAuditSchema>
type UploadManifest = z.infer<typeof uploadManifestSchema>
type UploadedAsset = UploadManifest['assets'][number]

const prisma = new PrismaClient()

function sequentialIndexes(values: number[], expectedLength: number): boolean {
  return values
    .slice()
    .sort((a, b) => a - b)
    .every((value, index) => value === index + 1) && values.length === expectedLength
}

function resolveImportOutput(outputRef: string): string {
  const resolved = path.resolve(IMPORT_DIR, outputRef)
  const relative = path.relative(IMPORT_DIR, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Audit outputRef resolves outside the import directory: ' + outputRef)
  }
  return resolved
}

async function readAudit(filePath = AUDIT_PATH): Promise<ImportAudit> {
  const raw: unknown = JSON.parse(await readFile(filePath, 'utf8'))
  return importAuditSchema.parse(raw)
}

async function validateAudit(audit: ImportAudit, phase: 'pre-upload' | 'pre-db'): Promise<void> {
  if (audit.product.sourcePageId !== NOTION_PAGE_ID || audit.product.notionUrl !== NOTION_URL) {
    throw new Error('Audit source does not match the approved Notion product')
  }
  if (audit.product.purchasePriceEvidence !== 'CNY 0.64/Pair (source screenshot; verify current quote)') {
    throw new Error('Purchase-price evidence changed unexpectedly')
  }
  if (audit.product.minimumOrderQuantity !== '12 Pairs') {
    throw new Error('Minimum order quantity must remain 12 Pairs')
  }
  if (!/not provided/i.test(audit.product.sellingPriceStatus)) {
    throw new Error('Audit must state that a storefront selling price was not provided')
  }
  if (!/not created/i.test(audit.product.variantStatus) || !/not created/i.test(audit.product.priceTierStatus)) {
    throw new Error('Audit must forbid inferred variants and price tiers')
  }
  if (!sequentialIndexes(audit.sourceAssets.map((asset) => asset.sourceIndex), 13)) {
    throw new Error('Source audit must cover Notion images 1 through 13 exactly once')
  }
  const rejectedSources = audit.sourceAssets.filter((asset) => asset.decision === 'reject')
  if (rejectedSources.length !== 5) {
    throw new Error('Expected exactly five deliberately excluded source images')
  }
  if (!sequentialIndexes(audit.finalAssets.map((asset) => asset.finalIndex), 11)) {
    throw new Error('Final audit must cover approved assets 1 through 11 exactly once')
  }
  const gallery = audit.finalAssets.filter((asset) => asset.provenance === 'gallery')
  const details = audit.finalAssets.filter((asset) => asset.provenance === 'detail')
  if (gallery.length !== 5 || details.length !== 6) {
    throw new Error('Expected five gallery assets and six detail assets')
  }
  const finalOutputRefs = new Set(audit.finalAssets.map((asset) => asset.outputRef))
  if (finalOutputRefs.size !== 11) {
    throw new Error('Final outputRef values must be unique')
  }
  await Promise.all(
    audit.finalAssets.map(async (asset) => {
      if (asset.derivedFromSourceIndexes.some((sourceIndex) => sourceIndex < 1 || sourceIndex > 13)) {
        throw new Error('Final asset has an invalid source mapping: ' + asset.finalIndex)
      }
      if (asset.inputRef.includes('03-hand-worn-front.png') && !asset.inputRef.includes('cleaned')) {
        throw new Error('Uncleaned hand-worn image must not enter the approved set')
      }
      const metadata = await sharp(resolveImportOutput(asset.outputRef)).metadata()
      if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
        throw new Error('Final asset is not a valid WebP: ' + asset.outputRef)
      }
      if (phase === 'pre-db') {
        if (!asset.outputUrl || asset.outputUrl.includes('prod-files-secure')) {
          throw new Error('Final asset lacks a durable R2 URL: ' + asset.finalIndex)
        }
      }
    })
  )
  if (phase === 'pre-upload' && (!audit.gate.r2UploadAllowed || audit.gate.databaseMutationAllowed)) {
    throw new Error('Pre-upload gate must allow R2 upload but forbid database mutation')
  }
  if (phase === 'pre-db' && (!audit.gate.r2UploadAllowed || !audit.gate.databaseMutationAllowed)) {
    throw new Error('Pre-db gate must allow R2 upload and database mutation')
  }
}

async function prepareAssets(audit: ImportAudit): Promise<Array<Record<string, unknown>>> {
  await mkdir(FINAL_DIR, { recursive: true })
  const prepared = await Promise.all(
    audit.finalAssets.map(async (asset) => {
      const sourceName = FINAL_SOURCE_FILES.get(asset.finalIndex)
      if (!sourceName) {
        throw new Error('No reviewed source file configured for final asset ' + asset.finalIndex)
      }
      const expectedInput = path.resolve(REVIEW_DIR, sourceName)
      if (path.resolve(asset.inputRef) !== expectedInput) {
        throw new Error('Audit inputRef does not match the reviewed source for asset ' + asset.finalIndex)
      }
      const outputPath = resolveImportOutput(asset.outputRef)
      await sharp(expectedInput)
        .rotate()
        .webp({ quality: 90, effort: 6, smartSubsample: true })
        .toFile(outputPath)
      const metadata = await sharp(outputPath).metadata()
      if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
        throw new Error('Prepared asset failed WebP validation: ' + asset.outputRef)
      }
      return {
        finalIndex: asset.finalIndex,
        provenance: asset.provenance,
        outputRef: asset.outputRef,
        width: metadata.width,
        height: metadata.height,
      }
    })
  )
  await validateAudit(audit, 'pre-upload')
  return prepared
}

async function assertPublicWebp(url: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' })
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.toLowerCase().includes('image/webp')) {
    throw new Error('Uploaded asset returned HTTP ' + response.status + ' with ' + (contentType || 'no content type'))
  }
  await response.body?.cancel()
}

async function withRetry<T>(label: string, operation: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750))
      }
    }
  }
  const reason = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(label + ' failed after 3 attempts: ' + reason)
}

async function cleanupUrls(urls: string[]): Promise<string[]> {
  const results = await Promise.allSettled(urls.map((url) => deleteFromR2(url)))
  return results.flatMap((result, index) => result.status === 'rejected' ? [urls[index] ?? 'unknown'] : [])
}

async function uploadAssets(audit: ImportAudit): Promise<UploadManifest> {
  await validateAudit(audit, 'pre-upload')
  const uploaded: UploadedAsset[] = []
  try {
    const prepared = await Promise.all(
      audit.finalAssets.map(async (asset) => {
        const filePath = resolveImportOutput(asset.outputRef)
        const [buffer, metadata] = await Promise.all([readFile(filePath), sharp(filePath).metadata()])
        if (!metadata.width || !metadata.height) {
          throw new Error('Missing dimensions for ' + asset.outputRef)
        }
        return { asset, buffer, width: metadata.width, height: metadata.height }
      })
    )
    await prepared.reduce<Promise<void>>(async (previousUpload, item) => {
      await previousUpload
      const role = item.asset.provenance === 'gallery' ? 'g' : 'd'
      const filename = [
        '20260815-600g-bleached-cotton-string-gloves-v1',
        role + String(item.asset.finalIndex).padStart(2, '0'),
        randomUUID().slice(0, 8),
      ].join('-') + '.webp'
      const outputUrl = await withRetry(
        'R2 upload for asset ' + item.asset.finalIndex,
        () => uploadToR2(item.buffer, filename, 'image/webp')
      )
      await withRetry(
        'Public WebP verification for asset ' + item.asset.finalIndex,
        () => assertPublicWebp(outputUrl)
      )
      item.asset.outputUrl = outputUrl
      uploaded.push({
        finalIndex: item.asset.finalIndex,
        provenance: item.asset.provenance,
        outputRef: item.asset.outputRef,
        outputUrl,
        width: item.width,
        height: item.height,
      })
    }, Promise.resolve())
    audit.gate = {
      phase: 'pre-db-approved',
      sourceCoverage: '13/13 source images reconciled; 11/11 approved final assets uploaded',
      databaseMutationAllowed: true,
      r2UploadAllowed: true,
      reason: 'User approved the localized image set and requested import; all final WebPs passed public HTTP verification. Selling price remains unprovided, so the inactive draft uses 0.00 only as a schema placeholder.',
    }
    await validateAudit(audit, 'pre-db')
    const manifest = uploadManifestSchema.parse({
      productSlug: PRODUCT_SLUG,
      createdAt: new Date().toISOString(),
      assets: uploaded,
    })
    await Promise.all([
      writeFile(PRE_DB_AUDIT_PATH, JSON.stringify(audit, null, 2) + '\n', 'utf8'),
      writeFile(UPLOAD_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8'),
    ])
    return manifest
  } catch (error) {
    const failedCleanup = await cleanupUrls(uploaded.map((asset) => asset.outputUrl))
    const reason = error instanceof Error ? error.message : String(error)
    const cleanupStatus = failedCleanup.length > 0
      ? 'Manual cleanup required for ' + failedCleanup.join(', ')
      : 'New uploads were cleaned up.'
    throw new Error('Asset upload failed: ' + reason + '. ' + cleanupStatus, error instanceof Error ? { cause: error } : undefined)
  }
}

async function preflight(): Promise<{ category: { id: string; name: string; slug: string; isActive: boolean } }> {
  // Keep the remote-database preflight sequential. This import is intentionally
  // low-volume, and avoiding a burst of fresh pool connections makes it more
  // reliable against the production database's conservative connection limit.
  const category = await prisma.category.findUnique({
    where: { slug: CATEGORY_SLUG },
    select: { id: true, name: true, slug: true, isActive: true },
  })
  const existingProducts = await prisma.product.findMany({
    where: {
      OR: [
        { slug: PRODUCT_SLUG },
        { name: { equals: PRODUCT_NAME, mode: 'insensitive' } },
      ],
    },
    select: { id: true, slug: true, isActive: true },
  })
  const redirectConflict = await prisma.productSlugRedirect.findUnique({
    where: { slug: PRODUCT_SLUG },
    select: { productId: true },
  })
  if (!category || category.name !== CATEGORY_NAME || !category.isActive) {
    throw new Error('Active Knit Gloves category is missing or incompatible')
  }
  if (existingProducts.length > 0) {
    throw new Error('A matching product already exists; refusing to create a duplicate draft')
  }
  if (redirectConflict) {
    throw new Error('Product slug is reserved by an existing redirect')
  }
  return { category }
}

function productContent(details: UploadedAsset[]): Prisma.InputJsonValue {
  return {
    time: Date.now(),
    version: '2.31.1',
    blocks: details
      .slice()
      .sort((a, b) => a.finalIndex - b.finalIndex)
      .map((asset) => ({
        id: 'cotton-gloves-detail-' + String(asset.finalIndex).padStart(2, '0'),
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

const specifications: Prisma.InputJsonValue = [
  { name: 'Product Type', value: 'Bleached Cotton String Work Gloves' },
  { name: 'Nominal Specification', value: '#600 Bleached' },
  { name: 'Weight Reference', value: '600 g (source did not state the packaging basis)' },
  { name: 'Material', value: 'Cotton Yarn' },
  { name: 'Color', value: 'Bleached White' },
  { name: 'Size', value: 'One Size' },
  { name: 'Length', value: 'Approx. 22 cm' },
  { name: 'Knit Gauge', value: '7 Gauge (product-specific source screenshot)' },
  { name: 'Cuff', value: 'Yellow Overlocked Cuff' },
  { name: 'Coating', value: 'None' },
  { name: 'Minimum Order Quantity', value: '12 Pairs' },
  { name: 'Purchase Price', value: 'CNY 0.64/Pair; source also shows manual overlock +CNY 0.10/Pair from 6,000 pairs (screenshot reference; verify current quote)' },
  { name: 'Intended Use', value: 'General material handling and light-duty work' },
  { name: 'Safety Note', value: 'No performance standard, test report, or certification was provided' },
  { name: 'Source', value: NOTION_URL },
  { name: 'Origin', value: 'China' },
]

const galleryAltByIndex = new Map<number, string>([
  [1, 'Pair of 600g bleached cotton string work gloves'],
  [2, 'Close-up of bleached cotton glove knit and yellow cuff'],
  [3, 'Bleached cotton string glove worn on hand, front view'],
  [4, 'Bleached cotton string glove worn on hand, angled view'],
  [5, 'Bleached cotton string glove worn on hand, back view'],
])

async function writeProduct(
  manifest: UploadManifest,
  preflightResult: Awaited<ReturnType<typeof preflight>>
): Promise<Prisma.ProductGetPayload<{
  include: { images: true; variants: true; priceTiers: true; category: true }
}>> {
  const gallery = manifest.assets
    .filter((asset) => asset.provenance === 'gallery')
    .sort((a, b) => a.finalIndex - b.finalIndex)
  const details = manifest.assets
    .filter((asset) => asset.provenance === 'detail')
    .sort((a, b) => a.finalIndex - b.finalIndex)
  if (gallery.length !== 5 || details.length !== 6) {
    throw new Error('Upload manifest asset counts are inconsistent')
  }
  return prisma.$transaction(async (tx) => {
    const [category, slugConflict, redirectConflict] = await Promise.all([
      tx.category.findUnique({ where: { slug: CATEGORY_SLUG } }),
      tx.product.findUnique({ where: { slug: PRODUCT_SLUG }, select: { id: true } }),
      tx.productSlugRedirect.findUnique({ where: { slug: PRODUCT_SLUG }, select: { productId: true } }),
    ])
    if (!category || !category.isActive || category.id !== preflightResult.category.id) {
      throw new Error('Knit Gloves category changed after preflight')
    }
    if (slugConflict || redirectConflict) {
      throw new Error('Product slug became unavailable after preflight')
    }
    return tx.product.create({
      data: {
        name: PRODUCT_NAME,
        slug: PRODUCT_SLUG,
        description: 'Thick uncoated 7-gauge bleached cotton string gloves with yellow overlocked cuffs for general material handling and light-duty work. The source identifies a #600 specification and an approximate 22 cm length.',
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
        usageScenes: ['general-handling', 'construction-materials', 'steel-handling', 'mechanical-maintenance'],
        metaTitle: '600g Bleached Cotton String Work Gloves',
        metaDescription: 'Thick 7-gauge bleached cotton string gloves with yellow overlocked cuffs, one-size fit and approximately 22 cm length for general handling.',
        metaKeywords: 'bleached cotton string gloves, cotton work gloves, 600g knit gloves, general handling gloves',
        ogTitle: PRODUCT_NAME,
        ogDescription: 'Thick uncoated bleached cotton string gloves with yellow cuffs for general handling and light-duty work.',
        ogImage: gallery[0]?.outputUrl ?? null,
        images: {
          create: gallery.map((asset, index) => ({
            url: asset.outputUrl,
            alt: galleryAltByIndex.get(asset.finalIndex) ?? PRODUCT_NAME,
            sortOrder: index,
          })),
        },
      },
      include: { images: true, variants: true, priceTiers: true, category: true },
    })
  }, { isolationLevel: 'Serializable', timeout: 30_000 })
}

async function readManifest(): Promise<UploadManifest> {
  const raw: unknown = JSON.parse(await readFile(UPLOAD_MANIFEST_PATH, 'utf8'))
  const manifest = uploadManifestSchema.parse(raw)
  if (manifest.assets.length !== 11) {
    throw new Error('Upload manifest does not contain the approved 11 assets')
  }
  return manifest
}

async function verifyImportedDraft(): Promise<Record<string, unknown>> {
  const product = await prisma.product.findUnique({
    where: { slug: PRODUCT_SLUG },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
      priceTiers: true,
    },
  })
  if (!product) {
    throw new Error('Imported product draft was not found')
  }
  const parsedContent = editorContentSchema.safeParse(product.content)
  if (!parsedContent.success) {
    throw new Error('Imported detail content does not match the expected EditorJS image format')
  }
  const detailUrls = parsedContent.data.blocks.map((block) => block.data.file.url)
  const specificationsText = JSON.stringify(product.specifications)
  const contentText = JSON.stringify(product.content)
  const assertions = {
    placeholderPrice: product.price.toString() === '0',
    inactive: !product.isActive && !product.isFeatured,
    category: product.category?.slug === CATEGORY_SLUG,
    galleryCount: product.images.length === 5,
    detailCount: detailUrls.length === 6,
    noVariants: product.variants.length === 0,
    noPriceTiers: product.priceTiers.length === 0,
    noSku: product.sku === null,
    schemaSafeStock: product.stock === 0,
    purchasePrice: specificationsText.includes('CNY 0.64/Pair'),
    minimumOrder: specificationsText.includes('12 Pairs'),
    noTemporaryNotionImages: !contentText.includes('prod-files-secure') && product.images.every((image) => !image.url.includes('prod-files-secure')),
    noProcessText: !/(rebuilt|localized|supplier markings removed|AI-generated)/i.test(contentText),
    uniqueGalleryUrls: new Set(product.images.map((image) => image.url)).size === 5,
    uniqueDetailUrls: new Set(detailUrls).size === 6,
  }
  const failed = Object.entries(assertions)
    .filter(([, passed]) => !passed)
    .map(([name]) => name)
  if (failed.length > 0) {
    throw new Error('Draft verification failed: ' + failed.join(', '))
  }
  await Promise.all([...product.images.map((image) => image.url), ...detailUrls].map(assertPublicWebp))
  return {
    id: product.id,
    slug: product.slug,
    price: product.price.toString(),
    priceStatus: 'Schema placeholder only; selling price not provided',
    stock: product.stock,
    stockStatus: 'Inactive-draft placeholder; supplier screenshot is not storefront inventory',
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
  const audit = await readAudit()
  if (process.argv.includes('--prepare')) {
    const prepared = await prepareAssets(audit)
    process.stdout.write(JSON.stringify({ mode: 'prepare', prepared }, null, 2) + '\n')
    return
  }
  if (process.argv.includes('--verify')) {
    process.stdout.write(JSON.stringify({ mode: 'verify', product: await verifyImportedDraft() }, null, 2) + '\n')
    return
  }
  const preflightResult = await preflight()
  if (process.argv.includes('--upload')) {
    const manifest = await uploadAssets(audit)
    process.stdout.write(JSON.stringify({ mode: 'upload', manifest }, null, 2) + '\n')
    return
  }
  if (process.argv.includes('--execute')) {
    const manifest = await readManifest()
    const preDbAudit = await readAudit(PRE_DB_AUDIT_PATH)
    await validateAudit(preDbAudit, 'pre-db')
    const manifestUrls = new Map(manifest.assets.map((asset) => [asset.finalIndex, asset.outputUrl]))
    for (const asset of preDbAudit.finalAssets) {
      if (asset.outputUrl !== manifestUrls.get(asset.finalIndex)) {
        throw new Error('Pre-db audit and upload manifest disagree for asset ' + asset.finalIndex)
      }
    }
    await Promise.all(manifest.assets.map((asset) => assertPublicWebp(asset.outputUrl)))
    let product: Awaited<ReturnType<typeof writeProduct>>
    try {
      product = await writeProduct(manifest, preflightResult)
    } catch (error) {
      const failedCleanup = await cleanupUrls(manifest.assets.map((asset) => asset.outputUrl))
      const reason = error instanceof Error ? error.message : String(error)
      const cleanupStatus = failedCleanup.length > 0
        ? 'Manual cleanup required for ' + failedCleanup.join(', ')
        : 'New uploads were cleaned up.'
      throw new Error('Database write failed: ' + reason + '. ' + cleanupStatus, error instanceof Error ? { cause: error } : undefined)
    }
    process.stdout.write(JSON.stringify({
      mode: 'execute',
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price.toString(),
        priceStatus: 'Schema placeholder only; selling price not provided',
        sku: product.sku,
        stock: product.stock,
        category: product.category?.name,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        imageCount: product.images.length,
        variantCount: product.variants.length,
        priceTierCount: product.priceTiers.length,
      },
    }, null, 2) + '\n')
    return
  }
  await validateAudit(audit, 'pre-upload')
  process.stdout.write(JSON.stringify({
    mode: 'dry-run',
    category: preflightResult.category,
    existingProduct: null,
    proposed: {
      name: PRODUCT_NAME,
      slug: PRODUCT_SLUG,
      price: PRODUCT_PRICE.toString(),
      priceStatus: 'Schema placeholder only; selling price not provided',
      stock: 0,
      sku: null,
      galleryCount: 5,
      detailCount: 6,
      variantCount: 0,
      priceTierCount: 0,
      isActive: false,
      isFeatured: false,
    },
  }, null, 2) + '\n')
}

main()
  .catch((error: unknown) => {
    process.stderr.write('Import failed: ' + (error instanceof Error ? error.message : String(error)) + '\n')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
