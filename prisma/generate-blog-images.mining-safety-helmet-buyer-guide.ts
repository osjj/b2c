import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] || fallback
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
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

const POST_SLUG = 'mining-safety-helmet-buyer-guide'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.mining-safety-helmet-buyer-guide.generated.json',
)
const PUBLIC_OUTPUT_DIR = path.resolve(
  __dirname,
  '..',
  'public',
  'blog',
  POST_SLUG,
)

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

type ImageRole =
  | 'hero'
  | 'product-detail'
  | 'comparison'
  | 'inspection'
  | 'procurement'

interface ImagePlan {
  key: string
  title: string
  role: ImageRole
  aspect: '16:9' | '4:3'
  prompt: string
}

const BASE_STYLE =
  'Style/medium: premium photorealistic natural editorial industrial-safety photography for a practical B2B mining helmet buyer guide, realistic polymers, webbing, hardware, cable routing, and credible mine scale. ' +
  'Lighting/mood: natural mine daylight, controlled underground work light, clean fitting-room light, or neutral warehouse light; calm, practical, professional. ' +
  'Color palette: rock gray, muted machinery yellow, navy workwear, and varied yellow, blue, orange, and white helmet accents. ' +
  'Accuracy: intact correctly assembled PPE, believable human proportions, secured cables and straps, guarded or safely separated equipment, realistic mine geometry. ' +
  'Constraints: no readable text, no letters, no numbers, no logos, no brand marks, no watermarks, no fake certification marks, no fake UI, no injury, no blood, no distress, no unsafe tool use, no active moving machinery, no distorted helmets, no duplicated people, no suggestion that PPE replaces ground control, lighting, traffic controls, or mine-equipment approval.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    title:
      'Mining Safety Helmet Buyer Guide: Fit, Cap-Lamp Mounts and PPE Compatibility',
    role: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. Asset type: wide blog hero. ' +
      'Primary request: a controlled mine PPE issue bay between a supported underground metal-mine portal and a distant open-pit quarry bench. Four unbranded mining helmet systems sit on an inspection table: a yellow cap-style helmet, a blue low-profile helmet with secured cap lamp and cable, an orange helmet with compatible earmuffs and clear eyewear, and a white helmet with four-point chin strap and raised clear visor. Two safety buyers shown only from torso and hands inspect the suspension and lamp bracket. ' +
      'Composition/framing: 16:9 wide three-quarter view, helmets are the primary subject, safe stationary equipment in the background, useful responsive-crop space. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-answer-approve-the-helmet-as-a-complete-worn-system',
    title: 'Quick Answer: Approve the Helmet as a Complete Worn System',
    role: 'product-detail',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: complete worn-system section image. ' +
      'Primary request: an orange mining helmet and its complete wearable system arranged on a clean issue-room table: removable suspension, matching four-point chin strap, cap-lamp bracket and lamp, secured cable and battery pack, earmuff adapters, clear eyewear, raised face-shield carrier, communication earpiece, and reflective material samples. ' +
      'Composition/framing: 4:3 top-down three-quarter product layout, no people, logical spacing, no graphic arrows or labels. ' +
      BASE_STYLE,
  },
  {
    key: 'treat-the-cap-lamp-mount-as-an-interface-not-a-claim',
    title: 'Treat the Cap-Lamp Mount as an Interface, Not a Claim',
    role: 'product-detail',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: cap-lamp interface detail. ' +
      'Primary request: macro close-up of a blue unbranded mining helmet, separate secure bracket, compact cap lamp, coiled cable with strain relief, and belt battery aligned for a compatibility inspection. A gloved technician compares the unmarked bracket dimensions with a plain caliper while another hand steadies the helmet. ' +
      'Composition/framing: 4:3 close three-quarter view, bracket engagement and cable routing are the focus, supported underground workshop softly blurred behind. Avoid sparks, exposed wiring, or lamp glare into camera. ' +
      BASE_STYLE,
  },
  {
    key: 'build-a-helmet-and-ppe-compatibility-matrix',
    title: 'Build a Helmet and PPE Compatibility Matrix',
    role: 'comparison',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: helmet compatibility comparison. ' +
      'Primary request: three unbranded assemblies on a neutral inspection table: yellow helmet with clear eyewear and four-point chin strap, orange helmet with earmuffs and raised clear face shield, and blue helmet with cap lamp, secured cable, and communication earpiece. Exact-looking suspension, adapter, carrier, and reflective samples sit in separate physical trays. ' +
      'Composition/framing: 4:3 overhead layout, no people, each system clearly separated, varied colors and forms, no universal-compatibility implication. ' +
      BASE_STYLE,
  },
  {
    key: 'run-a-controlled-sample-approval-before-bulk-ordering',
    title: 'Run a Controlled Sample Approval Before Bulk Ordering',
    role: 'inspection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: controlled sample-fit section image. ' +
      'Primary request: in a minimalist mine PPE fitting room with plain walls and blank lockers, a seated worker in navy coveralls wears a yellow helmet with adjusted suspension, four-point chin strap, compact cap lamp, and clear eyewear while a safety fitter checks the rear adjustment and cable clearance. Orange and blue samples and a spare suspension sit on an unmarked bench. Another worker performs a controlled crouch-and-look-up movement inside a railed training alcove. ' +
      'Composition/framing: 4:3 side three-quarter documentary view focused on fit and retention. Absolutely no signs, posters, labels, notices, badges, or written cards. ' +
      BASE_STYLE,
  },
  {
    key: 'write-a-quote-ready-mining-safety-helmet-rfq',
    title: 'Write a Quote-Ready Mining Safety Helmet RFQ',
    role: 'procurement',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: B2B mining helmet procurement image. ' +
      'Primary request: an organized warehouse review table with yellow, blue, and orange helmet systems; grouped spare suspensions, four-point chin straps, cap-lamp brackets, cables, battery components, earmuff adapters, clear eyewear, visor carrier, reflective swatches, packaging samples, and a controlled configuration run. Two buyers shown only by hands compare a suspension with a totally blank specification sheet and material swatch. ' +
      'Composition/framing: 4:3 top-down three-quarter layout, credible quantities, plain shelving and sealed unbranded cartons behind. ' +
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
    status: 'succeeded' | 'processing' | 'failed'
    results?: Array<{ url?: string }>
    failure_reason?: string
    error?: string
  }
}

