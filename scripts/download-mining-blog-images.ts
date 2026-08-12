import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import * as path from 'node:path'

const slug =
  process.argv.find((arg) => arg.startsWith('--slug='))?.slice('--slug='.length) ||
  'mining-ppe-checklist-by-task'

if (!/^[a-z0-9-]+$/.test(slug)) {
  throw new Error(`Invalid blog slug: ${slug}`)
}
const inputPath = path.resolve(
  process.cwd(),
  'prisma',
  `blog-images.${slug}.generated.json`,
)
const outputDir = path.resolve(process.cwd(), 'tmp', slug)

async function main(): Promise<void> {
  if (!existsSync(inputPath)) {
    throw new Error(`Missing generated image JSON: ${inputPath}`)
  }

  const urls = JSON.parse(await readFile(inputPath, 'utf8')) as Record<string, string>
  await mkdir(outputDir, { recursive: true })

  await Promise.all(
    Object.entries(urls).map(async ([key, url]) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`${key}: ${response.status} ${response.statusText}`)
      }
      await writeFile(
        path.join(outputDir, `${key}.webp`),
        Buffer.from(await response.arrayBuffer()),
      )
    }),
  )

  console.log(outputDir)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
