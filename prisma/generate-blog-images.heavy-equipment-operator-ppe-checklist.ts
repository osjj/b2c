import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
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

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`) || process.argv.includes(`--${name}=true`)
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

const POST_SLUG = 'heavy-equipment-operator-ppe-checklist'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.heavy-equipment-operator-ppe-checklist.generated.json',
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
  'Style/medium: photorealistic editorial construction safety photography, practical B2B PPE checklist tone, realistic heavy equipment and construction PPE details. ' +
  'Lighting/mood: natural daylight, credible, professional, field-oriented, serious but not dramatic. ' +
  'Color palette: construction yellow, high-visibility orange, reflective silver, concrete gray, asphalt black, steel blue, safety helmet white. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no blood, no unsafe tool handling, no distorted PPE, no distorted machinery.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog hero image for a heavy equipment operator PPE checklist. ' +
      'Primary request: construction equipment operator standing safely beside an excavator or wheel loader, wearing high-visibility clothing, safety helmet, safety glasses, hearing protection, gloves, and safety boots. ' +
      'Scene/backdrop: active but controlled construction site with excavator, loader route, cones, spotter, and unfinished concrete structure in the background. ' +
      'Subject: PPE readiness for operators moving between cab and ground. ' +
      'Composition/framing: 16:9 wide hero frame, operator and PPE in foreground with heavy equipment context behind, room for article crop. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-heavy-equipment-operator-ppe-checklist',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image for a quick operator PPE checklist. ' +
      'Primary request: organized cab-kit layout with hi-vis vest, hard hat, safety glasses, earmuffs, earplugs, work gloves, safety boots, and respirator on a clean jobsite table. ' +
      'Scene/backdrop: heavy equipment parking area with excavator blurred in the background and traffic cones nearby. ' +
      'Subject: complete PPE kit before an operator starts a shift. ' +
      'Composition/framing: 4:3 organized flat-lay, realistic PPE, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'why-equipment-operators-need-a-separate-ppe-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image explaining why equipment operators need a separate PPE checklist. ' +
      'Primary request: operator stepping down from a protected excavator cab into an active but controlled ground zone, with visible blind-spot markings, spotter, haul road, and nearby attachments. ' +
      'Scene/backdrop: construction site transition point between cab protection and ground exposure. ' +
      'Subject: the exposure change when an operator leaves the machine. ' +
      'Composition/framing: 4:3 documentary scene, operator centered between cab and ground hazards, PPE clearly visible. ' +
      BASE_STYLE,
  },
  {
    key: 'in-cab-ppe-and-controls-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for in-cab PPE and controls. ' +
      'Primary request: clean heavy equipment cab with visible seat belt, mirrors, clean safety glass, radio, and PPE storage pouch containing safety glasses, earplugs, and gloves. ' +
      'Scene/backdrop: view from the side door of an excavator or loader cab with construction site visible through the glass. ' +
      'Subject: cab controls and PPE storage readiness. ' +
      'Composition/framing: 4:3 medium close-up into the cab, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'outside-cab-ppe-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for outside-cab operator PPE. ' +
      'Primary request: equipment operator after exiting a loader, wearing high-visibility jacket, safety helmet, safety glasses, gloves, hearing protection, and safety boots, standing safely outside the machine swing path. ' +
      'Scene/backdrop: controlled construction work zone with loader, spotter, cones, and haul road. ' +
      'Subject: transition from protected cab to active ground zone. ' +
      'Composition/framing: 4:3 documentary jobsite view, PPE clearly visible. ' +
      BASE_STYLE,
  },
  {
    key: 'mounting-and-dismounting-ppe-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for mounting and dismounting heavy equipment safely. ' +
      'Primary request: close jobsite view of an operator using three points of contact while climbing down metal machine steps, wearing slip-resistant safety boots, gloves, hi-vis clothing, and helmet. ' +
      'Scene/backdrop: loader or excavator access ladder with mud, gravel, and controlled site lighting, no unsafe jumping. ' +
      'Subject: boot traction, handholds, and safe access to heavy equipment. ' +
      'Composition/framing: 4:3 close-to-medium crop focused on steps, boots, hands, and PPE without showing a fall. ' +
      BASE_STYLE,
  },
  {
    key: 'walk-around-inspection-ppe-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for heavy equipment walk-around inspection PPE. ' +
      'Primary request: operator in PPE inspecting excavator bucket, tracks, hydraulic hose area, and attachment pins from a safe position, wearing clear safety glasses, gloves, helmet, hi-vis clothing, and safety boots. ' +
      'Scene/backdrop: parked excavator on compacted gravel with cones and no active movement. ' +
      'Subject: daily inspection hazards around attachments and hydraulic systems. ' +
      'Composition/framing: 4:3 field inspection scene with machine detail and PPE visible. ' +
      BASE_STYLE,
  },
  {
    key: 'hearing-protection-checklist-for-equipment-operators',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for operator hearing protection. ' +
      'Primary request: construction equipment operator wearing helmet-mounted earmuffs and safety glasses while checking a compactor, breaker attachment, or loader from a safe position. ' +
      'Scene/backdrop: heavy equipment staging area with machinery, barriers, and concrete structure behind. ' +
      'Subject: hearing protection compatibility with helmet, eyewear, and communication. ' +
      'Composition/framing: 4:3 medium close-up focused on earmuffs and PPE compatibility. ' +
      BASE_STYLE,
  },
  {
    key: 'high-visibility-checklist-around-heavy-equipment',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for high-visibility PPE around heavy equipment. ' +
      'Primary request: ground operator and spotter wearing clean high-visibility garments with reflective tape near a dump truck route and loader, positioned outside the exclusion zone. ' +
      'Scene/backdrop: haul road, cones, barriers, machinery, asphalt and concrete textures, controlled traffic movement. ' +
      'Subject: visibility from front, side, and back around moving machinery. ' +
      'Composition/framing: 4:3 wide jobsite view with strong contrast between workers and equipment, no readable signs. ' +
      BASE_STYLE,
  },
  {
    key: 'eye-and-face-protection-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for operator eye and face protection. ' +
      'Primary request: operator wearing clear anti-fog safety goggles and helmet while checking equipment in dusty wind, with a face shield and spare safety glasses visible in a clean cab-kit pouch. ' +
      'Scene/backdrop: open construction area with dust control, machine parked safely, no injuries. ' +
      'Subject: clear eye protection for dust, wind, particles, and walk-around checks. ' +
      'Composition/framing: 4:3 medium close-up focused on eyewear compatibility with helmet and hearing protection. ' +
      BASE_STYLE,
  },
  {
    key: 'footwear-checklist-for-operators',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for operator safety footwear. ' +
      'Primary request: realistic safety boots on heavy equipment steps and mixed jobsite ground, showing slip-resistant tread, toe protection, mud, gravel, asphalt edge, and oily service area nearby. ' +
      'Scene/backdrop: lower part of loader or excavator access area with handhold and safe stance. ' +
      'Subject: footwear that works on both machine access points and construction ground. ' +
      'Composition/framing: 4:3 close-up with boots and machine steps prominent, no brand labels. ' +
      BASE_STYLE,
  },
  {
    key: 'task-based-operator-ppe-matrix',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for a task-based PPE matrix. ' +
      'Primary request: realistic construction scene showing three operator contexts: excavator walk-around inspection, roadwork roller operator near traffic cones, and demolition loader operator near concrete debris. ' +
      'Scene/backdrop: editorial multi-zone construction site with clear but safe separation between work areas. ' +
      'Subject: operators wearing task-appropriate hi-vis, hearing protection, eye protection, gloves, safety helmets, and boots. ' +
      'Composition/framing: 4:3 balanced multi-scene composition without readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'procurement-checklist-for-operator-ppe-kits',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for operator PPE kit procurement. ' +
      'Primary request: warehouse dispatch table with multiple heavy equipment operator PPE kits staged in bins: hi-vis garments, helmets, safety glasses, earmuffs, earplugs, gloves, respirators, and safety boots. ' +
      'Scene/backdrop: construction supplier warehouse with equipment silhouettes and cartons in the background. ' +
      'Subject: bulk PPE kit preparation for construction equipment operators. ' +
      'Composition/framing: 4:3 organized inventory scene, no readable labels or logos. ' +
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
    progress?: number
    results?: Array<{ url?: string }>
    failure_reason?: string
    error?: string
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
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
    await sleep(3000)

    const resultRes = await fetch(resultUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({ id: taskId }),
    })

    if (!resultRes.ok) {
      throw new Error(`Result failed: ${resultRes.status} ${resultRes.statusText}`)
    }

    const result = (await resultRes.json()) as ResultResponse
    if (result.code !== 0) {
      throw new Error(`Result error: ${result.msg}`)
    }

    if (result.data?.status === 'failed') {
      throw new Error(result.data.failure_reason || result.data.error || 'Image generation failed')
    }

    if (result.data?.status === 'succeeded') {
      const url = result.data.results?.[0]?.url
      if (!url) {
        throw new Error('Image generation succeeded without image URL')
      }
      return url
    }
  }

  throw new Error(`Timed out generating image: ${plan.key}`)
}

async function uploadImage(sourceUrl: string, key: string): Promise<string> {
  const imageRes = await fetch(sourceUrl)
  if (!imageRes.ok) {
    throw new Error(`Download failed: ${imageRes.status} ${imageRes.statusText}`)
  }

  const contentType = imageRes.headers.get('content-type') || 'image/webp'
  const extension = contentType.includes('png') ? 'png' : 'webp'
  const bytes = Buffer.from(await imageRes.arrayBuffer())
  const objectKey = `blog/${POST_SLUG}/${key}-${Date.now()}.${extension}`

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      Body: bytes,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )

  return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${objectKey}`
}

