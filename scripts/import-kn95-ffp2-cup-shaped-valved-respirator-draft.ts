import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'
import { z } from 'zod'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const IMPORT_DIR = path.resolve('output/kn95-ffp2-cup-shaped-valved-dust-respirator')
const FINAL_DIR = path.join(IMPORT_DIR, 'final')
const AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.json')
const PRE_DB_AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.pre-db.json')
const UPLOAD_MANIFEST_PATH = path.join(IMPORT_DIR, 'upload-manifest.json')

const CATEGORY_SLUG = 'respiratory-protection'
const CATEGORY_NAME = 'Respiratory Protection'
const PRODUCT_NAME = 'KN95 / FFP2 Cup-Shaped Valved Dust Respirator'
const PRODUCT_SLUG = 'kn95-ffp2-cup-shaped-valved-dust-respirator'
const PRODUCT_PRICE = new Prisma.Decimal('0.00')
const NOTION_PAGE_ID = '3bdd505a-0030-8017-9e1a-d1aeb0235cf9'
const NOTION_URL = 'https://app.notion.com/p/3bdd505a003080179e1ad1aeb0235cf9?pvs=204'

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
    claimStatus: z.string().min(1),
  }),
  sourceTotals: z.object({
    notionImages: z.literal(15),
    approvedFinalAssets: z.literal(15),
    rejectedSourceImages: z.literal(0),
    galleryAssets: z.literal(4),
    detailAssets: z.literal(11),
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
  if (audit.product.purchasePriceEvidence !== 'USD 0.19 (source unit not stated; verify current quote)') {
    throw new Error('Purchase-price evidence changed unexpectedly')
  }
  if (!/not provided/i.test(audit.product.minimumOrderQuantity)) {
    throw new Error('Audit must keep the minimum order quantity unprovided')
  }
  if (!/not provided/i.test(audit.product.sellingPriceStatus)) {
    throw new Error('Audit must state that a storefront selling price was not provided')
  }
  if (!/not created/i.test(audit.product.skuStatus)
    || !/not created/i.test(audit.product.variantStatus)
    || !/not created/i.test(audit.product.priceTierStatus)) {
    throw new Error('Audit must forbid inferred SKU, variants and price tiers')
  }
  if (!/conflicting/i.test(audit.product.claimStatus)
    || !/no certificate or test report/i.test(audit.product.claimStatus)) {
    throw new Error('Audit must preserve the source-claim conflict warning')
  }
  if (!sequentialIndexes(audit.sourceAssets.map((asset) => asset.sourceIndex), 15)) {
    throw new Error('Source audit must cover Notion images 1 through 15 exactly once')
  }
  if (audit.sourceAssets.some((asset) => asset.decision === 'reject')) {
    throw new Error('No approved source image may be rejected')
  }
  if (!sequentialIndexes(audit.finalAssets.map((asset) => asset.finalIndex), 15)) {
    throw new Error('Final audit must cover approved assets 1 through 15 exactly once')
  }
  const gallery = audit.finalAssets.filter((asset) => asset.provenance === 'gallery')
  const details = audit.finalAssets.filter((asset) => asset.provenance === 'detail')
  if (gallery.length !== 4 || details.length !== 11) {
    throw new Error('Expected four gallery assets and eleven detail assets')
  }
  if (new Set(audit.finalAssets.map((asset) => asset.outputRef)).size !== 15) {
    throw new Error('Final outputRef values must be unique')
  }
  // Keep local asset preparation deterministic so a failed file is reported by
  // its audit order and never leaves an ambiguous partially prepared sequence.
  for (const asset of audit.finalAssets) {
    if (asset.derivedFromSourceIndexes.length !== 1
      || asset.derivedFromSourceIndexes[0] !== asset.finalIndex) {
      throw new Error('Final asset must map one-to-one to its source index: ' + asset.finalIndex)
    }
    const metadata = await sharp(resolveImportOutput(asset.outputRef)).metadata()
    if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
      throw new Error('Final asset is not a valid WebP: ' + asset.outputRef)
    }
    if (phase === 'pre-db' && (!asset.outputUrl || asset.outputUrl.includes('prod-files-secure'))) {
      throw new Error('Final asset lacks a durable R2 URL: ' + asset.finalIndex)
    }
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
    const expectedInput = path.resolve(
      'tmp/product-imports/kn95-ffp2-valved-mask/english-images/webp',
      'image-' + String(asset.finalIndex).padStart(2, '0') + '-english.webp'
    )
    if (path.resolve(asset.inputRef) !== expectedInput) {
      throw new Error('Audit inputRef does not match the reviewed image for asset ' + asset.finalIndex)
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
  // R2 has aborted burst requests in this environment; cleanup is intentionally
  // limited to one request at a time for a small, fixed set of import assets.
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
    // R2 uploads and public-URL checks stay at concurrency 1 because this
    // production account has previously aborted concurrent import requests.
    for (const asset of audit.finalAssets) {
      const filePath = resolveImportOutput(asset.outputRef)
      const buffer = await readFile(filePath)
      const metadata = await sharp(filePath).metadata()
      if (!metadata.width || !metadata.height) {
        throw new Error('Missing dimensions for ' + asset.outputRef)
      }
      const role = asset.provenance === 'gallery' ? 'g' : 'd'
      const filename = [
        '20260816-kn95-ffp2-cup-valved-respirator-v1',
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
      sourceCoverage: '15/15 source images reconciled; 15/15 approved final assets uploaded',
      databaseMutationAllowed: true,
      r2UploadAllowed: true,
      reason: 'User approved the English, brand-removed image set and requested import. All final WebPs passed public HTTP verification. Selling price, MOQ, stock, SKU, variants and tiers remain unprovided.',
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
    throw new Error('Active Respiratory Protection category is missing or incompatible')
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
        id: 'valved-respirator-detail-' + String(asset.finalIndex).padStart(2, '0'),
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
  { name: 'Product Type', value: 'Cup-Shaped Valved Particulate Respirator' },
  { name: 'Model / Item No.', value: '9009V' },
  { name: 'Construction', value: '5-Layer Cup-Shaped Construction' },
  { name: 'Materials', value: 'Nonwoven Fabric, Activated Carbon, 2 Meltblown Layers and Needle-Punched Cotton' },
  { name: 'Edge Seal', value: 'PU Edge Seal; Half-Seal and Full-Seal Options Shown by Source' },
  { name: 'Activated Carbon', value: 'Optional According to Source' },
  { name: 'Exhalation Valve', value: 'Present in Product Imagery; Source Attribute Table Also Contains a Conflicting “No” Entry' },
  { name: 'Wearing Style', value: 'Headband' },
  { name: 'Headband', value: 'Approx. 7 mm Elastic Strap' },
  { name: 'Nose Clip', value: 'M-Shaped Adjustable Nose Clip' },
  { name: 'Colors', value: 'White and Gray' },
  { name: 'Weight Reference', value: '10 g (Source Attribute Table)' },
  { name: 'Packaging', value: 'Boxed' },
  { name: 'Series', value: 'Disposable' },
  { name: 'Source-Stated Grade', value: 'KN95; Product Sample Is Also Marked FFP2 NR (Conflicting Source Claims)' },
  { name: 'Source-Stated Filtration', value: '≥95%; A Separate Source Attribute Table States ≥98% (Conflicting Source Claims)' },
  { name: 'Source-Stated Standard', value: 'GB 2626-2019; Product Sample Is Also Marked EN 149:2001+A1:2009' },
  { name: 'Source-Visible Marking', value: '9009V, FFP2 NR, CE 2834 and EN 149:2001+A1:2009; Visible Marking Only, Not Independently Verified' },
  { name: 'Applications', value: 'Dusty Work, Mining, Grinding, Cutting, Construction, Painting and Welding; Selection Must Follow a Site-Specific Hazard Assessment' },
  { name: 'Minimum Order Quantity', value: 'Not Provided' },
  { name: 'Purchase Price', value: 'USD 0.19 (Source Unit Not Stated; Verify Current Quote)' },
  { name: 'Certification / Test Report', value: 'Not Provided' },
  { name: 'Safety Note', value: 'Source grade, filtration and standard statements conflict. Verify certification, test reports, fit and hazard suitability before relying on any protection claim.' },
  { name: 'Source Location', value: 'Anqing, Anhui, China' },
  { name: 'Source', value: NOTION_URL },
  { name: 'Origin', value: 'China' },
]

const galleryAltByIndex = new Map<number, string>([
  [1, 'Cup-shaped valved particulate respirator front view'],
  [2, 'Cup-shaped valved respirator product view'],
  [11, 'Cup-shaped respirator with exhalation valve angled view'],
  [15, 'Headband cup-shaped valved respirator product view'],
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
  if (gallery.length !== 4 || details.length !== 11) {
    throw new Error('Upload manifest asset counts are inconsistent')
  }
  return prisma.$transaction(async (tx) => {
    // The remote database has a conservative connection limit. These three
    // low-volume guard queries are intentionally sequential inside one tx.
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
      throw new Error('Respiratory Protection category changed after preflight')
    }
    if (slugConflict || redirectConflict) {
      throw new Error('Product slug became unavailable after preflight')
    }
    return tx.product.create({
      data: {
        name: PRODUCT_NAME,
        slug: PRODUCT_SLUG,
        description: 'Five-layer cup-shaped headband particulate respirator with an exhalation valve, optional activated carbon, PU edge-seal options and an adjustable nose clip. Protection markings and performance claims shown by the source require independent document verification before use.',
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
        usageScenes: [],
        metaTitle: 'Cup-Shaped Valved Dust Respirator with PU Edge Seal',
        metaDescription: 'Five-layer cup-shaped headband particulate respirator with exhalation valve, optional activated carbon, PU edge-seal options and adjustable nose clip.',
        metaKeywords: 'cup shaped dust respirator, valved particulate respirator, headband dust mask, activated carbon respirator',
        ogTitle: PRODUCT_NAME,
        ogDescription: 'Cup-shaped headband particulate respirator with an exhalation valve, optional activated carbon and PU edge-seal options.',
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
  if (manifest.assets.length !== 15) {
    throw new Error('Upload manifest does not contain the approved 15 assets')
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
    galleryCount: product.images.length === 4,
    detailCount: detailUrls.length === 11,
    noVariants: product.variants.length === 0,
    noPriceTiers: product.priceTiers.length === 0,
    noSku: product.sku === null,
    schemaSafeStock: product.stock === 0,
    purchasePriceEvidence: specificationsText.includes('USD 0.19'),
    minimumOrderUnprovided: specificationsText.includes('Not Provided'),
    conflictWarning: specificationsText.includes('Conflicting Source Claims'),
    certificateUnprovided: specificationsText.includes('Certification / Test Report'),
    noTemporaryNotionImages: !contentText.includes('prod-files-secure')
      && product.images.every((image) => !image.url.includes('prod-files-secure')),
    noProcessText: !/(rebuilt|localized|supplier markings removed|AI-generated)/i.test(contentText),
    uniqueGalleryUrls: new Set(product.images.map((image) => image.url)).size === 4,
    uniqueDetailUrls: new Set(detailUrls).size === 11,
  }
  const failed = Object.entries(assertions)
    .filter(([, passed]) => !passed)
    .map(([name]) => name)
  if (failed.length > 0) {
    throw new Error('Draft verification failed: ' + failed.join(', '))
  }
  // Public R2 verification is intentionally sequential for the same reliability
  // reason as upload; this is a bounded list of fifteen assets.
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
    // Revalidate the bounded manifest sequentially before the database write.
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
        priceStatus: 'Schema placeholder only; selling price not provided',
        cost: product.cost,
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
      cost: null,
      stock: 0,
      sku: null,
      galleryCount: 4,
      detailCount: 11,
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
