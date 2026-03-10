'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { transferImages } from '@/lib/scraper/image-transfer'
import type { ScrapedProduct } from '@/lib/scraper/types'
import { revalidatePath } from 'next/cache'

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || `product-${Date.now()}`
  )
}

export async function saveCollectedProduct(scrapedData: ScrapedProduct) {
  await requireAdmin()

  // 收集需要转存的图片（SKU 颜色图不转存，保持原始 URL 用于预览即可）
  const allImages = [
    ...scrapedData.mainImages,
    ...scrapedData.detailImages,
  ]

  // 批量下载并上传到 R2
  const urlMap = await transferImages(allImages)

  // 替换图片 URL
  const mainImages = scrapedData.mainImages.map((url) => urlMap.get(url) || url)
  const detailImages = scrapedData.detailImages.map((url) => urlMap.get(url) || url)

  // 生成唯一 slug
  let slug = generateSlug(scrapedData.name)
  const slugExists = await prisma.product.findUnique({ where: { slug } })
  if (slugExists) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  // 构建规格参数（包含 1688 来源信息）
  const specifications = {
    ...scrapedData.specifications,
    sourceUrl1688: scrapedData.sourceUrl,
    offerId1688: scrapedData.offerId,
  }

  // 构建 EditorJS 详情内容
  const content = {
    time: Date.now(),
    blocks: detailImages.map((url) => ({
      type: 'image',
      data: {
        file: { url },
        caption: '',
        withBorder: false,
        stretched: true,
        withBackground: false,
      },
    })),
  }

  // 创建商品（不用 interactive transaction，用批量事务避免超时）
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
          create: mainImages.map((url, i) => ({
            url,
            alt: scrapedData.name,
            sortOrder: i,
          })),
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

export async function updateCollectedProduct(
  productId: string,
  scrapedData: ScrapedProduct
) {
  await requireAdmin()

  const allImages = [
    ...scrapedData.mainImages,
    ...scrapedData.detailImages,
  ]
  const urlMap = await transferImages(allImages)

  const mainImages = scrapedData.mainImages.map((url) => urlMap.get(url) || url)
  const detailImages = scrapedData.detailImages.map((url) => urlMap.get(url) || url)

  const specifications = {
    ...scrapedData.specifications,
    sourceUrl1688: scrapedData.sourceUrl,
    offerId1688: scrapedData.offerId,
  }

  const content = {
    time: Date.now(),
    blocks: detailImages.map((url) => ({
      type: 'image',
      data: {
        file: { url },
        caption: '',
        withBorder: false,
        stretched: true,
        withBackground: false,
      },
    })),
  }

  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId } }),
    prisma.priceTier.deleteMany({ where: { productId } }),
    prisma.product.update({
      where: { id: productId },
      data: {
        name: scrapedData.name,
        description: scrapedData.description || null,
        price: scrapedData.price || 0,
        comparePrice: scrapedData.comparePrice || null,
        specifications,
        content,
        images: {
          create: mainImages.map((url, i) => ({
            url,
            alt: scrapedData.name,
            sortOrder: i,
          })),
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
  revalidatePath(`/admin/products/${productId}`)

  return { success: true, productId }
}
