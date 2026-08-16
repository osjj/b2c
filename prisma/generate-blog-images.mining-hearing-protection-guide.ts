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
const AI_MODEL = requireEnv('NEXT_PUBLIC_THIRD_PARTY_IMAGE_MODEL', 'nano-banana-fast')

const POST_SLUG = 'mining-hearing-protection-guide'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.mining-hearing-protection-guide.generated.json',
)
const PUBLIC_OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'blog', POST_SLUG)

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
  | 'standards'
  | 'scenario'
  | 'comparison'
  | 'inspection'
  | 'training'
  | 'procurement'

interface ImagePlan {
  key: string
  title: string
  role: ImageRole
  aspect: '16:9' | '4:3'
  prompt: string
}

const BASE_STYLE =
  'Style/medium: photorealistic natural editorial mining-safety photography for a practical B2B technical guide, realistic industrial scale and materials. ' +
  'Lighting/mood: credible daylight, clean processing-plant light, or neutral training-room light; calm, professional, safety-focused. ' +
  'Color palette: limestone gray, muted machinery yellow, navy and charcoal workwear with controlled orange, blue, lime, red, and black hearing-protection accents. ' +
  'Accuracy: intact hearing protectors, plausible fit, guarded or safely separated equipment, correct human proportions, realistic quarry and mine geometry. ' +
  'Constraints: no readable text, no numbers, no logos, no brand marks, no watermarks, no fake UI, no injury, no distress, no unsafe tool use, no open moving machinery, no distorted PPE, no duplicated people, no suggestion that hearing PPE replaces engineering controls.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    title: 'Mining Hearing Protection Guide: MSHA Part 62, Earplugs, Earmuffs & Dual Protection',
    role: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. Asset type: wide blog hero. ' +
      'Primary request: a mine safety supervisor and processing technician at a protected observation platform overlooking an enclosed quarry crusher and vibrating screen with visible acoustic panels and full guarding. The technician wears a blue safety helmet with correctly seated black helmet-mounted earmuffs, clear safety glasses, fitted navy workwear, gloves, and protective boots; a clean dispenser tray with several unbranded foam and reusable earplugs sits in the foreground. ' +
      'Composition/framing: 16:9 wide three-quarter documentary view, controls and hearing protection both visible, people secondary to the credible mine environment, useful negative space for responsive cropping. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-msha-part-62-decision-table',
    title: 'Quick MSHA Part 62 Decision Table',
    role: 'standards',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: visual decision-stage comparison without written labels. ' +
      'Primary request: a top-down industrial hygiene table divided by spacing into three progressive hearing-conservation groups: a personal noise dosimeter and reusable plugs; earmuffs with a monitoring instrument and maintenance-control sample; then a clearly paired plug-and-muff set beside a second dosimeter. Include blank colored cards and simple physical dividers only, with no text or numbers. ' +
      'Composition/framing: 4:3 clean overhead comparison, no people, equipment unbranded and technically plausible, visually distinct green, amber, and red accent zones without traffic-light graphics. ' +
      BASE_STYLE,
  },
  {
    key: 'measure-and-control-mine-noise-before-selecting-hearing-protection',
    title: 'Measure and Control Mine Noise Before Selecting Hearing Protection',
    role: 'scenario',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: mine noise monitoring and engineering-control section image. ' +
      'Primary request: an industrial hygienist clips a small personal noise dosimeter to a quarry worker at a safe staging point while an enclosed crusher transfer point with acoustic barrier panels, intact guards, and dust suppression sits in the background. Both workers wear fitted helmets, eye protection, workwear, and hearing protection appropriate to the controlled area. ' +
      'Composition/framing: 4:3 waist-level documentary view, focus on the dosimeter and enclosure rather than a worker portrait, safe distance from equipment. ' +
      BASE_STYLE,
  },
  {
    key: 'what-a-part-62-hearing-conservation-program-must-cover',
    title: 'What a Part 62 Hearing Conservation Program Must Cover',
    role: 'training',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: hearing conservation training and audiometry section image. ' +
      'Primary request: a clean mine training room with a hearing-conservation instructor demonstrating correct foam-earplug rolling and insertion using a large neutral ear model; on a separate counter are two muff styles, two plug styles, a closed audiometric-headset case, blank record folders, and an unbranded dosimeter. Two miners observe from the side in clean workwear. ' +
      'Composition/framing: 4:3 oblique classroom view, hands and equipment prominent, no readable presentation screen or paperwork. ' +
      BASE_STYLE,
  },
  {
    key: 'hearing-protection-by-mining-and-quarry-task',
    title: 'Hearing Protection by Mining and Quarry Task',
    role: 'scenario',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: task-based mine hearing protection selection image. ' +
      'Primary request: an organized mine issue-room table with four physically separated task modules: drill-rig kit with corded reusable plugs and helmet; crusher inspection kit with helmet-mounted muffs and sealed eyewear; haulage transition kit with foldable muffs and radio; maintenance kit with foam plugs, standalone muffs, face shield, and respirator compatibility samples. Use small rock, conveyor-belt, cab-key, and tool-case cues without labels. ' +
      'Composition/framing: 4:3 three-quarter overhead layout, no people, varied product colors, no readable text or fake certifications. ' +
      BASE_STYLE,
  },
  {
    key: 'earplugs-vs-earmuffs-vs-dual-hearing-protection',
    title: 'Earplugs vs Earmuffs vs Dual Hearing Protection',
    role: 'comparison',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: precise hearing protector comparison. ' +
      'Primary request: three clean unbranded hearing-protection configurations displayed on matte gray headforms: correctly inserted orange foam earplugs on the left, well-seated blue earmuffs in the center, and correctly combined purple plugs plus black earmuffs on the right. Add nearby replacement cushions and a clean reusable plug case for scale. ' +
      'Composition/framing: 4:3 straight-on product comparison, ear and seal details visible, neutral studio-workbench setting, no people, no labels or numbers. ' +
      BASE_STYLE,
  },
  {
    key: 'fit-compatibility-communication-and-warning-signals',
    title: 'Fit, Compatibility, Communication, and Warning Signals',
    role: 'inspection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: close fit-and-compatibility inspection. ' +
      'Primary request: side-profile close-up of a mine worker while a safety supervisor checks the seal and cup position of helmet-mounted earmuffs. The exact system includes a red retained safety helmet with cap lamp, slim-temple clear safety glasses, black earmuffs fully seated around the ear, and a secured radio microphone; nothing crosses the muff cushion. A blurred visual warning beacon is visible in the protected background. ' +
      'Composition/framing: 4:3 tight side-profile detail with hands only from the supervisor, natural skin and PPE proportions, no generic smiling portrait. ' +
      BASE_STYLE,
  },
  {
    key: 'build-a-mining-hearing-protection-rfq',
    title: 'Build a Mining Hearing Protection RFQ',
    role: 'procurement',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: B2B mining hearing protection procurement scene. ' +
      'Primary request: a warehouse sample-review table with two muff types, two plug types in multiple sizes, helmet attachment samples, replacement cushion kits, clean storage cases, dispenser cartons, spare parts, an unbranded dosimeter, and blank RFQ document packets. Two buyers shown only by hands compare a helmet-and-muff assembly and place a blank approval card beside it. ' +
      'Composition/framing: 4:3 top-down three-quarter procurement layout, credible quantities, organized stock shelves behind, no readable text, logos, or fake certification marks. ' +
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

async function generateImage(plan: ImagePlan): Promise<string> {
  const submitRes = await fetch(AI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_API_KEY}` },
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
  if (submitted.code !== 0 || !taskId) throw new Error(`Submit error: ${submitted.msg}`)

  const resultUrl = AI_URL.replace(/\/draw\/[^/]+$/, '/draw/result')
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const response = await fetch(resultUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({ id: taskId }),
    })
    if (!response.ok) throw new Error(`Poll failed: ${response.status}`)
    const result = (await response.json()) as ResultResponse
    if (result.code !== 0 || !result.data) throw new Error(`Poll error: ${result.msg}`)
    if (result.data.status === 'succeeded') {
      const url = result.data.results?.[0]?.url
      if (!url) throw new Error('No image URL in result')
      return url
    }
    if (result.data.status === 'failed') {
      throw new Error(result.data.failure_reason || result.data.error || 'Generation failed')
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error('Timeout waiting for image generation')
}

async function optimizeToWebp(buffer: Buffer): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  return sharp(buffer).webp({ quality: 88 }).toBuffer()
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
  if (!existsSync(OUTPUT_JSON)) return {}
  try {
    const parsed = JSON.parse(await readFile(OUTPUT_JSON, 'utf8')) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as GeneratedImages
    }
  } catch {}
  return {}
}

async function saveOutput(map: GeneratedImages): Promise<void> {
  await writeFile(OUTPUT_JSON, `${JSON.stringify(map, null, 2)}\n`, 'utf8')
}

async function findLocalSource(key: string): Promise<string> {
  for (const extension of ['png', 'webp', 'jpg', 'jpeg']) {
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

  const existing = await loadExisting()
  const next: GeneratedImages = { ...existing }
  const plansToRun = PLAN.filter((plan) => {
    if (keyFilter?.length && !keyFilter.includes(plan.key)) return false
    if (!force && existing[plan.key]) return false
    return true
  })

  if (!plansToRun.length) {
    console.log('Nothing to generate or upload.')
    return
  }
  if (uploadLocal && !existsSync(PUBLIC_OUTPUT_DIR)) {
    await mkdir(PUBLIC_OUTPUT_DIR, { recursive: true })
  }

  let failed = 0
  for (const [index, plan] of plansToRun.entries()) {
    console.log(`[${index + 1}/${plansToRun.length}] ${plan.key} (${plan.role}, ${plan.aspect})`)
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
      const url = await uploadBlogImage(webp, `${plan.key}-${Date.now()}.webp`)
      next[plan.key] = url
      await saveOutput(next)
      console.log(`    Uploaded: ${url}`)
    } catch (error) {
      failed += 1
      console.error(`    FAILED: ${error instanceof Error ? error.message : String(error)}`)
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
