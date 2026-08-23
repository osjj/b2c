import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const PRODUCT_ID = 'cmt092kis0001umy05t2z8mlt'
const OLD_NAME = 'Model 1003 Mining Safety Helmet with Headlamp Mount'
const OLD_SLUG = 'model-1003-mining-safety-helmet-headlamp-mount'
const NEW_NAME = 'Mining Safety Helmet with Headlamp Mount'
const NEW_SLUG = 'mining-safety-helmet-headlamp-mount'
const CATEGORY_SLUG = 'safety-helmets'
const UPDATE_DIR = path.resolve('output/mining-helmet-review/public-copy-update')
const PREVIEW_DIR = path.resolve('output/mining-helmet-review/no-internal-id-preview')
const MANIFEST_PATH = path.join(UPDATE_DIR, 'upload-manifest.json')
const SNAPSHOT_PATH = path.join(UPDATE_DIR, 'protected-snapshot.json')

const replacementInputs = [
  { role: 'gallery', index: 0, filename: '01-yellow-mining-helmet-en-v2.png', alt: 'Yellow mining safety helmet with red reflective strip' },
  { role: 'gallery', index: 1, filename: '02-red-mining-helmet-en-v2.png', alt: 'Red mining safety helmet with yellow reflective strip' },
  { role: 'gallery', index: 2, filename: '03-black-mining-helmet-en-v2.png', alt: 'Black mining safety helmet with blue reflective strip' },
  { role: 'detail', index: 0, filename: '04-product-attributes-en-v2.png' },
  { role: 'detail', index: 1, filename: '05-colors-en-v2.png' },
  { role: 'detail', index: 2, filename: '06-detailed-attributes-en-v2.png' },
] as const

type ReplacementInput = (typeof replacementInputs)[number]
type UploadedAsset = ReplacementInput & { url: string; width: number; height: number }

const prisma = new PrismaClient()

const specifications: Prisma.InputJsonValue = [
  { name: 'Product Type', value: 'Mining Safety Helmet' },
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
  { name: 'Source', value: 'https://app.notion.com/p/3c1d505a003080339656c13b3aad33e9?pvs=204' },
]

function extractDetailUrls(content: unknown): string[] {
  if (!content || typeof content !== 'object' || !('blocks' in content) || !Array.isArray(content.blocks)) {
    throw new Error('Product detail content is not an EditorJS block document')
  }
  return content.blocks.map((block, index) => {
    if (!block || typeof block !== 'object' || !('data' in block)
      || !block.data || typeof block.data !== 'object' || !('file' in block.data)
      || !block.data.file || typeof block.data.file !== 'object' || !('url' in block.data.file)
      || typeof block.data.file.url !== 'string') {
      throw new Error('Detail block ' + index + ' does not contain an image URL')
    }
    return block.data.file.url
  })
}

async function readProduct() {
  const product = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
      priceTiers: true,
    },
  })
  if (!product) throw new Error('Target product was not found: ' + PRODUCT_ID)
  return product
}

function assertProtectedState(product: Awaited<ReturnType<typeof readProduct>>): void {
  const failures = [
    product.price.toString() === '1.6' ? null : 'price',
    product.comparePrice === null ? null : 'comparePrice',
    product.cost === null ? null : 'cost',
    product.stock === 0 ? null : 'stock',
    product.sku === null ? null : 'sku',
    product.weight === null ? null : 'weight',
    product.category?.slug === CATEGORY_SLUG ? null : 'category',
    !product.isActive ? null : 'isActive',
    !product.isFeatured ? null : 'isFeatured',
    product.images.length === 4 ? null : 'galleryCount',
    extractDetailUrls(product.content).length === 3 ? null : 'detailCount',
    product.variants.length === 0 ? null : 'variantCount',
    product.priceTiers.length === 0 ? null : 'priceTierCount',
  ].filter((value): value is string => value !== null)
  if (failures.length > 0) throw new Error('Protected product state changed: ' + failures.join(', '))
}

async function assertPublicWebp(url: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow', cache: 'no-store' })
  const contentType = response.headers.get('content-type') ?? ''
  await response.body?.cancel()
  if (!response.ok || !contentType.toLowerCase().includes('image/webp')) {
    throw new Error('Asset check failed for ' + url + ': HTTP ' + response.status + ' ' + contentType)
  }
}

