import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { getObjectFromR2 } from '../src/lib/r2'

const db = new PrismaClient()
async function main() {
  const categories = await db.category.findMany({ where: { OR: [{ name: { contains: 'glove', mode: 'insensitive' } }, { name: { contains: 'hand', mode: 'insensitive' } }] }, select: { id: true, name: true, slug: true, isActive: true } })
  const duplicates = await db.product.findMany({ where: { OR: [{ name: { contains: 'weld', mode: 'insensitive' } }, { slug: { contains: '14-inch' } }, { specifications: { array_contains: [{ name: 'Source', value: 'https://app.notion.com/p/3ddd505a003080038348eac0c1d99a33' }] } }] }, select: { id: true, name: true, slug: true, isActive: true } })
  const knownImage = await db.productImage.findFirst({ where: { url: { startsWith: `${process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com'}/products/` } }, select: { url: true } })
  if (!knownImage) throw new Error('No existing R2 image available for signed read check')
  const object = await getObjectFromR2(new URL(knownImage.url).pathname.slice(1))
  const bytes = await object.Body?.transformToByteArray()
  process.stdout.write(JSON.stringify({ categories, duplicates, signedR2Read: { status: object.$metadata.httpStatusCode, contentType: object.ContentType, bytes: bytes?.length } }, null, 2))
}
main().catch((error: unknown) => { process.stderr.write(error instanceof Error ? error.name : 'Preflight failed'); process.exitCode = 1 }).finally(() => db.$disconnect())
