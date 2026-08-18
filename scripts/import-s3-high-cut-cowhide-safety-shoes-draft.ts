import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'
import { z } from 'zod'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const IMPORT_DIR = path.resolve('output/s3-cowhide-solid-sole-safety-shoes-review')
const ENGLISH_DIR = path.join(IMPORT_DIR, 'english')
const FINAL_DIR = path.join(IMPORT_DIR, 'final')
const AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.json')
const PRE_DB_AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.pre-db.json')
const UPLOAD_MANIFEST_PATH = path.join(IMPORT_DIR, 'upload-manifest.json')

const CATEGORY_SLUG = 'safety-shoes'
const CATEGORY_NAME = 'Safety Shoes'
const PRODUCT_NAME = 'S3 High-Cut Cowhide Steel Toe Puncture-Resistant Safety Shoes'
const PRODUCT_SLUG = 's3-high-cut-cowhide-steel-toe-safety-shoes'
const PRODUCT_PRICE = new Prisma.Decimal('0.00')
const NOTION_PAGE_ID = '3c0d505a-0030-80d1-89f7-c291109f4650'
const NOTION_URL = 'https://app.notion.com/p/3c0d505a003080d189f7c291109f4650?pvs=204'
const SOURCE_IMAGE_COUNT = 23
const EXCLUDED_SOURCE_INDEX = 21
const GALLERY_SOURCE_INDEXES = new Set([1, 2])
const SELECTED_SOURCE_INDEXES = Array.from(
  { length: SOURCE_IMAGE_COUNT },
  (_, index) => index + 1
).filter((sourceIndex) => sourceIndex !== EXCLUDED_SOURCE_INDEX)

