// src/lib/i18n-helpers.ts
import { prisma } from './prisma'
import { defaultLocale } from '@/i18n/config'

// Generic translation applier
export function applyTranslation<
  T extends { name: string; description?: string | null },
  U extends { name: string; description?: string | null }
>(entity: T, translation: U | undefined): T {
  if (!translation) return entity
  return {
    ...entity,
    name: translation.name || entity.name,
    description: translation.description ?? entity.description,
  }
}

// Get product with translation
export async function getProductWithTranslation(
  slug: string,
  locale: string
) {
  const product = await prisma.product.findUnique({
    where: { slug, isActive: true },
    include: {
      translations: {
        where: { locale },
        take: 1,
      },
      category: {
        include: {
          translations: { where: { locale }, take: 1 },
        },
      },
      images: { orderBy: { sortOrder: 'asc' } },
      priceTiers: { orderBy: { sortOrder: 'asc' } },
      attributeValues: {
        include: {
          attribute: {
            include: {
              translations: { where: { locale }, take: 1 },
            },
          },
          option: {
            include: {
              translations: { where: { locale }, take: 1 },
            },
          },
        },
      },
    },
  })

  if (!product) return null

  const translation = product.translations[0]
  return {
    ...product,
    name: translation?.name || product.name,
    description: translation?.description || product.description,
    price: Number(product.price),
    comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
    cost: product.cost ? Number(product.cost) : null,
    weight: product.weight ? Number(product.weight) : null,
    priceTiers: product.priceTiers.map((t) => ({
      ...t,
      price: Number(t.price),
    })),
    category: product.category
      ? applyTranslation(product.category, product.category.translations[0])
      : null,
    attributeValues: product.attributeValues.map((av) => ({
      ...av,
      attribute: applyTranslation(av.attribute, av.attribute.translations[0]),
      option: av.option
        ? {
            ...av.option,
            value: av.option.translations[0]?.value || av.option.value,
          }
        : null,
    })),
  }
}

// Get products with translations
export async function getProductsWithTranslation(
  locale: string,
  options: {
    categoryId?: string
    limit?: number
    offset?: number
    activeOnly?: boolean
    featured?: boolean
  } = {}
) {
  const { categoryId, limit = 20, offset = 0, activeOnly = true, featured } = options

  const where: any = {}
  if (activeOnly) where.isActive = true
  if (categoryId) where.categoryId = categoryId
  if (featured) where.isFeatured = true

  const products = await prisma.product.findMany({
    where,
    include: {
      translations: {
        where: { locale },
        take: 1,
      },
      category: {
        include: {
          translations: { where: { locale }, take: 1 },
        },
      },
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      priceTiers: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return products.map((product) => {
    const translation = product.translations[0]
    return {
      ...product,
      name: translation?.name || product.name,
      description: translation?.description || product.description,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      cost: product.cost ? Number(product.cost) : null,
      weight: product.weight ? Number(product.weight) : null,
      priceTiers: product.priceTiers.map((t) => ({
        ...t,
        price: Number(t.price),
      })),
      category: product.category
        ? applyTranslation(product.category, product.category.translations[0])
        : null,
    }
  })
}

// Get categories with translations
export async function getCategoriesWithTranslation(locale: string) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      translations: {
        where: { locale },
        take: 1,
      },
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return categories.map((category) =>
    applyTranslation(category, category.translations[0])
  )
}

// Get single category with translation
export async function getCategoryWithTranslation(slug: string, locale: string) {
  const category = await prisma.category.findUnique({
    where: { slug, isActive: true },
    include: {
      translations: {
        where: { locale },
        take: 1,
      },
      _count: { select: { products: true } },
    },
  })

  if (!category) return null

  return applyTranslation(category, category.translations[0])
}

// Get collections with translations
export async function getCollectionsWithTranslation(locale: string) {
  const collections = await prisma.collection.findMany({
    where: { isActive: true },
    include: {
      translations: {
        where: { locale },
        take: 1,
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return collections.map((collection) =>
    applyTranslation(collection, collection.translations[0])
  )
}

// Get featured products with translations
export async function getFeaturedProductsWithTranslation(locale: string, limit = 8) {
  return getProductsWithTranslation(locale, { featured: true, limit })
}
