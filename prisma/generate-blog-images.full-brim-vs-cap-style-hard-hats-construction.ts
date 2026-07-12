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

const POST_SLUG = 'full-brim-vs-cap-style-hard-hats-construction'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.full-brim-vs-cap-style-hard-hats-construction.generated.json',
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
  'Style/medium: photorealistic editorial construction safety photography, practical B2B PPE buying tone, realistic hard hat shell and accessory details. ' +
  'Lighting/mood: natural daylight, credible, professional, field-oriented, clean industrial safety aesthetic. ' +
  'Color palette: concrete gray, steel blue, safety yellow, high-visibility orange, white helmets, matte black accessory details. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no distorted helmets, no unsafe tool use.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog hero image for full brim vs cap style hard hats buyer guide. ' +
      'Primary request: construction safety manager comparing full brim and cap style hard hats before approving a bulk PPE order. ' +
      'Scene/backdrop: active but controlled construction site with concrete, steel framing, and PPE procurement table in foreground. ' +
      'Subject: full brim hard hat and cap style hard hat clearly visible with face shield, earmuffs, chin strap, and blank clipboard. ' +
      'Composition/framing: 16:9 wide editorial hero, helmets in foreground, worker context softly behind, room for article crop. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-answer-full-brim-vs-cap-style-hard-hats',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: clear visual comparison of full brim and cap style construction hard hats without text labels. ' +
      'Scene/backdrop: clean jobsite safety table with concrete texture and blurred construction activity. ' +
      'Subject: one full brim hard hat and one cap style hard hat arranged side by side with safety glasses and gloves. ' +
      'Composition/framing: 4:3 practical product comparison for B2B construction buyers. ' +
      BASE_STYLE,
  },
  {
    key: 'what-full-brim-hard-hats-are-good-for',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: full brim hard hats for outdoor construction weather coverage, sun shade, and rain runoff. ' +
      'Scene/backdrop: outdoor construction site with bright daylight, controlled work zone, concrete and steel elements. ' +
      'Subject: worker wearing realistic full brim hard hat, hi-vis vest, safety glasses, and gloves. ' +
      'Composition/framing: 4:3 medium field scene with the all-around brim clearly visible. ' +
      BASE_STYLE,
  },
  {
    key: 'what-cap-style-hard-hats-are-good-for',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: cap style hard hats for accessory-heavy construction work. ' +
      'Scene/backdrop: jobsite PPE fitting station with blurred scaffolding and steel structure behind. ' +
      'Subject: cap style hard hat with compatible face shield bracket, earmuffs, headlamp, safety glasses, and gloves. ' +
      'Composition/framing: 4:3 close product-and-worker scene, accessories realistic and manufacturer-style, no labels. ' +
      BASE_STYLE,
  },
  {
    key: 'osha-ansi-type-and-class-still-come-first',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: construction head protection compliance review before choosing brim shape. ' +
      'Scene/backdrop: safety office table at construction site with hard hats, suspension systems, insulated gloves, and blank inspection sheets. ' +
      'Subject: safety manager inspecting hard hat shell and suspension while comparing full brim and cap style options. ' +
      'Composition/framing: 4:3 compliance and procurement review scene, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'full-brim-vs-cap-style-comparison-table',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: organized comparison table concept for full brim versus cap style hard hats without actual text. ' +
      'Scene/backdrop: clean warehouse PPE table with blank forms and hard hat samples. ' +
      'Subject: full brim and cap style hard hats arranged with face shield, earmuffs, chin strap, blank forms, and PPE samples. ' +
      'Composition/framing: 4:3 flat-lay procurement comparison, no readable labels or words. ' +
      BASE_STYLE,
  },
  {
    key: 'construction-scenarios-which-brim-style-fits',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: different construction scenarios needing different hard hat brim styles. ' +
      'Scene/backdrop: mixed construction environment with outdoor crew, accessory fitting station, and materials area in one believable scene. ' +
      'Subject: supervisor comparing full brim and cap style hard hats for different crews, with hi-vis clothing and safety glasses. ' +
      'Composition/framing: 4:3 documentary safety planning scene, realistic and organized. ' +
      BASE_STYLE,
  },
  {
    key: 'sun-rain-and-weather-exposure',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: hard hat brim style decision for sun, rain, and outdoor weather exposure. ' +
      'Scene/backdrop: outdoor construction site after light rain with safe, non-slippery work area and daylight clouds. ' +
      'Subject: full brim hard hat on PPE table with rain jacket, safety glasses, gloves, and hi-vis vest. ' +
      'Composition/framing: 4:3 weather-focused PPE planning scene, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'accessory-compatibility-face-shields-earmuffs-lights-and-chin-straps',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: accessory compatibility check for hard hats with face shields, earmuffs, lights, and chin straps. ' +
      'Scene/backdrop: organized PPE fitting table at construction safety office. ' +
      'Subject: cap style hard hat and full brim hard hat with face shield, helmet-mounted earmuffs, headlamp, chin strap, safety glasses, and respirator nearby. ' +
      'Composition/framing: 4:3 detailed accessory compatibility layout, no text. ' +
      BASE_STYLE,
  },
  {
    key: 'full-brim-cap-style-and-electrical-work',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: electrical class decision before choosing full brim or cap style hard hats. ' +
      'Scene/backdrop: controlled electrical construction context with temporary power equipment blurred safely in background. ' +
      'Subject: non-vented hard hat, insulated gloves, safety glasses, blank checklist, and two brim style samples on PPE table. ' +
      'Composition/framing: 4:3 safe electrical PPE procurement review, no readable signage or labels. ' +
      BASE_STYLE,
  },
  {
    key: 'bulk-buying-and-inventory-control',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: bulk hard hat buying and inventory control for contractor crews. ' +
      'Scene/backdrop: warehouse PPE inventory shelf with cartons, hard hats, replacement suspensions, accessories, and packing table. ' +
      'Subject: procurement manager sorting full brim and cap style hard hats into separate crew issue groups, no readable labels. ' +
      'Composition/framing: 4:3 organized B2B inventory planning scene. ' +
      BASE_STYLE,
  },
  {
    key: 'how-to-write-full-brim-or-cap-style-into-an-rfq',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: RFQ preparation for full brim and cap style hard hats with Type, Class, and accessories. ' +
      'Scene/backdrop: procurement desk at construction safety office with laptop screen blurred, blank forms, hard hats, and PPE samples. ' +
      'Subject: buyer comparing brim style samples, accessory parts, and replacement suspension before supplier request. ' +
      'Composition/framing: 4:3 B2B procurement planning scene, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'inspection-fit-and-replacement-checks',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: hard hat inspection, fit, suspension, and replacement checks for full brim and cap style shells. ' +
      'Scene/backdrop: jobsite PPE fitting station with safety glasses, gloves, face shield, earmuffs, and hard hat samples. ' +
      'Subject: safety manager inspecting inside of hard hat shell and suspension with worker nearby, no readable labels. ' +
      'Composition/framing: 4:3 practical field inspection scene, professional and safe. ' +
      BASE_STYLE,
  },
  {
    key: 'common-buying-mistakes',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: common buying mistakes when selecting full brim or cap style hard hats, including accessory mismatch and mixed inventory. ' +
      'Scene/backdrop: organized PPE storage area with hard hats, accessories, blank bin tags, and separated issue shelves. ' +
      'Subject: supervisor checking hard hats and accessories before crew issue, with no readable text. ' +
      'Composition/framing: 4:3 procurement mistake prevention scene. ' +
      BASE_STYLE,
  },
  {
    key: 'buyer-checklist',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: buyer checklist for choosing full brim or cap style hard hats for construction. ' +
      'Scene/backdrop: safety office table with full brim hard hat, cap style hard hat, blank checklist, safety glasses, gloves, chin strap, and earmuffs. ' +
      'Subject: organized PPE selection checklist scene without readable text. ' +
      'Composition/framing: 4:3 clean B2B buying guide visual, practical and credible. ' +
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
  console.log('\nNext step: npm run db:seed:blog -- --slug=full-brim-vs-cap-style-hard-hats-construction')
}

main().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})
