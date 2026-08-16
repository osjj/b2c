import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'
import { z } from 'zod'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const IMPORT_DIR = path.resolve('output/en-397-abs-industrial-safety-helmet-2158t')
const FINAL_DIR = path.join(IMPORT_DIR, 'final')
const AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.json')
const PRE_DB_AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.pre-db.json')
const UPLOAD_MANIFEST_PATH = path.join(IMPORT_DIR, 'upload-manifest.json')

const CATEGORY_SLUG = 'head-protection'
const CATEGORY_NAME = 'Head Protection'
const PRODUCT_NAME = 'EN 397 ABS Industrial Safety Helmet 2158T'
const PRODUCT_SLUG = 'en-397-abs-industrial-safety-helmet-2158t'
const PRODUCT_PRICE = new Prisma.Decimal('0.00')
const PRODUCT_WEIGHT_KG = new Prisma.Decimal('0.41')
const NOTION_PAGE_ID = '3bed505a-0030-80c2-897a-e01327d8a5fb'
const NOTION_URL = 'https://app.notion.com/p/3bed505a003080c2897ae01327d8a5fb?pvs=204'

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
    storefrontStockStatus: z.string().min(1),
    skuStatus: z.string().min(1),
    variantStatus: z.string().min(1),
    priceTierStatus: z.string().min(1),
    confirmedParameters: z.string().min(1),
    claimStatus: z.string().min(1),
  }),
  sourceTotals: z.object({
    notionImages: z.literal(20),
    approvedFinalAssets: z.literal(19),
    rejectedSourceImages: z.literal(1),
    galleryAssets: z.literal(4),
    detailAssets: z.literal(15),
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
    data: z.object({ file: z.object({ url: z.string().url() }) }),
  })),
})

type ImportAudit = z.infer<typeof importAuditSchema>
type UploadManifest = z.infer<typeof uploadManifestSchema>
type UploadedAsset = UploadManifest['assets'][number]

const prisma = new PrismaClient()

function hasSequentialIndexes(values: number[], expectedLength: number): boolean {
  return values.length === expectedLength
    && values
      .slice()
      .sort((a, b) => a - b)
      .every((value, index) => value === index + 1)
}

function resolveImportOutput(outputRef: string): string {
  const resolved = path.resolve(IMPORT_DIR, outputRef)
  const relative = path.relative(IMPORT_DIR, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Audit outputRef resolves outside the import directory: ' + outputRef)
  }
  return resolved
}

