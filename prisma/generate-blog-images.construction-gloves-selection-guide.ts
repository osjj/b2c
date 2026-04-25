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

const POST_SLUG = 'construction-gloves-selection-guide'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.construction-gloves-selection-guide.generated.json',
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
      'Primary request: editorial construction PPE photograph focused on hand protection. ' +
      'Scene/backdrop: active commercial construction site with raw concrete, timber framing, rebar, and muted safety-yellow accents. ' +
      'Subject: close-up of a worker wearing modern protective construction gloves while gripping rough building material. ' +
      'Style/medium: documentary photography, magazine quality, highly realistic. ' +
      'Composition/framing: wide 16:9 frame with strong foreground hands and shallow-background jobsite context. ' +
      'Lighting/mood: natural directional daylight, authoritative and practical. ' +
      'Color palette: concrete gray, workwear tan, safety yellow, steel blue. ' +
      'Constraints: no text, no logos, no watermark, no brand marks.',
  },
  {
    key: 'what-osha-requires-for-construction-gloves',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section illustration. ' +
      'Primary request: construction supervisor checking worker hand PPE before task start. ' +
      'Scene/backdrop: U.S. construction site with clipboard, framing, and PPE context. ' +
      'Subject: safety manager inspecting properly fitted work gloves on a construction worker. ' +
      'Style/medium: editorial documentary photograph. ' +
      'Composition/framing: medium shot, 4:3, hands and gloves clearly visible. ' +
      'Lighting/mood: natural daylight, compliance-focused and professional. ' +
      'Constraints: no text, no logos, no watermark.',
  },
  {
    key: 'the-main-glove-hazards-on-construction-sites',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section illustration. ' +
      'Primary request: construction hand hazards shown in one realistic scene. ' +
      'Scene/backdrop: busy jobsite surface with rebar, sheet metal edge, dusty concrete, wet area, and tools. ' +
      'Subject: gloved worker hands navigating rough, sharp, and wet construction materials. ' +
      'Style/medium: high-detail documentary photography. ' +
      'Composition/framing: close-up 4:3 frame with strong texture and layered hazards. ' +
      'Lighting/mood: gritty daylight, practical and serious. ' +
      'Constraints: no injuries, no gore, no text, no logos.',
  },
  {
    key: 'the-main-types-of-construction-gloves',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section illustration. ' +
      'Primary request: comparison lineup of construction glove categories. ' +
      'Scene/backdrop: clean workshop bench with neutral industrial background. ' +
      'Subject: arranged gloves including coated knit, cut-resistant, impact, leather, chemical-resistant, and welding glove styles. ' +
      'Style/medium: editorial product photography. ' +
      'Composition/framing: overhead 4:3 layout, evenly spaced, tactile material detail visible. ' +
      'Lighting/mood: soft studio lighting, professional catalog feel. ' +
      'Constraints: no text, no packaging, no logos, no watermark.',
  },
  {
    key: 'how-to-read-construction-glove-labels-and-standards',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section illustration. ' +
      'Primary request: buyer examining construction glove specifications before purchase. ' +
      'Scene/backdrop: industrial purchasing or safety office with gloves and sample cards on table. ' +
      'Subject: hands comparing glove tags and material details, with labels out of readable focus. ' +
      'Style/medium: editorial close-up photograph. ' +
      'Composition/framing: 4:3 macro-medium composition centered on glove cuff and material texture. ' +
      'Lighting/mood: clear, analytical, professional. ' +
      'Constraints: no readable text, no logos, no watermark.',
  },
  {
    key: 'glove-materials-and-coatings-what-they-usually-do-well',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section illustration. ' +
      'Primary request: material and coating differences across construction gloves. ' +
      'Scene/backdrop: workshop tabletop with industrial lighting. ' +
      'Subject: close-up arrangement of nitrile-coated gloves, leather gloves, cut-liner gloves, and chemical gloves showing palm textures and cuff builds. ' +
      'Style/medium: high-detail editorial product photograph. ' +
      'Composition/framing: 4:3 top-down and angled mix, emphasizing surface textures. ' +
      'Lighting/mood: crisp, informative, realistic. ' +
      'Constraints: no text, no logos, no watermark.',
  },
  {
    key: 'how-to-choose-gloves-by-construction-task',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section illustration. ' +
      'Primary request: task-based glove selection across multiple construction roles. ' +
      'Scene/backdrop: split editorial composition across roofing, masonry, rebar, and welding environments. ' +
      'Subject: different workers using glove types appropriate to each task. ' +
      'Style/medium: documentary collage-style photography. ' +
      'Composition/framing: 4:3 balanced multi-scene composition with clear glove visibility. ' +
      'Lighting/mood: realistic, practical, field-oriented. ' +
      'Constraints: no text, no logos, no watermark.',
  },
  {
    key: 'common-glove-buying-mistakes-on-construction-sites',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section illustration. ' +
      'Primary request: contrast between worn-out wrong gloves and appropriate task-ready gloves on a construction bench. ' +
      'Scene/backdrop: gang box or site bench with tools and dusty work surface. ' +
      'Subject: damaged overused glove beside suitable replacement gloves for different job hazards. ' +
      'Style/medium: editorial still-life photograph. ' +
      'Composition/framing: 4:3 close-up with strong texture and contrast. ' +
      'Lighting/mood: cautionary, realistic, no dramatization. ' +
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
