import { createHash, randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import { z } from 'zod'
import { getObjectFromR2, uploadToR2 } from '../src/lib/r2'
import { getStorefrontVisibleProductSpecifications } from '../src/lib/product-specification-visibility'

const ROOT = path.resolve('output/14-inch-welding-gloves')
const NAME = '14-Inch Split Cowhide Welding Gloves with Reinforced Thumb'
const SLUG = '14-inch-split-cowhide-welding-gloves-reinforced-thumb'
const SOURCE = 'https://app.notion.com/p/3ddd505a003080038348eac0c1d99a33'
const CATEGORY = 'welding-gloves'
const PRICE = '1.98'
const db = new PrismaClient()
const prefix = `${(process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com').replace(/\/$/, '')}/products/`
const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex')
const log = (event: string, data: unknown) => process.stdout.write(`${JSON.stringify({ event, data }, null, 2)}\n`)
const save = (name: string, value: unknown) => writeFile(path.join(ROOT, name), `${JSON.stringify(value, null, 2)}\n`)

const titles = [
  'Red split cowhide welding glove pair with long cuffs',
  'Yellow split cowhide welding glove pair, palm and back views',
  'Split cowhide leather construction of long-cuff welding gloves',
  'Reinforced thumb junction detail',
  'Welted seams and protective strips along the stitching',
  'Soft inner fabric lining at the cuff',
  '14-inch extended cuff design',
  'Welding work gloves for workshop tasks',
  'Flexible hand movement in split cowhide gloves',
  'Welding glove material, lining, length, colors and construction',
  'Source-listed work applications and task-specific selection',
]
const specs = [
  { name: 'Product Type', value: 'Long-cuff welding gloves' },
  { name: 'Material', value: 'Split cowhide leather' },
  { name: 'Lining', value: 'Soft fabric lining' },
  { name: 'Length', value: '14 inches (source lists approximately 35 cm)' },
  { name: 'Colors', value: 'Red / Yellow' },
  { name: 'Construction', value: 'Five-finger design, reinforced thumb junction, welted seams, extended gauntlet cuff' },
  { name: 'Applications', value: 'Welding, metal handling, and workshop tasks (source-listed)' },
  { name: 'Minimum Order Quantity', value: '144 (source unit not stated)' },
  { name: 'Price Unit', value: 'Source quote: USD 1.98; per-glove or per-pair unit not stated' },
  { name: 'Verification Note', value: 'Abrasion resistance, heat insulation and spatter protection appear in source marketing only. No standard, certification, test report or temperature rating was supplied.' },
  { name: 'Source', value: SOURCE },
]
const assetSchema = z.object({
  index: z.number().int().min(1).max(11),
  role: z.enum(['gallery', 'detail']),
  alt: z.string(),
  sourceHash: z.string().length(64),
  generatedHash: z.string().length(64),
  outputHash: z.string().length(64),
  width: z.number().positive(), height: z.number().positive(),
  url: z.string().url().optional(),
})
const auditSchema = z.object({ slug: z.literal(SLUG), assets: z.array(assetSchema).length(11), reviewed: z.literal(true) })
const manifestSchema = z.object({ slug: z.literal(SLUG), runId: z.string().uuid(), assets: z.array(assetSchema).max(11) })
type Asset = z.infer<typeof assetSchema>
const qaSchema = z.object({ reviewedIndexes: z.array(z.number().int()).length(11), verdict: z.literal('pass') })
const json = async (name: string): Promise<unknown> => JSON.parse(await readFile(path.join(ROOT, name), 'utf8'))
const sourceFile = (i: number) => path.join(ROOT, `source/image-${i}.png`)
const generatedFile = (i: number) => path.join(ROOT, `generated/image-${i}.png`)
const finalFile = (i: number) => path.join(ROOT, `final/welding-gloves-${String(i).padStart(2, '0')}.webp`)

async function retry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
  try { return await fn() } catch (error) {
    if (attempt >= 3) throw error
    await new Promise(resolve => setTimeout(resolve, attempt * 1000))
    return retry(fn, attempt + 1)
  }
}
async function prepare() {
  const qa = qaSchema.parse(await json('visual-qa.json'))
  if ([...qa.reviewedIndexes].sort((a,b) => a-b).join(',') !== '1,2,3,4,5,6,7,8,9,10,11') throw new Error('All eleven images require visual review')
  const assets = await Promise.all(titles.map(async (alt, offset) => {
    const index = offset + 1
    const [source, generated] = await Promise.all([readFile(sourceFile(index)), readFile(generatedFile(index))])
    if (hash(source) === hash(generated)) throw new Error(`Image ${index} was not regenerated`)
    const output = await sharp(generated).webp({ quality: 92, effort: 6 }).toBuffer()
    const meta = await sharp(output).metadata()
    if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 1000) throw new Error(`Image ${index} is too small`)
    await writeFile(finalFile(index), output)
    return { index, role: index <= 2 ? 'gallery' : 'detail', alt, sourceHash: hash(source), generatedHash: hash(generated), outputHash: hash(output), width: meta.width, height: meta.height }
  }))
  const audit = auditSchema.parse({ slug: SLUG, assets, reviewed: true })
  await save('import-audit.json', audit)
  log('prepared', { sources: 11, regenerated: 11, gallery: 2, details: 9 })
}
const duplicateWhere: Prisma.ProductWhereInput = { OR: [
  { slug: SLUG }, { name: { equals: NAME, mode: 'insensitive' } },
  { specifications: { array_contains: [{ name: 'Source', value: SOURCE }] } },
] }
async function preflight() {
  const category = await db.category.findUnique({ where: { slug: CATEGORY } })
  if (!category?.isActive || category.name !== 'Welding Gloves') throw new Error('Welding Gloves category unavailable')
  const existing = await db.product.findFirst({ where: duplicateWhere, select: { id: true } })
  const redirect = await db.productSlugRedirect.findUnique({ where: { slug: SLUG } })
  if (existing || redirect) throw new Error('Product source, name or slug already exists; refusing duplicate draft')
  const known = await db.productImage.findFirst({ where: { url: { startsWith: prefix } }, select: { url: true } })
  if (!known) throw new Error('No known object for signed storage check')
  const object = await getObjectFromR2(new URL(known.url).pathname.slice(1))
  const bytes = await object.Body?.transformToByteArray()
  if (object.$metadata.httpStatusCode !== 200 || !bytes?.length) throw new Error('Signed storage check failed')
  const result = { categoryId: category.id, category: category.name, duplicateCount: 0, signedStorageRead: 200, price: PRICE, isActive: false }
  await save('preflight.json', result)
  log('preflight', result)
  return category
}
async function validateAssets(assets: Asset[], remote = false) {
  if (assets.map(a => a.index).join(',') !== '1,2,3,4,5,6,7,8,9,10,11' || new Set(assets.map(a=>a.outputHash)).size !== 11) throw new Error('Missing or duplicated assets')
  await Promise.all(assets.map(async a => {
    const [source, generated, output] = await Promise.all([readFile(sourceFile(a.index)), readFile(generatedFile(a.index)), readFile(finalFile(a.index))])
    const meta = await sharp(output).metadata()
    if (hash(source) !== a.sourceHash || hash(generated) !== a.generatedHash || hash(output) !== a.outputHash || meta.format !== 'webp') throw new Error(`Asset ${a.index} changed after audit`)
    if (a.role !== (a.index <= 2 ? 'gallery' : 'detail') || a.alt !== titles[a.index-1]) throw new Error('Gallery/detail mapping changed')
    if (remote && (!a.url?.startsWith(prefix) || /X-Amz-|prod-files-secure/.test(a.url))) throw new Error('Non-durable media URL')
  }))
}
async function checkRemote(a: Asset) {
  if (!a.url?.startsWith(prefix)) throw new Error('Unexpected media URL')
  const response = await fetch(a.url, { signal: AbortSignal.timeout(30000) })
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('image/webp')) throw new Error(`Media ${a.index} HTTP check failed`)
  if (hash(Buffer.from(await response.arrayBuffer())) !== a.outputHash) throw new Error(`Media ${a.index} byte mismatch`)
}
async function loadManifest() {
  try { return manifestSchema.parse(await json('upload-manifest.json')) } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
    return manifestSchema.parse({ slug: SLUG, runId: randomUUID(), assets: [] })
  }
}
async function apply() {
  const category = await preflight()
  const audit = auditSchema.parse(await json('import-audit.json'))
  await validateAssets(audit.assets)
  const manifest = await loadManifest()
  await save('upload-manifest.json', manifest)
  await audit.assets.reduce<Promise<void>>(async (previous, asset) => {
    await previous
    const prior = manifest.assets.find(a => a.index === asset.index)
    if (prior) {
      if (prior.outputHash !== asset.outputHash) throw new Error('Existing upload differs from reviewed asset')
      await retry(() => checkRemote(prior))
      return
    }
    const filename = `20260916-welding-gloves-${manifest.runId}-${String(asset.index).padStart(2,'0')}.webp`
    const buffer = await readFile(finalFile(asset.index))
    const url = await retry(() => uploadToR2(buffer, filename, 'image/webp'))
    if (url !== `${prefix}${filename}`) throw new Error('Unexpected upload destination')
    const uploaded = { ...asset, url }
    manifest.assets.push(uploaded)
    await save('upload-manifest.json', manifest)
    await retry(() => checkRemote(uploaded))
    log('uploaded', { index: asset.index, role: asset.role })
  }, Promise.resolve())
  manifest.assets.sort((a,b) => a.index-b.index)
  await validateAssets(manifest.assets, true)
  await save('import-audit.pre-db.json', { ...audit, assets: manifest.assets, remoteBytesVerified: true })
  await save('pre-create-snapshot.json', { source: SOURCE, slug: SLUG, existingProduct: null, categoryId: category.id, intendedActive: false, createdAt: new Date().toISOString() })
  const gallery = manifest.assets.filter(a => a.role === 'gallery')
  const details = manifest.assets.filter(a => a.role === 'detail')
  const first = gallery[0]
  if (!first?.url || gallery.length !== 2 || details.length !== 9) throw new Error('Incorrect image counts')
  const product = await db.$transaction(async tx => {
    const duplicate = await tx.product.findFirst({ where: duplicateWhere, select: { id: true } })
    const currentCategory = await tx.category.findUnique({ where: { id: category.id } })
    const redirect = await tx.productSlugRedirect.findUnique({ where: { slug: SLUG } })
    if (duplicate || redirect || !currentCategory?.isActive || currentCategory.slug !== CATEGORY) throw new Error('Product identity or category changed')
    return tx.product.create({ data: {
      name: NAME, slug: SLUG,
      description: 'Long-cuff welding gloves in red or yellow split cowhide leather, with a soft fabric lining, reinforced thumb junction and welted seams. The 14-inch design extends coverage beyond the wrist.',
      price: new Prisma.Decimal(PRICE), comparePrice: null, cost: null, sku: null, stock: 0, weight: null,
      categoryId: category.id, isActive: false, isFeatured: false, specifications: specs,
      usageScenes: ['welding', 'metal-handling', 'workshop'],
      metaTitle: '14-Inch Split Cowhide Welding Gloves | Red & Yellow',
      metaDescription: '14-inch split cowhide welding gloves with soft fabric lining, reinforced thumb and welted seams. Available in red and yellow with extended cuffs.',
      metaKeywords: '14 inch welding gloves, split cowhide gloves, long cuff welding gloves, reinforced thumb gloves',
      ogTitle: NAME, ogDescription: 'Split cowhide welding gloves with reinforced thumb, soft lining and long cuffs.', ogImage: first.url,
      content: { time: Date.now(), version: '2.31.1', blocks: details.map(a => ({ id: `detail-${a.index}`, type: 'image', data: { file: { url: a.url }, caption: a.alt, withBorder: false, stretched: true, withBackground: false } })) },
      images: { create: gallery.map((a, sortOrder) => { if (!a.url) throw new Error('Missing URL'); return { url: a.url, alt: a.alt, sortOrder } }) },
    }, select: { id: true } })
  }, { isolationLevel: 'Serializable', timeout: 30000 })
  await save('created-product.json', { ...product, slug: SLUG, name: NAME })
  log('created', product)
  await verify()
}
const contentSchema = z.object({ blocks: z.array(z.object({ type: z.literal('image'), data: z.object({ file: z.object({ url: z.string().url() }), caption: z.string() }) })).length(9) })
async function verify() {
  const p = await db.product.findUnique({ where: { slug: SLUG }, include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, variants: true, priceTiers: true } })
  if (!p) throw new Error('Draft missing')
  const manifest = await loadManifest()
  await validateAssets(manifest.assets, true)
  const content = contentSchema.parse(p.content)
  const urls = [...p.images.map(a => a.url), ...content.blocks.map(a => a.data.file.url)]
  const visible = JSON.stringify(getStorefrontVisibleProductSpecifications(p.specifications))
  const checks = {
    identity: p.name === NAME && p.slug === SLUG,
    inactive: !p.isActive && !p.isFeatured,
    category: p.category?.slug === CATEGORY,
    commercial: p.price.toString() === PRICE && p.stock === 0 && p.sku === null && p.cost === null && p.weight === null && p.comparePrice === null,
    noInventedVariants: p.variants.length === 0 && p.priceTiers.length === 0,
    exactSpecs: JSON.stringify(p.specifications) === JSON.stringify(specs),
    imageMapping: p.images.length === 2 && urls.length === 11 && new Set(urls).size === 11 && urls.every((url,i) => url === manifest.assets[i]?.url),
    imageAlt: p.images.every((a,i) => a.alt === titles[i]) && content.blocks.every((a,i) => a.data.caption === titles[i+2]),
    english: !/[\u3400-\u9fff]/u.test(JSON.stringify({ name: p.name, description: p.description, specs: p.specifications, content: p.content })),
    sourcePrivate: !visible.includes(SOURCE),
    ogImage: p.ogImage === urls[0],
  }
  const failed = Object.entries(checks).filter(([,v]) => !v).map(([k])=>k)
  if (failed.length) throw new Error(`Verification failed: ${failed.join(', ')}`)
  await manifest.assets.reduce<Promise<void>>(async (previous,a) => { await previous; await retry(() => checkRemote(a)) }, Promise.resolve())
  const publicUrl = `https://www.laifappe.com/products/${SLUG}`
  const response = await fetch(publicUrl, { redirect: 'follow', signal: AbortSignal.timeout(30000) })
  await response.body?.cancel()
  if (response.status !== 404) throw new Error(`Expected inactive storefront 404, got ${response.status}`)
  const result = { id: p.id, name: p.name, price: p.price.toString(), category: p.category?.name, isActive: p.isActive, gallery: 2, details: 9, publicImagesVerified: 11, storefrontStatus: 404, adminUrl: `https://www.laifappe.com/admin/products/${p.id}`, checks }
  await save('verification.json', result)
  log('verified', result)
}
async function main() {
  const args = process.argv.slice(2)
  if (args.length !== 1) throw new Error('Specify one mode: --prepare, --preflight, --apply or --verify')
  const mode = z.enum(['--prepare', '--preflight', '--apply', '--verify']).parse(args[0])
  if (mode === '--prepare') await prepare()
  if (mode === '--preflight') await preflight()
  if (mode === '--apply') await apply()
  if (mode === '--verify') await verify()
}
main().catch((error: unknown) => { log('failed', { message: error instanceof Error ? error.message : 'Unknown import error', recovery: 'Check the product and upload manifest before retrying; files are retained if commit outcome is uncertain.' }); process.exitCode = 1 }).finally(() => db.$disconnect())
