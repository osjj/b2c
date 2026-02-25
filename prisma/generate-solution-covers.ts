import { PrismaClient } from '@prisma/client'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const prisma = new PrismaClient()

// R2 config
const R2_ENDPOINT = process.env.R2_ENDPOINT!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'medusa'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com'

// Third-party AI config
const AI_URL = process.env.NEXT_PUBLIC_THIRD_PARTY_IMAGE_URL || 'https://grsai.dakka.com.cn/v1/draw/nano-banana'
const AI_API_KEY = process.env.NEXT_PUBLIC_THIRD_PARTY_IMAGE_API_KEY || ''
const AI_MODEL = process.env.NEXT_PUBLIC_THIRD_PARTY_IMAGE_MODEL || 'nano-banana-fast'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

// Upload buffer to R2 under solutions/ prefix
async function uploadSolutionImage(buffer: Buffer, filename: string): Promise<string> {
  const key = `solutions/${filename}`

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'image/webp',
    })
  )

  return `${R2_PUBLIC_URL}/${key}`
}

// Submit task to third-party AI
interface SubmitResponse {
  code: number
  msg: string
  data: { id: string }
}

interface ResultResponse {
  code: number
  msg: string
  data: {
    id: string
    status: 'succeeded' | 'processing' | 'failed'
    progress: number
    results: Array<{ url: string }>
    failure_reason?: string
    error?: string
  }
}

async function generateImage(prompt: string): Promise<string> {
  // Submit task
  const submitRes = await fetch(AI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      prompt,
      aspectRatio: '4:3',
      imageSize: '1K',
      urls: [],
      webHook: '-1',
      shutProgress: true,
    }),
  })

  if (!submitRes.ok) {
    throw new Error(`Submit failed: ${submitRes.status} ${submitRes.statusText}`)
  }

  const submitResult: SubmitResponse = await submitRes.json()
  if (submitResult.code !== 0 || !submitResult.data?.id) {
    throw new Error(`Submit error: ${submitResult.msg}`)
  }

  const taskId = submitResult.data.id
  console.log(`    Task submitted: ${taskId}`)

  // Poll for result
  const resultUrl = AI_URL.replace(/\/draw\/[^/]+$/, '/draw/result')
  const maxAttempts = 120
  const interval = 2000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(resultUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({ id: taskId }),
    })

    if (!res.ok) {
      throw new Error(`Poll failed: ${res.status}`)
    }

    const result: ResultResponse = await res.json()

    if (result.code !== 0) {
      throw new Error(`Poll error: ${result.msg}`)
    }

    if (result.data.status === 'succeeded') {
      const imageUrl = result.data.results?.[0]?.url
      if (!imageUrl) throw new Error('No image URL in result')
      return imageUrl
    }

    if (result.data.status === 'failed') {
      throw new Error(result.data.failure_reason || result.data.error || 'Generation failed')
    }

    // Still processing, wait
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error('Timeout waiting for image generation')
}

// Download image and return buffer
async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function main() {
  if (!AI_API_KEY) {
    console.error('Error: NEXT_PUBLIC_THIRD_PARTY_IMAGE_API_KEY is not set')
    process.exit(1)
  }

  // Find solutions without cover image (null or empty string)
  const solutions = await prisma.solution.findMany({
    where: {
      OR: [
        { coverImage: null },
        { coverImage: '' },
      ],
    },
    select: { id: true, slug: true, title: true },
    orderBy: { sortOrder: 'asc' },
  })

  if (solutions.length === 0) {
    console.log('All solutions already have cover images.')
    return
  }

  console.log(`Found ${solutions.length} solutions without cover image:\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < solutions.length; i++) {
    const sol = solutions[i]
    console.log(`[${i + 1}/${solutions.length}] ${sol.slug} - "${sol.title}"`)

    try {
      // 1. Generate image via AI
      const prompt = `${sol.title}，生成这篇文章的4：3封面图`
      console.log(`    Prompt: ${prompt}`)

      const imageUrl = await generateImage(prompt)
      console.log(`    Generated: ${imageUrl}`)

      // 2. Download image
      const imageBuffer = await downloadImage(imageUrl)
      console.log(`    Downloaded: ${(imageBuffer.length / 1024).toFixed(1)}KB`)

      // 3. Upload to R2
      const filename = `${sol.slug}-cover-${Date.now()}.webp`
      const r2Url = await uploadSolutionImage(imageBuffer, filename)
      console.log(`    Uploaded to R2: ${r2Url}`)

      // 4. Update database
      await prisma.solution.update({
        where: { id: sol.id },
        data: { coverImage: r2Url },
      })
      console.log(`    Database updated!\n`)

      success++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`    FAILED: ${msg}\n`)
      failed++
    }
  }

  console.log(`\nDone! Success: ${success}, Failed: ${failed}`)
}

main()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
