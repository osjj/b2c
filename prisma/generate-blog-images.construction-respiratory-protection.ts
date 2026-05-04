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

const POST_SLUG = 'construction-respiratory-protection'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.construction-respiratory-protection.generated.json',
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
  'Style/medium: photorealistic editorial construction safety photography, practical B2B PPE buying tone, realistic dust and respirator details. ' +
  'Lighting/mood: natural daylight, credible, professional, field-oriented, serious but not dramatic. ' +
  'Color palette: concrete gray, steel blue, safety yellow, high-visibility orange, respirator charcoal, white dust. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no distorted respirators.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog hero image for construction respiratory protection. ' +
      'Primary request: construction worker wearing hard hat, safety glasses, hi-vis vest, gloves, and a properly fitted half-face respirator near concrete cutting dust. ' +
      'Scene/backdrop: active construction site with controlled dust, concrete saw, water suppression, and raw structure softly visible. ' +
      'Subject: respirator and full PPE compatibility are the clear focus. ' +
      'Composition/framing: 16:9 wide hero frame, worker in foreground with jobsite context behind, room for article crop. ' +
      BASE_STYLE,
  },
  {
    key: 'what-osha-requires-for-construction-respirators',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: safety manager reviewing respirator program items before construction dust work. ' +
      'Scene/backdrop: jobsite safety office table with respirator samples, blurred forms, fit-test supplies, and PPE. ' +
      'Subject: supervisor inspecting a half-face respirator and documentation with a worker nearby. ' +
      'Composition/framing: 4:3 medium close-up, respirator and program materials visible, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'the-main-airborne-hazards-on-construction-sites',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: realistic construction airborne hazards shown in one scene. ' +
      'Scene/backdrop: active construction site with concrete drilling dust, grinding area, drywall dust, and demolition debris in controlled zones. ' +
      'Subject: workers wearing appropriate respirators and eye protection around dust-generating tasks. ' +
      'Composition/framing: 4:3 documentary jobsite view with visible but controlled dust. ' +
      BASE_STYLE,
  },
  {
    key: 'n95-p100-half-face-full-face-and-papr-what-each-one-does',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: comparison lineup of construction respiratory protection types. ' +
      'Scene/backdrop: clean industrial workbench with concrete texture. ' +
      'Subject: N95-style filtering facepiece, reusable half-face respirator with P100 filters, full-face respirator, and PAPR hood or blower components arranged clearly. ' +
      'Composition/framing: 4:3 flat-lay product composition, organized and realistic. ' +
      BASE_STYLE,
  },
  {
    key: 'osha-silica-table-1-and-respirator-selection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: construction silica task planning with respirator selection. ' +
      'Scene/backdrop: safety planning table beside a concrete work area, with concrete saw, water hose, HEPA vacuum, respirators, and blurred control-method checklist. ' +
      'Subject: supervisor choosing respiratory protection based on silica task controls. ' +
      'Composition/framing: 4:3 close-up planning scene with tools and respirators visible. ' +
      BASE_STYLE,
  },
  {
    key: 'respirator-selection-by-construction-task',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: task-based respirator selection across construction roles. ' +
      'Scene/backdrop: split editorial composition showing concrete cutting, demolition cleanup, welding fume area, and coating application. ' +
      'Subject: different workers using respiratory PPE appropriate to each task. ' +
      'Composition/framing: 4:3 balanced multi-scene composition with respirators clearly visible. ' +
      BASE_STYLE,
  },
  {
    key: 'fit-testing-medical-evaluation-and-training',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: respirator fit testing and training for a construction worker. ' +
      'Scene/backdrop: jobsite safety room or quiet corner with fit-test hood, half-face respirator, sample filters, and PPE. ' +
      'Subject: competent person coaching worker on respirator fit and seal check. ' +
      'Composition/framing: 4:3 medium close-up, fit process visible, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'compatibility-with-other-construction-ppe',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: respirator compatibility planning with other construction PPE. ' +
      'Scene/backdrop: clean jobsite PPE table beside a concrete wall. ' +
      'Subject: half-face respirator, sealed safety goggles, hard hat, earmuffs, gloves, and hi-vis vest arranged as a complete construction PPE set. ' +
      'Composition/framing: 4:3 organized flat-lay scene showing how the PPE items fit together, no people. ' +
      BASE_STYLE,
  },
  {
    key: 'filter-and-cartridge-replacement-planning',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: bulk respirator filters and cartridge replacement planning for construction crews. ' +
      'Scene/backdrop: warehouse PPE shelf with bins and cartons. ' +
      'Subject: reusable respirators, P100 filters, organic vapor cartridges, storage bags, cleaning wipes, and replacement parts arranged for site distribution. ' +
      'Composition/framing: 4:3 organized inventory scene, no readable labels. ' +
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
    }),
  )
  return `${R2_PUBLIC_URL}/${r2Key}`
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
  await writeFile(OUTPUT_JSON, JSON.stringify(map, null, 2) + '\n', 'utf8')
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