async function retry<T>(label: string, operation: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 750 * 2 ** (attempt - 1)))
    }
  }
  throw new Error(label + ' failed: ' + (lastError instanceof Error ? lastError.message : String(lastError)))
}

async function cleanup(urls: string[]): Promise<string[]> {
  const settled = await Promise.allSettled(urls.map((url) => deleteFromR2(url)))
  return settled.flatMap((result, index) => result.status === 'rejected' ? [urls[index] ?? 'unknown'] : [])
}

async function prepareAndUpload(): Promise<UploadedAsset[]> {
  await mkdir(UPDATE_DIR, { recursive: true })
  const uploaded: UploadedAsset[] = []
  try {
    await replacementInputs.reduce<Promise<void>>(async (previous, input) => {
      await previous
      const inputPath = path.join(PREVIEW_DIR, input.filename)
      const webpPath = path.join(UPDATE_DIR, input.filename.replace(/\.png$/i, '.webp'))
      await sharp(inputPath).rotate().webp({ quality: 90, effort: 6, smartSubsample: true }).toFile(webpPath)
      const metadata = await sharp(webpPath).metadata()
      if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
        throw new Error('Prepared image is not a valid WebP: ' + input.filename)
      }
      const filename = [
        '20260820-mining-safety-helmet-v2',
        input.role === 'gallery' ? 'g' + String(input.index + 1).padStart(2, '0') : 'd' + String(input.index + 1).padStart(2, '0'),
        randomUUID().slice(0, 8),
      ].join('-') + '.webp'
      const buffer = await readFile(webpPath)
      const url = await retry('Upload ' + input.filename, () => uploadToR2(buffer, filename, 'image/webp'))
      await retry('Verify ' + input.filename, () => assertPublicWebp(url))
      uploaded.push({ ...input, url, width: metadata.width, height: metadata.height })
    }, Promise.resolve())
    await writeFile(MANIFEST_PATH, JSON.stringify({ createdAt: new Date().toISOString(), assets: uploaded }, null, 2) + '\n')
    return uploaded
  } catch (error) {
    const failed = await cleanup(uploaded.map((asset) => asset.url))
    throw new Error((error instanceof Error ? error.message : String(error))
      + (failed.length > 0 ? '; manual cleanup required: ' + failed.join(', ') : '; uploaded replacements cleaned up'))
  }
}

function buildContent(detailAssets: UploadedAsset[]): Prisma.InputJsonValue {
  return {
    time: Date.now(),
    version: '2.31.1',
    blocks: detailAssets
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((asset, index) => ({
        id: 'mining-helmet-detail-' + String(index + 1).padStart(2, '0'),
        type: 'image',
        data: { file: { url: asset.url }, caption: '', withBorder: false, stretched: true, withBackground: false },
      })),
  }
}

