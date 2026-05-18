import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] || fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const R2_ENDPOINT = requireEnv('R2_ENDPOINT')
const R2_ACCESS_KEY_ID = requireEnv('R2_ACCESS_KEY_ID')
const R2_SECRET_ACCESS_KEY = requireEnv('R2_SECRET_ACCESS_KEY')
const R2_BUCKET_NAME = requireEnv('R2_BUCKET_NAME', 'medusa')
const R2_PUBLIC_URL = requireEnv('R2_PUBLIC_URL', 'https://shop.laifappe.com')

const AI_URL = requireEnv(
  'NEXT_PUBLIC_THIRD_PARTY_IMAGE_URL',
  'https://grsai.dakka.com.cn/v1/draw/nano-banana',
)
const AI_API_KEY = requireEnv('NEXT_PUBLIC_THIRD_PARTY_IMAGE_API_KEY')
const AI_MODEL = requireEnv(
  'NEXT_PUBLIC_THIRD_PARTY_IMAGE_MODEL',
  'nano-banana-fast',
)

const POST_SLUG = 'trenching-excavation-ppe-checklist'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.trenching-excavation-ppe-checklist.generated.json',
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
}

const BASE_STYLE =
  'Style/medium: photorealistic editorial construction safety photography, practical B2B trenching and excavation PPE checklist tone, realistic civil construction details. ' +
  'Lighting/mood: natural daylight, credible, professional, field-oriented, serious but not dramatic. ' +
  'Color palette: soil brown, concrete gray, steel blue, high-visibility lime and orange, helmet white, boot black, reflective silver. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no unsafe trench entry, no unsupported vertical trench walls, no distorted PPE.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog hero image for a trenching and excavation PPE checklist. ' +
      'Primary request: excavation crew prepared for trench work, wearing safety helmets, high-visibility clothing, safety boots, gloves, eye protection, and hearing protection near a controlled trench work zone. ' +
      'Scene/backdrop: civil construction site with excavator parked, trench box or sloped excavation visible, spoil pile set back, cones, ladder access, and pipe sections. ' +
      'Subject: complete PPE readiness before trenching work starts, with a supervisor checking blank paperwork with no readable text. ' +
      'Composition/framing: 16:9 wide hero frame, PPE and crew prominent in foreground with excavation context behind, room for article crop. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-trenching-and-excavation-ppe-checklist',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image for a quick trenching PPE checklist. ' +
      'Primary request: organized trenching PPE kit on a clean jobsite dispatch table: helmet, safety glasses, high-visibility vest, cut-resistant gloves, waterproof safety boots, earplugs, respirator case, and headlamp. ' +
      'Scene/backdrop: controlled excavation site entrance with cones, trench box, pipe sections, and compact excavator softly visible. ' +
      'Subject: baseline PPE before trench and excavation crews enter the work area. ' +
      'Composition/framing: 4:3 organized flat-lay with realistic PPE, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'osha-and-niosh-context-for-trenching-work',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for trenching safety context. ' +
      'Primary request: competent person and supervisor reviewing excavation conditions beside a protected trench, with PPE samples and blank inspection sheet on a clipboard. ' +
      'Scene/backdrop: trench with protective system, safe ladder access, set-back spoil pile, barriers, and excavator idle in the background. ' +
      'Subject: PPE planning inside a broader trench safety review. ' +
      'Composition/framing: 4:3 medium documentary scene, paperwork visible but unreadable. ' +
      BASE_STYLE,
  },
  {
    key: 'head-protection-for-trenching-and-excavation',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for head protection in trenching. ' +
      'Primary request: close view of workers wearing safety helmets with chin straps while handling pipe and shoring components beside a protected excavation. ' +
      'Scene/backdrop: trench box, pipe bedding material, ladder, equipment boom parked safely, and overhead hazard controls. ' +
      'Subject: helmet retention and head protection around excavation materials and machinery. ' +
      'Composition/framing: 4:3 medium close-up focused on helmets, eye protection, and controlled work area. ' +
      BASE_STYLE,
  },
  {
    key: 'high-visibility-clothing-around-excavators-and-traffic',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for high-visibility PPE around excavators and traffic. ' +
      'Primary request: spotter and excavation crew wearing high-visibility clothing near an idle excavator and dump truck route, with clear separation from moving equipment. ' +
      'Scene/backdrop: roadwork excavation zone with cones, barriers, trench protection, and low-light overcast construction conditions. ' +
      'Subject: visibility for trench crews around plant, trucks, and traffic. ' +
      'Composition/framing: 4:3 medium-wide jobsite scene with hi-vis clothing prominent, no readable signs. ' +
      BASE_STYLE,
  },
  {
    key: 'footwear-for-mud-water-edges-and-puncture-hazards',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for excavation footwear. ' +
      'Primary request: close-up of safety boots with deep tread, toe protection, and puncture-resistant soles on muddy excavation ground near gravel, pipe, and trench edge barriers. ' +
      'Scene/backdrop: wet civil jobsite surface with safe edge protection and drainage hose, no worker inside an unsafe trench. ' +
      'Subject: boot traction, waterproofing, and puncture protection for trenching. ' +
      'Composition/framing: 4:3 low-angle close-up, boots sharp and terrain realistic. ' +
      BASE_STYLE,
  },
  {
    key: 'respiratory-protection-and-atmospheric-hazards',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for respiratory protection and atmospheric review. ' +
      'Primary request: worker performing a respirator seal check while a safety manager uses a gas meter near a trench access point, with dust control and utility work equipment nearby. ' +
      'Scene/backdrop: protected excavation area with pipe work, generator away from trench, and barriers. ' +
      'Subject: respiratory and atmospheric hazard planning before excavation entry. ' +
      'Composition/framing: 4:3 medium close-up focused on respirator, gas meter, gloves, helmet, and hi-vis clothing. ' +
      BASE_STYLE,
  },
  {
    key: 'task-based-trenching-ppe-matrix',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for a task-based trenching PPE matrix. ' +
      'Primary request: multi-zone excavation site showing separate safe tasks: equipment spotting, pipe laying preparation, shoring inspection, utility locating, and backfill staging, with workers wearing task-appropriate PPE. ' +
      'Scene/backdrop: civil trenching project with protected excavation, pipe sections, compactors, cones, and organized crew roles. ' +
      'Subject: PPE changes by trenching task and crew role. ' +
      'Composition/framing: 4:3 balanced multi-role jobsite view without readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'procurement-checklist-for-trenching-ppe-kits',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for trenching PPE procurement. ' +
      'Primary request: trenching PPE kits staged for multiple crews in a contractor warehouse, with helmets, hi-vis garments, gloves, waterproof safety boots, eyewear, hearing protection, respirator cases, headlamps, and replacement stock. ' +
      'Scene/backdrop: warehouse dispatch table opening toward a civil excavation yard with pipe pallets and cones. ' +
      'Subject: organized PPE kit procurement and issue workflow for trench crews. ' +
      'Composition/framing: 4:3 practical inventory scene, blank labels only, no readable text. ' +
      BASE_STYLE,
  },
]

