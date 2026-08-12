import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] || fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const DEFAULT_POST_SLUG = 'mining-ppe-checklist-by-task'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: requireEnv('R2_ENDPOINT'),
  credentials: {
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
  },
})

const bucketName = requireEnv('R2_BUCKET_NAME', 'medusa')
const publicUrl = requireEnv('R2_PUBLIC_URL', 'https://shop.laifappe.com').replace(
  /\/$/,
  '',
)

function parseArgs(): { slug: string; key: string; file: string } {
  const args = Object.fromEntries(
    process.argv.slice(2).flatMap((arg) => {
      const separator = arg.indexOf('=')
      return separator === -1
        ? []
        : [[arg.slice(2, separator), arg.slice(separator + 1)]]
    }),
  )

  const key = args.key?.trim()
  const file = args.file?.trim()
  const slug = args.slug?.trim() || DEFAULT_POST_SLUG
  if (!key || !file) {
    throw new Error(
      'Usage: npx tsx scripts/upload-blog-image-files.ts --slug=<slug> --key=<key> --file=<path>',
    )
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`Invalid blog slug: ${slug}`)
  }

  return { slug, key, file: path.resolve(file) }
}

async function loadExisting(outputJson: string): Promise<Record<string, string>> {
  if (!existsSync(outputJson)) {
    return {}
  }

  const parsed = JSON.parse(await readFile(outputJson, 'utf8')) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Invalid generated image JSON: ${outputJson}`)
  }

  return parsed as Record<string, string>
}

async function main(): Promise<void> {
  const { slug, key, file } = parseArgs()
  const outputJson = path.resolve(
    process.cwd(),
    'prisma',
    `blog-images.${slug}.generated.json`,
  )
  const input = await readFile(file)
  const sharp = (await import('sharp')).default
  const webp = await sharp(input).webp({ quality: 88 }).toBuffer()
  const filename = `${key}-${Date.now()}.webp`
  const r2Key = `blog/${slug}/${filename}`

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
      Body: webp,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )

  const url = `${publicUrl}/${r2Key}`
  const existing = await loadExisting(outputJson)
  existing[key] = url
  await writeFile(outputJson, `${JSON.stringify(existing, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({ key, file, url, bytes: webp.length }))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
