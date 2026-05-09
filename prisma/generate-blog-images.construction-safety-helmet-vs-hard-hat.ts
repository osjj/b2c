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

const POST_SLUG = 'construction-safety-helmet-vs-hard-hat'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.construction-safety-helmet-vs-hard-hat.generated.json',
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
  'Style/medium: photorealistic editorial construction safety photography, practical B2B PPE buying tone, realistic hard hat and safety helmet details. ' +
  'Lighting/mood: natural daylight, credible, professional, field-oriented, clean industrial safety aesthetic. ' +
  'Color palette: concrete gray, steel blue, safety yellow, high-visibility orange, white helmets, matte black accessory details. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no distorted helmets, no unrealistic head shapes.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. Asset type: blog hero image comparing construction safety helmets and traditional hard hats. ' +
      'Primary request: safety manager reviewing a traditional cap-style hard hat and a modern construction safety helmet with chin strap on a PPE table. ' +
      'Scene/backdrop: active construction site with scaffolding, steel structure, and workers in hi-vis softly visible. ' +
      'Subject: the two head protection options are clear and realistic, with no readable labels. ' +
      'Composition/framing: 16:9 wide editorial hero, helmets in foreground and jobsite context behind. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-answer-safety-helmet-or-hard-hat',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: blog section image. ' +
      'Primary request: side-by-side comparison of a traditional construction hard hat and a modern safety helmet. ' +
      'Scene/backdrop: clean industrial workbench with concrete texture and PPE checklist materials blurred. ' +
      'Subject: cap-style hard hat, full-brim hard hat, and helmet-style head protection with chin strap. ' +
      'Composition/framing: 4:3 organized comparison, no text. ' +
      BASE_STYLE,
  },
  {
    key: 'what-osha-actually-requires',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: blog section image. ' +
      'Primary request: construction head protection compliance review. ' +
      'Scene/backdrop: jobsite safety office table with helmets, hard hats, suspension systems, blurred forms, and PPE samples. ' +
      'Subject: safety manager inspecting helmet marking area and suspension without readable text. ' +
      'Composition/framing: 4:3 medium close-up, credible safety audit mood. ' +
      BASE_STYLE,
  },
  {
    key: 'safety-helmet-vs-hard-hat-practical-differences',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: blog section image. ' +
      'Primary request: practical visual comparison between traditional hard hat and safety helmet features. ' +
      'Scene/backdrop: PPE fitting station. ' +
      'Subject: hard hat suspension, helmet foam liner, chin strap, and accessory mounts shown realistically on a table. ' +
      'Composition/framing: 4:3 detailed product comparison, no text labels. ' +
      BASE_STYLE,
  },
  {
    key: 'type-i-vs-type-ii-matters-more-than-the-name',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: blog section image. ' +
      'Primary request: Type I versus Type II head protection selection for construction. ' +
      'Scene/backdrop: scaffold and steel work area with PPE table in foreground. ' +
      'Subject: traditional top-impact hard hat beside modern side-impact safety helmet with chin strap. ' +
      'Composition/framing: 4:3 editorial scene showing side-impact context without graphic injury. ' +
      BASE_STYLE,
  },
  {
    key: 'chin-straps-when-retention-becomes-a-safety-feature',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: blog section image. ' +
      'Primary request: construction worker adjusting a manufacturer-approved helmet chin strap before scaffolding work. ' +
      'Scene/backdrop: scaffold access point, fall protection harness, hi-vis clothing, safe controlled site. ' +
      'Subject: chin strap fit and helmet retention are the clear focus. ' +
      'Composition/framing: 4:3 medium close-up, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'electrical-class-still-matters',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: blog section image. ' +
      'Primary request: electrical class decision for construction head protection. ' +
      'Scene/backdrop: controlled electrical construction area with insulated gloves and non-vented helmet on PPE table. ' +
      'Subject: non-vented head protection, insulated gloves, safety glasses, and safe electrical work context. ' +
      'Composition/framing: 4:3 close-up, no readable signs or labels. ' +
      BASE_STYLE,
  },
  {
    key: 'which-construction-tasks-should-consider-safety-helmets',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: blog section image. ' +
      'Primary request: task-based safety helmet selection across construction roles. ' +
      'Scene/backdrop: split editorial composition with scaffolding, bridge work, demolition, and general site access. ' +
      'Subject: different workers wearing appropriate hard hats or safety helmets by task. ' +
      'Composition/framing: 4:3 balanced multi-role construction scene, helmets clearly visible. ' +
      BASE_STYLE,
  },
  {
    key: 'compatibility-with-the-rest-of-the-ppe-system',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. Asset type: blog section image. ' +
      'Primary request: safety helmet compatibility with construction PPE accessories. ' +
      'Scene/backdrop: organized PPE fitting table. ' +
      'Subject: safety helmet with safety glasses, helmet-mounted earmuffs, face shield, respirator, headlamp, chin strap, gloves, and hi-vis vest arranged clearly. ' +
      'Composition/framing: 4:3 flat-lay, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'buying-specification-better-than-safety-helmet',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. Asset type: blog section image. ' +
      'Primary request: procurement manager building a construction helmet RFQ. ' +
      'Scene/backdrop: warehouse PPE shelf and desk with sample helmets, hard hats, spare suspensions, chin straps, and blurred forms. ' +
      'Subject: organized helmet samples and procurement review without readable text. ' +
      'Composition/framing: 4:3 practical B2B buying scene. ' +
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
