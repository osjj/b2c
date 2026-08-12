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

const POST_SLUG = 'mining-ppe-checklist-by-task'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.mining-ppe-checklist-by-task.generated.json',
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
  'Style/medium: photorealistic editorial mining safety photography, practical B2B field-checklist tone, realistic open-pit mine and quarry equipment. ' +
  'Lighting/mood: natural daylight, credible, professional, calm, safety-focused, never cinematic disaster lighting. ' +
  'Color palette: limestone gray, iron-ore brown, muted machinery yellow, PPE accents in orange, lime, blue, red, black, and white. ' +
  'Accuracy: correct human proportions, intact PPE, guarded equipment, controlled access, clean fit, realistic scale between workers and heavy machinery. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no blood, no distress, no active explosion, no exposed explosives, no unsafe tool use, no worker inside a vehicle blind spot, no unguarded moving machinery, no distorted PPE.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    title: 'Mining PPE Checklist by Task',
    role: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: wide blog hero for a task-based mining PPE checklist. ' +
      'Primary request: a realistic surface mine and quarry operating landscape that clearly connects three work zones without looking like a collage: an idle drill rig with a small PPE-prepared crew at a marked safe staging area in the foreground, a guarded crushing and screening plant with dust suppression in the middle distance, and haul trucks traveling on a maintained bermed haul road in the background. ' +
      'PPE: mixed orange, blue, and yellow helmets; clear eye protection; earmuffs where appropriate; orange and lime high-visibility outerwear; gloves and protective boots, all properly fitted. ' +
      'Composition/framing: 16:9 wide three-quarter documentary view, workers secondary to the work zones, space for responsive article cropping, no active blasting. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-mining-ppe-checklist-by-task',
    title: 'Quick Mining PPE Checklist by Task',
    role: 'checklist',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: section image for a quick task-by-task mining PPE checklist. ' +
      'Primary request: top-down mine dispatch table with six visually distinct task modules arranged in separate open trays without words: head protection, impact eyewear, hearing protection, half-face respirator, task-specific gloves, high-visibility garment, and protective footwear components, plus a radio and inspection light. Use varied PPE colors and different combinations so the modules visibly differ. ' +
      'Scene/backdrop: rugged clean dispatch table inside a quarry safety room, rock samples and an out-of-focus mine map with no legible markings at the edge. ' +
      'Composition/framing: 4:3 overhead flat-lay, no people, organized and procurement-ready, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'drilling-ppe-checklist',
    title: 'Drilling PPE Checklist',
    role: 'inspection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: section image for drilling PPE inspection. ' +
      'Primary request: one quarry drill operator completing a pre-start inspection beside a stationary rotary drill rig in a clearly controlled zone; water dust-suppression hose and intact guards visible, drill steel not moving. The operator wears a blue retained safety helmet, clear sealed goggles, helmet-compatible earmuffs, fitted work clothing without loose ends, appropriate gloves held or worn only for inspection, and brown protective boots. ' +
      'Scene/backdrop: stable limestone bench, exclusion cones without text, no other worker near the rig. ' +
      'Composition/framing: 4:3 waist-level three-quarter documentary view emphasizing inspection, guarding, and PPE compatibility rather than machine operation. ' +
      BASE_STYLE,
  },
  {
    key: 'blasting-ppe-checklist',
    title: 'Blasting PPE Checklist',
    role: 'scenario',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: section image for safe blasting readiness, not blasting technique. ' +
      'Primary request: an authorized mine safety supervisor and one team member at a secure pre-blast control point, checking radio communication and access control from a safe location. A distant rock bench is empty; access is barricaded with plain colored barriers and warning beacons without text. ' +
      'PPE: red and yellow retained helmets, clear eye protection, navy protective coveralls, orange high-visibility outer layers, protective boots, radios; no explosives or initiation devices visible. ' +
      'Composition/framing: 4:3 medium-long documentary view, workers outside the blast area, no smoke, no explosion, no dramatic action. ' +
      BASE_STYLE,
  },
  {
    key: 'crushing-ppe-checklist',
    title: 'Crushing PPE Checklist',
    role: 'scenario',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: section image for crusher-area PPE and control checks. ' +
      'Primary request: a crusher operator conducting a visual check from a guarded access platform beside an enclosed jaw crusher and conveyor transfer; railings, fixed guards, emergency pull cord, water sprays, and tidy walkways visible. Worker remains outside moving material paths. ' +
      'PPE: orange helmet, clear impact goggles, black earmuffs, lime high-visibility long-sleeve shirt, charcoal gloves, protective boots. ' +
      'Composition/framing: 4:3 side-profile environmental view with guarded machinery and dust control as important as the worker. ' +
      BASE_STYLE,
  },
  {
    key: 'screening-and-processing-ppe-checklist',
    title: 'Screening and Processing PPE Checklist',
    role: 'product-detail',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: section image for screening and processing PPE selection. ' +
      'Primary request: close-up inspection station beside a fully guarded mineral screening plant, showing gloved hands safely checking a sealed sample container and compatible PPE staged on a stainless side bench: blue helmet, sealed goggles, compact earmuffs, half-face respirator in a clean storage bag, and two different glove types for dry sample handling and splash work. ' +
      'Scene/backdrop: wet-process pipes, guarded screen deck, handrails, and clean anti-slip walkway softly visible; no chemicals poured and no moving equipment contact. ' +
      'Composition/framing: 4:3 close three-quarter detail, hands and organized PPE are primary, no face portrait, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'haul-roads-and-transport-ppe-checklist',
    title: 'Haul Roads and Transport PPE Checklist',
    role: 'scenario',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: section image for haul-road and transport PPE checks. ' +
      'Primary request: a haul-road spotter standing in a designated protected turnout, making positive radio contact while a large haul truck remains far away on a wide maintained road with visible berms. A parked light vehicle has a whip flag and beacon. ' +
      'PPE: lime high-visibility jacket as the outermost layer, white retained helmet, clear dust eyewear, gloves, rugged protective boots, radio; worker is well outside all vehicle blind areas. ' +
      'Composition/framing: 4:3 long-lens documentary view showing safe separation, road geometry, berm, visibility, and communication. ' +
      BASE_STYLE,
  },
  {
    key: 'maintenance-ppe-checklist',
    title: 'Maintenance PPE Checklist',
    role: 'inspection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: section image for mine maintenance isolation and PPE. ' +
      'Primary request: two maintenance technicians at an isolated crusher drive in a barricaded service bay, verifying a de-energized disconnect and securely blocked components before work; personal locks and blank tags visible without readable text, tools still organized on a cart, no repair underway. ' +
      'PPE: one technician in blue helmet and clear glasses with cut-resistant gloves, one in orange helmet with raised clear face shield over primary eyewear, both in fitted coveralls and protective boots. ' +
      'Composition/framing: 4:3 medium close-up emphasizing isolation hardware, blocking, PPE condition, and controlled work area. ' +
      BASE_STYLE,
  },
  {
    key: 'how-supervisors-turn-the-checklist-into-role-kits',
    title: 'How Supervisors Turn the Checklist Into Role Kits',
    role: 'procurement',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: section image for role-based mining PPE kit planning. ' +
      'Primary request: practical mine warehouse packing station with a shared baseline PPE set and separate drill, processing, haul-road, and maintenance modules arranged in open gray bins. Include varied helmets, eyewear, earmuffs, respirator storage, glove types, folded orange and lime garments, protective boots, spare lenses, filters, and hygiene supplies. ' +
      'Scene/backdrop: clean industrial PPE storeroom with plain cartons and shelving, no people and no readable inventory labels. ' +
      'Composition/framing: 4:3 eye-level three-quarter inventory scene, clear visual separation between baseline and task modules, realistic quantities rather than showroom fantasy. ' +
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
  console.log('\nNext step: npm run db:seed:blog -- --slug=mining-ppe-checklist-by-task')

  if (failed > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})
