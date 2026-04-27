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

const POST_SLUG = 'construction-eye-face-protection'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.construction-eye-face-protection.generated.json',
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

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog hero image. ' +
      'Primary request: editorial construction PPE photograph focused on eye and face protection. ' +
      'Scene/backdrop: active commercial construction site with cutting, grinding, and structural materials in soft background. ' +
      'Subject: close-up of a construction worker wearing modern safety glasses and face PPE while performing a jobsite task. ' +
      'Style/medium: documentary photography, realistic, industrial magazine quality. ' +
      'Composition/framing: wide 16:9 frame with eye PPE clearly visible and enough contextual jobsite depth. ' +
      'Lighting/mood: natural daylight, practical, authoritative. ' +
      'Color palette: concrete gray, safety yellow, steel blue, muted orange sparks. ' +
      'Constraints: no text, no logos, no watermark.',
  },
  {
    key: 'what-osha-requires-for-construction-eye-and-face-protection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section illustration. ' +
      'Primary request: construction safety supervisor checking worker eye protection before task start. ' +
      'Scene/backdrop: U.S. construction site with clipboard, hard hats, and work activity around. ' +
      'Subject: supervisor inspecting properly fitted safety glasses or goggles on a worker. ' +
      'Style/medium: editorial documentary photograph. ' +
      'Composition/framing: 4:3 medium shot centered on the face and protective eyewear. ' +
      'Lighting/mood: professional, compliance-focused daylight. ' +
      'Constraints: no text, no logos, no watermark.',
  },
  {
    key: 'the-main-eye-and-face-hazards-on-construction-sites',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section illustration. ' +
      'Primary request: realistic construction eye and face hazards shown in one scene. ' +
      'Scene/backdrop: active jobsite with grinding sparks, airborne dust, chips, and face-level work environment. ' +
      'Subject: worker with visible eye protection in a high-debris construction setting. ' +
      'Style/medium: gritty documentary photography. ' +
      'Composition/framing: close-up 4:3 frame showing hazard texture and protective gear clearly. ' +
      'Lighting/mood: serious, practical, realistic. ' +
      'Constraints: no injuries, no gore, no text, no logos.',
  },
  {
    key: 'safety-glasses-goggles-face-shields-and-welding-helmets-what-each-one-actually-does',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section illustration. ' +
      'Primary request: comparison layout of construction eye and face protection categories. ' +
      'Scene/backdrop: clean industrial workbench with neutral workshop background. ' +
      'Subject: safety glasses, sealed goggles, clear face shield, and welding helmet arranged for comparison. ' +
      'Style/medium: editorial product photography. ' +
      'Composition/framing: 4:3 overhead and slight-angle composition, crisp material detail. ' +
      'Lighting/mood: clean, technical, professional. ' +
      'Constraints: no text, no brand marks, no watermark.',
  },
  {
    key: 'what-to-choose-by-construction-task',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section illustration. ' +
      'Primary request: task-based construction eye PPE selection across multiple roles. ' +
      'Scene/backdrop: split editorial composition across grinding, masonry, chemical handling, and welding tasks. ' +
      'Subject: different workers using the correct eye and face protection for each task. ' +
      'Style/medium: realistic documentary collage-style photograph. ' +
      'Composition/framing: 4:3 balanced multi-scene layout with PPE clearly visible. ' +
      'Lighting/mood: practical, field-oriented, realistic. ' +
      'Constraints: no text, no logos, no watermark.',
  },
  {
    key: 'face-shield-use-the-point-many-sites-get-wrong',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section illustration. ' +
      'Primary request: construction worker using a clear face shield over primary eye protection during debris-heavy task. ' +
      'Scene/backdrop: grinding or chipping setup on a construction site. ' +
      'Subject: face shield plus safety glasses visible together, demonstrating layered protection. ' +
      'Style/medium: documentary safety photograph. ' +
      'Composition/framing: 4:3 medium close-up emphasizing both shield and glasses. ' +
      'Lighting/mood: instructive, realistic, not staged. ' +
      'Constraints: no text, no logos, no watermark.',
  },
  {
    key: 'common-buying-mistakes-in-construction-eye-and-face-protection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section illustration. ' +
      'Primary request: contrast between scratched worn-out eye PPE and proper task-ready eye protection on a construction bench. ' +
      'Scene/backdrop: gang box or dusty site bench with tools nearby. ' +
      'Subject: damaged scratched glasses and mismatched gear beside correct construction eye PPE options. ' +
      'Style/medium: editorial still-life photography. ' +
      'Composition/framing: 4:3 close-up with strong texture contrast. ' +
      'Lighting/mood: cautionary, practical, realistic. ' +
      'Constraints: no text, no logos, no watermark.',
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
