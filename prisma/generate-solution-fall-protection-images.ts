import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const R2_ENDPOINT = process.env.R2_ENDPOINT!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'medusa'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com'

const AI_URL =
  process.env.NEXT_PUBLIC_THIRD_PARTY_IMAGE_URL ||
  'https://grsai.dakka.com.cn/v1/draw/nano-banana'
const AI_API_KEY = process.env.NEXT_PUBLIC_THIRD_PARTY_IMAGE_API_KEY || ''
const AI_MODEL = process.env.NEXT_PUBLIC_THIRD_PARTY_IMAGE_MODEL || 'nano-banana-fast'

const SOLUTION_SLUG = 'fall-protection-construction'
const TARGET_JSON = path.join(__dirname, 'solutions-construction-fall-protection.json')
const OUTPUT_JSON = path.join(
  __dirname,
  'solution-images.fall-protection-construction.generated.json',
)

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

interface ImagePlan {
  key: string
  aspect: '16:9' | '4:3'
  prompt: string
  apply(solution: SolutionJsonRecord, url: string): void
}

type TaskCardJson = {
  scene: string
  checked: boolean
  title: string
  description: string
  items: string[]
  image?: string
}

type SolutionSectionJson = {
  key: string
  type: string
  title?: string | null
  enabled?: boolean
  sort?: number
  data?: {
    cards?: TaskCardJson[]
    [key: string]: unknown
  }
}

type SolutionJsonRecord = {
  slug: string
  title: string
  excerpt: string | null
  usageScenes: string[]
  coverImage: string | null
  isActive: boolean
  sortOrder: number
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  sections?: SolutionSectionJson[]
}

const PLAN: ImagePlan[] = [
  {
    key: 'cover',
    aspect: '16:9',
    prompt:
      'Professional editorial construction photograph, wide 16:9 format. ' +
      'A construction worker at height on a steel-and-concrete jobsite wearing a properly fitted full-body harness, ' +
      'connected to a fall arrest system near an exposed edge, with helmet, gloves, and high-visibility clothing. ' +
      'Realistic industrial atmosphere, muted steel grey and safety yellow accents, serious procurement-grade visual, ' +
      'no text, no logos, no watermark.',
    apply(solution, url) {
      solution.coverImage = url
    },
  },
  {
    key: 'roofing-height-work',
    aspect: '4:3',
    prompt:
      'Editorial documentary photograph, 4:3. Roofing crew working near an exposed roof edge, ' +
      'wearing properly fitted harnesses and tied off to a safe fall protection system. ' +
      'Visible roof surface texture, authentic construction details, realistic daylight, no text or logos.',
    apply(solution, url) {
      setTaskCardImage(solution, 'height-work', url)
    },
  },
  {
    key: 'scaffold-fall-protection',
    aspect: '4:3',
    prompt:
      'Documentary construction photograph, 4:3. Workers on scaffolding and access platforms using fall protection equipment, ' +
      'with clear harnesses, connectors, and safe movement on a live jobsite. ' +
      'Industrial realism, clean composition, no text, no logos, no watermark.',
    apply(solution, url) {
      setTaskCardImage(solution, 'fall-protection', url)
    },
  },
  {
    key: 'steel-erection',
    aspect: '4:3',
    prompt:
      'Editorial 4:3 construction image of structural steel workers at height, wearing harnesses and helmets while moving across steel members. ' +
      'Strong sense of height, connection work, durable gear, and real industrial atmosphere. No text, no logos.',
    apply(solution, url) {
      setTaskCardImage(solution, 'steel-work', url)
    },
  },
  {
    key: 'maintenance-access',
    aspect: '4:3',
    prompt:
      'Professional industrial maintenance photograph, 4:3. Site supervisor and maintenance crew preparing fall protection gear for mixed elevated access work, ' +
      'including harnesses, lanyards, and equipment checks in a realistic construction or plant setting. No text, no logos.',
    apply(solution, url) {
      setTaskCardImage(solution, 'construction', url)
    },
  },
]

