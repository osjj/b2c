import { createHash, randomUUID } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import { PrismaClient, type AttributeOption } from '@prisma/client'
import 'dotenv/config'
import sharp from 'sharp'

import { deleteFromR2, uploadToR2 } from '../src/lib/r2'

const CATEGORY_NAME = 'Acid, Alkali & Oil Resistant Gloves'
const CATEGORY_SLUG = 'acid-alkali-oil-resistant-gloves'
const PRODUCT_NAME = 'Fully Dipped PVC Oil-Resistant Anti-Slip Gloves'
const PRODUCT_SLUG = 'fully-dipped-pvc-oil-resistant-anti-slip-gloves'
const PRODUCT_SKU = 'HB-919-PVC-BLU-UNI'
const SOURCE_URL = 'https://app.notion.com/p/3a2d505a0030805c9f7bdd81f70ec8ce'
const EXPECTED_IMAGE_NAMES = Array.from(
  { length: 13 },
  (_, index) => `${String(index + 1).padStart(2, '0')}.png`
)
const GALLERY_IMAGE_NAMES = new Set(['01.png', '02.png', '03.png', '04.png'])

type CliOptions = {
  execute: boolean
  sourceDir: string
}

type SourceImage = {
  name: string
  buffer: Buffer
  sha256: string
  role: 'gallery' | 'detail'
}

type PreparedImage = SourceImage & {
  webp: Buffer
}

type UploadedImage = PreparedImage & {
  key: string
  url: string
}

type PreflightResult = {
  handProtectionId: string
  colorAttributeId: string
  blueOptionId: string
  sizeAttributeId: string
  oneSizeOptionId: string
  materialAttributeId: string
  existingProduct?: {
    id: string
    name: string
    slug: string
    sku: string | null
    isActive: boolean
    categoryId: string | null
  }
}

const prisma = new PrismaClient()

function parseArgs(args: string[]): CliOptions {
  const execute = args.includes('--execute')
  const sourceDirIndex = args.indexOf('--source-dir')
  const sourceDir = sourceDirIndex >= 0 ? args[sourceDirIndex + 1] : undefined

  if (!sourceDir) {
    throw new Error('Missing required argument: --source-dir <directory>')
  }

  return { execute, sourceDir: path.resolve(sourceDir) }
}

async function loadSourceImages(sourceDir: string): Promise<SourceImage[]> {
  const directoryEntries = await readdir(sourceDir)
  const pngNames = directoryEntries.filter((name) => name.toLowerCase().endsWith('.png')).sort()

  if (
    pngNames.length !== EXPECTED_IMAGE_NAMES.length ||
    pngNames.some((name, index) => name !== EXPECTED_IMAGE_NAMES[index])
  ) {
    throw new Error(`Expected exactly these source images: ${EXPECTED_IMAGE_NAMES.join(', ')}`)
  }

  const images = await Promise.all(
    pngNames.map(async (name): Promise<SourceImage> => {
      const buffer = await readFile(path.join(sourceDir, name))
      return {
        name,
        buffer,
        sha256: createHash('sha256').update(buffer).digest('hex'),
        role: GALLERY_IMAGE_NAMES.has(name) ? 'gallery' : 'detail',
      }
    })
  )

  const seenHashes = new Set<string>()
  const uniqueImages = images.filter((image) => {
    if (seenHashes.has(image.sha256)) {
      return false
    }
    seenHashes.add(image.sha256)
    return true
  })

  if (uniqueImages.length !== 12) {
    throw new Error(`Expected 12 unique source images after deduplication, found ${uniqueImages.length}`)
  }

  const galleryCount = uniqueImages.filter((image) => image.role === 'gallery').length
  const detailCount = uniqueImages.filter((image) => image.role === 'detail').length
  if (galleryCount !== 4 || detailCount !== 8) {
    throw new Error(`Expected 4 gallery and 8 detail images, found ${galleryCount} and ${detailCount}`)
  }

  return uniqueImages
}

async function findOption(attributeId: string, value: string): Promise<AttributeOption | null> {
  return prisma.attributeOption.findFirst({
    where: { attributeId, value: { equals: value, mode: 'insensitive' } },
  })
}

