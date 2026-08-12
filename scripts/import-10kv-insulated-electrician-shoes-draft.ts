import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const IMPORT_DIR = path.resolve('output/10kv-insulated-electrician-shoes')
const AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.json')
const PRE_DB_AUDIT_PATH = path.join(IMPORT_DIR, 'import-audit.pre-db.json')
const UPLOAD_MANIFEST_PATH = path.join(IMPORT_DIR, 'upload-manifest.json')
const CATEGORY_SLUG = 'safety-shoes'
const PRODUCT_NAME = '10 kV Insulated Electrician Safety Shoes with Blue Outsole'
const PRODUCT_SLUG = '10kv-insulated-electrician-safety-shoes-blue-outsole'
const PRODUCT_PRICE = new Prisma.Decimal('74.00')
const NOTION_URL = 'https://app.notion.com/p/3b6d505a00308011afd0d1f06af97931'

type AuditAsset = {
  sourceIndex: number
  provenance: 'gallery' | 'detail'
  decision: 'keep' | 'localize' | 'rebuild' | 'reject'
  reason: string
  outputRef?: string
  archiveRef?: string
  outputUrl?: string
  qa?: string
}

type ImportAudit = {
  product: {
    sourcePageId: string
    title: string
    sizeRange: string
    purchasePrice: string
    sellingPriceStatus: string
    authorizedSellingPrice?: number
    moqStatus: string
    stockStatus: string
    skuStatus: string
    variantStatus: string
  }
  sourceTotals: {
    all: number
    publishableProductAssets: number
    rejectedPromotionalAssets: number
  }
  assets: AuditAsset[]
  gate: {
    phase: string
    sourceCoverage: string
    databaseMutationAllowed: boolean
    r2UploadAllowed: boolean
    reason: string
  }
}

type UploadedAsset = {
  sourceIndex: number
  provenance: 'gallery' | 'detail'
  outputRef: string
  outputUrl: string
  width: number
  height: number
}

type UploadManifest = {
  productSlug: string
  createdAt: string
  assets: UploadedAsset[]
}

type ExistingProduct = {
  id: string
  name: string
  slug: string
  sku: string | null
  price: Prisma.Decimal
  comparePrice: Prisma.Decimal | null
  cost: Prisma.Decimal | null
  stock: number
  isActive: boolean
  isFeatured: boolean
  categoryId: string | null
  updatedAt: Date
  images: Array<{ url: string }>
  variants: Array<{ id: string }>
  priceTiers: Array<{ id: string }>
}

const prisma = new PrismaClient()

function selectedAssets(audit: ImportAudit): AuditAsset[] {
  return audit.assets
    .filter((asset) => asset.decision !== 'reject')
    .sort((a, b) => a.sourceIndex - b.sourceIndex)
}

function parseAudit(raw: unknown): ImportAudit {
  if (!raw || typeof raw !== 'object') throw new Error('Audit root must be an object')
  const audit = raw as Partial<ImportAudit>
  if (!audit.product || !audit.sourceTotals || !Array.isArray(audit.assets) || !audit.gate) {
    throw new Error('Audit is missing product, sourceTotals, assets, or gate')
  }
  return audit as ImportAudit
}

async function readAudit(filePath = AUDIT_PATH): Promise<ImportAudit> {
  return parseAudit(JSON.parse(await readFile(filePath, 'utf8')) as unknown)
}