interface SubmitResponse {
  code: number
  msg: string
  data?: { id?: string }
}

interface ResultResponse {
  code: number
  msg: string
  data?: {
    id: string
    status: 'succeeded' | 'processing' | 'failed'
    progress: number
    results?: Array<{ url?: string }>
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

  const submitResult = (await submitRes.json()) as SubmitResponse
  const taskId = submitResult.data?.id
  if (submitResult.code !== 0 || !taskId) {
    throw new Error(`Submit error: ${submitResult.msg}`)
  }

  const resultUrl = AI_URL.replace(/\/draw\/[^/]+$/, '/draw/result')

  for (let attempt = 0; attempt < 120; attempt += 1) {
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

    const result = (await res.json()) as ResultResponse
    const data = result.data
    if (result.code !== 0 || !data) {
      throw new Error(`Poll error: ${result.msg}`)
    }

    if (data.status === 'succeeded') {
      const imageUrl = data.results?.[0]?.url
      if (!imageUrl) {
        throw new Error('No image URL in result')
      }
      return imageUrl
    }

    if (data.status === 'failed') {
      throw new Error(data.failure_reason || data.error || 'Generation failed')
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  throw new Error('Timeout waiting for image generation')
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`)
  }
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

async function uploadBlogImage(buffer: Buffer, filename: string): Promise<string> {
  const r2Key = `blog/${POST_SLUG}/${filename}`
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: buffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
  return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${r2Key}`
}

type GeneratedImages = Record<string, string>

async function loadExisting(): Promise<GeneratedImages> {
  if (!existsSync(OUTPUT_JSON)) {
    return {}
  }

  try {
    const raw = await readFile(OUTPUT_JSON, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as GeneratedImages
    }
  } catch {
    return {}
  }

  return {}
}

async function saveOutput(map: GeneratedImages): Promise<void> {
  const dir = path.dirname(OUTPUT_JSON)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(OUTPUT_JSON, `${JSON.stringify(map, null, 2)}\n`, 'utf8')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const keyFilter = args
    .find((arg) => arg.startsWith('--key='))
    ?.slice('--key='.length)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  const existing = await loadExisting()
  const next: GeneratedImages = { ...existing }

  const plansToRun = PLAN.filter((plan) => {
    if (keyFilter && keyFilter.length > 0 && !keyFilter.includes(plan.key)) {
      return false
    }
    if (!force && existing[plan.key]) {
      console.log(`[skip] ${plan.key} (already generated: ${existing[plan.key]})`)
      return false
    }
    return true
  })

  if (plansToRun.length === 0) {
    console.log(
      '\nNothing to generate. Use --force to regenerate all, or --key=... for specific keys.',
    )
    return
  }

  console.log(`\nGenerating ${plansToRun.length} blog image(s) for ${POST_SLUG}...\n`)
  let success = 0
  let failed = 0

  for (let index = 0; index < plansToRun.length; index += 1) {
    const plan = plansToRun[index]
    console.log(`[${index + 1}/${plansToRun.length}] ${plan.key} (${plan.aspect})`)

    try {
      const imageUrl = await generateImage(plan)
      console.log(`    Generated: ${imageUrl}`)

      const rawBuffer = await downloadImage(imageUrl)
      console.log(`    Downloaded: ${(rawBuffer.length / 1024).toFixed(1)}KB`)

      const webpBuffer = await optimizeToWebp(rawBuffer)
      const filename = `${plan.key}-${Date.now()}.webp`
      const r2Url = await uploadBlogImage(webpBuffer, filename)
      console.log(`    Uploaded: ${r2Url}\n`)

      next[plan.key] = r2Url
      await saveOutput(next)
      success += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`    FAILED: ${message}\n`)
      failed += 1
    }
  }

  console.log(`\nDone! Success: ${success}, Failed: ${failed}`)
  console.log(`Output: ${OUTPUT_JSON}`)
  console.log('\nNext step: npm run db:seed:blog')
}

main().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})