async function preflight(): Promise<PreflightResult> {
  const [handProtection, categoryConflict, productConflict, skuConflict, redirectConflict, attributes] =
    await Promise.all([
      prisma.category.findUnique({ where: { slug: 'hand-protection' } }),
      prisma.category.findUnique({ where: { slug: CATEGORY_SLUG } }),
      prisma.product.findUnique({ where: { slug: PRODUCT_SLUG } }),
      prisma.product.findUnique({ where: { sku: PRODUCT_SKU } }),
      prisma.productSlugRedirect.findUnique({ where: { slug: PRODUCT_SLUG } }),
      prisma.attribute.findMany({ where: { code: { in: ['color', 'size', 'material'] } } }),
    ])

  if (!handProtection) {
    throw new Error('The Hand Protection parent category does not exist')
  }
  if (
    categoryConflict &&
    (categoryConflict.name !== CATEGORY_NAME ||
      categoryConflict.parentId !== handProtection.id ||
      categoryConflict.isActive)
  ) {
    throw new Error(`Category slug exists with an incompatible name, parent, or status: ${CATEGORY_SLUG}`)
  }
  const isSameDraft =
    productConflict?.name === PRODUCT_NAME &&
    productConflict.sku === PRODUCT_SKU &&
    !productConflict.isActive &&
    productConflict.categoryId === categoryConflict?.id &&
    skuConflict?.id === productConflict.id &&
    !redirectConflict
  if ((productConflict || skuConflict) && !isSameDraft) {
    throw new Error('Product slug, SKU, or legacy slug already exists')
  }
  if (redirectConflict) {
    throw new Error('Product slug is already reserved by a legacy slug redirect')
  }

  const colorAttribute = attributes.find((attribute) => attribute.code === 'color')
  const sizeAttribute = attributes.find((attribute) => attribute.code === 'size')
  const materialAttribute = attributes.find((attribute) => attribute.code === 'material')
  if (!colorAttribute || !sizeAttribute || !materialAttribute) {
    throw new Error('Required Color, Size, or Material attribute is missing')
  }
  if (
    colorAttribute.type !== 'MULTISELECT' ||
    sizeAttribute.type !== 'MULTISELECT' ||
    materialAttribute.type !== 'MULTISELECT'
  ) {
    throw new Error('Color, Size, and Material attributes must be MULTISELECT')
  }

  const [blueOption, oneSizeOption] = await Promise.all([
    findOption(colorAttribute.id, 'Blue'),
    findOption(sizeAttribute.id, 'One Size'),
  ])
  if (!blueOption || !oneSizeOption) {
    throw new Error('Required Blue or One Size attribute option is missing')
  }

  return {
    handProtectionId: handProtection.id,
    colorAttributeId: colorAttribute.id,
    blueOptionId: blueOption.id,
    sizeAttributeId: sizeAttribute.id,
    oneSizeOptionId: oneSizeOption.id,
    materialAttributeId: materialAttribute.id,
    existingProduct: isSameDraft && productConflict ? productConflict : undefined,
  }
}

