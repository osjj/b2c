import { Prisma, PrismaClient } from '@prisma/client'
import 'dotenv/config'

const PRODUCT_ID = 'cmsvvzni10001um302ian9h0j'
const OLD_SLUG = 'en-397-abs-industrial-safety-helmet-2158t'
const NEW_SLUG = 'en-397-abs-safety-helmet-t-shaped-ridge'
const NEW_NAME = 'EN 397 ABS Safety Helmet with T-Shaped Top Ridge'

const prisma = new PrismaClient()

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: true,
  priceTiers: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.ProductInclude

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>

function protectedSnapshot(product: ProductRecord): Record<string, unknown> {
  return {
    id: product.id,
    price: product.price.toString(),
    comparePrice: product.comparePrice?.toString() ?? null,
    cost: product.cost?.toString() ?? null,
    sku: product.sku,
    barcode: product.barcode,
    stock: product.stock,
    lowStock: product.lowStock,
    weight: product.weight?.toString() ?? null,
    categoryId: product.categoryId,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    specifications: JSON.stringify(product.specifications),
    content: JSON.stringify(product.content),
    usageScenes: product.usageScenes,
    gallery: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      sortOrder: image.sortOrder,
    })),
    variants: product.variants
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((variant) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        price: variant.price.toString(),
        stock: variant.stock,
        options: JSON.stringify(variant.options),
      })),
    priceTiers: product.priceTiers.map((tier) => ({
      id: tier.id,
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity,
      price: tier.price.toString(),
      sortOrder: tier.sortOrder,
    })),
  }
}

async function readProduct(): Promise<ProductRecord> {
  const product = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    include: productInclude,
  })
  if (!product) {
    throw new Error('Target product was not found: ' + PRODUCT_ID)
  }
  return product
}

async function assertTargetAvailable(): Promise<void> {
  const productConflict = await prisma.product.findFirst({
    where: { slug: NEW_SLUG, NOT: { id: PRODUCT_ID } },
    select: { id: true },
  })
  const redirectConflict = await prisma.productSlugRedirect.findUnique({
    where: { slug: NEW_SLUG },
    select: { productId: true },
  })
  if (productConflict) {
    throw new Error('New product slug is already used by product ' + productConflict.id)
  }
  if (redirectConflict && redirectConflict.productId !== PRODUCT_ID) {
    throw new Error('New product slug is reserved by a redirect for ' + redirectConflict.productId)
  }
}

async function executeUpdate(before: ProductRecord): Promise<void> {
  if (before.slug !== OLD_SLUG && before.slug !== NEW_SLUG) {
    throw new Error('Current slug is outside the approved old/new values: ' + before.slug)
  }
  await prisma.$transaction(async (tx) => {
    const current = await tx.product.findUnique({
      where: { id: PRODUCT_ID },
      select: { id: true, slug: true },
    })
    const productConflict = await tx.product.findFirst({
      where: { slug: NEW_SLUG, NOT: { id: PRODUCT_ID } },
      select: { id: true },
    })
    const redirectConflict = await tx.productSlugRedirect.findUnique({
      where: { slug: NEW_SLUG },
      select: { productId: true },
    })
    if (!current || (current.slug !== OLD_SLUG && current.slug !== NEW_SLUG)) {
      throw new Error('Product slug changed after preflight')
    }
    if (productConflict || (redirectConflict && redirectConflict.productId !== PRODUCT_ID)) {
      throw new Error('New slug became unavailable after preflight')
    }
    if (current.slug === OLD_SLUG) {
      await tx.productSlugRedirect.upsert({
        where: { slug: OLD_SLUG },
        update: { productId: PRODUCT_ID },
        create: { slug: OLD_SLUG, productId: PRODUCT_ID },
      })
    }
    await tx.product.update({
      where: { id: PRODUCT_ID },
      data: {
        name: NEW_NAME,
        slug: NEW_SLUG,
        description: 'Non-vented ABS industrial safety helmet with a T-shaped top ridge, model 2158T, four-point suspension, rear ratchet adjustment, adjustable chin strap, front sweatband and rain-channel brim. The listing references EN 397:2012 + A1:2012; certification and test documentation were not provided.',
        metaTitle: 'T-Shaped Top Ridge ABS Safety Helmet with Ratchet',
        metaDescription: 'EN 397 ABS safety helmet with a T-shaped top ridge, four-point suspension, ratchet adjustment, chin strap and 410 g ±5% weight.',
        metaKeywords: 'T-shaped ridge safety helmet, ABS safety helmet, EN 397 helmet, industrial hard hat, ratchet safety helmet, model 2158T',
        ogTitle: NEW_NAME,
        ogDescription: 'Non-vented ABS safety helmet with a T-shaped top ridge, four-point suspension and rear ratchet adjustment.',
      },
    })
  }, { isolationLevel: 'Serializable', timeout: 30_000 })
}

async function verifyUpdate(beforeSnapshot: Record<string, unknown>): Promise<Record<string, unknown>> {
  const product = await readProduct()
  const oldRedirect = await prisma.productSlugRedirect.findUnique({
    where: { slug: OLD_SLUG },
    select: { productId: true },
  })
  const afterSnapshot = protectedSnapshot(product)
  const assertions = {
    nameUpdated: product.name === NEW_NAME,
    slugUpdated: product.slug === NEW_SLUG,
    legacyRedirectSaved: oldRedirect?.productId === PRODUCT_ID,
    canonicalTargetReady: product.slug === NEW_SLUG,
    remainsInactive: !product.isActive && !product.isFeatured,
    protectedFieldsPreserved: JSON.stringify(beforeSnapshot) === JSON.stringify(afterSnapshot),
  }
  const failed = Object.entries(assertions)
    .filter(([, passed]) => !passed)
    .map(([name]) => name)
  if (failed.length > 0) {
    throw new Error('Post-update verification failed: ' + failed.join(', '))
  }
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    oldSlug: OLD_SLUG,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    galleryCount: product.images.length,
    detailContentPreserved: JSON.stringify(product.content) === String(afterSnapshot.content),
    variantCount: product.variants.length,
    priceTierCount: product.priceTiers.length,
    assertions,
  }
}

async function main(): Promise<void> {
  const before = await readProduct()
  await assertTargetAvailable()
  const beforeSnapshot = protectedSnapshot(before)
  if (!process.argv.includes('--execute')) {
    process.stdout.write(JSON.stringify({
      mode: 'dry-run',
      current: { id: before.id, name: before.name, slug: before.slug },
      proposed: { name: NEW_NAME, slug: NEW_SLUG },
      protected: beforeSnapshot,
    }, null, 2) + '\n')
    return
  }
  await executeUpdate(before)
  process.stdout.write(JSON.stringify({
    mode: 'execute',
    result: await verifyUpdate(beforeSnapshot),
  }, null, 2) + '\n')
}

main()
  .catch((error: unknown) => {
    process.stderr.write('Product URL update failed: '
      + (error instanceof Error ? error.message : String(error)) + '\n')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
