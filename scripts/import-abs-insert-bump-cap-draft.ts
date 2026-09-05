import { createHash, randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'
import { z } from 'zod'

import { getStorefrontVisibleProductSpecifications } from '../src/lib/product-specification-visibility'
import { assertR2Configured, deleteFromR2, uploadToR2 } from '../src/lib/r2'

const ROOT = path.resolve('output/abs-insert-bump-cap')
const SLUG = 'abs-insert-bump-cap-mesh-ventilation'
const NAME = 'ABS Insert Bump Cap with Mesh Ventilation'
const CATEGORY = 'bump-caps'
const NOTION_URL = 'https://www.notion.so/3d0d505a0030803a9d18edf42b4a23a5'
const SOURCE_URL = 'https://detail.1688.com/offer/802963869507.html'
const prisma = new PrismaClient()
const hash = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex')
const log = (event: string, data: unknown) => process.stdout.write(JSON.stringify({ event, data }, null, 2) + '\n')

const assetSchema = z.object({
  key: z.string().min(1),
  sourceIndex: z.number().int().min(1).max(15),
  role: z.enum(['gallery', 'detail']),
  outputRef: z.string().min(1),
  alt: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  qa: z.literal('pass'),
  outputUrl: z.string().url().optional(),
})
const auditSchema = z.object({
  product: z.object({
    sourcePageId: z.literal('3d0d505a-0030-803a-9d18-edf42b4a23a5'),
    slug: z.literal(SLUG),
    priceUsd: z.literal('3.42'),
    moq: z.literal(100),
    material: z.literal('Polycotton'),
  }),
  authorization: z.literal('User requested inactive draft creation and English product image processing'),
  sources: z.array(z.object({
    sourceIndex: z.number().int().min(1).max(15),
    sourceRef: z.string().min(1),
    inputRef: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    decision: z.enum(['keep', 'localize', 'reject']),
    reason: z.string().min(10),
    categories: z.array(z.string().min(1)).min(1),
  })).length(15),
  categoryExceptions: z.array(z.object({ category: z.string(), reason: z.string().min(10) })),
  assets: z.array(assetSchema).length(8),
})
type Asset = z.infer<typeof assetSchema>
type Audit = z.infer<typeof auditSchema>
const manifestSchema = z.object({ slug: z.literal(SLUG), runId: z.string(), assets: z.array(assetSchema.extend({ outputUrl: z.string().url() })).length(8) })
type Manifest = z.infer<typeof manifestSchema>

function localFile(ref: string) {
  const resolved = path.resolve(ROOT, ref)
  const relative = path.relative(ROOT, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('File path escapes the import directory')
  return resolved
}
async function save(name: string, value: unknown) {
  await writeFile(path.join(ROOT, name), JSON.stringify(value, null, 2) + '\n', 'utf8')
}
async function readAudit() {
  const raw: unknown = JSON.parse(await readFile(path.join(ROOT, 'import-audit.json'), 'utf8'))
  return auditSchema.parse(raw)
}
async function validateAudit(audit: Audit, phase: 'pre-upload' | 'pre-db') {
  const indices = audit.sources.map(source => source.sourceIndex).sort((a, b) => a - b)
  if (indices.some((index, position) => index !== position + 1)) throw new Error('Source coverage must reconcile all 15 images exactly once')
  if (new Set(audit.assets.map(asset => asset.key)).size !== 8) throw new Error('Duplicate final asset keys')
  const gallery = audit.assets.filter(asset => asset.role === 'gallery')
  const detail = audit.assets.filter(asset => asset.role === 'detail')
  if (gallery.map(asset => asset.sourceIndex).join() !== '1,2,3,4,5' || detail.map(asset => asset.sourceIndex).join() !== '10,14,15') {
    throw new Error('Expected five source-ordered gallery images and detail sources 10, 14, 15')
  }
  const represented = new Set(audit.assets.map(asset => asset.sourceIndex))
  audit.sources.forEach(source => {
    if ((source.decision === 'reject') === represented.has(source.sourceIndex)) throw new Error('Source decision disagrees with final media mapping')
  })
  await Promise.all(audit.sources.map(async source => {
    if (hash(await readFile(localFile(source.inputRef))) !== source.sha256) throw new Error('Source file changed after review')
  }))
  await Promise.all(audit.assets.map(async asset => {
    const buffer = await readFile(localFile(asset.outputRef))
    const metadata = await sharp(buffer).metadata()
    if (hash(buffer) !== asset.sha256 || metadata.format !== 'webp' || !metadata.width || !metadata.height) throw new Error('Final image failed integrity validation: ' + asset.key)
    if (/[\u3400-\u9fff]/u.test(asset.alt)) throw new Error('Image alt text must be English')
    if (phase === 'pre-db' && !asset.outputUrl) throw new Error('Missing durable media URL')
  }))
  log('audit_passed', { phase, sourceCount: 15, galleryCount: gallery.length, detailCount: detail.length })
}
async function publicImage(asset: Asset) {
  if (!asset.outputUrl || !asset.outputUrl.startsWith((process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com').replace(/\/$/, '') + '/products/')) throw new Error('Unexpected public media origin')
  const response = await fetch(asset.outputUrl, { signal: AbortSignal.timeout(30_000) })
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('image/webp')) throw new Error('Public image check failed: ' + asset.key)
  const buffer = Buffer.from(await response.arrayBuffer())
  if (hash(buffer) !== asset.sha256) throw new Error('Public image bytes do not match the reviewed asset: ' + asset.key)
}
async function retry<T>(operation: () => Promise<T>, attempt = 1): Promise<T> {
  try { return await operation() } catch (error) {
    if (attempt >= 3) throw error
    await new Promise(resolve => setTimeout(resolve, attempt * 750))
    return retry(operation, attempt + 1)
  }
}
async function preflight() {
  const category = await prisma.category.findUnique({ where: { slug: CATEGORY } })
  if (!category?.isActive || category.name !== 'Bump Caps') throw new Error('Expected active Bump Caps category')
  const duplicates = await prisma.product.findMany({
    where: { OR: [{ slug: SLUG }, { name: { equals: NAME, mode: 'insensitive' } }, { specifications: { array_contains: [{ name: 'Source', value: NOTION_URL }] } }, { specifications: { array_contains: [{ name: '1688 Source URL', value: SOURCE_URL }] } }] },
    select: { id: true, slug: true },
  })
  if (duplicates.length) throw new Error('A matching product already exists; refusing to create a duplicate draft')
  if (await prisma.productSlugRedirect.findUnique({ where: { slug: SLUG } })) throw new Error('Slug reserved by a redirect')
  return category
}
const specifications = [
  { name: 'Product Type', value: 'Baseball-style bump cap with removable ABS insert' },
  { name: 'Outer Material', value: 'Polycotton' },
  { name: 'Inner Shell', value: 'Removable ABS insert with inner padding' },
  { name: 'Ventilation', value: 'Side mesh panels and ventilation holes in the insert' },
  { name: 'Head Circumference', value: '58-60 cm' },
  { name: 'Adjustment', value: 'Rear hook-and-loop strap' },
  { name: 'Brim', value: 'Curved brim, 7 cm long' },
  { name: 'Crown', value: 'Rounded' },
  { name: 'Colors', value: 'Orange, Grey, Red, Blue, Fluorescent Green' },
  { name: 'Construction', value: 'Panelled fabric construction with mesh sections' },
  { name: 'Style', value: 'Unisex' },
  { name: 'Seasons', value: 'Spring, Summer, Autumn' },
  { name: 'Country of Origin', value: 'China' },
  { name: 'Dimensions', value: '28 x 26 x 13 cm (L x W x H; source-listed dimensions)' },
  { name: 'Listed Weight', value: '200 g (net/gross basis not specified)' },
  { name: 'Minimum Order Quantity', value: '100 Caps' },
  { name: 'Standard Claim', value: 'CE / EN 812 (source claim; certificate and test report pending verification)' },
  { name: 'Measurement Note', value: 'Manual measurements may vary by 1-3 cm' },
  { name: 'Purchase Price', value: 'CNY 19/Cap (source screenshot; current purchase quote unconfirmed)' },
  { name: 'Source', value: NOTION_URL },
  { name: '1688 Source URL', value: SOURCE_URL },
]
function productContent(details: Manifest['assets']): Prisma.InputJsonValue {
  return { time: Date.now(), version: '2.31.1', blocks: [
    { id: 'overview-title', type: 'header', data: { text: 'Baseball styling with a removable ABS insert', level: 2 } },
    { id: 'overview-text', type: 'paragraph', data: { text: 'A polycotton bump cap with side mesh panels, a removable ABS insert and inner padding. The rear hook-and-loop strap adjusts the fit, while a 7 cm curved brim completes the baseball-cap design. Available in Orange, Grey, Red, Blue and Fluorescent Green.' } },
    ...details.map(asset => ({ id: asset.key, type: 'image', data: { file: { url: asset.outputUrl }, caption: asset.alt, withBorder: false, stretched: true, withBackground: false } })),
  ] }
}
async function verify() {
  const product = await prisma.product.findUnique({ where: { slug: SLUG }, include: { category: true, images: { orderBy: { sortOrder: 'asc' } }, variants: true, priceTiers: true } })
  if (!product) throw new Error('Draft was not found')
  const manifest = manifestSchema.parse(JSON.parse(await readFile(path.join(ROOT, 'upload-manifest.json'), 'utf8')) as unknown)
  const content = z.object({ blocks: z.array(z.object({ type: z.string(), data: z.record(z.string(), z.unknown()) })) }).parse(product.content)
  const imageBlocks = content.blocks.filter(block => block.type === 'image')
  const detailUrls = imageBlocks.map(block => z.object({ url: z.string().url() }).parse(block.data.file).url)
  const expectedGallery = manifest.assets.filter(asset => asset.role === 'gallery')
  const expectedDetails = manifest.assets.filter(asset => asset.role === 'detail')
  const visible = JSON.stringify(getStorefrontVisibleProductSpecifications(product.specifications))
  const assertions = {
    exactName: product.name === NAME,
    price: product.price.toString() === '3.42',
    inactive: !product.isActive && !product.isFeatured,
    category: product.category?.slug === CATEGORY,
    specifications: JSON.stringify(product.specifications) === JSON.stringify(specifications),
    gallery: product.images.length === 5 && product.images.every((item, index) => item.url === expectedGallery[index]?.outputUrl && item.sortOrder === index && item.alt === expectedGallery[index]?.alt),
    details: detailUrls.length === 3 && detailUrls.every((url, index) => url === expectedDetails[index]?.outputUrl),
    ogImage: product.ogImage === expectedGallery[0]?.outputUrl,
    noInventedCommerce: product.sku === null && product.stock === 0 && product.cost === null && product.weight === null && product.comparePrice === null && product.variants.length === 0 && product.priceTiers.length === 0,
    english: !/[\u3400-\u9fff]/u.test(JSON.stringify({ name: product.name, description: product.description, content: product.content, specifications: product.specifications })),
    noTemporaryUrls: !/prod-files-secure|X-Amz-|file:\/\//i.test(JSON.stringify(product)),
    sourcePrivacy: !/notion\.so|1688\.com|CNY 19|Purchase Price/i.test(visible),
  }
  if (Object.values(assertions).some(value => !value)) throw new Error('Draft verification failed: ' + JSON.stringify(assertions))
  await manifest.assets.reduce<Promise<void>>(async (previous, asset) => { await previous; await retry(() => publicImage(asset)) }, Promise.resolve())
  const storefront = await fetch('https://www.laifappe.com/products/' + SLUG, { redirect: 'follow', signal: AbortSignal.timeout(30_000) })
  await storefront.body?.cancel()
  if (storefront.status !== 404) throw new Error('Expected unpublished storefront 404, received ' + storefront.status)
  const result = { id: product.id, name: product.name, slug: product.slug, priceUsd: product.price.toString(), moq: '100 Caps', category: product.category?.name, isActive: product.isActive, isFeatured: product.isFeatured, galleryCount: product.images.length, detailCount: detailUrls.length, publicMediaVerified: manifest.assets.length, storefrontStatus: storefront.status, assertions, adminUrl: 'https://www.laifappe.com/admin/products/' + product.id }
  await save('verification.json', result)
  log('verified', result)
}
async function apply(audit: Audit) {
  const category = await preflight()
  await validateAudit(audit, 'pre-upload')
  assertR2Configured()
  const runId = randomUUID()
  const attemptedUrls: string[] = []
  let committed = false
  let transactionStarted = false
  try {
    await audit.assets.reduce<Promise<void>>(async (previous, asset) => {
      await previous
      const filename = '20260903-abs-bump-cap-' + runId + '-' + asset.key + '.webp'
      const expectedUrl = (process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com').replace(/\/$/, '') + '/products/' + filename
      attemptedUrls.push(expectedUrl)
      await save('upload-attempts.json', { runId, urls: attemptedUrls })
      const buffer = await readFile(localFile(asset.outputRef))
      if (hash(buffer) !== asset.sha256) throw new Error('Image changed before upload: ' + asset.key)
      asset.outputUrl = await retry(() => uploadToR2(buffer, filename, 'image/webp'))
      await retry(() => publicImage(asset))
      log('image_uploaded', { key: asset.key })
    }, Promise.resolve())
    await validateAudit(audit, 'pre-db')
    const manifest = manifestSchema.parse({ slug: SLUG, runId, assets: audit.assets })
    await save('import-audit.pre-db.json', audit)
    await save('upload-manifest.json', manifest)
    const gallery = manifest.assets.filter(asset => asset.role === 'gallery')
    const details = manifest.assets.filter(asset => asset.role === 'detail')
    const first = gallery[0]
    if (!first) throw new Error('Missing primary gallery image')
    transactionStarted = true
    const product = await prisma.$transaction(async tx => {
      const [currentCategory, duplicate, redirect] = await Promise.all([
        tx.category.findUnique({ where: { slug: CATEGORY } }),
        tx.product.findFirst({ where: { OR: [{ slug: SLUG }, { name: { equals: NAME, mode: 'insensitive' } }] } }),
        tx.productSlugRedirect.findUnique({ where: { slug: SLUG } }),
      ])
      if (currentCategory?.id !== category.id || !currentCategory.isActive || duplicate || redirect) throw new Error('Category or duplicate preflight changed')
      return tx.product.create({ data: {
        name: NAME, slug: SLUG,
        description: 'Polycotton baseball-style bump cap with a removable ABS insert, inner padding and mesh ventilation. Adjustable 58-60 cm fit, 7 cm curved brim and five color options.',
        price: new Prisma.Decimal('3.42'), comparePrice: null, cost: null, sku: null, stock: 0, weight: null,
        categoryId: category.id, isActive: false, isFeatured: false, specifications, content: productContent(details), usageScenes: [],
        metaTitle: 'ABS Insert Bump Cap with Mesh Ventilation | LAIFAPPE',
        metaDescription: 'Polycotton bump cap with removable ABS insert, mesh ventilation, adjustable 58-60 cm fit and 7 cm brim. Five colors. Minimum order: 100 caps.',
        metaKeywords: 'ABS insert bump cap, baseball bump cap, ventilated bump cap, polycotton bump cap',
        ogTitle: NAME, ogDescription: 'Removable ABS insert, polycotton outer fabric and side mesh ventilation with a 58-60 cm adjustable fit.', ogImage: first.outputUrl,
        images: { create: gallery.map((asset, sortOrder) => ({ url: asset.outputUrl, alt: asset.alt, sortOrder })) },
      }, select: { id: true } })
    }, { isolationLevel: 'Serializable', timeout: 30_000 })
    committed = true
    await save('created-product.json', { ...product, runId, slug: SLUG })
    log('created', product)
  } catch (error) {
    if (!committed) {
      const transactionOutcome = transactionStarted
        ? await prisma.product.findUnique({ where: { slug: SLUG }, select: { images: { select: { url: true } } } }).catch(() => undefined)
        : null
      if (transactionOutcome === undefined || transactionOutcome?.images.some(item => attemptedUrls.includes(item.url))) {
        log('cleanup_deferred', { reason: 'Database outcome needs verification; uploaded media retained to avoid breaking a committed product.' })
      } else {
        const cleanup = await Promise.allSettled(attemptedUrls.map(url => deleteFromR2(url)))
        await save('cleanup.json', cleanup.map((result, index) => ({ url: attemptedUrls[index], status: result.status })))
      }
    }
    throw error
  }
  await verify()
}
async function main() {
  if (process.argv.includes('--verify')) return verify()
  if (process.argv.includes('--preflight')) { log('preflight', await preflight()); return }
  const audit = await readAudit()
  await validateAudit(audit, 'pre-upload')
  if (process.argv.includes('--apply')) {
    await apply(audit)
    return
  }
  log('dry_run', { category: (await preflight()).name, name: NAME, slug: SLUG, priceUsd: '3.42', moq: 100, gallery: 5, detail: 3, isActive: false })
}
main().catch((error: unknown) => { process.stderr.write(JSON.stringify({ event: 'import_failed', message: error instanceof Error ? error.message : String(error) }) + '\n'); process.exitCode = 1 }).finally(() => prisma.$disconnect())
