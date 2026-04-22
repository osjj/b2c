import type { Prisma, PrismaClient } from '@prisma/client'
import {
  buildProductSlugBase,
  createUniqueProductSlug,
} from '@/lib/product-slug'

type ProductSlugDbClient = PrismaClient | Prisma.TransactionClient

export async function generateUniqueProductSlug(
  db: ProductSlugDbClient,
  {
    name,
    preferredSlug,
    excludeProductId,
  }: {
    name: string
    preferredSlug?: string | null
    excludeProductId?: string
  },
) {
  const baseSlug = buildProductSlugBase(name, preferredSlug)

  const [products, redirects] = await Promise.all([
    db.product.findMany({
      where: excludeProductId ? { NOT: { id: excludeProductId } } : undefined,
      select: { slug: true },
    }),
    db.productSlugRedirect.findMany({
      where: excludeProductId
        ? {
            productId: {
              not: excludeProductId,
            },
          }
        : undefined,
      select: { slug: true },
    }),
  ])

  const takenSlugs = new Set([
    ...products.map((product) => product.slug),
    ...redirects.map((redirect) => redirect.slug),
  ])

  return createUniqueProductSlug(baseSlug, takenSlugs)
}

export async function saveLegacyProductSlug(
  db: ProductSlugDbClient,
  {
    productId,
    previousSlug,
  }: {
    productId: string
    previousSlug: string
  },
) {
  await db.productSlugRedirect.upsert({
    where: { slug: previousSlug },
    update: { productId },
    create: {
      slug: previousSlug,
      productId,
    },
  })
}

export async function resolveProductIdBySlug(
  db: ProductSlugDbClient,
  slug: string,
) {
  const product = await db.product.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (product) {
    return product.id
  }

  const redirect = await db.productSlugRedirect.findUnique({
    where: { slug },
    select: { productId: true },
  })

  return redirect?.productId ?? null
}
