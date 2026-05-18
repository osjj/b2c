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

const POST_SLUG = 'scaffolding-ppe-checklist'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.scaffolding-ppe-checklist.generated.json',
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
  'Style/medium: photorealistic editorial construction safety photography, practical B2B scaffolding PPE checklist tone, realistic scaffold access details. ' +
  'Lighting/mood: natural daylight, credible, professional, field-oriented, serious but not dramatic. ' +
  'Color palette: galvanized steel, concrete gray, high-visibility lime and orange, helmet white, harness black, glove charcoal, boot leather brown. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no unsafe climbing, no missing guardrails in active use scenes, no distorted PPE.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog hero image for a scaffolding PPE checklist. ' +
      'Primary request: scaffold crew prepared for work, wearing safety helmets with chin straps, high-visibility clothing, full body harnesses where needed, anti-slip safety boots, gloves, eye protection, and tool lanyards. ' +
      'Scene/backdrop: controlled construction site with modular scaffold, guardrails, toe boards, ladder access, tagged inspection point with no readable text, and concrete structure. ' +
      'Subject: complete PPE readiness before scaffold work starts. ' +
      'Composition/framing: 16:9 wide hero frame, crew and PPE visible in foreground with scaffold context behind, room for article crop. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-scaffolding-ppe-checklist',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image for a quick scaffolding PPE checklist. ' +
      'Primary request: organized scaffold PPE kit on a jobsite dispatch table: helmet with chin strap, safety glasses, high-visibility vest, full body harness, lanyard, tool tether, cut-resistant gloves, and anti-slip safety boots. ' +
      'Scene/backdrop: scaffold access area with guardrails, ladder, toe board, and construction structure softly visible. ' +
      'Subject: baseline scaffolding PPE before work starts. ' +
      'Composition/framing: 4:3 organized flat-lay with realistic PPE, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'ppe-by-scaffolding-role',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for PPE by scaffolding role. ' +
      'Primary request: scaffold erector, scaffold user, inspector, and ground support worker shown in distinct but coordinated PPE, with helmets, hi-vis, gloves, boots, harness where appropriate, and tool tethering. ' +
      'Scene/backdrop: scaffold staging zone with components organized, completed scaffold behind, and safe access route. ' +
      'Subject: role-based scaffolding PPE packages. ' +
      'Composition/framing: 4:3 balanced jobsite scene, roles clear without text labels. ' +
      BASE_STYLE,
  },
  {
    key: 'fall-protection-and-harness-checks',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for fall protection and harness checks. ' +
      'Primary request: safety supervisor checking a worker full body harness and lanyard before scaffold access, with anchor and rescue gear staged safely. ' +
      'Scene/backdrop: scaffold platform with guardrails, ladder access, toe boards, and clear tie-off planning area. ' +
      'Subject: harness inspection, compatibility, and rescue planning for scaffold work. ' +
      'Composition/framing: 4:3 medium close-up focused on harness fit, helmet, gloves, and lanyard connectors. ' +
      BASE_STYLE,
  },
  {
    key: 'head-protection-and-chin-strap-retention',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for head protection and chin straps. ' +
      'Primary request: close view of scaffold workers wearing safety helmets with chin straps while handling scaffold tubes and couplers in a controlled staging zone. ' +
      'Scene/backdrop: scaffold structure, guardrails, overhead activity zone, and material racks visible. ' +
      'Subject: helmet retention and head protection for climbing and elevated platform work. ' +
      'Composition/framing: 4:3 medium close-up focused on helmets, chin straps, eye protection, and gloves. ' +
      BASE_STYLE,
  },
  {
    key: 'footwear-for-ladders-platforms-and-wet-planks',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for scaffold footwear. ' +
      'Primary request: close-up of anti-slip safety boots on scaffold ladder rungs and platform decking, showing secure footing in damp conditions. ' +
      'Scene/backdrop: scaffold access area with guardrails, toe boards, wet deck sheen, and concrete worksite below blurred safely. ' +
      'Subject: boot grip and platform footing for scaffolding. ' +
      'Composition/framing: 4:3 low-angle close-up, boots sharp and scaffold surface realistic. ' +
      BASE_STYLE,
  },
  {
    key: 'gloves-for-scaffold-tubes-couplers-and-tools',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image for scaffolding gloves. ' +
      'Primary request: scaffold glove options arranged beside galvanized tubes, couplers, ratchet wrench, and clean fasteners: cut-resistant coated gloves, impact gloves, and dexterity work gloves. ' +
      'Scene/backdrop: scaffold component staging table at a construction site, completed scaffold blurred behind. ' +
      'Subject: glove selection for scaffold tubes, couplers, and hand tools. ' +
      'Composition/framing: 4:3 product flat-lay with realistic materials, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'tool-tethering-and-dropped-object-prevention',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for tool tethering and dropped-object prevention. ' +
      'Primary request: scaffold worker attaching a tool lanyard to a wrench and belt anchor while standing on a guarded scaffold platform. ' +
      'Scene/backdrop: platform with toe boards, netting or controlled drop zone below, scaffold tubes, and construction structure. ' +
      'Subject: practical tool tethering before elevated work starts. ' +
      'Composition/framing: 4:3 medium close-up focused on tethered tool, gloves, harness, and guardrails. ' +
      BASE_STYLE,
  },
  {
    key: 'scaffolding-ppe-kit-examples',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image for scaffolding PPE kit examples. ' +
      'Primary request: multiple scaffold PPE kits staged in a contractor warehouse for erectors, users, inspectors, and replacement stock, with helmets, harnesses, lanyards, gloves, boots, hi-vis garments, eyewear, and tool tethers. ' +
      'Scene/backdrop: warehouse dispatch table opening toward a scaffold yard with components and cartons. ' +
      'Subject: organized role-based PPE kit procurement for scaffold crews. ' +
      'Composition/framing: 4:3 practical inventory scene, blank labels only, no readable text. ' +
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