function resolveProjectInput(inputRef: string): string {
  const resolved = path.resolve(inputRef)
  const relative = path.relative(process.cwd(), resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Audit inputRef resolves outside the project directory: ' + inputRef)
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
  if (audit.product.purchasePriceEvidence !== 'USD 1.50 (source Notion page; verify current quote)') {
    throw new Error('Purchase-price evidence changed unexpectedly')
  }
  if (!/not provided/i.test(audit.product.minimumOrderQuantity)
    || !/not provided/i.test(audit.product.sellingPriceStatus)
    || !/not provided/i.test(audit.product.storefrontStockStatus)) {
    throw new Error('Audit must preserve unprovided commercial fields')
  }
  if (!/not created/i.test(audit.product.skuStatus)
    || !/not created/i.test(audit.product.variantStatus)
    || !/not created/i.test(audit.product.priceTierStatus)) {
    throw new Error('Audit must forbid inferred SKU, variants and price tiers')
  }
  if (audit.product.confirmedParameters !== 'Model 2158T; weight 410 g ±5%; ABS material') {
    throw new Error('Audit does not contain the user-confirmed model, weight and material')
  }
  if (!/no certificate or test report/i.test(audit.product.claimStatus)
    || !/unverified/i.test(audit.product.claimStatus)) {
    throw new Error('Audit must preserve the standards and performance evidence warning')
  }
  if (!hasSequentialIndexes(audit.sourceAssets.map((asset) => asset.sourceIndex), 20)) {
    throw new Error('Source audit must cover Notion images 1 through 20 exactly once')
  }
  const rejected = audit.sourceAssets.filter((asset) => asset.decision === 'reject')
  if (rejected.length !== 1 || rejected[0]?.sourceIndex !== 9) {
    throw new Error('Only source image 9 may be rejected for its unsupported comparative claim')
  }
  if (!hasSequentialIndexes(audit.finalAssets.map((asset) => asset.finalIndex), 19)) {
    throw new Error('Final audit must cover approved assets 1 through 19 exactly once')
  }
  const gallery = audit.finalAssets.filter((asset) => asset.provenance === 'gallery')
  const details = audit.finalAssets.filter((asset) => asset.provenance === 'detail')
  if (gallery.length !== 4 || details.length !== 15) {
    throw new Error('Expected four gallery assets and fifteen detail assets')
  }
  if (new Set(audit.finalAssets.map((asset) => asset.outputRef)).size !== 19) {
    throw new Error('Final outputRef values must be unique')
  }
  const sourceByIndex = new Map(audit.sourceAssets.map((asset) => [asset.sourceIndex, asset]))
  const derivedIndexes: number[] = []
  for (const asset of audit.finalAssets) {
    const sourceIndex = asset.derivedFromSourceIndexes[0]
    if (asset.derivedFromSourceIndexes.length !== 1 || !sourceIndex) {
      throw new Error('Each final asset must map to exactly one source image')
    }
    const sourceAsset = sourceByIndex.get(sourceIndex)
    if (!sourceAsset || sourceAsset.decision === 'reject') {
      throw new Error('Final asset maps to an unavailable source image: ' + asset.finalIndex)
    }
    if (path.resolve(sourceAsset.sourceRef) !== path.resolve(asset.inputRef)) {
      throw new Error('Final inputRef does not match its audited source: ' + asset.finalIndex)
    }
    derivedIndexes.push(sourceIndex)
    const metadata = await sharp(resolveImportOutput(asset.outputRef)).metadata()
    if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
      throw new Error('Final asset is not a valid WebP: ' + asset.outputRef)
    }
    if (phase === 'pre-db' && (!asset.outputUrl || asset.outputUrl.includes('prod-files-secure'))) {
      throw new Error('Final asset lacks a durable R2 URL: ' + asset.finalIndex)
    }
  }
  const expectedDerived = Array.from({ length: 20 }, (_, index) => index + 1)
    .filter((sourceIndex) => sourceIndex !== 9)
  if (derivedIndexes.slice().sort((a, b) => a - b).join(',') !== expectedDerived.join(',')) {
    throw new Error('Approved source-to-final asset mapping is incomplete or duplicated')
  }
  if (phase === 'pre-upload' && (!audit.gate.r2UploadAllowed || audit.gate.databaseMutationAllowed)) {
    throw new Error('Pre-upload gate must allow R2 upload but forbid database mutation')
  }
  if (phase === 'pre-db' && (!audit.gate.r2UploadAllowed || !audit.gate.databaseMutationAllowed)) {
    throw new Error('Pre-db gate must allow both R2 upload and database mutation')
  }
}

async function prepareAssets(audit: ImportAudit): Promise<Array<Record<string, unknown>>> {
  await mkdir(FINAL_DIR, { recursive: true })
  const prepared: Array<Record<string, unknown>> = []
  for (const asset of audit.finalAssets) {
    const inputPath = resolveProjectInput(asset.inputRef)
    const outputPath = resolveImportOutput(asset.outputRef)
    await sharp(inputPath)
      .rotate()
      .webp({ quality: 90, effort: 6, smartSubsample: true })
      .toFile(outputPath)
    const metadata = await sharp(outputPath).metadata()
    if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
      throw new Error('Prepared asset failed WebP validation: ' + asset.outputRef)
    }
    prepared.push({
      finalIndex: asset.finalIndex,
      provenance: asset.provenance,
      outputRef: asset.outputRef,
      width: metadata.width,
      height: metadata.height,
    })
  }
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
        await new Promise((resolve) => setTimeout(resolve, 750 * 2 ** (attempt - 1)))
      }
    }
  }
  throw new Error(label + ' failed after 3 attempts: '
    + (lastError instanceof Error ? lastError.message : String(lastError)))
}