const provenanceSchema = z.enum(['gallery', 'detail'])
const auditAssetSchema = z.object({
  finalIndex: z.number().int().min(1),
  sourceIndex: z.number().int().min(1).max(SOURCE_IMAGE_COUNT),
  provenance: provenanceSchema,
  inputRef: z.string().min(1),
  outputRef: z.string().min(1),
  outputUrl: z.string().url().optional(),
  decision: z.enum(['keep', 'localize']),
  qa: z.literal('pass'),
})
const auditSchema = z.object({
  product: z.object({
    sourcePageId: z.literal(NOTION_PAGE_ID),
    notionUrl: z.literal(NOTION_URL),
    title: z.literal(PRODUCT_NAME),
    sourcePriceEvidence: z.literal('USD 11 (source page; unit basis not stated; verify current quote)'),
    sellingPriceStatus: z.literal('Not provided; draft price 0.00 is a schema placeholder only'),
    skuStatus: z.literal('Not provided; no SKU created'),
    stockStatus: z.literal('Not provided; inactive draft stock is 0'),
    variantStatus: z.literal('Not created; size 37-45 remains a non-selectable source specification'),
    priceTierStatus: z.literal('Not created; no commercial quantity tiers were provided'),
    brandFieldStatus: z.literal('Removed at user request; logos and brand marks in approved images remain'),
    complianceStatus: z.literal('S3 and performance statements are source claims; no product certificate or test report was provided'),
    midsoleConflict: z.literal('Source images conflict between steel and Kevlar; material remains unverified'),
  }),
  sourceCoverage: z.object({
    notionImages: z.literal(SOURCE_IMAGE_COUNT),
    selectedFinalAssets: z.literal(22),
    excludedSourceImages: z.literal(1),
    excluded: z.array(z.object({
      sourceIndex: z.literal(EXCLUDED_SOURCE_INDEX),
      reason: z.literal('Generic certification and management-system claims lack product-level documentary evidence'),
    })).length(1),
  }),
  finalAssets: z.array(auditAssetSchema).length(22),
  gate: z.object({
    phase: z.string().min(1),
    sourceCoverage: z.string().min(1),
    r2UploadAllowed: z.boolean(),
    databaseMutationAllowed: z.boolean(),
    reason: z.string().min(1),
  }),
})
const manifestSchema = z.object({
  productSlug: z.literal(PRODUCT_SLUG),
  createdAt: z.string().datetime(),
  assets: z.array(z.object({
    finalIndex: z.number().int().min(1),
    sourceIndex: z.number().int().min(1).max(SOURCE_IMAGE_COUNT),
    provenance: provenanceSchema,
    outputRef: z.string().min(1),
    outputUrl: z.string().url(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })).length(22),
})
const editorContentSchema = z.object({
  blocks: z.array(z.object({
    type: z.literal('image'),
    data: z.object({ file: z.object({ url: z.string().url() }) }),
  })).length(20),
})

type ImportAudit = z.infer<typeof auditSchema>
type UploadManifest = z.infer<typeof manifestSchema>
type UploadedAsset = UploadManifest['assets'][number]

const prisma = new PrismaClient()

function initialAudit(): ImportAudit {
  return auditSchema.parse({
    product: {
      sourcePageId: NOTION_PAGE_ID,
      notionUrl: NOTION_URL,
      title: PRODUCT_NAME,
      sourcePriceEvidence: 'USD 11 (source page; unit basis not stated; verify current quote)',
      sellingPriceStatus: 'Not provided; draft price 0.00 is a schema placeholder only',
      skuStatus: 'Not provided; no SKU created',
      stockStatus: 'Not provided; inactive draft stock is 0',
      variantStatus: 'Not created; size 37-45 remains a non-selectable source specification',
      priceTierStatus: 'Not created; no commercial quantity tiers were provided',
      brandFieldStatus: 'Removed at user request; logos and brand marks in approved images remain',
      complianceStatus: 'S3 and performance statements are source claims; no product certificate or test report was provided',
      midsoleConflict: 'Source images conflict between steel and Kevlar; material remains unverified',
    },
    sourceCoverage: {
      notionImages: SOURCE_IMAGE_COUNT,
      selectedFinalAssets: 22,
      excludedSourceImages: 1,
      excluded: [{
        sourceIndex: EXCLUDED_SOURCE_INDEX,
        reason: 'Generic certification and management-system claims lack product-level documentary evidence',
      }],
    },
    finalAssets: SELECTED_SOURCE_INDEXES.map((sourceIndex, index) => ({
      finalIndex: index + 1,
      sourceIndex,
      provenance: GALLERY_SOURCE_INDEXES.has(sourceIndex) ? 'gallery' : 'detail',
      inputRef: path.join('english', `english-${String(sourceIndex).padStart(2, '0')}.png`),
      outputRef: path.join('final', `s3-safety-shoes-${String(index + 1).padStart(2, '0')}.webp`),
      decision: [1, 2, 17, 18].includes(sourceIndex) ? 'keep' : 'localize',
      qa: 'pass',
    })),
    gate: {
      phase: 'pre-upload-approved',
      sourceCoverage: '23/23 source images reconciled; 22 final assets approved; source 21 excluded for unsupported certification claims',
      r2UploadAllowed: true,
      databaseMutationAllowed: false,
      reason: 'User reviewed the English contact sheet, removed the Brand field, and explicitly requested an inactive draft import.',
    },
  })
}

function resolveWithin(base: string, relativeRef: string): string {
  const resolved = path.resolve(base, relativeRef)
  const relative = path.relative(base, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path resolves outside the expected directory: ' + relativeRef)
  }
  return resolved
}

async function readAudit(filePath: string): Promise<ImportAudit> {
  const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'))
  return auditSchema.parse(parsed)
}

async function validateAudit(audit: ImportAudit, phase: 'pre-upload' | 'pre-db'): Promise<void> {
  const sourceIndexes = audit.finalAssets.map((asset) => asset.sourceIndex)
  if (new Set(sourceIndexes).size !== 22 || sourceIndexes.includes(EXCLUDED_SOURCE_INDEX)) {
    throw new Error('Final asset source mapping is incomplete or contains excluded source 21')
  }
  if (audit.finalAssets.filter((asset) => asset.provenance === 'gallery').length !== 2) {
    throw new Error('Exactly two gallery assets are required')
  }
  if (audit.finalAssets.filter((asset) => asset.provenance === 'detail').length !== 20) {
    throw new Error('Exactly twenty detail assets are required')
  }
  const brandText = JSON.stringify(specifications)
  if (/"Brand"|卫尔盾/i.test(brandText)) {
    throw new Error('The removed Brand field reappeared in structured specifications')
  }
  for (const asset of audit.finalAssets) {
    const outputPath = resolveWithin(IMPORT_DIR, asset.outputRef)
    const metadata = await sharp(outputPath).metadata()
    if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
      throw new Error('Final asset is not a valid WebP: ' + asset.outputRef)
    }
    if (phase === 'pre-db' && (!asset.outputUrl || asset.outputUrl.includes('prod-files-secure'))) {
      throw new Error('Final asset lacks a durable R2 URL: ' + asset.finalIndex)
    }
  }
  if (phase === 'pre-upload' && (!audit.gate.r2UploadAllowed || audit.gate.databaseMutationAllowed)) {
    throw new Error('Pre-upload gate must permit upload and forbid database mutation')
  }
  if (phase === 'pre-db' && (!audit.gate.r2UploadAllowed || !audit.gate.databaseMutationAllowed)) {
    throw new Error('Pre-db gate must permit both upload and database mutation')
  }
}