function loadExistingResults(): Record<string, string> {
  if (!existsSync(OUTPUT_JSON)) {
    return {}
  }

  try {
    const parsed = JSON.parse(readFileSync(OUTPUT_JSON, 'utf8')) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === 'string' && typeof entry[1] === 'string' && entry[1].length > 0,
      ),
    )
  } catch {
    return {}
  }
}

async function generateImageWithRetry(plan: ImagePlan): Promise<string> {
  const maxAttempts = 3
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (attempt > 1) {
        console.log(`Retrying ${plan.key} (${attempt}/${maxAttempts})...`)
      }
      return await generateImage(plan)
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Generation failed for ${plan.key} (${attempt}/${maxAttempts}): ${message}`)
      if (attempt < maxAttempts) {
        await sleep(5000)
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

async function main(): Promise<void> {
  if (!existsSync(path.dirname(OUTPUT_JSON))) {
    await mkdir(path.dirname(OUTPUT_JSON), { recursive: true })
  }

  const results: Record<string, string> = loadExistingResults()
  const force = hasFlag('force')
  const failures: string[] = []

  for (const plan of PLAN) {
    if (!force && results[plan.key]) {
      console.log(`Skipping ${plan.key}; already exists.`)
      continue
    }

    try {
      console.log(`Generating ${plan.key}...`)
      const generatedUrl = await generateImageWithRetry(plan)
      console.log(`Uploading ${plan.key}...`)
      results[plan.key] = await uploadImage(generatedUrl, plan.key)
      await writeFile(OUTPUT_JSON, `${JSON.stringify(results, null, 2)}\n`, 'utf8')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${plan.key}: ${message}`)
      console.error(`Skipping failed image ${plan.key}: ${message}`)
    }
  }

  await writeFile(OUTPUT_JSON, `${JSON.stringify(results, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${OUTPUT_JSON}`)

  if (failures.length > 0) {
    throw new Error(`Failed to generate ${failures.length} image(s):\n${failures.join('\n')}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
