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

const POST_SLUG = 'class-e-vs-class-g-vs-class-c-hard-hats'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.class-e-vs-class-g-vs-class-c-hard-hats.generated.json',
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
  'Style/medium: photorealistic editorial construction safety photography, practical B2B PPE buying tone, realistic hard hat and safety helmet specification details. ' +
  'Lighting/mood: natural daylight, credible, professional, field-oriented, clean industrial safety aesthetic. ' +
  'Color palette: concrete gray, steel blue, safety yellow, high-visibility orange, white helmets, matte black accessory details. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no distorted helmets.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog hero image for Class E vs Class G vs Class C hard hats buyer guide. ' +
      'Primary request: construction safety manager comparing electrical-rated hard hats before approving a bulk PPE order. ' +
      'Scene/backdrop: controlled construction site with safe electrical work context, concrete floor, procurement table in foreground. ' +
      'Subject: non-vented electrical-rated hard hats, vented Class C style hard hat, insulated gloves, and blank inspection clipboard without readable text. ' +
      'Composition/framing: 16:9 wide editorial hero, helmets in foreground with worker context behind, room for article crop. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-answer-class-e-vs-class-g-vs-class-c-hard-hats',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: clear visual comparison of Class E, Class G, and Class C construction hard hats without text labels. ' +
      'Scene/backdrop: clean jobsite safety table with concrete texture and blurred construction activity. ' +
      'Subject: non-vented hard hats and vented hard hat arranged with insulated gloves and safety glasses, no text labels. ' +
      'Composition/framing: 4:3 practical product comparison for B2B buyers. ' +
      BASE_STYLE,
  },
  {
    key: 'what-osha-requires-for-electrical-head-protection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: head protection compliance review for construction electrical exposure. ' +
      'Scene/backdrop: safety office table with hard hats, blank procurement sheets, inspection tags blurred, and PPE samples. ' +
      'Subject: safety manager inspecting hard hat shell, suspension, and electrical PPE samples without readable text. ' +
      'Composition/framing: 4:3 medium close-up, no readable labels or text. ' +
      BASE_STYLE,
  },
  {
    key: 'class-e-hard-hats',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: Class E hard hat for construction electrical exposure. ' +
      'Scene/backdrop: safe distance from electrical panel and temporary power setup, no readable signage. ' +
      'Subject: non-vented electrical-rated hard hat with insulated gloves, safety glasses, and blank checklist on PPE table. ' +
      'Composition/framing: 4:3 close-up with electrical work context, safe and controlled. ' +
      BASE_STYLE,
  },
  {
    key: 'class-g-hard-hats',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: Class G hard hat as general construction head protection with limited electrical protection. ' +
      'Scene/backdrop: general construction site staging area with concrete, steel, and controlled background activity. ' +
      'Subject: worker wearing cap-style hard hat, safety glasses, gloves, and hi-vis vest while supervisor reviews PPE samples. ' +
      'Composition/framing: 4:3 documentary construction safety planning scene. ' +
      BASE_STYLE,
  },
  {
    key: 'class-c-hard-hats',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: Class C vented hard hat for non-electrical hot-weather construction work. ' +
      'Scene/backdrop: clean warehouse PPE table with summer construction site blurred behind. ' +
      'Subject: vented hard hat, cooling towel, safety glasses, gloves, and hi-vis vest arranged neatly, no text labels. ' +
      'Composition/framing: 4:3 product-mockup layout emphasizing ventilation and comfort without electrical context. ' +
      BASE_STYLE,
  },
  {
    key: 'class-e-vs-class-g-vs-class-c-comparison-table',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: practical comparison lineup of Class E, Class G, and Class C hard hats for procurement review without text labels. ' +
      'Scene/backdrop: clean warehouse PPE shelf or jobsite table. ' +
      'Subject: non-vented electrical hard hats and vented hard hat arranged with blank specification sheets. ' +
      'Composition/framing: 4:3 product-mockup layout for procurement comparison, no text. ' +
      BASE_STYLE,
  },
  {
    key: 'common-construction-buyer-scenarios',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: contractor role-based hard hat class purchasing for general crews, electrical crews, visitors, and scaffold crews. ' +
      'Scene/backdrop: warehouse PPE inventory shelf with cartons, hard hats, helmet accessories, and blank procurement forms. ' +
      'Subject: procurement manager checking multiple hard hat models before crew issue. ' +
      'Composition/framing: 4:3 organized inventory and buying scene, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'vented-vs-non-vented-shells-and-electrical-classes',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: vented vs non-vented hard hat shell comparison for electrical class selection. ' +
      'Scene/backdrop: clean industrial workbench with concrete texture and blurred jobsite background. ' +
      'Subject: vented hard hat beside non-vented electrical-rated hard hat, with safety glasses and insulated gloves nearby. ' +
      'Composition/framing: 4:3 organized product comparison, no text labels. ' +
      BASE_STYLE,
  },
  {
    key: 'how-to-write-the-hard-hat-class-into-an-rfq',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: hard hat electrical class RFQ preparation with samples, replacement suspensions, chin straps, and accessory compatibility checks. ' +
      'Scene/backdrop: procurement desk at construction safety office with laptop screen blurred, blank forms, hard hats, and PPE samples. ' +
      'Subject: buyer comparing hard hat samples and accessory parts before sending supplier request. ' +
      'Composition/framing: 4:3 B2B procurement planning scene, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'marking-inspection-and-replacement-checks',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: hard hat marking, shell inspection, suspension replacement, and field issue checks. ' +
      'Scene/backdrop: jobsite PPE fitting station with safety glasses, earmuffs, face shield, respirator, and hard hat samples. ' +
      'Subject: safety manager inspecting inside of hard hat shell and suspension without readable text. ' +
      'Composition/framing: 4:3 practical field inspection scene, safe and professional. ' +
      BASE_STYLE,
  },
  {
    key: 'common-mistakes-when-buying-hard-hat-classes',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: common hard hat class buying mistakes such as mixed inventory and wrong shell choice. ' +
      'Scene/backdrop: organized PPE storage area with separated hard hats, accessories, and blank bin labels with no readable text. ' +
      'Subject: supervisor sorting vented and non-vented hard hats before crew issue. ' +
      'Composition/framing: 4:3 practical procurement and inventory control scene. ' +
      BASE_STYLE,
  },
  {
    key: 'buyer-decision-matrix',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: buyer decision matrix for hard hat electrical classes, impact type, and accessories. ' +
      'Scene/backdrop: safety office table with hard hats, blank matrix sheet, non-readable checklist, and PPE samples. ' +
      'Subject: procurement manager and safety manager reviewing hard hat class options together. ' +
      'Composition/framing: 4:3 B2B decision planning scene, no readable text. ' +
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
