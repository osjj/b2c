import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const s = await p.solution.findMany({ select: { slug: true, usageScenes: true } })
  console.log(JSON.stringify(s, null, 2))
}
main().finally(() => p.$disconnect())
