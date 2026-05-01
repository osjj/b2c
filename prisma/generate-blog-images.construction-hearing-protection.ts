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

const POST_SLUG = 'construction-hearing-protection'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.construction-hearing-protection.generated.json',
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
  'Style/medium: photorealistic editorial construction safety photography, practical B2B PPE buying tone, realistic equipment and worker details. ' +
  'Lighting/mood: natural daylight, credible, professional, field-oriented. ' +
  'Color palette: concrete gray, steel blue, safety yellow, high-visibility orange, black hearing protectors. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no distorted PPE.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog hero image for construction hearing protection. ' +
      'Primary request: construction worker wearing hard hat, safety glasses, hi-vis vest, and visible earmuffs while working near noisy equipment. ' +
      'Scene/backdrop: active construction site with concrete saw, compressor, and raw structure softly visible in the background. ' +
      'Subject: hearing protection is the clear focus, with full PPE compatibility visible. ' +
      'Composition/framing: 16:9 wide hero frame, worker in foreground, noisy tools and jobsite context behind, room for article crop. ' +
      BASE_STYLE,
  },
  {
    key: 'what-osha-requires-for-construction-noise-and-hearing-protection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: safety supervisor checking hearing protection and noise exposure setup on a construction site. ' +
      'Scene/backdrop: jobsite with a portable sound level meter, clipboard with unreadable notes, hard hats, earplugs, and earmuffs. ' +
      'Subject: supervisor and worker reviewing hearing PPE before noisy work begins. ' +
      'Composition/framing: 4:3 medium close-up, sound meter and hearing PPE visible, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'common-construction-noise-sources',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: realistic construction noise sources in one scene. ' +
      'Scene/backdrop: active construction area with concrete saw, grinder, compressor, generator, and heavy equipment in background. ' +
      'Subject: workers wearing hearing protection around noisy tools, no dramatic hazards. ' +
      'Composition/framing: 4:3 documentary jobsite view with layered sources of noise. ' +
      BASE_STYLE,
  },
  {
    key: 'earplugs-earmuffs-canal-caps-and-communication-headsets',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: comparison lineup of hearing protection types for construction. ' +
      'Scene/backdrop: clean industrial workbench with concrete texture. ' +
      'Subject: foam earplugs, reusable pre-molded earplugs, banded canal caps, standard earmuffs, helmet-mounted earmuffs, and communication headset arranged clearly. ' +
      'Composition/framing: 4:3 flat-lay product composition, organized and realistic. ' +
      BASE_STYLE,
  },
  {
    key: 'how-to-choose-the-right-nrr-or-snr',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: PPE buyer comparing hearing protection attenuation choices. ' +
      'Scene/backdrop: safety office desk with several hearing protector samples, blurred spec sheets, calculator, and noise measurement device. ' +
      'Subject: hands comparing earplugs and earmuffs with documents visible but unreadable. ' +
      'Composition/framing: 4:3 close-up procurement evaluation scene. ' +
      BASE_STYLE,
  },
  {
    key: 'fit-matters-more-than-the-package-rating',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: competent person coaching a construction worker on proper earplug insertion and earmuff seal. ' +
      'Scene/backdrop: quiet corner of construction site near PPE station. ' +
      'Subject: close-up of worker fitting foam earplug correctly while earmuffs and hard hat sit nearby. ' +
      'Composition/framing: 4:3 medium close-up focused on ear, hand position, and hearing protector fit. ' +
      BASE_STYLE,
  },
  {
    key: 'compatibility-with-other-construction-ppe',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: hearing protection worn together with hard hat, safety glasses, respirator, and face shield options. ' +
      'Scene/backdrop: construction PPE fitting station. ' +
      'Subject: worker checking whether earmuffs seal correctly while wearing safety glasses and hard hat; other compatible PPE on table. ' +
      'Composition/framing: 4:3 practical fit-check scene with clear PPE interaction. ' +
      BASE_STYLE,
  },
  {
    key: 'hearing-protection-by-construction-task',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: task-based hearing protection across construction roles. ' +
      'Scene/backdrop: split editorial composition showing concrete cutting, roadwork, demolition, and equipment maintenance. ' +
      'Subject: different workers using earplugs, earmuffs, and helmet-mounted muffs appropriate to each task. ' +
      'Composition/framing: 4:3 balanced multi-scene composition with hearing PPE clearly visible. ' +
      BASE_STYLE,
  },
  {
    key: 'bulk-purchasing-and-replacement-planning',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: bulk hearing protection stock and replacement planning for construction crews. ' +
      'Scene/backdrop: warehouse PPE issue shelf with cartons and bins. ' +
      'Subject: boxes of foam earplugs, reusable earplugs in cases, earmuffs, replacement cushions, and helmet-mounted muffs arranged for site distribution. ' +
      'Composition/framing: 4:3 organized warehouse inventory scene, no readable labels. ' +
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