async function updateDatabase(
  before: Awaited<ReturnType<typeof readProduct>>,
  uploaded: UploadedAsset[]
): Promise<void> {
  const galleries = uploaded.filter((asset) => asset.role === 'gallery').sort((a, b) => a.index - b.index)
  const details = uploaded.filter((asset) => asset.role === 'detail').sort((a, b) => a.index - b.index)
  if (galleries.length !== 3 || details.length !== 3) throw new Error('Replacement manifest must contain 3 gallery and 3 detail assets')

  await prisma.$transaction(async (tx) => {
    const [current, slugConflict, redirectConflict] = await Promise.all([
      tx.product.findUnique({ where: { id: PRODUCT_ID }, select: { updatedAt: true, slug: true } }),
      tx.product.findUnique({ where: { slug: NEW_SLUG }, select: { id: true } }),
      tx.productSlugRedirect.findUnique({ where: { slug: NEW_SLUG }, select: { productId: true } }),
    ])
    if (!current || current.updatedAt.getTime() !== before.updatedAt.getTime()) {
      throw new Error('Product changed after preflight; refusing stale update')
    }
    if (current.slug !== OLD_SLUG && current.slug !== NEW_SLUG) throw new Error('Unexpected current product slug')
    if (slugConflict && slugConflict.id !== PRODUCT_ID) throw new Error('New slug belongs to another product')
    if (redirectConflict && redirectConflict.productId !== PRODUCT_ID) throw new Error('New slug is reserved by a redirect')

    const updateResult = await tx.product.updateMany({
      where: { id: PRODUCT_ID, updatedAt: before.updatedAt },
      data: {
        name: NEW_NAME,
        slug: NEW_SLUG,
        description: 'Matte ABS mining safety helmet with a reflective strip, button-type suspension and provision for a headlamp mount. Source imagery shows yellow, red and black versions for mining and coal-mine use.',
        specifications,
        content: buildContent(details),
        metaTitle: NEW_NAME,
        metaDescription: 'Matte ABS mining safety helmet with reflective strip, button-type suspension, headlamp-mount provision and black, red or yellow display colors.',
        metaKeywords: 'mining safety helmet, coal mine helmet, mining hard hat, headlamp mount helmet, reflective mining helmet',
        ogTitle: NEW_NAME,
        ogDescription: 'Matte ABS mining helmet with reflective strip, button-type suspension and headlamp-mount provision.',
        ogImage: galleries[0]?.url,
      },
    })
    if (updateResult.count !== 1) throw new Error('Product updatedAt guard rejected the database update')

    const galleryUpdates = await Promise.all(galleries.map(async (asset) => {
      const image = before.images[asset.index]
      if (!image) throw new Error('Missing gallery image at index ' + asset.index)
      return tx.productImage.updateMany({
        where: { id: image.id, productId: PRODUCT_ID, url: image.url },
        data: { url: asset.url, alt: 'alt' in asset ? asset.alt : NEW_NAME },
      })
    }))
    const failedGalleryIndex = galleryUpdates.findIndex((result) => result.count !== 1)
    if (failedGalleryIndex !== -1) throw new Error('Gallery image guard failed at index ' + failedGalleryIndex)
    const retainedImage = before.images[3]
    if (!retainedImage) throw new Error('Missing retained suspension image')
    const retained = await tx.productImage.updateMany({
      where: { id: retainedImage.id, productId: PRODUCT_ID, url: retainedImage.url },
      data: { alt: 'Interior button-type suspension of mining safety helmet' },
    })
    if (retained.count !== 1) throw new Error('Retained gallery image guard failed')
  }, { isolationLevel: 'Serializable', timeout: 30_000 })
}