async function cleanupUrls(urls: string[]): Promise<string[]> {
  const failures: string[] = []
  for (const url of urls) {
    try {
      await deleteFromR2(url)
    } catch {
      failures.push(url)
    }
  }
  return failures
}

async function uploadAssets(audit: ImportAudit): Promise<UploadManifest> {
  await validateAudit(audit, 'pre-upload')
  const uploaded: UploadedAsset[] = []
  try {
    for (const asset of audit.finalAssets) {
      const filePath = resolveImportOutput(asset.outputRef)
      const buffer = await readFile(filePath)
      const metadata = await sharp(filePath).metadata()
      if (!metadata.width || !metadata.height) {
        throw new Error('Missing dimensions for ' + asset.outputRef)
      }
      const role = asset.provenance === 'gallery' ? 'g' : 'd'
      const filename = [
        '20260816-en397-abs-safety-helmet-2158t-v1',
        role + String(asset.finalIndex).padStart(2, '0'),
        randomUUID().slice(0, 8),
      ].join('-') + '.webp'
      const outputUrl = await withRetry(
        'R2 upload for asset ' + asset.finalIndex,
        () => uploadToR2(buffer, filename, 'image/webp')
      )
      await withRetry(
        'Public WebP verification for asset ' + asset.finalIndex,
        () => assertPublicWebp(outputUrl)
      )
      asset.outputUrl = outputUrl
      uploaded.push({
        finalIndex: asset.finalIndex,
        provenance: asset.provenance,
        outputRef: asset.outputRef,
        outputUrl,
        width: metadata.width,
        height: metadata.height,
      })
    }
    audit.gate = {
      phase: 'pre-db-approved',
      sourceCoverage: '20/20 source images reconciled; 19/19 approved final assets uploaded; source image 9 rejected',
      databaseMutationAllowed: true,
      r2UploadAllowed: true,
      reason: 'User confirmed model 2158T, weight 410 g ±5% and ABS material, then explicitly requested formal product entry. All final WebPs passed public HTTP verification.',
    }
    await validateAudit(audit, 'pre-db')
    const manifest = uploadManifestSchema.parse({
      productSlug: PRODUCT_SLUG,
      createdAt: new Date().toISOString(),
      assets: uploaded,
    })
    await writeFile(PRE_DB_AUDIT_PATH, JSON.stringify(audit, null, 2) + '\n', 'utf8')
    await writeFile(UPLOAD_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
    return manifest
  } catch (error) {
    const failedCleanup = await cleanupUrls(uploaded.map((asset) => asset.outputUrl))
    const reason = error instanceof Error ? error.message : String(error)
    const cleanupStatus = failedCleanup.length > 0
      ? 'Manual cleanup required for ' + failedCleanup.join(', ')
      : 'New uploads were cleaned up.'
    throw new Error('Asset upload failed: ' + reason + '. ' + cleanupStatus,
      error instanceof Error ? { cause: error } : undefined)
  }
}

async function preflight(): Promise<{ category: { id: string; name: string; slug: string; isActive: boolean } }> {
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
    throw new Error('Active Head Protection category is missing or incompatible')
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
        id: 'en397-helmet-detail-' + String(asset.finalIndex).padStart(2, '0'),
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
  { name: 'Product Type', value: 'Industrial Safety Helmet' },
  { name: 'Model', value: '2158T' },
  { name: 'Material', value: 'ABS' },
  { name: 'Weight', value: '410 g ±5%' },
  { name: 'Standard', value: 'EN 397:2012 + A1:2012 (User-Confirmed Listing Standard; Certificate / Test Report Not Provided)' },
  { name: 'Shell', value: 'Non-Vented ABS Shell with Front Brim and Rain Channel' },
  { name: 'Suspension', value: 'Four-Point Suspension; 25–50 mm Shell Clearance Shown by Source' },
  { name: 'Adjustment', value: 'Rear Ratchet Headband' },
  { name: 'Chin Strap', value: 'Adjustable' },
  { name: 'Sweatband', value: 'Front Sweat-Absorbing Pad' },
  { name: 'Colors Shown', value: 'Blue, Yellow, Red and White (Display Only; No Variants Created)' },
  { name: 'Brand', value: 'Rongyu' },
  { name: 'Origin', value: 'China' },
  { name: 'Packaging', value: '30 pcs/carton; Outer Carton 68 × 29 × 83 (Source Unit Not Stated)' },
  { name: 'Industrial Production License No.', value: 'Guangdong XK02-001-10502 (Source Image)' },
  { name: 'Customization', value: 'Logo Printing Shown by Source; Not Configured as a Selectable Option' },
  { name: 'Applications', value: 'Construction, Steel Production, Installation, Railway Maintenance and General Industrial Work; Selection Must Follow a Site-Specific Hazard Assessment' },
  { name: 'Minimum Order Quantity', value: 'Not Provided' },
  { name: 'Purchase Price', value: 'USD 1.50 (Source Notion Page; Verify Current Quote)' },
  { name: 'Certification / Test Report', value: 'Not Provided' },
  { name: 'Safety Note', value: 'Verify EN 397 documentation, optional performance markings and site suitability before relying on protection claims. Electrical insulation, low-temperature performance and comparative impact claims were not independently verified.' },
  { name: 'Source', value: NOTION_URL },
]

const galleryAltByIndex = new Map<number, string>([
  [1, 'Blue ABS industrial safety helmet model 2158T'],
  [2, 'Yellow ABS industrial safety helmet model 2158T'],
  [3, 'Red ABS industrial safety helmet model 2158T'],
  [4, 'White ABS industrial safety helmet model 2158T'],
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
  if (gallery.length !== 4 || details.length !== 15) {
    throw new Error('Upload manifest asset counts are inconsistent')
  }
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({ where: { slug: CATEGORY_SLUG } })
    const slugConflict = await tx.product.findUnique({
      where: { slug: PRODUCT_SLUG },
      select: { id: true },
    })
    const redirectConflict = await tx.productSlugRedirect.findUnique({
      where: { slug: PRODUCT_SLUG },
      select: { productId: true },
    })
    if (!category || !category.isActive || category.id !== preflightResult.category.id) {
      throw new Error('Head Protection category changed after preflight')
    }
    if (slugConflict || redirectConflict) {
      throw new Error('Product slug became unavailable after preflight')
    }
    return tx.product.create({
      data: {
        name: PRODUCT_NAME,
        slug: PRODUCT_SLUG,
        description: 'Non-vented ABS industrial safety helmet model 2158T with four-point suspension, rear ratchet adjustment, adjustable chin strap, front sweatband and rain-channel brim. The listing references EN 397:2012 + A1:2012; certification and test documentation were not provided.',
        price: PRODUCT_PRICE,
        comparePrice: null,
        cost: null,
        sku: null,
        stock: 0,
        weight: PRODUCT_WEIGHT_KG,
        categoryId: category.id,
        isActive: false,
        isFeatured: false,
        specifications,
        content: productContent(details),
        usageScenes: ['construction', 'steel-production', 'installation', 'railway-maintenance'],
        metaTitle: '2158T ABS Industrial Safety Helmet with Ratchet Adjustment',
        metaDescription: 'Model 2158T non-vented ABS industrial safety helmet with four-point suspension, ratchet adjustment, chin strap and 410 g ±5% weight.',
        metaKeywords: 'ABS safety helmet, EN 397 helmet, industrial hard hat, ratchet safety helmet, model 2158T',
        ogTitle: PRODUCT_NAME,
        ogDescription: 'Non-vented ABS industrial safety helmet model 2158T with four-point suspension and rear ratchet adjustment.',
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
  if (manifest.assets.length !== 19) {
    throw new Error('Upload manifest does not contain the approved 19 assets')
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
    noPurchaseCostField: product.cost === null,
    inactive: !product.isActive && !product.isFeatured,
    category: product.category?.slug === CATEGORY_SLUG,
    weightKg: product.weight?.toString() === '0.41',
    galleryCount: product.images.length === 4,
    detailCount: detailUrls.length === 15,
    noVariants: product.variants.length === 0,
    noPriceTiers: product.priceTiers.length === 0,
    noSku: product.sku === null,
    schemaSafeStock: product.stock === 0,
    confirmedModel: specificationsText.includes('2158T'),
    confirmedMaterial: specificationsText.includes('ABS'),
    confirmedWeight: specificationsText.includes('410 g ±5%'),
    standardReference: specificationsText.includes('EN 397:2012 + A1:2012'),
    purchasePriceEvidence: specificationsText.includes('USD 1.50'),
    minimumOrderUnprovided: specificationsText.includes('Not Provided'),
    certificateUnprovided: specificationsText.includes('Certification / Test Report'),
    unsupportedComparativeClaimExcluded: !specificationsText.includes('10 Times')
      && !specificationsText.includes('ten-times'),
    noTemporaryNotionImages: !contentText.includes('prod-files-secure')
      && product.images.every((image) => !image.url.includes('prod-files-secure')),
    uniqueGalleryUrls: new Set(product.images.map((image) => image.url)).size === 4,
    uniqueDetailUrls: new Set(detailUrls).size === 15,
  }
  const failed = Object.entries(assertions)
    .filter(([, passed]) => !passed)
    .map(([name]) => name)
  if (failed.length > 0) {
    throw new Error('Draft verification failed: ' + failed.join(', '))
  }
  for (const url of [...product.images.map((image) => image.url), ...detailUrls]) {
    await assertPublicWebp(url)
  }
  return {
    id: product.id,
    slug: product.slug,
    price: product.price.toString(),
    priceStatus: 'Schema placeholder only; selling price not provided',
    cost: product.cost,
    stock: product.stock,
    stockStatus: 'Inactive-draft schema placeholder; supplier stock not provided',
    sku: product.sku,
    weightKg: product.weight?.toString() ?? null,
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
  if (process.argv.includes('--validate-pre-db')) {
    const preDbAudit = await readAudit(PRE_DB_AUDIT_PATH)
    const manifest = await readManifest()
    await validateAudit(preDbAudit, 'pre-db')
    const manifestByIndex = new Map(manifest.assets.map((asset) => [asset.finalIndex, asset]))
    for (const asset of preDbAudit.finalAssets) {
      const uploaded = manifestByIndex.get(asset.finalIndex)
      if (!uploaded
        || asset.outputRef !== uploaded.outputRef
        || asset.outputUrl !== uploaded.outputUrl) {
        throw new Error('Pre-db audit and upload manifest disagree for asset ' + asset.finalIndex)
      }
    }
    process.stdout.write(JSON.stringify({
      mode: 'validate-pre-db',
      approvedAssets: manifest.assets.length,
      databaseMutationAllowed: preDbAudit.gate.databaseMutationAllowed,
    }, null, 2) + '\n')
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
    for (const asset of manifest.assets) {
      await assertPublicWebp(asset.outputUrl)
    }
    let product: Awaited<ReturnType<typeof writeProduct>>
    try {
      product = await writeProduct(manifest, preflightResult)
    } catch (error) {
      const failedCleanup = await cleanupUrls(manifest.assets.map((asset) => asset.outputUrl))
      const reason = error instanceof Error ? error.message : String(error)
      const cleanupStatus = failedCleanup.length > 0
        ? 'Manual cleanup required for ' + failedCleanup.join(', ')
        : 'New uploads were cleaned up.'
      throw new Error('Database write failed: ' + reason + '. ' + cleanupStatus,
        error instanceof Error ? { cause: error } : undefined)
    }
    process.stdout.write(JSON.stringify({
      mode: 'execute',
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price.toString(),
        cost: product.cost,
        sku: product.sku,
        stock: product.stock,
        weightKg: product.weight?.toString() ?? null,
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
      cost: null,
      stock: 0,
      sku: null,
      weightKg: PRODUCT_WEIGHT_KG.toString(),
      galleryCount: 4,
      detailCount: 15,
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
