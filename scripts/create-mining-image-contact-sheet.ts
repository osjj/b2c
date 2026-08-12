import { readdir, readFile } from 'node:fs/promises'
import * as path from 'node:path'
import sharp from 'sharp'

const slug =
  process.argv.find((arg) => arg.startsWith('--slug='))?.slice('--slug='.length) ||
  'mining-ppe-checklist-by-task'

if (!/^[a-z0-9-]+$/.test(slug)) {
  throw new Error(`Invalid blog slug: ${slug}`)
}

const inputDir = path.resolve(process.cwd(), 'tmp', slug)
const outputPath = path.resolve(
  process.cwd(),
  'tmp',
  `${slug}-contact-sheet.jpg`,
)

async function main(): Promise<void> {
  const files = (await readdir(inputDir)).filter((file) => file.endsWith('.webp')).sort()
  const cellWidth = 560
  const imageHeight = 380
  const labelHeight = 48
  const gap = 20
  const columns = 3
  const rows = Math.ceil(files.length / columns)
  const width = columns * cellWidth + (columns + 1) * gap
  const height = rows * (imageHeight + labelHeight) + (rows + 1) * gap

  const composites: sharp.OverlayOptions[] = []
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    if (!file) continue
    const column = index % columns
    const row = Math.floor(index / columns)
    const left = gap + column * (cellWidth + gap)
    const top = gap + row * (imageHeight + labelHeight + gap)
    const image = await sharp(await readFile(path.join(inputDir, file)))
      .resize(cellWidth, imageHeight, { fit: 'cover' })
      .jpeg({ quality: 88 })
      .toBuffer()
    const label = Buffer.from(
      `<svg width="${cellWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#10243e"/><text x="16" y="31" font-family="Arial, sans-serif" font-size="19" fill="white">${file.replace('.webp', '')}</text></svg>`,
    )
    composites.push({ input: image, left, top })
    composites.push({ input: label, left, top: top + imageHeight })
  }

  await sharp({
    create: { width, height, channels: 3, background: '#e7ebef' },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile(outputPath)

  console.log(outputPath)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
