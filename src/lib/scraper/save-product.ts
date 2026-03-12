import { prisma } from '@/lib/prisma'
import { transferImages } from './image-transfer'
import { revalidatePath } from 'next/cache'
import type { ScrapedProduct } from './types'

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || `product-${Date.now()}`
  )
}

/**
 * 核心保存逻辑（不含鉴权，由调用方负责权限校验）
 */
export async function saveProductCore(
  scrapedData: ScrapedProduct
): Promise<{ success: true; productId: string; slug: string }> {
  const allImages = [...scrapedData.mainImages, ...scrapedData.detailImages]
  const urlMap = await transferImages(allImages)

  const mainImages = scrapedData.mainImages.map((url) => urlMap.get(url) || url)
  const detailImages = scrapedData.detailImages.map((url) => urlMap.get(url) || url)

  let slug = generateSlug(scrapedData.name)
  const slugExists = await prisma.product.findUnique({ where: { slug } })
  if (slugExists) slug = `${slug}-${Date.now().toString(36)}`

  const specifications = {
    ...scrapedData.specifications,
    sourceUrl1688: scrapedData.sourceUrl,
    offerId1688: scrapedData.offerId,
  }

  const content = {
    time: Date.now(),
    blocks: detailImages.map((url) => ({
      type: 'image',
      data: { file: { url }, caption: '', withBorder: false, stretched: true, withBackground: false },
    })),
  }

  const [product] = await prisma.$transaction([
    prisma.product.create({
      data: {
        name: scrapedData.name,
        slug,
        description: scrapedData.description || null,
        price: scrapedData.price || 0,
        comparePrice: scrapedData.comparePrice || null,
        stock: 0,
        isActive: false,
        specifications,
        content,
        images: {
          create: mainImages.map((url, i) => ({ url, alt: scrapedData.name, sortOrder: i })),
        },
        priceTiers: {
          create: scrapedData.priceTiers.map((tier, i) => ({
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity || null,
            price: tier.price,
            sortOrder: i,
          })),
        },
      },
    }),
  ])

  revalidatePath('/admin/products')
  return { success: true, productId: product.id, slug: product.slug }
}
