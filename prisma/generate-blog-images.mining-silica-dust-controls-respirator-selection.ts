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

const POST_SLUG = 'mining-silica-dust-controls-respirator-selection'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.mining-silica-dust-controls-respirator-selection.generated.json',
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
  | 'comparison'
  | 'standards'
  | 'procurement'

interface ImagePlan {
  key: string
  title: string
  role: ImageRole
  aspect: '16:9' | '4:3'
  prompt: string
}

const BASE_STYLE =
  'Style/medium: photorealistic editorial industrial-hygiene and mining safety photography, practical B2B technical-guide tone, realistic quarry scale and equipment. ' +
  'Lighting/mood: natural daylight or clean training-room light, credible, calm, professional, safety-focused, never dramatic disaster lighting. ' +
  'Color palette: limestone gray, muted machinery yellow, navy and charcoal workwear, restrained orange, lime, blue, and teal PPE accents. ' +
  'Accuracy: correct human proportions, intact PPE, controlled access, realistic dust-control equipment, no worker standing in a dust plume, no suggestion that a respirator replaces engineering controls. ' +
  'Constraints: no readable text, no formulas printed in the image, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no blood, no distress, no unsafe tool use, no open moving machinery, no distorted respirators, no loose straps, no incorrect filter attachment.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    title: 'Silica Dust Controls and Respirator Selection for Mining and Quarrying',
    role: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. Asset type: wide blog hero for a mine silica control and respirator selection guide. ' +
      'Primary request: a realistic limestone quarry with an idle drill rig using visible wet dust suppression in the foreground, an enclosed crushing and screening plant with local extraction in the middle distance, and a positive-pressure haul-truck cab in the background. At a clean upwind observation point, an industrial hygienist checks a personal sampling pump on one clean-shaven worker; a closed respirator case sits on a clean table as a secondary last-line control. ' +
      'Composition/framing: 16:9 wide three-quarter documentary view, engineering controls and sampling are visually primary, people secondary, breathable negative space for responsive cropping. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-decision-flow-measure-control-verify-then-select',
    title: 'Quick Decision Flow: Measure, Control, Verify, Then Select',
    role: 'checklist',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: visual decision-flow section image without text. ' +
      'Primary request: a top-down industrial hygiene planning table showing a logical left-to-right sequence through physical objects: personal sampling pump and cyclone, water-spray nozzle and ventilation airflow meter, clean sample cassette case, calculator and blank worksheet, three distinct NIOSH-style respirator classes, fit-test adapter, and clean storage container. Use spacing and object grouping to imply sequence without arrows or labels. ' +
      'Scene/backdrop: clean quarry safety office table with one rock core at the edge. Composition/framing: 4:3 overhead, no people, no readable paperwork. ' +
      BASE_STYLE,
  },
  {
    key: 'exposure-monitoring-sample-the-work-that-actually-happens',
    title: 'Exposure Monitoring: Sample the Work That Actually Happens',
    role: 'scenario',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: section image for personal silica exposure monitoring. ' +
      'Primary request: an industrial hygienist in a clean staging area clips a calibrated personal sampling pump to a quarry worker belt and positions a respirable-dust cyclone in the breathing zone near the collar. The worker is clean-shaven, wearing a blue retained helmet, clear eye protection, navy fitted coveralls, gloves carried at the belt, and protective boots; no respirator because this is clean-area setup before work. ' +
      'Scene/backdrop: guarded crushing plant softly out of focus, sampling case and calibration device on a bench, no active dust cloud. Composition/framing: 4:3 close waist-level documentary view emphasizing correct sampler placement. ' +
      BASE_STYLE,
  },
  {
    key: 'engineering-controls-by-mining-and-quarrying-process',
    title: 'Engineering Controls by Mining and Quarrying Process',
    role: 'scenario',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: section image for mining silica engineering controls. ' +
      'Primary request: a guarded quarry crusher transfer point operating with a close-fitting enclosure, local exhaust duct, intact belt skirts, and fine water sprays visibly capturing dust at the source. No worker is close to the moving equipment; one operator observes from behind a sealed control-room window. ' +
      'Composition/framing: 4:3 environmental side view, controls and containment dominate, realistic moderate moisture with no excessive muddy spray. ' +
      BASE_STYLE,
  },
  {
    key: 'verify-controls-before-selecting-respiratory-protection',
    title: 'Verify Controls Before Selecting Respiratory Protection',
    role: 'inspection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: control-verification section image. ' +
      'Primary request: a mine ventilation technician checks pressure differential at a closed heavy-equipment cab while a second technician inspects the clean intake filter and door seal. Include a handheld manometer with a simple unreadable display, intact gaskets, a clean replacement filter, and the dusty exterior contrasted with the clean cab interior. ' +
      'PPE: gray helmet, clear glasses, blue coveralls, nitrile-coated gloves, protective boots. Composition/framing: 4:3 close three-quarter inspection view, stationary equipment, no respirator visible. ' +
      BASE_STYLE,
  },
  {
    key: 'calculate-required-protection-and-choose-an-apf',
    title: 'Calculate Required Protection and Choose an APF',
    role: 'standards',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: APF selection section image without readable numbers. ' +
      'Primary request: a clean respiratory program desk with a sampling report represented by blank graph shapes, a calculator, and four equipment classes arranged by increasing protection concept: filtering facepiece, reusable half-mask with paired particulate filters, full-face air-purifying respirator, and loose-fitting PAPR hood with blower. Each device is intact, unbranded, clearly separated, and realistically proportioned. ' +
      'Composition/framing: 4:3 top-down three-quarter product layout, no people, no text or numeric labels, neutral charcoal and teal accents. ' +
      BASE_STYLE,
  },
  {
    key: '100-series-he-p100-facepieces-and-paprs',
    title: '100-Series, HE, P100, Facepieces, and PAPRs',
    role: 'comparison',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: respirator component comparison section image. ' +
      'Primary request: side-by-side technical tabletop display of one reusable half-mask with paired magenta-colored 100-series-style filters, a full-face respirator with matching particulate filters, and a loose-fitting PAPR hood connected to a belt blower and high-efficiency filter. Components must look complete and compatible, with blank molded surfaces and no certification text. ' +
      'Scene/backdrop: clean respirator inspection bench with spare seals and a flow indicator at the edge. Composition/framing: 4:3 eye-level three-quarter product detail, no worker. ' +
      BASE_STYLE,
  },
  {
    key: 'fit-testing-seal-checks-and-facial-hair',
    title: 'Fit Testing, Seal Checks, and Facial Hair',
    role: 'inspection',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: quantitative fit-testing section image. ' +
      'Primary request: a trained fit-test technician conducts a quantitative fit test on a clean-shaven mine worker wearing a correctly fitted reusable half-mask with test adapter tubing. The worker is seated in a clean training room and turns the head slightly as part of the protocol; the technician observes a compact instrument with an unreadable screen. ' +
      'PPE and accuracy: straps correctly positioned, no facial hair at the sealing surface, no safety glasses breaking the seal, no dust, no active mining work. Composition/framing: 4:3 medium close-up with the facepiece seal and test tubing clearly visible. ' +
      BASE_STYLE,
  },
  {
    key: 'build-the-written-respiratory-protection-program',
    title: 'Build the Written Respiratory Protection Program',
    role: 'procurement',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: written-program and respirator inventory section image. ' +
      'Primary request: a clean mine PPE storeroom and respirator program station showing individually stored reusable facepieces in open ventilated containers, sealed replacement filters, spare valves and straps, PAPR batteries on chargers, cleaning supplies, inspection tools, and a row of blank color-coded folders without words. A program administrator wearing clean gloves inspects one facepiece at the bench; only hands and torso visible. ' +
      'Composition/framing: 4:3 three-quarter inventory view, organized but realistic quantities, no brand labels, no respirator stored loose in dust. ' +
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
  return Buffer.from(await res.arrayBuffer())
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
  console.log(
    '\nNext step: npm run db:seed:blog -- --slug=mining-silica-dust-controls-respirator-selection',
  )

  if (failed > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})
