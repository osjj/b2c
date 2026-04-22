import { prisma } from '@/lib/prisma'
import { generateUniqueProductSlug } from '@/lib/product-slug.server'
import { transferImages } from './image-transfer'
import { revalidatePath } from 'next/cache'
import type { ScrapedProduct, ScrapedVariant } from './types'

function slugifyCode(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

/**
 * 将采集到的 variants 写入 Attribute / AttributeOption，
 * 并为产品创建 ProductAttributeValue 关联（MULTISELECT：全选所有选项）
 */
async function linkVariantsToProduct(productId: string, variants: ScrapedVariant[]) {
  if (!variants || variants.length === 0) return

  for (const v of variants) {
    const name = v.name?.trim()
    if (!name) continue
    const values = v.options
      .map((o) => o.value?.trim())
      .filter((val): val is string => !!val)
    if (values.length === 0) continue

    // 1) 查找或创建 Attribute
    let attribute = await prisma.attribute.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })

    if (!attribute) {
      let baseCode = slugifyCode(name)
      if (!baseCode) baseCode = `attr_${Date.now().toString(36)}`
      let code = baseCode
      let suffix = 1
      while (await prisma.attribute.findUnique({ where: { code } })) {
        suffix += 1
        code = `${baseCode}_${suffix}`
      }
      const maxOrder = await prisma.attribute.aggregate({ _max: { sortOrder: true } })
      attribute = await prisma.attribute.create({
        data: {
          name,
          code,
          type: 'MULTISELECT',
          isRequired: false,
          isFilterable: true,
          isActive: true,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        },
      })
    }

    // 2) 确保所有选项值存在
    const existingOptions = await prisma.attributeOption.findMany({
      where: { attributeId: attribute.id },
    })
    const existingLower = new Map(existingOptions.map((o) => [o.value.toLowerCase(), o.id]))
    let nextSort = existingOptions.length

    const optionIds: string[] = []
    for (const val of values) {
      const key = val.toLowerCase()
      if (existingLower.has(key)) {
        optionIds.push(existingLower.get(key)!)
      } else {
        const created = await prisma.attributeOption.create({
          data: { attributeId: attribute.id, value: val, sortOrder: nextSort++ },
        })
        existingLower.set(key, created.id)
        optionIds.push(created.id)
      }
    }

    // 3) 为产品创建 ProductAttributeValue（全选所有选项）
    await prisma.productAttributeValue.upsert({
      where: { productId_attributeId: { productId, attributeId: attribute.id } },
      create: {
        productId,
        attributeId: attribute.id,
        optionIds,
      },
      update: {
        optionIds,
      },
    })
  }
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

  const slug = await generateUniqueProductSlug(prisma, {
    name: scrapedData.name,
  })

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

  // 采集的 variants 自动关联为产品属性（创建 Attribute + Options + ProductAttributeValue）
  await linkVariantsToProduct(product.id, scrapedData.variants)

  revalidatePath('/admin/products')
  revalidatePath('/admin/attributes')
  return { success: true, productId: product.id, slug: product.slug }
}