async function prepareImages(images: SourceImage[]): Promise<PreparedImage[]> {
  return Promise.all(
    images.map(async (image) => ({
      ...image,
      webp: await sharp(image.buffer)
        .resize(2560, 2560, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer(),
    }))
  )
}

async function throwAfterCleanup(
  context: string,
  error: unknown,
  images: UploadedImage[]
): Promise<never> {
  const results = await Promise.allSettled(images.map((image) => deleteFromR2(image.url)))
  const failedKeys = images
    .filter((_, index) => results[index]?.status === 'rejected')
    .map((image) => image.key)
  const uploadedKeys = images.map((image) => image.key)
  const reason = error instanceof Error ? error.message : String(error)
  const cleanupStatus = failedKeys.length
    ? `Manual cleanup required for keys: ${failedKeys.join(', ')}`
    : 'Automatic cleanup succeeded.'

  throw new Error(
    `${context}: ${reason}. Uploaded keys before failure: ${uploadedKeys.join(', ') || 'none'}. ${cleanupStatus}`,
    error instanceof Error ? { cause: error } : undefined
  )
}

async function uploadImages(images: PreparedImage[]): Promise<UploadedImage[]> {
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`
  const results = await Promise.allSettled(
    images.map(async (image): Promise<UploadedImage> => {
      const filename = `${runId}-pvc-oil-glove-${path.parse(image.name).name}.webp`
      const url = await uploadToR2(image.webp, filename, 'image/webp')
      return { ...image, key: `products/${filename}`, url }
    })
  )
  const uploaded = results
    .filter((result): result is PromiseFulfilledResult<UploadedImage> => result.status === 'fulfilled')
    .map((result) => result.value)
  const failure = results.find((result) => result.status === 'rejected')

  if (failure) {
    await throwAfterCleanup('Image upload failed', failure.reason, uploaded)
  }

  return uploaded
}

function getGalleryAlt(name: string): string {
  const altByName: Record<string, string> = {
    '01.png': 'Fully dipped blue PVC oil-resistant anti-slip work gloves',
    '02.png': 'PVC work glove abrasion and anti-slip surface demonstration',
    '03.png': 'Flexible fully dipped PVC work glove grip demonstration',
    '04.png': 'Blue PVC work glove with soft high-density knitted liner',
  }
  return altByName[name] ?? PRODUCT_NAME
}

async function createDraft(preflightResult: PreflightResult, images: UploadedImage[]) {
  const galleryImages = images.filter((image) => image.role === 'gallery')
  const detailImages = images.filter((image) => image.role === 'detail')

  return prisma.$transaction(
    async (tx) => {
      const [
        existingCategory,
        productConflict,
        skuConflict,
        redirectConflict,
        blueOption,
        oneSizeOption,
      ] = await Promise.all([
        tx.category.findUnique({ where: { slug: CATEGORY_SLUG } }),
        tx.product.findUnique({ where: { slug: PRODUCT_SLUG } }),
        tx.product.findUnique({ where: { sku: PRODUCT_SKU } }),
        tx.productSlugRedirect.findUnique({ where: { slug: PRODUCT_SLUG } }),
        tx.attributeOption.findFirst({
          where: {
            id: preflightResult.blueOptionId,
            attributeId: preflightResult.colorAttributeId,
            value: { equals: 'Blue', mode: 'insensitive' },
          },
        }),
        tx.attributeOption.findFirst({
          where: {
            id: preflightResult.oneSizeOptionId,
            attributeId: preflightResult.sizeAttributeId,
            value: { equals: 'One Size', mode: 'insensitive' },
          },
        }),
      ])
      if (productConflict || skuConflict || redirectConflict) {
        throw new Error('Product slug, SKU, or legacy slug conflict appeared during import')
      }
      if (
        existingCategory &&
        (existingCategory.name !== CATEGORY_NAME ||
          existingCategory.parentId !== preflightResult.handProtectionId ||
          existingCategory.isActive)
      ) {
        throw new Error('Category conflict appeared during import')
      }
      if (!blueOption || !oneSizeOption) {
        throw new Error('Blue or One Size option changed after preflight')
      }

      const materialAttribute = await tx.attribute.findUnique({
        where: { id: preflightResult.materialAttributeId },
      })
      if (!materialAttribute || materialAttribute.type !== 'MULTISELECT') {
        throw new Error('Material attribute is missing or no longer MULTISELECT')
      }

      const existingPvcOption = await tx.attributeOption.findFirst({
        where: {
          attributeId: preflightResult.materialAttributeId,
          value: { equals: 'PVC', mode: 'insensitive' },
        },
      })
      const maxMaterialSort = await tx.attributeOption.aggregate({
        where: { attributeId: preflightResult.materialAttributeId },
        _max: { sortOrder: true },
      })
      const pvcOption =
        existingPvcOption ??
        (await tx.attributeOption.create({
          data: {
            attributeId: preflightResult.materialAttributeId,
            value: 'PVC',
            sortOrder: (maxMaterialSort._max.sortOrder ?? -1) + 1,
          },
        }))

      const category =
        existingCategory ??
        (await tx.category.create({
          data: {
            name: CATEGORY_NAME,
            slug: CATEGORY_SLUG,
            description:
              'PVC-coated work gloves for oily handling and supplier-stated resistance to weak acids and alkalis.',
            parentId: preflightResult.handProtectionId,
            isActive: false,
            metaTitle: CATEGORY_NAME,
            metaDescription:
              'PVC-coated industrial work gloves for oily handling, anti-slip grip and supplier-stated resistance to weak acids and alkalis.',
          },
        }))

      const specifications = [
        { name: 'Brand', value: 'Hubang' },
        { name: 'Model Number', value: '919' },
        { name: 'Product Type', value: 'Fully Dipped PVC Coated Work Gloves' },
        { name: 'Coating Material', value: 'PVC' },
        { name: 'Coating Coverage', value: 'Fully Dipped' },
        { name: 'Liner', value: 'High-Density Knitted Liner' },
        { name: 'Color', value: 'Blue' },
        { name: 'Size', value: 'One Size' },
        { name: 'Length', value: '27 cm ±' },
        { name: 'Palm Width', value: '12 cm ±' },
        { name: 'Pair Weight', value: '182 g ±' },
        {
          name: 'Packaging',
          value: 'Individually Polybagged; 10 Pairs/Bundle; 100 Pairs/Carton',
        },
        { name: 'Carton Weight', value: '19 kg ±' },
        { name: 'Minimum Order Quantity', value: '100 Pairs' },
        { name: 'Purchase Price', value: 'CNY 3.20/Pair' },
        {
          name: 'Supplier-Claimed Features',
          value: 'Oil Resistant; Weak Acid and Alkali Resistant; Anti-Slip; Abrasion Resistant',
        },
        {
          name: 'Applications',
          value:
            'Machinery; Construction; Agriculture; Livestock and Fisheries; Chemical and Petrochemical Work; Petroleum Processing; Printing',
        },
        { name: 'Source', value: SOURCE_URL },
      ]
      const content = {
        time: Date.now(),
        blocks: detailImages.map((image) => ({
          type: 'image',
          data: {
            file: { url: image.url },
            caption: '',
            withBorder: false,
            stretched: true,
            withBackground: false,
          },
        })),
      }

      return tx.product.create({
        data: {
          name: PRODUCT_NAME,
          slug: PRODUCT_SLUG,
          description:
            'Fully dipped blue PVC work gloves with an oil-resistant textured surface, flexible anti-slip grip and a soft knitted liner. Suitable for machinery handling, construction, agriculture, printing and oily industrial environments.',
          price: 0,
          comparePrice: null,
          cost: null,
          sku: PRODUCT_SKU,
          stock: 0,
          categoryId: category.id,
          isActive: false,
          isFeatured: false,
          specifications,
          content,
          usageScenes: ['construction', 'heavy-duty', 'slip-resistant'],
          metaTitle: 'PVC Oil-Resistant Anti-Slip Work Gloves',
          metaDescription:
            'Fully dipped blue PVC work gloves with a soft knitted liner, textured anti-slip grip and abrasion resistance for construction and oily industrial handling.',
          metaKeywords:
            'PVC work gloves, oil resistant gloves, anti-slip gloves, industrial safety gloves',
          ogTitle: 'PVC Oil-Resistant Anti-Slip Work Gloves',
          ogDescription:
            'Fully dipped blue PVC work gloves with a soft knitted liner, textured anti-slip grip and abrasion resistance for construction and oily industrial handling.',
          ogImage: galleryImages[0]?.url ?? null,
          images: {
            create: galleryImages.map((image, index) => ({
              url: image.url,
              alt: getGalleryAlt(image.name),
              sortOrder: index,
            })),
          },
          attributeValues: {
            create: [
              {
                attributeId: preflightResult.colorAttributeId,
                optionIds: [preflightResult.blueOptionId],
              },
              {
                attributeId: preflightResult.sizeAttributeId,
                optionIds: [preflightResult.oneSizeOptionId],
              },
              {
                attributeId: preflightResult.materialAttributeId,
                optionIds: [pvcOption.id],
              },
            ],
          },
        },
        select: { id: true, name: true, slug: true, sku: true, isActive: true, categoryId: true },
      })
    },
    { isolationLevel: 'Serializable', timeout: 30_000 }
  )
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const sourceImages = await loadSourceImages(options.sourceDir)
  const preflightResult = await preflight()

  if (preflightResult.existingProduct) {
    process.stdout.write(
      `${JSON.stringify(
        { mode: options.execute ? 'execute-noop' : 'dry-run-existing', product: preflightResult.existingProduct },
        null,
        2
      )}\n`
    )
    return
  }

  if (!options.execute) {
    process.stdout.write(
      `${JSON.stringify(
        {
          mode: 'dry-run',
          sourceDir: options.sourceDir,
          sourceImageCount: EXPECTED_IMAGE_NAMES.length,
          uniqueImageCount: sourceImages.length,
          galleryImageCount: sourceImages.filter((image) => image.role === 'gallery').length,
          detailImageCount: sourceImages.filter((image) => image.role === 'detail').length,
          category: CATEGORY_NAME,
          product: PRODUCT_NAME,
          sku: PRODUCT_SKU,
          price: 0,
          stock: 0,
          isActive: false,
        },
        null,
        2
      )}\n`
    )
    return
  }

  const preparedImages = await prepareImages(sourceImages)
  const uploadedImages = await uploadImages(preparedImages)
  try {
    const product = await createDraft(preflightResult, uploadedImages)
    process.stdout.write(`${JSON.stringify({ mode: 'execute', product }, null, 2)}\n`)
  } catch (error) {
    await throwAfterCleanup('Database transaction failed', error, uploadedImages)
  }
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`Import failed: ${message}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
