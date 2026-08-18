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

const POST_SLUG = 'mining-quarry-safety-boots-guide'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.mining-quarry-safety-boots-guide.generated.json',
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
  | 'checklist'
  | 'comparison'
  | 'scenario'
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
  'Style/medium: photorealistic natural editorial industrial-safety photography for a practical B2B mining-footwear buyer guide, realistic materials and credible mine scale. ' +
  'Lighting/mood: natural overcast quarry daylight, controlled underground work light, clean fitting-room light, or neutral warehouse light; calm, practical, professional. ' +
  'Color palette: rock gray, earth brown, muted machinery yellow, black and brown leather, dark green PVC, navy workwear, with restrained orange, lime, blue, and red PPE accents. ' +
  'Accuracy: intact safety footwear, believable soles and closures, correct human proportions, guarded or safely separated equipment, stable ground, realistic mine and quarry geometry. ' +
  'Constraints: no readable text, no numbers, no logos, no brand marks, no watermarks, no fake certification marks, no fake UI, no injury, no blood, no distress, no unsafe tool use, no active blasting, no open moving machinery, no distorted boots, no mismatched left and right footwear, no duplicated people, no suggestion that footwear replaces engineering or traffic controls.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    title: 'Mining & Quarry Safety Boots Buyer Guide',
    role: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. Asset type: wide blog hero for mining and quarry safety-boot procurement. ' +
      'Primary request: four distinct unbranded work-boot families arranged on a rugged but clean mine issue bench: a black lace-up leather ankle boot, a brown high-cut leather boot with visible external metatarsal guard, a dark green waterproof PVC knee boot, and a charcoal pull-on boot. Behind the bench, a safely separated limestone quarry bench transitions toward a supported underground mine portal and a distant stationary haul truck. A safety buyer shown only from torso down examines the tread of one sample while wearing a separate correctly fitted pair. ' +
      'Composition/framing: 16:9 wide three-quarter editorial view, boots are the clear primary subject, work environments provide context without becoming a generic worker portrait, useful negative space for responsive cropping. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-answer-build-the-boot-specification-in-seven-steps',
    title: 'Quick Answer: Build the Boot Specification in Seven Steps',
    role: 'checklist',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: visual seven-stage boot-specification workflow without written labels. ' +
      'Primary request: an organized top-down industrial procurement table with seven physically separated stations forming a gentle sequence: crushed rock and wet-ground samples, three boot silhouettes, outsole and toe-cap material samples, blank document folder with an unbranded hangtag, foot-measuring tool and sock samples, a small approved size run, and a replacement-stock carton. Use spacing, trays, and material changes instead of arrows or text. ' +
      'Composition/framing: 4:3 overhead, no people, realistic scale, visually readable sequence, varied neutral and safety-color accents, no printed labels. ' +
      BASE_STYLE,
  },
  {
    key: 'compare-boot-protection-features-separately',
    title: 'Compare Boot Protection Features Separately',
    role: 'comparison',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: precise mining-boot feature comparison. ' +
      'Primary request: four complete unbranded safety boots in side profile on a neutral stone-and-metal workbench, each paired with one separate feature sample: a polished toe-cap insert beside a lace-up boot, a metatarsal guard component beside a high-cut boot, a puncture-resistant midsole sample and rugged outsole beside a dark boot, and water droplets with a chemical-splash tray beside a green PVC boot. Features are displayed as buyer samples, not as unsupported certification claims. ' +
      'Composition/framing: 4:3 straight three-quarter product comparison, no people, complete pairs visible in background, tread and upper construction sharp, no cutaway feet, no text or approval symbols. ' +
      BASE_STYLE,
  },
  {
    key: 'match-safety-boots-to-the-mine-or-quarry-work-area',
    title: 'Match Safety Boots to the Mine or Quarry Work Area',
    role: 'scenario',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: work-area boot-selection scene. ' +
      'Primary request: at a protected mine staging bay, three workers are shown mainly from the knees down on clearly different test surfaces: one rugged leather boot on dry uneven quarry rock, one high-visibility-trim waterproof boot on a damp underground-style travelway mat, and one tall dark green PVC boot near a contained washdown area. Helmets and upper-body PPE are visible only softly in the background; stationary guarded processing equipment and a supported portal establish credible context. ' +
      'Composition/framing: 4:3 low waist-level documentary view emphasizing contact, traction, ankle support, and shaft height; workers remain inside the marked safe test zone, no slipping pose, no moving equipment nearby. ' +
      BASE_STYLE,
  },
  {
    key: 'run-a-fit-size-and-wear-trial-before-bulk-approval',
    title: 'Run a Fit, Size, and Wear Trial Before Bulk Approval',
    role: 'inspection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: representative workforce boot fit trial. ' +
      'Primary request: a clean mine issue room where a seated worker in navy work trousers and realistic work socks tries a black high-cut boot while a footwear fitter checks heel hold and flex point by hand. Nearby are a foot-measuring device, three unbranded size samples, spare insoles, thick and thin sock options, and a clean step-and-ramp trial platform. Show another worker walking away in the blurred background to suggest a wear trial. ' +
      'Composition/framing: 4:3 side three-quarter view focused on hands, foot, boot, and sizing tools; natural anatomy, matched footwear, no medical scene, no readable paperwork. ' +
      BASE_STYLE,
  },
  {
    key: 'write-a-quote-ready-mining-safety-boot-rfq',
    title: 'Write a Quote-Ready Mining Safety Boot RFQ',
    role: 'procurement',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: B2B mining safety-boot RFQ and bulk-order review. ' +
      'Primary request: a warehouse procurement table with approved-looking but unbranded boot samples in black, brown, and dark green; a complete size run arranged by physical spacing; outsole, toe, upper, lining, and closure samples; spare laces and insoles; blank document packets; sealed sample cartons; and a small replacement-stock shelf behind. Two buyers shown only by hands compare one boot against a blank specification card and a material swatch. ' +
      'Composition/framing: 4:3 top-down three-quarter procurement layout, credible quantities and clean organization, no readable text, no logos, no fake certificates or approval stamps. ' +
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
