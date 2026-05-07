import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { existsSync } from 'node:fs'
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

const POST_SLUG = 'high-visibility-clothing-construction'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.high-visibility-clothing-construction.generated.json',
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
  'Style/medium: photorealistic editorial construction safety photography, practical B2B PPE buying tone, realistic high-visibility clothing details. ' +
  'Lighting/mood: natural daylight, credible, professional, field-oriented, serious but not dramatic. ' +
  'Color palette: fluorescent yellow-green, safety orange, reflective silver, concrete gray, steel blue, asphalt black. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no distorted reflective tape.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog hero image for construction high-visibility clothing. ' +
      'Primary request: construction workers wearing ANSI-style high-visibility vests, shirts, hard hats, safety glasses, gloves, and boots near moving equipment. ' +
      'Scene/backdrop: active construction site with telehandler, dump truck route, cones, concrete structure, and controlled pedestrian zone. ' +
      'Subject: hi-vis garment coverage and reflective layout are the clear focus. ' +
      'Composition/framing: 16:9 wide hero frame, workers in foreground with equipment context behind, room for article crop. ' +
      BASE_STYLE,
  },
  {
    key: 'why-high-visibility-clothing-matters-on-construction-sites',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: construction worker in high-visibility clothing standing safely near a controlled truck route. ' +
      'Scene/backdrop: jobsite access road with reversing dump truck, cones, spotter, and unfinished concrete building. ' +
      'Subject: worker visibility against construction background and vehicle movement. ' +
      'Composition/framing: 4:3 documentary jobsite view with strong depth and clear sight-line context. ' +
      BASE_STYLE,
  },
  {
    key: 'what-osha-and-ansi-require-for-construction-hi-vis',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: safety manager reviewing high-visibility garments for a construction crew. ' +
      'Scene/backdrop: jobsite safety table with hi-vis vest, long-sleeve shirt, hard hat, blurred compliance forms, and cones. ' +
      'Subject: supervisor checking labels and reflective tape without readable text. ' +
      'Composition/framing: 4:3 medium close-up, standards and inspection concept clear, no readable words. ' +
      BASE_STYLE,
  },
  {
    key: 'ansiisea-107-types-and-classes-explained',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: comparison lineup of high-visibility construction garments by coverage level. ' +
      'Scene/backdrop: clean industrial workbench with concrete texture and soft jobsite background. ' +
      'Subject: hi-vis vest, short-sleeve shirt, long-sleeve shirt, jacket, and trousers arranged clearly with reflective tape visible. ' +
      'Composition/framing: 4:3 organized product composition, realistic fabric and reflective details, no text. ' +
      BASE_STYLE,
  },
  {
    key: 'en-iso-20471-classes-for-international-projects',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: international construction PPE procurement scene for high-visibility clothing. ' +
      'Scene/backdrop: warehouse quality-control table with hi-vis jackets, vests, sealed sample bags, and blurred export documents. ' +
      'Subject: certified garment inspection and documentation concept, no readable text or logos. ' +
      'Composition/framing: 4:3 clean procurement inspection image, reflective material and label area visible but unreadable. ' +
      BASE_STYLE,
  },
  {
    key: 'class-1-class-2-or-class-3-which-one-fits-the-job',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: construction workers in different hi-vis garment coverage levels matched to different site zones. ' +
      'Scene/backdrop: split editorial construction scene showing controlled building site, loading zone, and roadwork edge. ' +
      'Subject: workers wearing vest, long-sleeve hi-vis shirt, and jacket/pant system with reflective tape. ' +
      'Composition/framing: 4:3 balanced multi-zone image, clear but realistic, no text. ' +
      BASE_STYLE,
  },
  {
    key: 'color-reflective-tape-and-daynight-visibility',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: high-visibility clothing shown in daytime and low-light construction conditions. ' +
      'Scene/backdrop: editorial split-light scene with one worker in daylight and another under work lights near equipment. ' +
      'Subject: fluorescent fabric and retroreflective tape performance are visible without readable text. ' +
      'Composition/framing: 4:3 dramatic but realistic lighting comparison, no fake labels. ' +
      BASE_STYLE,
  },
  {
    key: 'high-visibility-clothing-by-construction-task',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: task-based high-visibility clothing selection for construction roles. ' +
      'Scene/backdrop: road crew, crane signal person, general laborer, and site visitor in one realistic construction environment. ' +
      'Subject: different workers wearing different hi-vis garment systems appropriate to their role. ' +
      'Composition/framing: 4:3 documentary group scene, clear garment differences, no text. ' +
      BASE_STYLE,
  },
  {
    key: 'compatibility-with-other-construction-ppe',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: high-visibility clothing compatibility planning with other construction PPE. ' +
      'Scene/backdrop: clean jobsite PPE table beside concrete wall. ' +
      'Subject: hi-vis vest, hard hat, fall harness, safety glasses, earmuffs, gloves, respirator, and boots arranged as a complete construction PPE set. ' +
      'Composition/framing: 4:3 organized flat-lay scene showing how PPE items fit together, no people, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'weather-flame-and-wash-durability-considerations',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: durable high-visibility construction clothing for rain, cold, dirt, and hot work planning. ' +
      'Scene/backdrop: PPE storage area with clean hi-vis rain jacket, insulated jacket, FR-style shirt, dirty worn vest, and replacement stock. ' +
      'Subject: supervisor comparing serviceable and worn high-vis garments. ' +
      'Composition/framing: 4:3 realistic inspection scene, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'bulk-buying-checklist-for-construction-hi-vis',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: bulk procurement and inventory planning for high-visibility construction clothing. ' +
      'Scene/backdrop: warehouse PPE shelf with folded hi-vis vests, shirts, jackets, size-sorted cartons, hard hats, and gloves. ' +
      'Subject: procurement worker organizing high-vis garments for site issue. ' +
      'Composition/framing: 4:3 organized inventory scene, no readable labels. ' +
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

async function main(): Promise<void> {
  if (!existsSync(path.dirname(OUTPUT_JSON))) {
    await mkdir(path.dirname(OUTPUT_JSON), { recursive: true })
  }

  const results: Record<string, string> = {}

  for (const plan of PLAN) {
    console.log(`Generating ${plan.key}...`)
    const generatedUrl = await generateImage(plan)
    console.log(`Uploading ${plan.key}...`)
    results[plan.key] = await uploadImage(generatedUrl, plan.key)
  }

  await writeFile(OUTPUT_JSON, `${JSON.stringify(results, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${OUTPUT_JSON}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