async function validateAudit(audit: ImportAudit, phase: 'pre-upload' | 'pre-db'): Promise<void> {
  if (audit.product.sourcePageId !== '3b6d505a-0030-8011-afd0-d1f06af97931') {
    throw new Error('Audit source page does not match the approved Notion item')
  }
  if (audit.product.purchasePrice !== 'CNY 70 (Source unit not stated)') {
    throw new Error('Admin purchase price evidence changed unexpectedly')
  }
  if (audit.product.authorizedSellingPrice !== 74) {
    throw new Error('Authorized selling price must be exactly 74')
  }
  if (audit.sourceTotals.all !== 18 || audit.assets.length !== 18) {
    throw new Error('Audit must reconcile all 18 source images')
  }
  if (audit.assets.map((asset) => asset.sourceIndex).join(',') !== Array.from({ length: 18 }, (_, index) => index + 1).join(',')) {
    throw new Error('Audit source indexes must cover 1 through 18 exactly once')
  }
  const accepted = selectedAssets(audit)
  const rejected = audit.assets.filter((asset) => asset.decision === 'reject')
  if (accepted.length !== 13 || rejected.length !== 5) {
    throw new Error(`Expected 13 publishable and 5 archive-only assets, found ${accepted.length} and ${rejected.length}`)
  }
  if (accepted.filter((asset) => asset.provenance === 'gallery').length !== 2) {
    throw new Error('Expected exactly two accepted gallery assets')
  }
  if (accepted.filter((asset) => asset.provenance === 'detail').length !== 11) {
    throw new Error('Expected exactly eleven accepted detail assets')
  }
  await Promise.all(
    accepted.map(async (asset) => {
      if (!asset.outputRef || asset.qa !== 'pass') {
        throw new Error(`Accepted asset ${asset.sourceIndex} lacks approved output or QA state`)
      }
      const filePath = path.resolve(IMPORT_DIR, asset.outputRef)
      const metadata = await sharp(filePath).metadata()
      if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
        throw new Error(`Accepted asset ${asset.sourceIndex} is not a valid WebP`) 
      }
      if (phase === 'pre-db' && !asset.outputUrl) {
        throw new Error(`Accepted asset ${asset.sourceIndex} lacks outputUrl for pre-db validation`)
      }
    })
  )
  if (phase === 'pre-upload' && (!audit.gate.r2UploadAllowed || audit.gate.databaseMutationAllowed)) {
    throw new Error('Pre-upload gate must allow R2 upload but not database mutation')
  }
  if (phase === 'pre-db' && (!audit.gate.r2UploadAllowed || !audit.gate.databaseMutationAllowed)) {
    throw new Error('Pre-db gate must allow both R2 upload and database mutation')
  }
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
  const accepted = selectedAssets(audit)
  const uploaded: UploadedAsset[] = []
  try {
    const prepared = await Promise.all(
      accepted.map(async (asset) => {
        const outputRef = asset.outputRef
        if (!outputRef) throw new Error(`Accepted asset ${asset.sourceIndex} lacks outputRef`)
        const filePath = path.resolve(IMPORT_DIR, outputRef)
        const [buffer, metadata] = await Promise.all([readFile(filePath), sharp(filePath).metadata()])
        if (!metadata.width || !metadata.height) throw new Error(`Missing dimensions for ${outputRef}`)
        return { asset, outputRef, buffer, width: metadata.width, height: metadata.height }
      })
    )
    const uploadResults = await Promise.allSettled(
      prepared.map(async (item): Promise<UploadedAsset> => {
        const role = item.asset.provenance === 'gallery' ? 'g' : 'd'
        const filename = `20260812-10kv-insulated-electrician-shoes-v1-${role}${String(item.asset.sourceIndex).padStart(2, '0')}-${randomUUID().slice(0, 8)}.webp`
        const outputUrl = await uploadToR2(item.buffer, filename, 'image/webp')
        item.asset.outputUrl = outputUrl
        return {
          sourceIndex: item.asset.sourceIndex,
          provenance: item.asset.provenance,
          outputRef: item.outputRef,
          outputUrl,
          width: item.width,
          height: item.height,
        }
      })
    )
    uploaded.push(...uploadResults.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []))
    const uploadFailures = uploadResults.flatMap((result) =>
      result.status === 'rejected' ? [result.reason instanceof Error ? result.reason.message : String(result.reason)] : []
    )
    if (uploadFailures.length) throw new Error(`One or more R2 uploads failed: ${uploadFailures.join('; ')}`)
    await Promise.all(uploaded.map((asset) => assertPublicWebp(asset.outputUrl)))
    audit.gate = {
      phase: 'pre-db-approved',
      sourceCoverage: '18/18',
      databaseMutationAllowed: true,
      r2UploadAllowed: true,
      reason: 'User approved the English image set and selling price 74; all uploaded WebPs passed HTTP verification',
    }
    await validateAudit(audit, 'pre-db')
    const manifest = { productSlug: PRODUCT_SLUG, createdAt: new Date().toISOString(), assets: uploaded }
    await Promise.all([
      writeFile(PRE_DB_AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, 'utf8'),
      writeFile(UPLOAD_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    ])
    return manifest
  } catch (error) {
    const failedCleanup = await cleanupUrls(uploaded.map((asset) => asset.outputUrl))
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Asset upload failed: ${reason}. ${failedCleanup.length ? `Manual cleanup required for ${failedCleanup.join(', ')}` : 'New uploads were cleaned up.'}`,
      error instanceof Error ? { cause: error } : undefined
    )
  }
}

async function loadExistingProduct(): Promise<ExistingProduct | null> {
  const candidates = await prisma.product.findMany({
    where: {
      OR: [
        { slug: PRODUCT_SLUG },
        { name: { equals: PRODUCT_NAME, mode: 'insensitive' } },
        { description: { contains: NOTION_URL } },
      ],
    },
    include: {
      images: { select: { url: true } },
      variants: { select: { id: true } },
      priceTiers: { select: { id: true } },
    },
  })
  if (candidates.length > 1) throw new Error('Multiple matching product drafts found; refusing an ambiguous update')
  return candidates[0] ?? null
}

async function preflight() {
  const [category, slugConflict, redirectConflict, existing] = await Promise.all([
    prisma.category.findUnique({ where: { slug: CATEGORY_SLUG } }),
    prisma.product.findUnique({ where: { slug: PRODUCT_SLUG }, select: { id: true } }),
    prisma.productSlugRedirect.findUnique({ where: { slug: PRODUCT_SLUG }, select: { productId: true } }),
    loadExistingProduct(),
  ])
  if (!category || category.name !== 'Safety Shoes' || !category.isActive) {
    throw new Error('Active Safety Shoes category is missing or incompatible')
  }
  if (slugConflict && slugConflict.id !== existing?.id) throw new Error('Product slug is already used by another product')
  if (redirectConflict && redirectConflict.productId !== existing?.id) throw new Error('Product slug is reserved by another redirect')
  if (existing?.isActive || existing?.isFeatured) {
    throw new Error('Matching product is published; refusing to overwrite it as a draft')
  }
  return { category, existing }
}

function productContent(details: UploadedAsset[]): Prisma.InputJsonValue {
  return {
    time: Date.now(),
    version: '2.31.1',
    blocks: details.map((asset) => ({
      id: `insulated-shoes-${asset.sourceIndex}`,
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
  { name: 'Product Type', value: 'Low-Cut Insulated Electrician Safety Shoes' },
  { name: 'Item Number', value: '8132-1' },
  { name: 'Color', value: 'Black Upper / Blue Outsole' },
  { name: 'Size Range', value: 'EU 34-49' },
  { name: 'Upper Material', value: 'Split Leather' },
  { name: 'Lining', value: 'Sandwich Mesh' },
  { name: 'Toe Cap', value: 'Insulating Composite Toe' },
  { name: 'Insole', value: 'Hi-Poly Cushion Insole' },
  { name: 'Midsole', value: 'Kevlar Puncture-Resistant Midsole' },
  { name: 'Outsole', value: 'Solid Slip-Resistant Outsole' },
  { name: 'Electrical Insulation', value: '10 kV (Source-stated; verify applicable documentation before use)' },
  { name: 'Purchase Price', value: 'CNY 70 (Source unit not stated)' },
  { name: 'Source', value: NOTION_URL },
  { name: 'Origin', value: 'China' },
]

async function writeProduct(manifest: UploadManifest, preflightResult: Awaited<ReturnType<typeof preflight>>) {
  const gallery = manifest.assets.filter((asset) => asset.provenance === 'gallery')
  const details = manifest.assets.filter((asset) => asset.provenance === 'detail')
  if (gallery.length !== 2 || details.length !== 11) throw new Error('Upload manifest asset counts are inconsistent')
  const currentSnapshot = preflightResult.existing
    ? { id: preflightResult.existing.id, updatedAt: preflightResult.existing.updatedAt.getTime() }
    : null
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({ where: { slug: CATEGORY_SLUG } })
    if (!category || !category.isActive || category.id !== preflightResult.category.id) {
      throw new Error('Safety Shoes category changed after preflight')
    }
    const existing = currentSnapshot
      ? await tx.product.findUnique({ where: { id: currentSnapshot.id }, include: { variants: true, priceTiers: true } })
      : null
    if (existing && (existing.updatedAt.getTime() !== currentSnapshot?.updatedAt || existing.isActive || existing.isFeatured)) {
      throw new Error('Existing draft changed after preflight')
    }
    const data = {
      name: PRODUCT_NAME,
      slug: PRODUCT_SLUG,
      description: 'Black low-cut electrician safety shoes with a blue outsole, split-leather upper, composite toe, Kevlar midsole and source-stated 10 kV insulation for industrial procurement review.',
      price: PRODUCT_PRICE,
      categoryId: category.id,
      isActive: false,
      isFeatured: false,
      specifications,
      content: productContent(details),
      usageScenes: ['electrical-work', 'industrial', 'puncture-resistant', 'slip-resistant'],
      metaTitle: '10 kV Insulated Electrician Safety Shoes',
      metaDescription: 'Low-cut electrician safety shoes with blue outsole, composite toe, Kevlar midsole and source-stated 10 kV insulation in EU sizes 34-49.',
      metaKeywords: '10 kV insulated safety shoes, electrician work shoes, composite toe safety shoes, Kevlar midsole footwear',
      ogTitle: PRODUCT_NAME,
      ogDescription: 'Low-cut electrician safety shoes with composite toe, Kevlar midsole and blue slip-resistant outsole.',
      ogImage: gallery[0]?.outputUrl ?? null,
    } satisfies Prisma.ProductUncheckedUpdateInput
    if (existing) {
      return tx.product.update({
        where: { id: existing.id },
        data: {
          ...data,
          sku: existing.sku,
          stock: existing.stock,
          images: {
            deleteMany: {},
            create: gallery.map((asset, index) => ({
              url: asset.outputUrl,
              alt: index === 0 ? 'Black 10 kV insulated electrician safety shoes with blue outsole' : 'Multi-angle views of black electrician safety shoes with blue outsole',
              sortOrder: index,
            })),
          },
        },
        include: { images: true, variants: true, priceTiers: true, category: true },
      })
    }
    return tx.product.create({
      data: {
        ...data,
        comparePrice: null,
        cost: null,
        sku: null,
        stock: 0,
        images: {
          create: gallery.map((asset, index) => ({
            url: asset.outputUrl,
            alt: index === 0 ? 'Black 10 kV insulated electrician safety shoes with blue outsole' : 'Multi-angle views of black electrician safety shoes with blue outsole',
            sortOrder: index,
          })),
        },
      },
      include: { images: true, variants: true, priceTiers: true, category: true },
    })
  }, { isolationLevel: 'Serializable', timeout: 30_000 })
}

async function readManifest(): Promise<UploadManifest> {
  const manifest = JSON.parse(await readFile(UPLOAD_MANIFEST_PATH, 'utf8')) as UploadManifest
  if (manifest.productSlug !== PRODUCT_SLUG || manifest.assets.length !== 13) {
    throw new Error('Upload manifest does not match the approved import')
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
  if (!product) throw new Error('Imported product draft was not found')
  const content = product.content as { blocks?: Array<{ data?: { file?: { url?: string } } }> } | null
  const detailUrls = content?.blocks?.flatMap((block) => block.data?.file?.url ? [block.data.file.url] : []) ?? []
  const specificationsText = JSON.stringify(product.specifications)
  const contentText = JSON.stringify(product.content)
  const assertions = {
    price: product.price.toString() === '74',
    inactive: !product.isActive && !product.isFeatured,
    category: product.category?.slug === CATEGORY_SLUG,
    galleryCount: product.images.length === 2,
    detailCount: detailUrls.length === 11,
    noVariants: product.variants.length === 0,
    noPriceTiers: product.priceTiers.length === 0,
    noSku: product.sku === null,
    purchasePrice: specificationsText.includes('CNY 70 (Source unit not stated)'),
    noTemporaryNotionImages: !contentText.includes('prod-files-secure') && product.images.every((image) => !image.url.includes('prod-files-secure')),
    noProcessText: !/(rebuilt|localized|supplier markings removed|AI-generated)/i.test(contentText),
  }
  const failed = Object.entries(assertions).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length) throw new Error(`Draft verification failed: ${failed.join(', ')}`)
  await Promise.all([...product.images.map((image) => image.url), ...detailUrls].map(assertPublicWebp))
  return {
    id: product.id,
    slug: product.slug,
    price: product.price.toString(),
    stock: product.stock,
    stockEvidence: 'not provided; schema-safe inactive draft value only',
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
  const preflightResult = await preflight()
  if (process.argv.includes('--verify')) {
    process.stdout.write(`${JSON.stringify({ mode: 'verify', product: await verifyImportedDraft() }, null, 2)}\n`)
    return
  }
  if (process.argv.includes('--upload')) {
    const manifest = await uploadAssets(audit)
    process.stdout.write(`${JSON.stringify({ mode: 'upload', manifest }, null, 2)}\n`)
    return
  }
  if (process.argv.includes('--execute')) {
    const manifest = await readManifest()
    const preDbAudit = await readAudit(PRE_DB_AUDIT_PATH)
    await validateAudit(preDbAudit, 'pre-db')
    await Promise.all(manifest.assets.map((asset) => assertPublicWebp(asset.outputUrl)))
    let product: Awaited<ReturnType<typeof writeProduct>>
    try {
      product = await writeProduct(manifest, preflightResult)
    } catch (error) {
      if (!preflightResult.existing) {
        const failedCleanup = await cleanupUrls(manifest.assets.map((asset) => asset.outputUrl))
        const reason = error instanceof Error ? error.message : String(error)
        throw new Error(
          `Database write failed: ${reason}. ${failedCleanup.length ? `Manual cleanup required for ${failedCleanup.join(', ')}` : 'New uploads were cleaned up.'}`,
          error instanceof Error ? { cause: error } : undefined
        )
      }
      throw error
    }
    process.stdout.write(`${JSON.stringify({
      mode: 'execute',
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price.toString(),
        sku: product.sku,
        stock: product.stock,
        category: product.category?.name,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        imageCount: product.images.length,
        variantCount: product.variants.length,
        priceTierCount: product.priceTiers.length,
      },
    }, null, 2)}\n`)
    return
  }
  await validateAudit(audit, 'pre-upload')
  process.stdout.write(`${JSON.stringify({
    mode: 'dry-run',
    category: { id: preflightResult.category.id, name: preflightResult.category.name },
    existingProduct: preflightResult.existing ? {
      id: preflightResult.existing.id,
      price: preflightResult.existing.price.toString(),
      sku: preflightResult.existing.sku,
      stock: preflightResult.existing.stock,
      imageCount: preflightResult.existing.images.length,
      variantCount: preflightResult.existing.variants.length,
      priceTierCount: preflightResult.existing.priceTiers.length,
    } : null,
    proposed: { name: PRODUCT_NAME, slug: PRODUCT_SLUG, price: PRODUCT_PRICE.toString(), galleryCount: 2, detailCount: 11, isActive: false },
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
