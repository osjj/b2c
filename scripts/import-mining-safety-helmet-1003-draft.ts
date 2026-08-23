import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'
import { z } from 'zod'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const IMPORT_DIR = path.resolve('output/mining-helmet-review')
const FINAL_DIR = path.join(IMPORT_DIR, 'final')
const AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.json')
const PRE_DB_AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.pre-db.json')
const UPLOAD_MANIFEST_PATH = path.join(IMPORT_DIR, 'upload-manifest.json')

const CATEGORY_SLUG = 'safety-helmets'
const CATEGORY_NAME = 'Safety Helmets'
const PRODUCT_NAME = 'Model 1003 Mining Safety Helmet with Headlamp Mount'
const PRODUCT_SLUG = 'model-1003-mining-safety-helmet-headlamp-mount'
const CURRENT_PRODUCT_ID = 'cmt092kis0001umy05t2z8mlt'
const CURRENT_PRODUCT_SLUG = 'mining-safety-helmet-headlamp-mount'
const PRODUCT_PRICE = new Prisma.Decimal('1.60')
const NOTION_PAGE_ID = '3c1d505a-0030-8033-9656-c13b3aad33e9'
const NOTION_URL = 'https://app.notion.com/p/3c1d505a003080339656c13b3aad33e9?pvs=204'

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
    listedPriceEvidence: z.string().min(1),
    minimumOrderQuantity: z.string().min(1),
    storefrontStockStatus: z.string().min(1),
    skuStatus: z.string().min(1),
    variantStatus: z.string().min(1),
    priceTierStatus: z.string().min(1),
    confirmedParameters: z.string().min(1),
    claimStatus: z.string().min(1),
  }),
  sourceTotals: z.object({
    notionImages: z.literal(7),
    approvedFinalAssets: z.literal(7),
    rejectedSourceImages: z.literal(0),
    galleryAssets: z.literal(4),
    detailAssets: z.literal(3),
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
  if (audit.product.title !== PRODUCT_NAME) {
    throw new Error('Audit title does not match the approved product title')
  }
  if (audit.product.listedPriceEvidence !== 'USD 1.60 (source Notion page; user approved as storefront price)') {
    throw new Error('Approved USD 1.60 price evidence changed unexpectedly')
  }
  if (!/not provided/i.test(audit.product.minimumOrderQuantity)
    || !/not provided/i.test(audit.product.storefrontStockStatus)
    || !/not provided/i.test(audit.product.skuStatus)) {
    throw new Error('Audit must preserve unprovided commercial fields')
  }
  if (!/not created/i.test(audit.product.variantStatus)
    || !/not created/i.test(audit.product.priceTierStatus)) {
    throw new Error('Audit must forbid inferred variants and price tiers')
  }
  if (audit.product.confirmedParameters
    !== 'Model 1003; ABS material selected after review; weight 435 g ±5%; black, red and yellow colors') {
    throw new Error('Audit does not contain the approved model, material, weight and colors')
  }
  if (!/not provided/i.test(audit.product.claimStatus)
    || !/excluded by user request/i.test(audit.product.claimStatus)) {
    throw new Error('Audit must preserve the certification warning and GB exclusion')
  }
  if (!hasSequentialIndexes(audit.sourceAssets.map((asset) => asset.sourceIndex), 7)) {
    throw new Error('Source audit must cover Notion images 1 through 7 exactly once')
  }
  if (audit.sourceAssets.some((asset) => asset.decision === 'reject')) {
    throw new Error('The approved seven-image source set may not contain rejected assets')
  }
  if (!hasSequentialIndexes(audit.finalAssets.map((asset) => asset.finalIndex), 7)) {
    throw new Error('Final audit must cover approved assets 1 through 7 exactly once')
  }
  const gallery = audit.finalAssets.filter((asset) => asset.provenance === 'gallery')
  const details = audit.finalAssets.filter((asset) => asset.provenance === 'detail')
  if (gallery.length !== 4 || details.length !== 3) {
    throw new Error('Expected four gallery assets and three detail assets')
  }
  if (new Set(audit.finalAssets.map((asset) => asset.outputRef)).size !== 7) {
    throw new Error('Final outputRef values must be unique')
  }
  const sourceByIndex = new Map(audit.sourceAssets.map((asset) => [asset.sourceIndex, asset]))
  await Promise.all(audit.finalAssets.map(async (asset) => {
    const sourceIndex = asset.derivedFromSourceIndexes[0]
    if (asset.derivedFromSourceIndexes.length !== 1 || !sourceIndex || !sourceByIndex.has(sourceIndex)) {
      throw new Error('Each final asset must map to exactly one audited source image')
    }
    resolveProjectInput(asset.inputRef)
    const metadata = await sharp(resolveImportOutput(asset.outputRef)).metadata()
    if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
      throw new Error('Final asset is not a valid WebP: ' + asset.outputRef)
    }
    if (phase === 'pre-db' && (!asset.outputUrl || asset.outputUrl.includes('prod-files-secure'))) {
      throw new Error('Final asset lacks a durable R2 URL: ' + asset.finalIndex)
    }
  }))
  if (phase === 'pre-upload' && (!audit.gate.r2UploadAllowed || audit.gate.databaseMutationAllowed)) {
    throw new Error('Pre-upload gate must allow R2 upload but forbid database mutation')
  }
  if (phase === 'pre-db' && (!audit.gate.r2UploadAllowed || !audit.gate.databaseMutationAllowed)) {
    throw new Error('Pre-db gate must allow both R2 upload and database mutation')
  }
}

