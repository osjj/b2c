import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const all = await p.category.findMany({
  select: {
    id: true,
    name: true,
    slug: true,
    parentId: true,
    isActive: true,
    image: true,
    description: true,
    _count: { select: { products: true } },
  },
  orderBy: { sortOrder: 'asc' },
})
console.log('TOTAL:', all.length, 'ACTIVE:', all.filter((c) => c.isActive).length)
console.log('---')
for (const c of all) {
  console.log(
    `${c.isActive ? 'Y' : 'N'} ${c.parentId ? 'child' : 'ROOT '} ` +
      `slug=${c.slug.padEnd(24)} image=${c.image ? 'YES' : 'NULL'} ` +
      `desc=${c.description ? 'YES' : 'NULL'} products=${c._count.products}`,
  )
}
await p.$disconnect()
