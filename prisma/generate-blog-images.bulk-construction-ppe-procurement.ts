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

const POST_SLUG = 'bulk-construction-ppe-procurement'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.bulk-construction-ppe-procurement.generated.json',
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
  'Style/medium: photorealistic editorial industrial photography, practical B2B procurement tone, realistic construction PPE and warehouse details. ' +
  'Lighting/mood: clean natural daylight mixed with soft warehouse light, professional and credible. ' +
  'Color palette: concrete gray, steel blue, safety yellow, high-visibility orange, cardboard brown. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no distorted PPE.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog hero image for a construction PPE bulk procurement guide. ' +
      'Primary request: wide hero scene showing a complete bulk construction PPE order being prepared for shipment. ' +
      'Scene/backdrop: industrial warehouse staging area beside an active construction site entrance. ' +
      'Subject: neatly grouped hard hats, safety glasses, work gloves, hi-vis vests, safety boots, ear protection, respirator boxes, and fall protection harnesses arranged beside labeled cardboard cartons and a procurement clipboard with unreadable marks. ' +
      'Composition/framing: 16:9 wide frame, PPE kits in the foreground, cartons and site context in the background, strong room for article title crop. ' +
      BASE_STYLE,
  },
  {
    key: 'start-with-a-site-ppe-scope-not-a-product-list',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: safety manager and procurement buyer planning a construction PPE scope before ordering. ' +
      'Scene/backdrop: jobsite meeting table with blueprint-style plans, sample PPE, blank checklist sheets, hard hats, gloves, safety glasses, and a high-vis vest. ' +
      'Subject: two professionals reviewing PPE samples by trade and work phase, no readable text. ' +
      'Composition/framing: 4:3 medium overhead angle with site plans and PPE categories clearly visible. ' +
      BASE_STYLE,
  },
  {
    key: 'build-the-baseline-construction-ppe-package',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: baseline construction PPE kit arranged for a new worker. ' +
      'Scene/backdrop: clean industrial bench with raw concrete texture. ' +
      'Subject: hard hat, clear safety glasses, coated work gloves, hi-vis vest, earplugs, and safety boots arranged as one site-entry PPE package. ' +
      'Composition/framing: 4:3 flat-lay product composition, organized and easy to understand. ' +
      BASE_STYLE,
  },
  {
    key: 'add-task-specific-ppe-by-trade-and-exposure',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: role-based PPE kits for different construction trades. ' +
      'Scene/backdrop: warehouse staging shelves or jobsite issue area. ' +
      'Subject: separate grouped PPE kits for roofing, concrete cutting, roadwork, electrical work, and welding, each with distinct gear types but no labels or readable text. ' +
      'Composition/framing: 4:3 organized grouped layout with multiple kits visible and differentiated by equipment. ' +
      BASE_STYLE,
  },
  {
    key: 'verify-standards-before-you-compare-prices',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: procurement team verifying PPE certification documents and product markings before price comparison. ' +
      'Scene/backdrop: safety office desk with PPE samples, certificates with blurred unreadable text, test report sheets, and a laptop with generic blurred spreadsheet. ' +
      'Subject: close-up hands inspecting helmet label, glove cuff, respirator box, and boot tag with documents nearby. ' +
      'Composition/framing: 4:3 close-up, paperwork and PPE equally important. ' +
      BASE_STYLE,
  },
  {
    key: 'account-for-the-2025-proper-fit-requirement',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: PPE size range planning for a mixed construction workforce. ' +
      'Scene/backdrop: warehouse issue table. ' +
      'Subject: multiple glove sizes, several safety boot sizes, different harness sizes, safety glasses with different frame shapes, and hi-vis garments folded by size with no readable labels. ' +
      'Composition/framing: 4:3 ordered product layout showing size variety and fit planning. ' +
      BASE_STYLE,
  },
  {
    key: 'compare-suppliers-on-more-than-unit-price',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: construction PPE supplier evaluation beyond unit price. ' +
      'Scene/backdrop: procurement meeting in industrial office connected to warehouse shelves. ' +
      'Subject: buyer comparing sample PPE, shipping cartons, certification documents, and supplier packaging options on a table. ' +
      'Composition/framing: 4:3 professional B2B procurement meeting scene, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'a-practical-bulk-ppe-request-for-quote-template',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: RFQ preparation for a bulk construction PPE order. ' +
      'Scene/backdrop: office desk with sample PPE and logistics planning materials. ' +
      'Subject: blank RFQ-style forms, calculator, laptop with blurred spreadsheet, hard hat, gloves, safety glasses, and carton samples. ' +
      'Composition/framing: 4:3 close-up of procurement workflow, forms visible but unreadable. ' +
      BASE_STYLE,
  },
  {
    key: 'bulk-construction-ppe-purchasing-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: final inspection checklist for a bulk construction PPE shipment. ' +
      'Scene/backdrop: warehouse receiving area with palletized PPE cartons and open boxes. ' +
      'Subject: supervisor checking a clipboard while PPE kits are sorted by category: helmets, vests, gloves, boots, eyewear, respirator boxes, and harnesses. ' +
      'Composition/framing: 4:3 documentary receiving inspection scene with clear PPE inventory. ' +
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
