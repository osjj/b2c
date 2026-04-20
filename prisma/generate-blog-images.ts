/**
 * Generate AI illustrations for the construction safety footwear blog post.
 *
 * Flow:
 *   1. For each image key below, call the nano-banana third-party AI service
 *   2. Download the generated image
 *   3. Upload to Cloudflare R2 under `blog/<slug>/<key>-<ts>.webp`
 *   4. Write the final URL map to `prisma/blog-images.generated.json`
 *
 * `seed-blog.ts` reads that JSON (if present) to set hero + section images.
 *
 * Re-run safe: existing keys in the JSON are preserved unless `--force` is passed.
 * Pass `--key=<key1,key2>` to regenerate specific keys only.
 *
 *   npm run db:gen:blog-images
 *   npm run db:gen:blog-images -- --force
 *   npm run db:gen:blog-images -- --key=hero,foot-hazards
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

// ---------- Config ----------

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

const POST_SLUG = 'construction-safety-footwear-guide'
const OUTPUT_JSON = path.join(__dirname, 'blog-images.generated.json')

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

// ---------- Prompt plan ----------

// Keys match slugified H2 titles from seed-blog.ts SECTION_IMAGES mapping.
// Each prompt is optimised for a documentary-photography feel, no text overlays,
// and an aspect ratio that matches where the image will be shown on the page.

interface ImagePlan {
  key: string
  aspect: '16:9' | '4:3' | '3:2'
  prompt: string
}

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Professional editorial photograph, 16:9 wide format, cinematic lighting. ' +
      'Close-up of heavy-duty construction safety boots with steel toe caps on a ' +
      'rugged construction site floor, rebar and concrete dust in shallow background. ' +
      'Industrial, authoritative, magazine-style, muted earthy palette of steel grey, ' +
      'ochre and safety yellow. No text, no logos, no watermarks. High detail, realistic.',
  },
  {
    key: 'foot-hazards-on-a-construction-site',
    aspect: '4:3',
    prompt:
      'Documentary photograph, 4:3 format. Active construction site wide shot at golden hour: ' +
      'scattered nails and rebar on a concrete floor, a worker in PPE walking carefully, ' +
      'falling objects hazard, sharp edges and wet surfaces visible. Realistic, gritty, ' +
      'with subtle caution-tape yellow accents. No text or logos.',
  },
  {
    key: 'osha-safety-footwear-requirements-for-construction',
    aspect: '4:3',
    prompt:
      'Documentary 4:3 photograph of a US construction safety officer in hi-vis vest and ' +
      'hardhat inspecting a new worker\'s safety boots on site. Compliance clipboard in ' +
      'hand, serious and professional atmosphere. Neutral natural lighting, American ' +
      'jobsite backdrop (wood framing, concrete). No text or logos.',
  },
  {
    key: 'understanding-astm-f2413-the-us-safety-footwear-standard',
    aspect: '4:3',
    prompt:
      'Clean studio product photograph, 4:3. Single rugged work boot on a neutral grey ' +
      'backdrop, side profile, dramatic soft lighting emphasising the toe cap, heel and ' +
      'sole tread. Subtle embossed markings on the boot. Industrial editorial style. ' +
      'No text, no labels, no logos.',
  },
  {
    key: 'understanding-en-iso-20345-the-european-safety-footwear-standard',
    aspect: '4:3',
    prompt:
      'Editorial 4:3 photograph. European construction worker lacing up a high-ankle ' +
      'safety boot, hands in focus, bench setting, cool overcast daylight. Scandinavian ' +
      'workshop aesthetic, minimalist, authentic. Neutral palette, no text or logos.',
  },
  {
    key: 'steel-toe-vs-composite-toe-vs-aluminium-toe-which-to-choose',
    aspect: '4:3',
    prompt:
      'Flat-lay product comparison photograph, 4:3. Three work boots side by side on a ' +
      'dark walnut workshop bench: one with a steel toe cap, one with a composite toe ' +
      '(visible fibre texture), one with aluminium toe (silvery sheen). Overhead soft ' +
      'studio light, clean and editorial. No text or labels.',
  },
  {
    key: 'matching-safety-footwear-to-construction-sub-trades',
    aspect: '4:3',
    prompt:
      'Editorial 4:3 collage-style photograph showing three construction sub-trade workers ' +
      'from the boots-up: an electrician on a ladder, a scaffolder on scaffold planks, ' +
      'and a concrete worker in wet concrete boots. Realistic jobsite lighting, ' +
      'authentic textures. No text or logos.',
  },
  {
    key: 'how-to-read-the-boot-label-a-practical-checklist',
    aspect: '4:3',
    prompt:
      'Macro close-up photograph, 4:3. Hands in cotton gloves holding a rugged safety ' +
      'boot and pointing at the interior tongue label (label blurred, no readable text). ' +
      'Warm workshop lighting, shallow depth of field, editorial documentary feel. ' +
      'No text or branded logos visible.',
  },
  {
    key: 'common-mistakes-in-construction-safety-footwear-selection',
    aspect: '4:3',
    prompt:
      'Documentary 4:3 photograph. A worn-out, damaged work boot with visible cracks, ' +
      'missing sole tread and mud, laid on raw plywood next to a brand-new safety boot ' +
      'for contrast. Natural daylight, warning-tape yellow accent in background. ' +
      'Editorial, serious tone. No text or logos.',
  },
  {
    key: 'care-and-maintenance-of-construction-safety-boots',
    aspect: '4:3',
    prompt:
      'Editorial 4:3 photograph. A safety boot on a wooden bench being cleaned with ' +
      'a soft brush; a tin of leather conditioner, a microfibre cloth and a waterproofing ' +
      'spray arranged alongside. Warm golden light through a workshop window, artisanal ' +
      'feel. No text or brand labels.',
  },
  {
    key: 'regulatory-summary-osha-and-eu-requirements-side-by-side',
    aspect: '4:3',
    prompt:
      'Editorial 4:3 split-composition photograph. Left half: US construction site with ' +
      'OSHA-style compliance atmosphere. Right half: European construction site with ' +
      'CE-style compliance atmosphere. Connected by a neutral ground plane. Muted, ' +
      'authoritative tone. No text, no flags, no logos.',
  },
]

// ---------- API helpers ----------

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
  console.log(`    Task submitted: ${taskId}`)

  const resultUrl = AI_URL.replace(/\/draw\/[^/]+$/, '/draw/result')
  const maxAttempts = 120
  const interval = 2000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
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

    await new Promise((resolve) => setTimeout(resolve, interval))
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
  // Lazy-load sharp only if available; otherwise upload as-is.
  try {
    const sharp = (await import('sharp')).default
    return await sharp(buffer).webp({ quality: 88 }).toBuffer()
  } catch {
    return buffer
  }
}

async function uploadBlogImage(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const r2Key = `blog/${POST_SLUG}/${key}`
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: buffer,
      ContentType: contentType,
    }),
  )
  return `${R2_PUBLIC_URL}/${r2Key}`
}

// ---------- Main ----------

interface GeneratedImages {
  [key: string]: string
}

async function loadExisting(): Promise<GeneratedImages> {
  if (!existsSync(OUTPUT_JSON)) return {}
  try {
    const raw = await readFile(OUTPUT_JSON, 'utf8')
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

async function saveOutput(map: GeneratedImages) {
  const dir = path.dirname(OUTPUT_JSON)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(OUTPUT_JSON, JSON.stringify(map, null, 2) + '\n', 'utf8')
}

async function main() {
  if (!AI_API_KEY) {
    console.error('Error: NEXT_PUBLIC_THIRD_PARTY_IMAGE_API_KEY is not set')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const keyFilter = args
    .find((a) => a.startsWith('--key='))
    ?.slice('--key='.length)
    .split(',')
    .map((s) => s.trim())
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
    console.log('\nNothing to generate. Use --force to regenerate all, or --key=... for specific keys.')
    return
  }

  console.log(`\nGenerating ${plansToRun.length} blog image(s)...\n`)
  let success = 0
  let failed = 0

  for (let i = 0; i < plansToRun.length; i++) {
    const plan = plansToRun[i]
    console.log(`[${i + 1}/${plansToRun.length}] ${plan.key} (${plan.aspect})`)

    try {
      const imageUrl = await generateImage(plan)
      console.log(`    Generated: ${imageUrl}`)

      const rawBuffer = await downloadImage(imageUrl)
      console.log(`    Downloaded: ${(rawBuffer.length / 1024).toFixed(1)}KB`)

      const webpBuffer = await optimizeToWebp(rawBuffer)
      const filename = `${plan.key}-${Date.now()}.webp`
      const r2Url = await uploadBlogImage(webpBuffer, filename, 'image/webp')
      console.log(`    Uploaded: ${r2Url}\n`)

      next[plan.key] = r2Url
      // Persist incrementally so partial runs are never lost.
      await saveOutput(next)

      success++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`    FAILED: ${msg}\n`)
      failed++
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
