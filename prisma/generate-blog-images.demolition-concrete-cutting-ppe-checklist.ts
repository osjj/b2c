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

const POST_SLUG = 'demolition-concrete-cutting-ppe-checklist'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.demolition-concrete-cutting-ppe-checklist.generated.json',
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
  'Style/medium: photorealistic editorial construction safety photography, practical B2B PPE checklist tone, realistic demolition and concrete cutting details. ' +
  'Lighting/mood: natural daylight, credible, professional, field-oriented, serious but not dramatic. ' +
  'Color palette: concrete gray, steel blue, safety yellow, high-visibility orange, respirator charcoal, white dust, clean safety barriers. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no blood, no unsafe tool handling, no distorted PPE.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog hero image for a demolition and concrete cutting PPE checklist. ' +
      'Primary request: construction crew prepared for demolition and concrete cutting, wearing hard hats or safety helmets, sealed eye protection, face shields, respirators, hearing protection, gloves, boots, and high-visibility clothing. ' +
      'Scene/backdrop: controlled demolition work zone with concrete saw, water suppression hose, HEPA vacuum, barriers, debris pile, and raw concrete structure softly visible. ' +
      'Subject: complete PPE readiness before work starts, with a supervisor holding a blank checklist board with no readable text. ' +
      'Composition/framing: 16:9 wide hero frame, crew and PPE in foreground with jobsite context behind, room for article crop. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-ppe-checklist-before-demolition-starts',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for a quick PPE checklist. ' +
      'Primary request: pre-task demolition PPE layout showing respirator, sealed goggles, face shield, hard hat, earmuffs, cut-resistant gloves, safety boots, and high-visibility vest. ' +
      'Scene/backdrop: clean staging table at the edge of a concrete demolition zone with cones and dust-control equipment in the background. ' +
      'Subject: organized PPE kit before crews enter the work area. ' +
      'Composition/framing: 4:3 organized flat-lay with realistic PPE, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'why-demolition-ppe-needs-its-own-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: realistic demolition environment showing mixed hazards that need a dedicated PPE checklist. ' +
      'Scene/backdrop: interior renovation demolition area with broken concrete, rebar, dust-control mist, falling-object protection zone, and noise-control signs blurred beyond readability. ' +
      'Subject: worker wearing full PPE while a supervisor checks the work zone from a safe distance. ' +
      'Composition/framing: 4:3 documentary jobsite view with controlled dust and layered hazards visible. ' +
      BASE_STYLE,
  },
  {
    key: 'section-1-pre-demolition-hazard-review',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: pre-demolition hazard review before concrete cutting starts. ' +
      'Scene/backdrop: jobsite planning table beside a cordoned demolition area, with blank permit sheet, concrete core sample, tape measure, respirator, goggles, and hearing protection. ' +
      'Subject: safety manager and foreman pointing at an unreadable plan while reviewing hazards. ' +
      'Composition/framing: 4:3 medium close-up, planning materials and PPE visible, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'section-2-respiratory-protection-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: respiratory protection checklist for silica dust during concrete cutting. ' +
      'Scene/backdrop: controlled concrete cutting setup with water suppression, HEPA vacuum, saw on the ground, and dust containment barriers. ' +
      'Subject: worker performing a respirator seal check while wearing hard hat, sealed goggles, gloves, and hi-vis clothing. ' +
      'Composition/framing: 4:3 medium close-up focused on respirator fit and dust-control equipment. ' +
      BASE_STYLE,
  },
  {
    key: 'section-3-eye-and-face-protection-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: eye and face protection for demolition chips, dust, and concrete cutting slurry. ' +
      'Scene/backdrop: worker near a staged concrete cutting area with controlled debris and water spray, not actively cutting. ' +
      'Subject: sealed safety goggles under a clear face shield, hard hat, respirator, and hearing protection clearly visible. ' +
      'Composition/framing: 4:3 close-up portrait with PPE compatibility as the focus. ' +
      BASE_STYLE,
  },
  {
    key: 'section-4-hearing-protection-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: hearing protection checklist for demolition hammers and concrete saws. ' +
      'Scene/backdrop: demolition staging area with jackhammer and concrete saw parked safely, barriers and raw concrete structure behind. ' +
      'Subject: worker wearing hard hat mounted earmuffs and additional PPE while checking equipment before noisy work. ' +
      'Composition/framing: 4:3 medium shot with earmuffs, saw, and jackhammer visible. ' +
      BASE_STYLE,
  },
  {
    key: 'section-5-hand-protection-checklist',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: hand protection checklist for demolition cleanup, rebar, concrete edges, and tool vibration. ' +
      'Scene/backdrop: concrete slab staging table with rebar pieces, masonry fragments, and tools arranged safely. ' +
      'Subject: cut-resistant impact work gloves, nitrile-coated gloves, and heavy-duty leather gloves shown as realistic options. ' +
      'Composition/framing: 4:3 product flat-lay with glove types clearly separated, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'section-6-foot-protection-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: foot protection checklist for demolition and concrete cutting sites. ' +
      'Scene/backdrop: dusty concrete work zone with rebar, rubble, wet slurry, and toe-impact risks staged safely. ' +
      'Subject: worker wearing steel-toe or composite-toe safety boots with puncture-resistant midsoles, trousers, and high-visibility clothing. ' +
      'Composition/framing: 4:3 low-angle close-up of boots in realistic demolition terrain. ' +
      BASE_STYLE,
  },
  {
    key: 'section-7-head-protection-hi-vis-and-body-protection-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: head protection, high-visibility clothing, and body protection for demolition crews. ' +
      'Scene/backdrop: controlled demolition access zone with machinery silhouette, concrete columns, and safety barriers. ' +
      'Subject: worker wearing safety helmet or hard hat, hi-vis vest, long-sleeve protective workwear, respirator, goggles, and gloves. ' +
      'Composition/framing: 4:3 full-body jobsite portrait showing visibility and falling-object readiness. ' +
      BASE_STYLE,
  },
  {
    key: 'section-8-fall-protection-and-access-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: fall protection and access PPE for demolition near edges and elevated platforms. ' +
      'Scene/backdrop: scaffold or elevated platform beside a partially demolished concrete structure, with guardrails and safe tie-off points. ' +
      'Subject: worker wearing full body harness, helmet, hi-vis clothing, gloves, and safety boots while inspecting access before work. ' +
      'Composition/framing: 4:3 medium-wide view, harness and access controls visible, no unsafe posture. ' +
      BASE_STYLE,
  },
  {
    key: 'task-based-demolition-ppe-matrix',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for a task-based PPE matrix. ' +
      'Primary request: visual comparison of demolition tasks and matching PPE sets. ' +
      'Scene/backdrop: editorial multi-zone construction scene showing concrete cutting, chipping, debris cleanup, and elevated demolition preparation. ' +
      'Subject: workers in each zone wearing task-appropriate respirators, eye and face protection, hearing protection, gloves, boots, helmets, hi-vis, and harness where needed. ' +
      'Composition/framing: 4:3 balanced multi-scene composition without readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'procurement-checklist-for-demolition-ppe',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for bulk procurement planning. ' +
      'Primary request: demolition PPE procurement staging for multiple crews. ' +
      'Scene/backdrop: warehouse shelf and jobsite dispatch table with cartons, PPE bins, safety helmets, respirators, goggles, face shields, earmuffs, gloves, boots, hi-vis vests, and harnesses. ' +
      'Subject: procurement manager checking organized PPE kits before dispatch, with blank labels only. ' +
      'Composition/framing: 4:3 organized inventory scene, no readable labels or logos. ' +
      BASE_STYLE,
  },
  {
    key: 'common-demolition-ppe-mistakes',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for common demolition PPE mistakes. ' +
      'Primary request: safe training scene showing a supervisor correcting common PPE compatibility issues before demolition work starts. ' +
      'Scene/backdrop: jobsite PPE check area beside a concrete demolition zone, with respirator, goggles, face shield, earmuffs, gloves, boots, and hi-vis clothing visible. ' +
      'Subject: supervisor pointing to mismatched PPE on a staging table, workers nearby wearing corrected complete PPE, no active cutting. ' +
      'Composition/framing: 4:3 practical safety training scene, no readable text, no injuries, no unsafe work in progress. ' +
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
