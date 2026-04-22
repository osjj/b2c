import { PrismaClient } from '@prisma/client'
import { saveLegacyProductSlug } from '@/lib/product-slug.server'
import {
  buildProductSlugBase,
  createUniqueProductSlug,
  isProductSlugLikelyNoisy,
} from '@/lib/product-slug'

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })
  const redirects = await prisma.productSlugRedirect.findMany({
    select: { slug: true },
  })
  const takenSlugs = new Set([
    ...products.map((product) => product.slug),
    ...redirects.map((redirect) => redirect.slug),
  ])

  const changes: Array<{
    id: string
    name: string
    from: string
    to: string
  }> = []

  for (const product of products) {
    const baseSlug = buildProductSlugBase(product.name)
    const productTakenSlugs = new Set(takenSlugs)
    productTakenSlugs.delete(product.slug)
    const nextSlug = createUniqueProductSlug(baseSlug, productTakenSlugs)

    if (nextSlug === product.slug) {
      takenSlugs.add(product.slug)
      continue
    }

    takenSlugs.add(product.slug)
    takenSlugs.add(nextSlug)
    changes.push({
      id: product.id,
      name: product.name,
      from: product.slug,
      to: nextSlug,
    })
  }

  console.log(
    `Found ${changes.length} products to rename out of ${products.length}.`,
  )

  for (const change of changes) {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: change.id },
        data: { slug: change.to },
      })

      await saveLegacyProductSlug(tx, {
        productId: change.id,
        previousSlug: change.from,
      })
    })

    console.log(`${change.from} -> ${change.to}`)
  }

  const noisyCount = (
    await prisma.product.findMany({
      select: { slug: true },
    })
  ).filter((product) => isProductSlugLikelyNoisy(product.slug)).length

  console.log(`Noisy slugs remaining: ${noisyCount}`)
}

main()
  .catch((error) => {
    console.error('Failed to update product slugs:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
