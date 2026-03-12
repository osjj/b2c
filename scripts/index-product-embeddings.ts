import { PrismaClient } from '@prisma/client'
import { buildProductEmbeddingText, generateEmbedding } from '../src/lib/embeddings'

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`共 ${products.length} 个商品需要生成 embedding`)

  let success = 0
  let failed = 0

  for (const product of products) {
    const text = buildProductEmbeddingText({
      name: product.name,
      description: product.description,
      categoryName: product.category?.name,
      usageScenes: product.usageScenes,
      specifications: product.specifications,
    })

    const embedding = await generateEmbedding(text)

    if (!embedding) {
      console.error(`x ${product.name} - 生成失败`)
      failed += 1
      continue
    }

    await prisma.$executeRawUnsafe(
      'UPDATE products SET embedding = $1::vector WHERE id = $2',
      `[${embedding.join(',')}]`,
      product.id
    )

    console.log(`✓ ${product.name}`)
    success += 1

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  console.log(`完成：${success} 成功，${failed} 失败`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