async function verifyFinal(before?: Awaited<ReturnType<typeof readProduct>>): Promise<Record<string, unknown>> {
  const product = await readProduct()
  assertProtectedState(product)
  const detailUrls = extractDetailUrls(product.content)
  const publicText = JSON.stringify({
    name: product.name,
    slug: product.slug,
    description: product.description,
    specifications: product.specifications,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    metaKeywords: product.metaKeywords,
    ogTitle: product.ogTitle,
    ogDescription: product.ogDescription,
    imageAlts: product.images.map((image) => image.alt),
    content: product.content,
  })
  const assertions = {
    optimizedIdentity: product.name === NEW_NAME && product.slug === NEW_SLUG,
    noInternalModel: !/1003/i.test(publicText),
    noBrandOrModelFields: !/\"name\":\"(?:Brand|Model)\"/i.test(publicText),
    noGbCopy: !/GB\s*2811/i.test(publicText),
    uniqueGalleryUrls: new Set(product.images.map((image) => image.url)).size === 4,
    uniqueDetailUrls: new Set(detailUrls).size === 3,
    countsPreserved: product.images.length === 4 && detailUrls.length === 3,
    publicationPreserved: !product.isActive && !product.isFeatured,
    commercialFieldsPreserved: product.price.toString() === '1.6' && product.cost === null
      && product.stock === 0 && product.sku === null && product.weight === null,
    oldNameRemoved: product.name !== OLD_NAME,
  }
  const failed = Object.entries(assertions).filter(([, passed]) => !passed).map(([name]) => name)
  if (failed.length > 0) throw new Error('Final verification failed: ' + failed.join(', '))
  await Promise.all([...product.images.map((image) => image.url), ...detailUrls].map(assertPublicWebp))
  const oldSlugProduct = await prisma.product.findUnique({ where: { slug: OLD_SLUG }, select: { id: true } })
  const oldSlugRedirect = await prisma.productSlugRedirect.findUnique({ where: { slug: OLD_SLUG }, select: { productId: true } })
  if (oldSlugProduct || oldSlugRedirect) throw new Error('Old internal-model slug remains addressable')
  if (before) {
    const preserved = {
      categoryId: product.categoryId === before.categoryId,
      price: product.price.equals(before.price),
      comparePrice: product.comparePrice === before.comparePrice,
      cost: product.cost === before.cost,
      stock: product.stock === before.stock,
      sku: product.sku === before.sku,
      weight: product.weight === before.weight,
      isActive: product.isActive === before.isActive,
      isFeatured: product.isFeatured === before.isFeatured,
      usageScenes: JSON.stringify(product.usageScenes) === JSON.stringify(before.usageScenes),
    }
    const changed = Object.entries(preserved).filter(([, value]) => !value).map(([key]) => key)
    if (changed.length > 0) throw new Error('Protected fields changed: ' + changed.join(', '))
  }
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price.toString(),
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
    process.stdout.write(JSON.stringify({ mode: 'verify', product: await verifyFinal() }, null, 2) + '\n')
    return
  }

  const before = await readProduct()
  assertProtectedState(before)
  if ((before.name !== OLD_NAME && before.name !== NEW_NAME) || before.slug !== OLD_SLUG) {
    throw new Error('Draft identity changed outside the expected name-only edit; refusing to continue')
  }
  const oldDetailUrls = extractDetailUrls(before.content)
  const oldReplacedUrls = [...before.images.slice(0, 3).map((image) => image.url), ...oldDetailUrls]
  await mkdir(UPDATE_DIR, { recursive: true })
  await writeFile(SNAPSHOT_PATH, JSON.stringify({
    capturedAt: new Date().toISOString(),
    id: before.id,
    updatedAt: before.updatedAt,
    name: before.name,
    slug: before.slug,
    price: before.price.toString(),
    comparePrice: before.comparePrice?.toString() ?? null,
    cost: before.cost?.toString() ?? null,
    stock: before.stock,
    sku: before.sku,
    weight: before.weight,
    categoryId: before.categoryId,
    categorySlug: before.category?.slug,
    isActive: before.isActive,
    isFeatured: before.isFeatured,
    usageScenes: before.usageScenes,
    gallery: before.images.map(({ id, url, alt, sortOrder }) => ({ id, url, alt, sortOrder })),
    detailUrls: oldDetailUrls,
    variantCount: before.variants.length,
    priceTierCount: before.priceTiers.length,
  }, null, 2) + '\n')

  if (!process.argv.includes('--execute')) {
    process.stdout.write(JSON.stringify({
      mode: 'dry-run',
      productId: before.id,
      from: { name: before.name, slug: before.slug },
      to: { name: NEW_NAME, slug: NEW_SLUG },
      removals: ['1003 customer-facing copy', 'Brand specification', 'Model specification', 'GB exclusion note'],
      preserved: ['price', 'cost', 'stock', 'sku', 'weight', 'category', 'publication state', 'usage scenes', 'media counts', 'variants', 'price tiers'],
      replacementImages: replacementInputs.length,
    }, null, 2) + '\n')
    return
  }

  const uploaded = await prepareAndUpload()
  try {
    await updateDatabase(before, uploaded)
    const verified = await verifyFinal(before)
    const failedCleanup = await cleanup(oldReplacedUrls)
    if (failedCleanup.length > 0) throw new Error('Database update succeeded, but old R2 cleanup failed: ' + failedCleanup.join(', '))
    process.stdout.write(JSON.stringify({
      mode: 'execute',
      product: verified,
      uploadedReplacementCount: uploaded.length,
      deletedReplacedAssetCount: oldReplacedUrls.length,
      retainedGalleryAssetCount: 1,
    }, null, 2) + '\n')
  } catch (error) {
    const current = await prisma.product.findUnique({ where: { id: PRODUCT_ID }, select: { slug: true } })
    if (current?.slug === OLD_SLUG) {
      const failed = await cleanup(uploaded.map((asset) => asset.url))
      throw new Error((error instanceof Error ? error.message : String(error))
        + (failed.length > 0 ? '; manual cleanup required: ' + failed.join(', ') : '; unused replacement uploads cleaned up'))
    }
    throw error
  }
}

main()
  .catch((error: unknown) => {
    process.stderr.write('Update failed: ' + (error instanceof Error ? error.message : String(error)) + '\n')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
