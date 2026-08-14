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

const POST_SLUG = 'open-pit-vs-underground-mining-ppe'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.open-pit-vs-underground-mining-ppe.generated.json',
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
  | 'scenario'
  | 'inspection'
  | 'product-detail'
  | 'procurement'

interface ImagePlan {
  key: string
  title: string
  role: ImageRole
  aspect: '16:9' | '4:3'
  prompt: string
}

const BASE_STYLE =
  'Style/medium: photorealistic editorial mining-safety photography for a practical B2B technical guide, credible industrial scale and natural textures. ' +
  'Lighting/mood: realistic daylight, controlled underground work lighting, or clean storeroom light; calm, professional, safety-focused, never disaster imagery. ' +
  'Color palette: rock gray, earth brown, muted machinery yellow, navy and charcoal workwear with varied orange, lime, blue, red, and white PPE accents. ' +
  'Accuracy: correct human proportions, intact fitted PPE, controlled access, stationary or safely separated machinery, realistic mine geometry, no suggestion that PPE replaces traffic control, guarding, ventilation, ground control, or isolation. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlay, no injury, no blood, no distress, no unsafe tool use, no open moving machinery, no distorted helmets or respirators, no loose straps, no duplicated people.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    title: 'Open-Pit vs Underground Mining PPE: Key Differences',
    role: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. Asset type: wide blog hero comparing mining work environments. ' +
      'Primary request: one continuous realistic mine complex at a controlled transition point: a terraced open pit and distant haul truck on the left, a supported underground portal with safe white work lights on the right, a compact quarry crusher and processing structure in the middle distance. Two safety supervisors stand at a clean staging bay comparing distinct area modules on a bench; one surface set includes weather eye protection and orange outer-layer visibility, one underground set includes a retained blue helmet with cap lamp and reflective navy coveralls. ' +
      'Composition/framing: 16:9 wide three-quarter documentary view, environments visually primary, people secondary, coherent single scene rather than a collage, space for responsive cropping. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-comparison-open-pit-underground-quarry-and-processing-ppe',
    title: 'Quick Comparison: Open-Pit, Underground, Quarry, and Processing PPE',
    role: 'comparison',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: visual four-area PPE comparison without labels. ' +
      'Primary request: a top-down mine safety issue table divided by physical spacing into four distinct equipment modules: open-pit weather glasses, orange visibility shell and terrain boot; underground retained cap-lamp helmet, reflective navy garment and wet-ground boot; quarry sealed goggles, earmuffs and dust-ready respirator case; processing splash goggles, face shield, chemical glove sample and hearing protection. Keep the modules plausible, complete, unbranded, and clearly different. ' +
      'Scene/backdrop: clean industrial issue-room table with subtle stone and metal sample cues. Composition/framing: 4:3 overhead, no people, no printed labels or arrows. ' +
      BASE_STYLE,
  },
  {
    key: 'open-pit-mining-ppe-visibility-weather-traffic-and-travel-distance',
    title: 'Open-Pit Mining PPE: Visibility, Weather, Traffic, and Travel Distance',
    role: 'scenario',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: open-pit PPE section image. ' +
      'Primary request: an open-pit field inspector stands inside a marked protected pedestrian turnout while a large stationary haul truck waits far behind the barrier. The worker wears an orange outer-layer weather shell with reflective bands, a yellow helmet, wraparound eye protection, gloves, and mud-ready boots; a radio is secured at the chest. Show wind, bright sun, a damp haul road, berms, and long travel distance without dramatic dust. ' +
      'Composition/framing: 4:3 low three-quarter environmental view, safe separation and scale are obvious, no worker in the vehicle path. ' +
      BASE_STYLE,
  },
  {
    key: 'underground-mining-ppe-clearance-lighting-ventilation-and-escape',
    title: 'Underground Mining PPE: Clearance, Lighting, Ventilation, and Escape',
    role: 'scenario',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: underground mining PPE section image. ' +
      'Primary request: a single underground metal-mine worker walks in a supported, ventilated travelway beside a protected pedestrian line. The worker wears a correctly retained blue helmet with mounted cap lamp and secured cable, clear low-profile eyewear, communication-compatible hearing protection, reflective navy fitted coveralls, gloves, and wet-ground boots; a sealed self-rescue unit is correctly carried at the belt as separate emergency equipment. ' +
      'Scene/backdrop: realistic roof support, ventilation duct, machine lighting in the distance, damp floor, no unsupported ground and no active machine nearby. Composition/framing: 4:3 eye-level documentary view emphasizing wearable-system compatibility and low clearance. ' +
      BASE_STYLE,
  },
  {
    key: 'quarry-ppe-bench-work-drilling-blasting-and-crusher-proximity',
    title: 'Quarry PPE: Bench Work, Drilling, Blasting, and Crusher Proximity',
    role: 'scenario',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: quarry PPE section image. ' +
      'Primary request: a limestone quarry supervisor inspects a controlled zone from behind a solid barrier with an idle drill rig on one bench and an enclosed wet-suppressed crusher in the background. The supervisor wears a red helmet, sealed clear goggles, earmuffs, gray fitted workwear with restrained lime reflective accents, gloves carried at the belt, and rugged boots. Show wet dust control and compact transitions between quarry tasks without any blast event. ' +
      'Composition/framing: 4:3 elevated three-quarter view, clear exclusion distances, no person close to the face edge or moving machinery. ' +
      BASE_STYLE,
  },
  {
    key: 'processing-area-ppe-machinery-noise-dust-reagents-and-maintenance',
    title: 'Processing-Area PPE: Machinery, Noise, Dust, Reagents, and Maintenance',
    role: 'inspection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: mineral-processing PPE section image. ' +
      'Primary request: a processing-plant technician checks a designed sampling station on a guarded platform while the conveyor and screen behind full guards are stationary. The technician wears a white helmet, clear goggles plus a raised face shield ready for splash protection, blue hearing protection, teal chemical-compatible gloves, fitted charcoal coveralls, and protective boots. Include a closed reagent transfer line, eyewash station shape without readable signage, clean access stairs, and local extraction duct. ' +
      'Composition/framing: 4:3 medium three-quarter inspection view, no reach into machinery, no chemical spill, no generic worker portrait. ' +
      BASE_STYLE,
  },
  {
    key: 'workers-who-cross-between-areas-need-a-controlled-changeover',
    title: 'Workers Who Cross Between Areas Need a Controlled Changeover',
    role: 'product-detail',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: controlled PPE changeover section image. ' +
      'Primary request: a clean mine changeover room with one baseline kit in the center and four separate open storage cubbies represented by distinct physical modules: surface weather and visibility, underground cap-lamp and reflective gear, quarry dust and hearing gear, processing splash and chemical gear. A worker shown only from the back places a dusty sealed equipment bag into a dirty-side locker before reaching the clean side. ' +
      'Composition/framing: 4:3 wide interior view with obvious clean and dirty zones created by floor color and benches, varied PPE colors, no readable labels, no respirator left loose. ' +
      BASE_STYLE,
  },
  {
    key: 'emergency-and-self-rescue-equipment-is-not-routine-work-ppe',
    title: 'Emergency and Self-Rescue Equipment Is Not Routine Work PPE',
    role: 'comparison',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: emergency self-rescue versus routine respirator comparison image. ' +
      'Primary request: a clean underground mine training-room table with two deliberately separated equipment groups: a sealed generic mine self-rescue unit with carrying case, inspection seal and cap lamp on one side; a reusable workplace half-mask respirator with paired particulate filters, cleaning container and fit-test adapter on the other. Use distance and a divider strip to show these are different systems without text, symbols, or arrows. ' +
      'Composition/framing: 4:3 three-quarter product detail, no person wearing either device, no fake approval markings, all equipment intact and unbranded. ' +
      BASE_STYLE,
  },
  {
    key: 'how-to-write-the-differences-into-a-mining-ppe-rfq',
    title: 'How to Write the Differences Into a Mining PPE RFQ',
    role: 'procurement',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: B2B mining PPE procurement and RFQ section image. ' +
      'Primary request: a mine procurement review table in a warehouse with four grouped sample totes representing open pit, underground, quarry, and processing areas; each group contains a distinct helmet or eyewear, glove, boot material sample, garment swatch, accessory, spare part, and blank document packet. Two buyers shown only by hands compare compatibility samples and place a blank approval card beside one complete module. ' +
      'Composition/framing: 4:3 top-down three-quarter view, organized realistic quantities, varied colors, no readable text, no logos, no fake certifications. ' +
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
    const response = await fetch(resultUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({ id: taskId }),
    })

    if (!response.ok) {
      throw new Error(`Poll failed: ${response.status}`)
    }

    const result = (await response.json()) as ResultResponse
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
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
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
  const directory = path.dirname(OUTPUT_JSON)
  if (!existsSync(directory)) {
    await mkdir(directory, { recursive: true })
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
    if (!plan) {
      continue
    }
    console.log(
      `[${index + 1}/${plansToRun.length}] ${plan.key} (${plan.role}, ${plan.aspect})`,
    )

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
  console.log(
    '\nNext step: npm run db:seed:blog -- --slug=open-pit-vs-underground-mining-ppe',
  )

  if (failed > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})
