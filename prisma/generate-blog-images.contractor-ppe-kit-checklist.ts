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

const POST_SLUG = 'contractor-ppe-kit-checklist'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.contractor-ppe-kit-checklist.generated.json',
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
  'Style/medium: photorealistic editorial construction safety photography, practical B2B contractor PPE procurement tone, realistic PPE kit and warehouse dispatch details. ' +
  'Lighting/mood: clean natural daylight or bright warehouse light, credible, professional, field-oriented, organized but not staged like advertising. ' +
  'Color palette: high-visibility lime, safety orange, reflective silver, helmet white, glove black, boot leather brown, cardboard tan, concrete gray, steel blue. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no unsafe tool handling, no distorted PPE, no random letters on labels.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog hero image for a contractor PPE kit checklist. ' +
      'Primary request: organized contractor PPE kits staged for a construction crew, with safety helmets, clear safety glasses, hi-vis vests and shirts, work gloves, safety boots, earplugs, and respirator cases in clean issue bins. ' +
      'Scene/backdrop: construction supplier warehouse opening onto an active but controlled jobsite, with cartons, pallet rack, cones, and workers receiving kits in the background. ' +
      'Subject: bulk PPE kit preparation for contractors before site mobilization. ' +
      'Composition/framing: 16:9 wide hero frame, PPE kit contents prominent in foreground with warehouse and construction context behind, room for article crop. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-contractor-ppe-kit-checklist',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image for a quick contractor PPE kit checklist. ' +
      'Primary request: baseline contractor PPE kit arranged on a clean jobsite dispatch table: safety helmet, safety glasses, hi-vis vest, cut-resistant work gloves, earplugs, safety boots, respirator storage case, and issue bag. ' +
      'Scene/backdrop: construction warehouse dispatch area with cartons and a blurred jobsite entrance beyond. ' +
      'Subject: complete baseline PPE kit before contractors enter the site. ' +
      'Composition/framing: 4:3 organized flat-lay, realistic gear, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'what-is-a-contractor-ppe-kit',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image explaining what a contractor PPE kit is. ' +
      'Primary request: safety manager handing a complete PPE issue kit to a contractor worker at a controlled construction site entrance. ' +
      'Scene/backdrop: jobsite gate with PPE issue table, clean cartons, cones, and unfinished concrete structure in the background. ' +
      'Subject: PPE kit as a repeatable issue package for contractors and crews. ' +
      'Composition/framing: 4:3 medium documentary scene, PPE contents visible without readable paperwork. ' +
      BASE_STYLE,
  },
  {
    key: 'baseline-construction-contractor-ppe-kit',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image for a baseline construction contractor PPE kit. ' +
      'Primary request: neat PPE kit layout with hard hat or safety helmet, safety glasses with side protection, high-visibility vest, general work gloves, safety boots, and disposable earplugs. ' +
      'Scene/backdrop: clean concrete floor and jobsite table with a blurred contractor crew in PPE behind. ' +
      'Subject: baseline site-entry PPE for construction contractors. ' +
      'Composition/framing: 4:3 organized product composition, each item clear and realistic, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'trade-add-on-modules',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for trade add-on PPE modules. ' +
      'Primary request: several contractor PPE module bins for concrete cutting, demolition, roadwork, scaffolding, and welding, each showing appropriate gear such as sealed goggles, respirator, hearing protection, impact gloves, hi-vis clothing, and face shield. ' +
      'Scene/backdrop: organized warehouse staging area beside a construction site, with trade crews softly visible. ' +
      'Subject: modular PPE kits by trade and exposure. ' +
      'Composition/framing: 4:3 balanced staging scene, multiple bins visible, no readable text on labels. ' +
      BASE_STYLE,
  },
  {
    key: 'sizing-and-proper-fit-in-bulk-ppe-kits',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for sizing and proper fit in bulk PPE kits. ' +
      'Primary request: safety coordinator checking different PPE sizes for helmets, gloves, hi-vis garments, safety boots, and harnesses laid out by size on a warehouse table. ' +
      'Scene/backdrop: contractor PPE issue area with workers being fitted for gear and cartons in the background. ' +
      'Subject: size range and proper fit for bulk PPE kits. ' +
      'Composition/framing: 4:3 medium close-up focused on size variety, fit process, and realistic PPE, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'standards-and-documentation-to-request',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for PPE standards and documentation checks. ' +
      'Primary request: procurement manager reviewing blank certificates, product data sheets, and PPE samples including hard hat, hi-vis garment, gloves, boots, safety glasses, respirator, and earmuffs. ' +
      'Scene/backdrop: clean office-warehouse inspection table with PPE cartons and jobsite supplies nearby. ' +
      'Subject: documentation and certification review before approving contractor PPE kits. ' +
      'Composition/framing: 4:3 medium close-up, paperwork visible but no readable words or logos. ' +
      BASE_STYLE,
  },
  {
    key: 'packaging-labeling-and-site-issue-control',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for packaging, labeling, and site issue control. ' +
      'Primary request: organized contractor PPE kits packed in clear issue bags and open cartons, grouped by crew and size with blank color-coded labels, replacement gloves and eyewear nearby. ' +
      'Scene/backdrop: jobsite dispatch table at a construction warehouse with pallet racks and site entrance behind. ' +
      'Subject: controlled PPE kit packaging and issue workflow. ' +
      'Composition/framing: 4:3 organized inventory scene, no readable text, no logos. ' +
      BASE_STYLE,
  },
  {
    key: 'contractor-ppe-kit-rfq-template',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for a contractor PPE kit RFQ template. ' +
      'Primary request: procurement meeting table with blank RFQ form, calculator, PPE samples, cartons, and a laptop showing an unreadable spreadsheet-like grid. ' +
      'Scene/backdrop: construction supplier office connected to a warehouse, with contractor PPE kit samples staged nearby. ' +
      'Subject: structured RFQ planning for bulk contractor PPE kits. ' +
      'Composition/framing: 4:3 practical procurement scene, no readable text, no brand marks. ' +
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