async function prepareAssets(): Promise<ImportAudit> {
  const audit = initialAudit()
  await mkdir(FINAL_DIR, { recursive: true })
  for (const asset of audit.finalAssets) {
    const inputPath = resolveWithin(IMPORT_DIR, asset.inputRef)
    if (path.dirname(inputPath) !== ENGLISH_DIR) {
      throw new Error('Approved image must come from the English review directory')
    }
    const outputPath = resolveWithin(IMPORT_DIR, asset.outputRef)
    await sharp(inputPath)
      .rotate()
      .webp({ quality: 90, effort: 6, smartSubsample: true })
      .toFile(outputPath)
  }
  await validateAudit(audit, 'pre-upload')
  await writeFile(AUDIT_PATH, JSON.stringify(audit, null, 2) + '\n', 'utf8')
  return audit
}

async function assertPublicWebp(url: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' })
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.toLowerCase().includes('image/webp')) {
    throw new Error(`Uploaded asset returned HTTP ${response.status} with ${contentType || 'no content type'}`)
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
  throw new Error(`${label} failed after 3 attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
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
      if (!metadata.width || !metadata.height) {
        throw new Error('Missing image dimensions: ' + asset.outputRef)
      }
      const role = asset.provenance === 'gallery' ? 'g' : 'd'
      const filename = [
        '20260818-s3-high-cut-cowhide-safety-shoes-v1',
        role + String(asset.finalIndex).padStart(2, '0'),
        randomUUID().slice(0, 8),
      ].join('-') + '.webp'
      const outputUrl = await withRetry(
        'R2 upload for asset ' + asset.finalIndex,
        () => uploadToR2(buffer, filename, 'image/webp')
      )
      asset.outputUrl = outputUrl
      uploaded.push({
        finalIndex: asset.finalIndex,
        sourceIndex: asset.sourceIndex,
        provenance: asset.provenance,
        outputRef: asset.outputRef,
        outputUrl,
        width: metadata.width,
        height: metadata.height,
      })
      await withRetry('Public verification for asset ' + asset.finalIndex, () => assertPublicWebp(outputUrl))
    }
    audit.gate = {
      phase: 'pre-db-approved',
      sourceCoverage: '23/23 source images reconciled; 22/22 selected final assets uploaded and publicly verified',
      r2UploadAllowed: true,
      databaseMutationAllowed: true,
      reason: 'Approved English assets have durable R2 URLs; the user explicitly authorized an inactive draft import.',
    }
    await validateAudit(audit, 'pre-db')
    const manifest = manifestSchema.parse({
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
    const cleanup = failedCleanup.length > 0 ? 'Manual cleanup required: ' + failedCleanup.join(', ') : 'New uploads were cleaned up.'
    throw new Error(`Asset upload failed: ${error instanceof Error ? error.message : String(error)}. ${cleanup}`)
  }
}

async function preflight(): Promise<{ category: { id: string; name: string; slug: string; isActive: boolean } }> {
  const category = await prisma.category.findUnique({
    where: { slug: CATEGORY_SLUG },
    select: { id: true, name: true, slug: true, isActive: true },
  })
  const existingProducts = await prisma.product.findMany({
    where: { OR: [{ slug: PRODUCT_SLUG }, { name: { equals: PRODUCT_NAME, mode: 'insensitive' } }] },
    select: { id: true, slug: true, isActive: true },
  })
  const redirectConflict = await prisma.productSlugRedirect.findUnique({
    where: { slug: PRODUCT_SLUG },
    select: { productId: true },
  })
  if (!category || category.name !== CATEGORY_NAME || !category.isActive) {
    throw new Error('Active Safety Shoes category is missing or incompatible')
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
    blocks: details.map((asset) => ({
      id: 's3-safety-shoes-detail-' + String(asset.finalIndex).padStart(2, '0'),
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
  { name: 'Product Type', value: 'High-Cut Industrial Safety Shoes' },
  { name: 'Item Number', value: '108N' },
  { name: 'Safety Classification', value: 'S3 (source-stated; exact standard/version and certificate not provided)' },
  { name: 'Upper Material', value: 'Cowhide Leather' },
  { name: 'Toe Protection', value: 'European-Style Steel Toe (source-stated)' },
  { name: 'Compression Resistance', value: '≥15,000 N (source-stated; test report not provided)' },
  { name: 'Puncture Protection', value: 'Puncture-resistant midsole; source images conflict between steel and Kevlar, so material requires confirmation' },
  { name: 'Lining', value: 'BK Fabric / Elastic Fabric' },
  { name: 'Insole', value: 'Hi-Poly' },
  { name: 'Outsole', value: 'Solid Outsole (material not stated)' },
  { name: 'Color', value: 'Black' },
  { name: 'Size Range', value: '37-45 (source sizing system not stated; no selectable variants created)' },
  { name: 'Weight', value: 'Approx. 460 g per shoe, size 40' },
  { name: 'Sample Length', value: 'Approx. 29 cm (sample size not stated)' },
  { name: 'Sample Circumference', value: 'Approx. 16.5 cm (sample size not stated)' },
  { name: 'Heel Height', value: 'Approx. 3.2 cm' },
  { name: 'Opening Depth', value: 'Approx. 8.2 cm' },
  { name: 'Source Features', value: 'Impact protection, puncture resistance, slip resistance, abrasion resistance, breathability, and water/oil resistance (source claims; supporting reports not provided)' },
  { name: 'Purchase Price', value: 'USD 11 (source page; unit basis not stated; verify current quote)' },
  { name: 'Verification Note', value: 'S3, compression, puncture, slip, abrasion, water and oil resistance claims require product-specific supporting documents before publication' },
  { name: 'Source', value: NOTION_URL },
  { name: 'Origin', value: 'China' },
]

const galleryAltBySourceIndex = new Map<number, string>([
  [1, 'Black high-cut cowhide steel toe safety shoe, three-quarter view'],
  [2, 'Black high-cut cowhide steel toe safety shoe, side view'],
])

async function writeProduct(
  manifest: UploadManifest,
  preflightResult: Awaited<ReturnType<typeof preflight>>
): Promise<Prisma.ProductGetPayload<{
  include: { images: true; variants: true; priceTiers: true; category: true }
}>> {
  const gallery = manifest.assets.filter((asset) => asset.provenance === 'gallery').sort((a, b) => a.finalIndex - b.finalIndex)
  const details = manifest.assets.filter((asset) => asset.provenance === 'detail').sort((a, b) => a.finalIndex - b.finalIndex)
  if (gallery.length !== 2 || details.length !== 20) {
    throw new Error('Upload manifest asset counts are inconsistent')
  }
  return prisma.$transaction(async (tx) => {
    const [category, slugConflict, redirectConflict] = await Promise.all([
      tx.category.findUnique({ where: { slug: CATEGORY_SLUG } }),
      tx.product.findUnique({ where: { slug: PRODUCT_SLUG }, select: { id: true } }),
      tx.productSlugRedirect.findUnique({ where: { slug: PRODUCT_SLUG }, select: { productId: true } }),
    ])
    if (!category || !category.isActive || category.id !== preflightResult.category.id) {
      throw new Error('Safety Shoes category changed after preflight')
    }
    if (slugConflict || redirectConflict) {
      throw new Error('Product slug became unavailable after preflight')
    }
    return tx.product.create({
      data: {
        name: PRODUCT_NAME,
        slug: PRODUCT_SLUG,
        description: 'High-cut black cowhide industrial safety shoes with a source-stated S3 classification, steel toe and puncture-resistant construction. The exact S3 standard, midsole material and performance claims require documentary verification before publication.',
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
        usageScenes: ['construction', 'manufacturing', 'warehousing', 'general-industrial-work'],
        metaTitle: 'S3 High-Cut Cowhide Steel Toe Safety Shoes',
        metaDescription: 'High-cut cowhide safety shoes with steel toe and puncture-resistant construction. Source-stated S3 classification; documentation requires verification.',
        metaKeywords: 'S3 safety shoes, high cut safety shoes, cowhide safety shoes, steel toe safety shoes, puncture resistant work shoes',
        ogTitle: PRODUCT_NAME,
        ogDescription: 'High-cut cowhide steel toe safety shoes with puncture-resistant construction for industrial work.',
        ogImage: gallery[0]?.outputUrl ?? null,
        images: {
          create: gallery.map((asset, index) => ({
            url: asset.outputUrl,
            alt: galleryAltBySourceIndex.get(asset.sourceIndex) ?? PRODUCT_NAME,
            sortOrder: index,
          })),
        },
      },
      include: { images: true, variants: true, priceTiers: true, category: true },
    })
  }, { isolationLevel: 'Serializable', timeout: 30_000 })
}

async function readManifest(): Promise<UploadManifest> {
  const parsed: unknown = JSON.parse(await readFile(UPLOAD_MANIFEST_PATH, 'utf8'))
  return manifestSchema.parse(parsed)
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
  const parsedContent = editorContentSchema.parse(product.content)
  const detailUrls = parsedContent.blocks.map((block) => block.data.file.url)
  const specificationText = JSON.stringify(product.specifications)
  const allUrls = [...product.images.map((image) => image.url), ...detailUrls]
  const assertions = {
    inactive: !product.isActive && !product.isFeatured,
    placeholderPrice: product.price.toString() === '0',
    schemaSafeStock: product.stock === 0,
    noSku: product.sku === null,
    noVariants: product.variants.length === 0,
    noPriceTiers: product.priceTiers.length === 0,
    category: product.category?.slug === CATEGORY_SLUG,
    galleryCount: product.images.length === 2,
    detailCount: detailUrls.length === 20,
    uniqueMedia: new Set(allUrls).size === 22,
    noTemporaryNotionMedia: allUrls.every((url) => !url.includes('prod-files-secure')),
    removedBrandField: !/"Brand"|卫尔盾/i.test(specificationText),
    sourcePriceKeptAdminOnly: specificationText.includes('USD 11') && product.price.toString() === '0',
    midsoleConflictPreserved: specificationText.includes('conflict between steel and Kevlar'),
    unverifiedClaimsFlagged: specificationText.includes('require product-specific supporting documents'),
  }
  const failed = Object.entries(assertions).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length > 0) {
    throw new Error('Draft verification failed: ' + failed.join(', '))
  }
  for (const url of allUrls) {
    await assertPublicWebp(url)
  }
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
  if (process.argv.includes('--prepare')) {
    const audit = await prepareAssets()
    process.stdout.write(JSON.stringify({ mode: 'prepare', finalAssets: audit.finalAssets.length, auditPath: AUDIT_PATH }, null, 2) + '\n')
    return
  }
  if (process.argv.includes('--verify')) {
    process.stdout.write(JSON.stringify({ mode: 'verify', product: await verifyImportedDraft() }, null, 2) + '\n')
    return
  }
  const preflightResult = await preflight()
  if (process.argv.includes('--upload')) {
    const audit = await readAudit(AUDIT_PATH)
    const manifest = await uploadAssets(audit)
    process.stdout.write(JSON.stringify({ mode: 'upload', assetCount: manifest.assets.length, manifestPath: UPLOAD_MANIFEST_PATH }, null, 2) + '\n')
    return
  }
  if (process.argv.includes('--execute')) {
    const manifest = await readManifest()
    const preDbAudit = await readAudit(PRE_DB_AUDIT_PATH)
    await validateAudit(preDbAudit, 'pre-db')
    const uploadedByIndex = new Map(manifest.assets.map((asset) => [asset.finalIndex, asset.outputUrl]))
    for (const asset of preDbAudit.finalAssets) {
      if (asset.outputUrl !== uploadedByIndex.get(asset.finalIndex)) {
        throw new Error('Pre-db audit and upload manifest disagree for asset ' + asset.finalIndex)
      }
    }
    for (const asset of manifest.assets) {
      await assertPublicWebp(asset.outputUrl)
    }
    let product: Awaited<ReturnType<typeof writeProduct>>
    try {
      product = await writeProduct(manifest, preflightResult)
    } catch (error) {
      const failedCleanup = await cleanupUrls(manifest.assets.map((asset) => asset.outputUrl))
      const cleanup = failedCleanup.length > 0 ? 'Manual cleanup required: ' + failedCleanup.join(', ') : 'New uploads were cleaned up.'
      throw new Error(`Database write failed: ${error instanceof Error ? error.message : String(error)}. ${cleanup}`)
    }
    process.stdout.write(JSON.stringify({
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
        imageCount: product.images.length,
        variantCount: product.variants.length,
        priceTierCount: product.priceTiers.length,
      },
    }, null, 2) + '\n')
    return
  }
  const audit = await readAudit(AUDIT_PATH)
  await validateAudit(audit, 'pre-upload')
  process.stdout.write(JSON.stringify({
    mode: 'dry-run',
    category: preflightResult.category,
    existingProduct: null,
    proposed: {
      name: PRODUCT_NAME,
      slug: PRODUCT_SLUG,
      price: PRODUCT_PRICE.toString(),
      stock: 0,
      sku: null,
      galleryCount: 2,
      detailCount: 20,
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