async function prepareAssets(audit: ImportAudit): Promise<Array<Record<string, unknown>>> {
  await mkdir(FINAL_DIR, { recursive: true })
  const prepared = await Promise.all(audit.finalAssets.map(async (asset) => {
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
    return {
      finalIndex: asset.finalIndex,
      provenance: asset.provenance,
      outputRef: asset.outputRef,
      width: metadata.width,
      height: metadata.height,
    }
  }))
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
  const results = await Promise.allSettled(urls.map((url) => deleteFromR2(url)))
  return results.flatMap((result, index) => result.status === 'rejected' ? [urls[index] ?? 'unknown'] : [])
}

async function uploadAssets(audit: ImportAudit): Promise<UploadManifest> {
  await validateAudit(audit, 'pre-upload')
  const prepared = await Promise.all(audit.finalAssets.map(async (asset) => {
    const filePath = resolveImportOutput(asset.outputRef)
    const [buffer, metadata] = await Promise.all([readFile(filePath), sharp(filePath).metadata()])
    if (!metadata.width || !metadata.height) {
      throw new Error('Missing dimensions for ' + asset.outputRef)
    }
    return { asset, buffer, width: metadata.width, height: metadata.height }
  }))
  const uploaded: UploadedAsset[] = []
  try {
    await prepared.reduce<Promise<void>>(async (previous, item) => {
      await previous
      const role = item.asset.provenance === 'gallery' ? 'g' : 'd'
      const filename = [
        '20260819-mining-safety-helmet-1003-v1',
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
      sourceCoverage: '7/7 Notion images reconciled; 7/7 approved final assets uploaded and publicly verified',
      databaseMutationAllowed: true,
      r2UploadAllowed: true,
      reason: 'User approved the English image set and requested an inactive product draft. Every final WebP passed public HTTP verification before database mutation.',
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
    throw new Error('Asset upload failed: ' + reason + '. ' + cleanupStatus,
      error instanceof Error ? { cause: error } : undefined)
  }
}

async function preflight(): Promise<{ category: { id: string; name: string; slug: string; isActive: boolean } }> {
  const category = await prisma.category.findUnique({
    where: { slug: CATEGORY_SLUG },
    select: { id: true, name: true, slug: true, isActive: true },
  })
  if (!category || category.name !== CATEGORY_NAME || !category.isActive) {
    throw new Error('Active Safety Helmets category is missing or incompatible')
  }
  const existingProducts = await prisma.product.findMany({
    where: {
      OR: [
        { id: CURRENT_PRODUCT_ID },
        { slug: PRODUCT_SLUG },
        { slug: CURRENT_PRODUCT_SLUG },
        { name: { equals: PRODUCT_NAME, mode: 'insensitive' } },
        { categoryId: category.id, name: { contains: '1003', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, slug: true, isActive: true },
  })
  const redirectConflict = await prisma.productSlugRedirect.findUnique({
    where: { slug: PRODUCT_SLUG },
    select: { productId: true },
  })
  if (existingProducts.length > 0) {
    throw new Error('A matching product already exists; refusing to create a duplicate draft: '
      + existingProducts.map((product) => product.id + '/' + product.slug).join(', '))
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
        id: 'mining-helmet-1003-detail-' + String(asset.finalIndex).padStart(2, '0'),
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
  { name: 'Product Type', value: 'Mining Safety Helmet' },
  { name: 'Brand', value: 'Rongyu' },
  { name: 'Model', value: '1003' },
  { name: 'Material', value: 'ABS (Selected from the primary product and color sources)' },
  { name: 'Material Evidence Note', value: 'One source attribute image states polymer-blend polyethylene; this conflicts with the ABS main-image and color evidence and requires supplier confirmation.' },
  { name: 'Weight', value: '435 g ±5%' },
  { name: 'Colors Shown', value: 'Black, Red and Yellow (Display Only; No Variants Created)' },
  { name: 'Surface Finish', value: 'Matte' },
  { name: 'Application', value: 'Mining and Coal Mines' },
  { name: 'Primary Function', value: 'Head Protection' },
  { name: 'Suspension', value: 'Button-Type Suspension' },
  { name: 'Headlamp Compatibility', value: 'Headlamp Mount Available' },
  { name: 'Packaging', value: '30 pcs/carton; Outer Carton 68 × 29 × 71 (Source Unit Not Stated)' },
  { name: 'Origin', value: 'Mainland China' },
  { name: 'Imported', value: 'No' },
  { name: 'Industrial Production License No.', value: '粤XK02-001-10502 (Source Image)' },
  { name: 'Price Evidence', value: 'USD 1.60 (Source Notion Page; User Approved as Storefront Price)' },
  { name: 'Minimum Order Quantity', value: 'Not Provided' },
  { name: 'Certification Claim', value: 'EN 397 (Source Notion Text Claim; Unverified)' },
  { name: 'Certification Evidence', value: 'Certificate, Test Report, Certificate Number and Issuing Body Not Provided' },
  { name: 'Standard Exclusion', value: 'GB 2811-2019 Excluded from Product Draft and English Marketing Images by User Request' },
  { name: 'Source', value: NOTION_URL },
]

const galleryAltByIndex = new Map<number, string>([
  [1, 'Yellow model 1003 mining safety helmet with red reflective strip'],
  [2, 'Red model 1003 mining safety helmet with yellow reflective strip'],
  [3, 'Black model 1003 mining safety helmet with blue reflective strip'],
  [7, 'Interior button-type suspension of model 1003 mining safety helmet'],
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
  if (gallery.length !== 4 || details.length !== 3) {
    throw new Error('Upload manifest asset counts are inconsistent')
  }
  return prisma.$transaction(async (tx) => {
    const [category, slugConflict, modelConflicts, redirectConflict] = await Promise.all([
      tx.category.findUnique({ where: { slug: CATEGORY_SLUG } }),
      tx.product.findUnique({ where: { slug: PRODUCT_SLUG }, select: { id: true } }),
      tx.product.findMany({
        where: { categoryId: preflightResult.category.id, name: { contains: '1003', mode: 'insensitive' } },
        select: { id: true },
      }),
      tx.productSlugRedirect.findUnique({ where: { slug: PRODUCT_SLUG }, select: { productId: true } }),
    ])
    if (!category || !category.isActive || category.id !== preflightResult.category.id) {
      throw new Error('Safety Helmets category changed after preflight')
    }
    if (slugConflict || modelConflicts.length > 0 || redirectConflict) {
      throw new Error('Product identity became unavailable after preflight')
    }
    return tx.product.create({
      data: {
        name: PRODUCT_NAME,
        slug: PRODUCT_SLUG,
        description: 'Matte ABS mining safety helmet model 1003 with reflective strip, button-type suspension and provision for a headlamp mount. Source imagery shows yellow, red and black versions for mining and coal-mine use.',
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
        usageScenes: ['mining', 'coal-mining'],
        metaTitle: 'Model 1003 Mining Safety Helmet with Headlamp Mount',
        metaDescription: 'Matte ABS mining safety helmet model 1003 with reflective strip, button-type suspension, headlamp-mount provision and black, red or yellow display colors.',
        metaKeywords: 'mining safety helmet, coal mine helmet, mining hard hat, headlamp mount helmet, model 1003 helmet',
        ogTitle: PRODUCT_NAME,
        ogDescription: 'Model 1003 matte ABS mining helmet with reflective strip, button-type suspension and headlamp-mount provision.',
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
  if (manifest.assets.length !== 7) {
    throw new Error('Upload manifest does not contain the approved seven assets')
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
    approvedPrice: product.price.toString() === '1.6',
    noPurchaseCostField: product.cost === null,
    inactive: !product.isActive && !product.isFeatured,
    category: product.category?.slug === CATEGORY_SLUG,
    weightNotRounded: product.weight === null,
    galleryCount: product.images.length === 4,
    detailCount: detailUrls.length === 3,
    noVariants: product.variants.length === 0,
    noPriceTiers: product.priceTiers.length === 0,
    noSku: product.sku === null,
    schemaSafeStock: product.stock === 0,
    confirmedModel: specificationsText.includes('1003'),
    confirmedMaterial: specificationsText.includes('ABS'),
    confirmedWeight: specificationsText.includes('435 g ±5%'),
    materialConflictDisclosed: specificationsText.includes('polymer-blend polyethylene'),
    certificationUnverified: specificationsText.includes('EN 397')
      && specificationsText.includes('Unverified')
      && specificationsText.includes('Not Provided'),
    gbExcluded: specificationsText.includes('GB 2811-2019 Excluded'),
    noTemporaryNotionImages: !contentText.includes('prod-files-secure')
      && product.images.every((image) => !image.url.includes('prod-files-secure')),
    uniqueGalleryUrls: new Set(product.images.map((image) => image.url)).size === 4,
    uniqueDetailUrls: new Set(detailUrls).size === 3,
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
    name: product.name,
    slug: product.slug,
    price: product.price.toString(),
    cost: product.cost,
    stock: product.stock,
    sku: product.sku,
    weightKg: product.weight,
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
      if (!uploaded || asset.outputRef !== uploaded.outputRef || asset.outputUrl !== uploaded.outputUrl) {
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
      weightKg: null,
      galleryCount: 4,
      detailCount: 3,
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