type GeneratedImages = Record<string, string>

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
  if (!submitRes.ok) throw new Error(`Submit failed: ${submitRes.status}`)

  const submitted = (await submitRes.json()) as SubmitResponse
  const taskId = submitted.data?.id
  if (submitted.code !== 0 || !taskId) {
    throw new Error(`Submit error: ${submitted.msg}`)
  }

  const resultUrl = AI_URL.replace(/\/draw\/[^/]+$/, '/draw/result')
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const response = await fetch(resultUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({ id: taskId }),
    })
    if (!response.ok) throw new Error(`Poll failed: ${response.status}`)

    const result = (await response.json()) as ResultResponse
    if (result.code !== 0 || !result.data) {
      throw new Error(`Poll error: ${result.msg}`)
    }
    if (result.data.status === 'succeeded') {
      const url = result.data.results?.[0]?.url
      if (!url) throw new Error('No image URL in result')
      return url
    }
    if (result.data.status === 'failed') {
      throw new Error(
        result.data.failure_reason || result.data.error || 'Generation failed',
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  throw new Error('Timeout waiting for image generation')
}

async function optimizeToWebp(buffer: Buffer): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  return sharp(buffer).webp({ quality: 88 }).toBuffer()
}

async function uploadBlogImage(
  buffer: Buffer,
  filename: string,
): Promise<string> {
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

async function loadExisting(): Promise<GeneratedImages> {
  if (!existsSync(OUTPUT_JSON)) return {}
  try {
    const parsed = JSON.parse(await readFile(OUTPUT_JSON, 'utf8')) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as GeneratedImages
    }
  } catch {
    return {}
  }
  return {}
}

async function saveOutput(map: GeneratedImages): Promise<void> {
  await writeFile(OUTPUT_JSON, `${JSON.stringify(map, null, 2)}\n`, 'utf8')
}

async function findLocalSource(key: string): Promise<string> {
  for (const extension of ['webp', 'png', 'jpg', 'jpeg']) {
    const candidate = path.join(PUBLIC_OUTPUT_DIR, `${key}.${extension}`)
    if (existsSync(candidate)) return candidate
  }
  throw new Error(`Local image not found for key: ${key}`)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const uploadLocal = args.includes('--upload-local')
  const keyFilter = args
    .find((arg) => arg.startsWith('--key='))
    ?.slice('--key='.length)
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)

  if (!existsSync(PUBLIC_OUTPUT_DIR)) {
    await mkdir(PUBLIC_OUTPUT_DIR, { recursive: true })
  }

  const existing = await loadExisting()
  const next = { ...existing }
  const plansToRun = PLAN.filter((plan) => {
    if (keyFilter?.length && !keyFilter.includes(plan.key)) return false
    if (!force && existing[plan.key]) return false
    return true
  })

  if (!plansToRun.length) {
    console.log('Nothing to generate or upload.')
    return
  }

  let failed = 0
  for (const [index, plan] of plansToRun.entries()) {
    console.log(
      `[${index + 1}/${plansToRun.length}] ${plan.key} (${plan.role}, ${plan.aspect})`,
    )
    try {
      let raw: Buffer
      if (uploadLocal) {
        const localPath = await findLocalSource(plan.key)
        raw = await readFile(localPath)
        console.log(`    Local source: ${localPath}`)
      } else {
        const sourceUrl = await generateImage(plan)
        const response = await fetch(sourceUrl)
        if (!response.ok) throw new Error(`Download failed: ${response.status}`)
        raw = Buffer.from(await response.arrayBuffer())
      }

      const webp = await optimizeToWebp(raw)
      const url = await uploadBlogImage(
        webp,
        `${plan.key}-${Date.now()}.webp`,
      )
      next[plan.key] = url
      await saveOutput(next)
      console.log(`    Uploaded: ${url}`)
    } catch (error) {
      failed += 1
      console.error(
        `    FAILED: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  console.log(`Done. Success: ${plansToRun.length - failed}, Failed: ${failed}`)
  console.log(`Output: ${OUTPUT_JSON}`)
  if (failed) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
