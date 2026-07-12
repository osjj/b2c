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

const POST_SLUG = 'vented-vs-non-vented-hard-hats-construction'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.vented-vs-non-vented-hard-hats-construction.generated.json',
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
  role:
    | 'hero'
    | 'product-detail'
    | 'comparison'
    | 'scenario'
    | 'procurement'
    | 'inspection'
    | 'standards'
    | 'checklist'
  aspect: '16:9' | '4:3'
  prompt: string
}

const BASE_STYLE =
  'Style/medium: photorealistic editorial construction safety photography, practical B2B PPE buying tone, realistic hard hat shell, vent, suspension, and accessory details. ' +
  'Lighting/mood: natural daylight, credible, professional, field-oriented, clean industrial safety aesthetic. ' +
  'Color palette: concrete gray, steel blue, safety yellow, muted orange, matte black accessory details, controlled use of white helmets. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no blood, no distorted helmets, no unsafe tool use, no generic construction worker portrait.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    role: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog hero image for vented vs non-vented hard hats construction buyer guide. ' +
      'Primary request: side-by-side comparison of a yellow vented hard hat with visible side slots and a blue non-vented hard hat with a smooth shell before a bulk PPE order. ' +
      'Scene/backdrop: organized warehouse PPE table at a construction supplier staging area, cartons and replacement suspensions softly blurred in background. ' +
      'Subject: vented hard hat, non-vented hard hat, safety glasses, insulated gloves, cooling towel, chin strap, and blank RFQ clipboard without readable words. ' +
      'Composition/framing: 16:9 wide editorial hero, product comparison in foreground, no worker as the main subject, room for article crop. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-answer-vented-vs-non-vented-hard-hats',
    role: 'comparison',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: quick buyer answer showing the practical difference between airflow vents and smooth non-vented shells. ' +
      'Scene/backdrop: clean concrete-texture safety table, softly blurred jobsite entry gate in the distance. ' +
      'Subject: orange vented hard hat angled to show shell vents beside a gray non-vented hard hat angled to show uninterrupted shell, with safety glasses and blank checklist. ' +
      'Composition/framing: 4:3 top-down comparison, no people, no labels, clear shell differences. ' +
      BASE_STYLE,
  },
  {
    key: 'what-vented-hard-hats-are-good-for',
    role: 'product-detail',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: vented hard hat airflow and hot-weather acceptance for non-electrical construction tasks. ' +
      'Scene/backdrop: shaded outdoor construction staging table with summer daylight, water bottle, cooling towel, safety glasses, and gloves nearby. ' +
      'Subject: close-up of yellow vented hard hat side vents and suspension, no worker face, hands only adjusting the suspension. ' +
      'Composition/framing: 4:3 macro-detail product scene, vents clearly visible, no electrical equipment. ' +
      BASE_STYLE,
  },
  {
    key: 'when-non-vented-hard-hats-are-the-better-choice',
    role: 'standards',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: non-vented hard hats as the conservative choice when electrical exposure or mixed jobsite issue is possible. ' +
      'Scene/backdrop: controlled electrical construction staging area with temporary power equipment safely blurred in background. ' +
      'Subject: smooth blue non-vented hard hat on insulated rubber gloves with safety glasses and blank inspection card. ' +
      'Composition/framing: 4:3 close product scene, no vents, no readable signage, no active electrical work. ' +
      BASE_STYLE,
  },
  {
    key: 'electrical-classes-class-e-class-g-and-class-c',
    role: 'standards',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: electrical class review before choosing vented or non-vented shells. ' +
      'Scene/backdrop: safety office workbench with hard hat samples, insulated gloves, blank spec sheets, and non-readable certification-style tags. ' +
      'Subject: grouped hard hats: smooth non-vented electrical-style shells and a vented Class C-style shell separated on the table. ' +
      'Composition/framing: 4:3 organized standards review layout, no workers, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'vented-vs-non-vented-hard-hat-comparison-table',
    role: 'comparison',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: comparison table concept for vented versus non-vented hard hats without actual text. ' +
      'Scene/backdrop: procurement desk with blank grid sheet, hard hat samples, accessory parts, safety glasses, and gloves. ' +
      'Subject: vented yellow hard hat and non-vented black hard hat placed on opposite sides of a blank comparison sheet. ' +
      'Composition/framing: 4:3 clean flat-lay procurement comparison, no readable labels or words. ' +
      BASE_STYLE,
  },
  {
    key: 'construction-scenarios-which-shell-should-buyers-choose',
    role: 'scenario',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: different construction scenarios requiring different shell choices across one contractor order. ' +
      'Scene/backdrop: site safety planning area with jobsite entrance, shaded material staging, and warehouse cart visible. ' +
      'Subject: safety supervisor in neutral work shirt arranging yellow vented helmets for outdoor crew and blue non-vented helmets for electrical-risk area, workers blurred in background. ' +
      'Composition/framing: 4:3 documentary planning scene, supervisor and products visible but not a generic portrait. ' +
      BASE_STYLE,
  },
  {
    key: 'heat-stress-comfort-and-ppe-compliance',
    role: 'scenario',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: heat stress and worker comfort planning without downgrading required PPE class. ' +
      'Scene/backdrop: shaded rest station on a hot construction site with water cooler, cooling towel, safety glasses, and gloves. ' +
      'Subject: orange vented hard hat on table beside cooling towel and checklist, worker hands setting down the helmet, no face. ' +
      'Composition/framing: 4:3 comfort-focused PPE planning scene, no electrical equipment, no distress. ' +
      BASE_STYLE,
  },
  {
    key: 'accessory-compatibility-and-shell-modifications',
    role: 'product-detail',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: accessory compatibility check without drilling or modifying hard hat shells. ' +
      'Scene/backdrop: organized PPE fitting bench in a construction safety office. ' +
      'Subject: non-vented hard hat with chin strap, face shield bracket, helmet-mounted earmuffs, headlamp, safety glasses, and respirator nearby; separate vented hard hat sample in background. ' +
      'Composition/framing: 4:3 detailed accessory compatibility layout, no tools drilling shells, no text. ' +
      BASE_STYLE,
  },
  {
    key: 'how-to-write-vented-or-non-vented-hard-hats-into-an-rfq',
    role: 'procurement',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: RFQ preparation for vented and non-vented hard hats with Type, Class, shell style, accessories, samples, and documentation. ' +
      'Scene/backdrop: procurement desk at construction safety office with laptop screen blurred, blank RFQ forms, cartons, hard hats, and accessory samples. ' +
      'Subject: buyer hands comparing vented and non-vented hard hat samples before supplier request. ' +
      'Composition/framing: 4:3 B2B procurement planning scene, no readable text or brand marks. ' +
      BASE_STYLE,
  },
  {
    key: 'inspection-marking-and-inventory-controls',
    role: 'inspection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: inspection, marking, and inventory controls to keep vented Class C stock out of electrical work zones. ' +
      'Scene/backdrop: warehouse PPE shelf with separated bins, blank non-readable tags, replacement suspensions, and cartons. ' +
      'Subject: supervisor inspecting inside of a non-vented hard hat shell and suspension while vented hard hats are stored separately. ' +
      'Composition/framing: 4:3 practical inventory control scene, no readable bin labels. ' +
      BASE_STYLE,
  },
  {
    key: 'common-buying-mistakes',
    role: 'procurement',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: common buying mistakes such as treating vented shells as a universal upgrade and mixing shell classes in inventory. ' +
      'Scene/backdrop: PPE packing table with separated helmet groups, accessory parts, blank pick list, and cartons. ' +
      'Subject: procurement worker sorting mixed vented and non-vented hard hats into clearly separate order groups, no readable labels. ' +
      'Composition/framing: 4:3 mistake-prevention inventory scene, products dominate, no generic worker portrait. ' +
      BASE_STYLE,
  },
  {
    key: 'buyer-checklist',
    role: 'checklist',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: buyer checklist for selecting vented or non-vented hard hats by electrical exposure, impact type, ventilation, accessories, and replacement parts. ' +
      'Scene/backdrop: clean safety office table with mixed hard hat samples, blank checklist, safety glasses, gloves, chin strap, earmuffs, and replacement suspension. ' +
      'Subject: organized PPE selection checklist scene without readable text, balanced mix of yellow, blue, and gray helmets. ' +
      'Composition/framing: 4:3 clean B2B buying guide visual, no people, practical and credible. ' +
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
    '\nNext step: npm run db:seed:blog -- --slug=vented-vs-non-vented-hard-hats-construction',
  )
}

main().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})
