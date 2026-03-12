import { prisma } from '@/lib/prisma'

export interface ProductSearchResult {
  id: string
  name: string
  price: number
  sku: string | null
  description: string | null
  usageScenes: string[]
  categoryName: string | null
  image: string | null
  similarity: number
}

export async function searchProductsByEmbedding(
  embedding: number[],
  limit = 20
): Promise<ProductSearchResult[]> {
  const vector = `[${embedding.join(',')}]`

  const results = await prisma.$queryRawUnsafe<Array<{
    id: string
    name: string
    price: string
    sku: string | null
    description: string | null
    usage_scenes: string[] | null
    category_name: string | null
    image: string | null
    similarity: number
  }>>(
    `
      SELECT
        p.id,
        p.name,
        p.price::text,
        p.sku,
        p.description,
        p."usageScenes" AS usage_scenes,
        c.name AS category_name,
        (
          SELECT url
          FROM product_images
          WHERE "productId" = p.id
          ORDER BY "sortOrder" ASC
          LIMIT 1
        ) AS image,
        1 - (p.embedding <=> $1::vector) AS similarity
      FROM products p
      LEFT JOIN categories c ON c.id = p."categoryId"
      WHERE p."isActive" = true
        AND p.embedding IS NOT NULL
      ORDER BY p.embedding <=> $1::vector
      LIMIT $2
    `,
    vector,
    limit
  )

  return results.map((result) => ({
    id: result.id,
    name: result.name,
    price: Number(result.price),
    sku: result.sku,
    description: result.description,
    usageScenes: result.usage_scenes ?? [],
    categoryName: result.category_name,
    image: result.image,
    similarity: Number(result.similarity),
  }))
}