function setTaskCardImage(solution: SolutionJsonRecord, scene: string, url: string) {
  const section = solution.sections?.find((item) => item.key === 'task-scenarios')
  const cards = section?.data?.cards
  if (!Array.isArray(cards)) return
  const card = cards.find((item) => item.scene === scene)
  if (card) {
    card.image = url
  }
}

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

async function generateImage(plan: ImagePlan): Promise<string> {
  const submitRes = await fetch(AI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      prompt: plan.prompt,
      aspectRatio: plan.aspect,
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
  const resultUrl = AI_URL.replace(/\/draw\/[^/]+$/, '/draw/result')

  for (let attempt = 0; attempt < 120; attempt++) {
    const res = await fetch(resultUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({ id: taskId }),
    })

    if (!res.ok) throw new Error(`Poll failed: ${res.status}`)

    const result: ResultResponse = await res.json()
    if (result.code !== 0) throw new Error(`Poll error: ${result.msg}`)

    if (result.data.status === 'succeeded') {
      const imageUrl = result.data.results?.[0]?.url
      if (!imageUrl) throw new Error('No image URL in result')
      return imageUrl
    }

    if (result.data.status === 'failed') {
      throw new Error(
        result.data.failure_reason || result.data.error || 'Generation failed',
      )
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  throw new Error('Timeout waiting for image generation')
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function optimizeToWebp(buffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import('sharp')).default
    return await sharp(buffer).webp({ quality: 88 }).toBuffer()
  } catch {
    return buffer
  }
}

async function uploadSolutionImage(buffer: Buffer, filename: string): Promise<string> {
  const r2Key = `solutions/${SOLUTION_SLUG}/${filename}`
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: buffer,
      ContentType: 'image/webp',
    }),
  )
  return `${R2_PUBLIC_URL}/${r2Key}`
}

async function loadExisting(): Promise<Record<string, string>> {
  if (!existsSync(OUTPUT_JSON)) return {}
  try {
    const raw = await readFile(OUTPUT_JSON, 'utf8')
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

async function saveOutput(map: Record<string, string>) {
  const dir = path.dirname(OUTPUT_JSON)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(OUTPUT_JSON, JSON.stringify(map, null, 2) + '\n', 'utf8')
}

async function main() {
  if (!AI_API_KEY) {
    throw new Error('NEXT_PUBLIC_THIRD_PARTY_IMAGE_API_KEY is not set')
  }

  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const keyFilter = args
    .find((arg) => arg.startsWith('--key='))
    ?.slice('--key='.length)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const raw = await readFile(TARGET_JSON, 'utf8')
  const payload = JSON.parse(raw) as SolutionJsonRecord[]
  const solution = Array.isArray(payload)
    ? payload.find((item) => item.slug === SOLUTION_SLUG)
    : null

  if (!solution) {
    throw new Error(`Solution ${SOLUTION_SLUG} not found in ${TARGET_JSON}`)
  }

  const existing = await loadExisting()
  const next = { ...existing }

  const plansToRun = PLAN.filter((plan) => {
    if (keyFilter && keyFilter.length > 0 && !keyFilter.includes(plan.key)) {
      return false
    }
    if (!force && existing[plan.key]) {
      plan.apply(solution, existing[plan.key])
      return false
    }
    return true
  })

  for (let i = 0; i < plansToRun.length; i++) {
    const plan = plansToRun[i]
    console.log(`[${i + 1}/${plansToRun.length}] ${plan.key}`)
    const imageUrl = await generateImage(plan)
    const rawBuffer = await downloadImage(imageUrl)
    const webpBuffer = await optimizeToWebp(rawBuffer)
    const filename = `${plan.key}-${Date.now()}.webp`
    const r2Url = await uploadSolutionImage(webpBuffer, filename)
    plan.apply(solution, r2Url)
    next[plan.key] = r2Url
    await saveOutput(next)
    console.log(`    Uploaded: ${r2Url}`)
  }

  await writeFile(TARGET_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Updated solution JSON: ${TARGET_JSON}`)
}

main().catch((error) => {
  console.error('Solution image generation failed:', error)
  process.exit(1)
})
