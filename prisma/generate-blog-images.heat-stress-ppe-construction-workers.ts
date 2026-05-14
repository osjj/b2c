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

const POST_SLUG = 'heat-stress-ppe-construction-workers'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.heat-stress-ppe-construction-workers.generated.json',
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
  'Style/medium: photorealistic editorial construction safety photography, practical B2B PPE hot-weather planning tone, realistic PPE and construction details. ' +
  'Lighting/mood: bright natural summer daylight, credible, professional, field-oriented, serious but not dramatic. ' +
  'Color palette: high-visibility lime, safety orange, reflective silver, concrete gray, asphalt black, steel blue, sunlit tan dust, clean white helmets. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no heat illness victim scene, no unsafe tool handling, no distorted PPE.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog hero image for heat stress PPE for construction workers. ' +
      'Primary request: construction crew prepared for hot-weather work, wearing breathable high-visibility clothing, vented safety helmets, safety glasses, gloves, and safety boots, with hydration cooler and shade tent nearby. ' +
      'Scene/backdrop: active but controlled summer construction site with concrete structure, cones, equipment, sun exposure, and a shaded rest station. ' +
      'Subject: heat-ready PPE and site heat controls working together. ' +
      'Composition/framing: 16:9 wide hero frame, PPE and workers in foreground with shade and construction context behind, room for article crop. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-heat-stress-ppe-checklist-for-construction',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image for a quick heat stress PPE checklist. ' +
      'Primary request: organized hot-weather construction PPE kit with breathable hi-vis shirt, cooling towel, vented helmet, safety glasses, sunscreen tube with blank label, gloves, safety boots, water bottles, electrolyte packets without readable text, and first-aid cooling supplies. ' +
      'Scene/backdrop: clean jobsite table under a shade canopy with construction equipment softly visible behind. ' +
      'Subject: complete summer PPE kit before crews start work. ' +
      'Composition/framing: 4:3 organized flat-lay, realistic gear, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: '2026-osha-heat-enforcement-context',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for OSHA heat enforcement context. ' +
      'Primary request: construction safety manager reviewing hot-weather PPE and heat controls with a foreman at a shaded jobsite planning table, with blank inspection forms, thermometer, water cooler, helmets, and hi-vis garments visible. ' +
      'Scene/backdrop: sunny construction project with shade tent, hydration station, cones, and workers in PPE nearby. ' +
      'Subject: heat enforcement readiness and documented planning without readable text. ' +
      'Composition/framing: 4:3 medium jobsite planning scene, compliance concept clear but no readable forms. ' +
      BASE_STYLE,
  },
  {
    key: 'breathable-high-visibility-clothing-for-hot-weather',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for breathable high-visibility clothing in hot weather. ' +
      'Primary request: construction workers wearing lightweight hi-vis long-sleeve shirts, reflective tape, vented helmets, safety glasses, gloves, and boots while working near equipment in bright sun. ' +
      'Scene/backdrop: road or building construction site with asphalt, concrete, cones, and heat shimmer suggested subtly. ' +
      'Subject: breathable coverage, visibility, and sun protection. ' +
      'Composition/framing: 4:3 documentary scene with fabric texture, reflective tape, and airflow-friendly garment fit visible. ' +
      BASE_STYLE,
  },
  {
    key: 'head-face-and-sun-protection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for head, face, and sun protection. ' +
      'Primary request: close jobsite portrait of a worker wearing a vented safety helmet with brim shade, neck shade flap, clear safety glasses, light face covering, hearing protection nearby, gloves, and hi-vis shirt. ' +
      'Scene/backdrop: sunny construction area with shade station and concrete structure softly blurred. ' +
      'Subject: PPE compatibility for sun, sweat, eye protection, and head protection. ' +
      'Composition/framing: 4:3 medium close-up focused on helmet, face, eyewear, and sun protection details. ' +
      BASE_STYLE,
  },
  {
    key: 'cooling-ppe-vests-towels-and-shade-kits',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image for cooling PPE, vests, towels, and shade kits. ' +
      'Primary request: cooling vest, cooling towels, insulated water cooler, ice packs, spray bottle, folding shade canopy, safety helmets, and hi-vis garments staged for a construction crew. ' +
      'Scene/backdrop: shaded rest area beside an active construction site with gravel, cones, and equipment in the distance. ' +
      'Subject: cooling PPE logistics and recharging setup. ' +
      'Composition/framing: 4:3 organized equipment staging scene, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'water-rest-shade-and-acclimatization',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for water, rest, shade, and acclimatization. ' +
      'Primary request: construction crew taking a planned shaded rest break with water cooler, individual bottles, vented helmets set safely aside, hi-vis clothing, and supervisor checking on the crew. ' +
      'Scene/backdrop: shade canopy at the edge of a sunny construction site, with equipment and concrete work area visible beyond. ' +
      'Subject: planned heat controls without emergency or injury scene. ' +
      'Composition/framing: 4:3 credible rest station scene, calm and practical, no readable signage. ' +
      BASE_STYLE,
  },
  {
    key: 'respiratory-protection-and-heat-burden',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for respiratory protection and heat burden. ' +
      'Primary request: worker in hot-weather construction PPE performing a respirator seal check before dusty concrete work, with half-mask respirator, sealed safety glasses, vented helmet, hi-vis shirt, gloves, water cooler, and shade nearby. ' +
      'Scene/backdrop: controlled silica dust work area with water suppression and HEPA vacuum equipment staged safely. ' +
      'Subject: respirator fit and heat planning together. ' +
      'Composition/framing: 4:3 medium close-up focused on respirator, eyewear, helmet, and heat controls. ' +
      BASE_STYLE,
  },
  {
    key: 'heat-illness-symptoms-and-emergency-readiness',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for heat illness symptoms and emergency readiness. ' +
      'Primary request: safe training scene with construction supervisor reviewing emergency cooling supplies at a shaded first-aid station, including water, cooling towels, ice packs, radio, blank checklist board, and PPE kit. ' +
      'Scene/backdrop: construction site access area with shade, clear walkway, and equipment in the background. ' +
      'Subject: early response readiness without showing a sick or injured worker. ' +
      'Composition/framing: 4:3 practical safety training scene, no readable text, no distress scene. ' +
      BASE_STYLE,
  },
  {
    key: 'procurement-checklist-for-heat-stress-ppe',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for heat stress PPE procurement. ' +
      'Primary request: warehouse dispatch table with summer construction PPE kits staged in bins: breathable hi-vis shirts, cooling towels, vented helmets, safety glasses, gloves, safety boots, hydration bottles, sunscreen with blank labels, and replacement stock. ' +
      'Scene/backdrop: construction supplier warehouse with cartons, shelves, and jobsite PPE inventory. ' +
      'Subject: bulk procurement and site issue for hot-weather PPE kits. ' +
      'Composition/framing: 4:3 organized inventory scene, no readable labels or logos. ' +
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
