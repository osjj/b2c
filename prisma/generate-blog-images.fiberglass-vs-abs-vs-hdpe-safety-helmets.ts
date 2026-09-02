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

const POST_SLUG = 'fiberglass-vs-abs-vs-hdpe-safety-helmets'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.fiberglass-vs-abs-vs-hdpe-safety-helmets.generated.json',
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
  | 'comparison'
  | 'standards'
  | 'scenario'
  | 'procurement'
  | 'inspection'

interface ImagePlan {
  key: string
  title: string
  role: ImageRole
  aspect: '16:9' | '4:3'
  prompt: string
}

const BASE_STYLE =
  'Style/medium: photorealistic natural editorial industrial-safety photography for a practical B2B safety-helmet material buyer guide; realistic molded shells, suspensions, fittings, and human anatomy. ' +
  'Lighting/mood: clean neutral warehouse light, controlled product-lab light, or natural construction staging-area daylight; calm, credible, precise, not cinematic. ' +
  'Color palette: balanced white, yellow, orange, blue, gray, and restrained black helmet components with neutral metal, wood, and concrete backgrounds. ' +
  'Accuracy: all helmets are complete industrial head-protection products with plausible brims, crowns, suspensions, sweatbands, slots, and chin-strap anchors; no cracked PPE is worn; equipment is stationary or safely separated. ' +
  'Constraints: no readable text, no numbers, no logos, no brand marks, no watermarks, no fake certification marks, no fake UI, no injury, no blood, no distress, no unsafe tool use, no electrical arcs, no open flames, no distorted helmets, no impossible transparent shells, no duplicate products, no suggestion that shell material alone proves impact, heat, or electrical performance.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    title: 'Fiberglass vs ABS vs HDPE Safety Helmets',
    role: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: product-mockup. Asset type: wide blog hero for safety-helmet material comparison and bulk buying. ' +
      'Primary request: three distinct unbranded industrial helmets arranged on a clean procurement bench: an off-white full-brim reinforced-composite helmet with a smooth molded finish, an orange cap-style ABS helmet with restrained vents, and a blue non-vented HDPE hard hat with a matte molded finish. Place their complete suspensions beside them without disassembling or cutting the shells. In the softly focused background, a buyer reviews blank material samples and a construction staging area is visible through a window. ' +
      'Composition/framing: 16:9 wide three-quarter product view, the three helmets carry equal visual weight, useful negative space for responsive cropping, no workers wearing the products, no printed labels. ' +
      BASE_STYLE,
  },
  {
    key: 'fiberglass-vs-abs-vs-hdpe-what-the-material-label-means',
    title: 'Fiberglass vs ABS vs HDPE: What The Material Label Means',
    role: 'comparison',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: shell-material comparison without unsupported rankings. ' +
      'Primary request: top-down neutral tabletop layout with three complete unbranded industrial helmets in off-white, yellow-orange, and blue-gray, each paired with a small unlabeled molded material coupon and its correct complete suspension. The reinforced-composite sample has a subtle molded composite character but no exposed sharp fibers; the ABS and HDPE samples have distinct realistic thermoplastic surface finishes. Arrange the products as equal alternatives, not a winner podium. ' +
      'Composition/framing: 4:3 overhead comparison, no people, no cutaway heads, no arrows, no rating icons, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'compare-safety-helmet-materials-by-evidence-not-assumptions',
    title: 'Compare Safety Helmet Materials By Evidence, Not Assumptions',
    role: 'standards',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: model-evidence review for three helmet samples. ' +
      'Primary request: a safety procurement specialist shown only by hands compares three helmet undersides, suspension systems, blank hangtags, blank datasheet pages, a digital scale with an unreadable display, calipers, and accessory adapters on a controlled inspection bench. Each helmet has a different color and shell style. The scene communicates exact-model verification, marking photos, weight, fit range, and accessory compatibility without displaying fake approvals. ' +
      'Composition/framing: 4:3 high three-quarter view, sharp product detail, organized evidence stations, no legible writing, no certificates, no approval stamps. ' +
      BASE_STYLE,
  },
  {
    key: 'how-heat-and-electrical-requirements-change-the-decision',
    title: 'How Heat And Electrical Requirements Change The Decision',
    role: 'standards',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: controlled helmet test-planning scene for heat and electrical requirements. ' +
      'Primary request: two safely closed industrial test enclosures on a clean laboratory bench, one temperature chamber with a warm amber status light and one dielectric test cabinet with a cool blue status light, both with unreadable controls. Three unbranded helmet samples remain outside the closed equipment while a technician wearing ordinary lab PPE reviews blank manufacturer instructions. No active destructive test is visible and no material is presented as automatically approved. ' +
      'Composition/framing: 4:3 side three-quarter controlled-lab view, equipment guards closed, complete helmets intact, no sparks, no arcs, no flames, no fake standard symbols. ' +
      BASE_STYLE,
  },
  {
    key: 'run-a-jobsite-sample-approval-before-bulk-ordering',
    title: 'Run A Jobsite Sample Approval Before Bulk Ordering',
    role: 'scenario',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: representative construction helmet fit and accessory trial. ' +
      'Primary request: at a protected construction-site induction area away from active machinery, three diverse workers trial different approved-looking unbranded helmet samples: one worker adjusts a blue hard-hat suspension, one checks the stable fit of an orange helmet with safety glasses, and one tests an off-white full-brim helmet with compatible earmuffs held beside it. A supervisor records observations on blank paper. All workers wear reasonable site PPE and stand behind a barrier in a calm staging zone. ' +
      'Composition/framing: 4:3 waist-level documentary view, varied poses and helmet colors, fit and compatibility are the focus, no generic hero portrait, no active hazards. ' +
      BASE_STYLE,
  },
  {
    key: 'write-a-quote-ready-safety-helmet-rfq',
    title: 'Write A Quote-Ready Safety Helmet RFQ',
    role: 'procurement',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: bulk safety-helmet RFQ and sample-lock review. ' +
      'Primary request: a clean warehouse procurement table with three approved-looking unbranded helmet samples, complete suspensions, color swatches, compatible chin straps and face-shield adapters, blank specification packets, sealed sample cartons, spare suspensions, and a small organized replacement-stock shelf. Two buyers shown only by hands compare a helmet to a blank sample card and material coupon. ' +
      'Composition/framing: 4:3 top-down three-quarter layout, credible B2B quantities, visually separated RFQ fields without text, no logos, no fake certificates or approval marks. ' +
      BASE_STYLE,
  },
  {
    key: 'inspect-store-and-replace-helmets-by-product-instructions',
    title: 'Inspect, Store, And Replace Helmets By Product Instructions',
    role: 'inspection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: routine industrial helmet inspection and storage record. ' +
      'Primary request: gloved hands inspect the crown, brim edge, underside, suspension, sweatband, slots, and chin-strap anchors of a yellow industrial helmet under a bright angled inspection lamp. Nearby are an intact blue spare helmet, clean replacement suspension, soft cleaning cloth, and ventilated shaded storage cubbies. Use blank record cards and an unreadable date wheel to suggest traceability. ' +
      'Composition/framing: 4:3 close three-quarter detail, the inspected helmet is not worn, no deliberate cracking or destructive flexing, no chemical bottles, no readable text. ' +
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
