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

const POST_SLUG = 'hard-hat-color-codes-construction-sites'
const OUTPUT_JSON = path.join(
  __dirname,
  'blog-images.hard-hat-color-codes-construction-sites.generated.json',
)
const PUBLIC_OUTPUT_DIR = path.join(__dirname, '..', 'public', 'blog', POST_SLUG)
const PUBLIC_URL_PREFIX = `/blog/${POST_SLUG}`

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
  'Style/medium: photorealistic editorial construction safety photography, practical B2B PPE buying tone, realistic hard hat color coding and head protection inventory details. ' +
  'Lighting/mood: natural daylight, credible, professional, field-oriented, clean industrial safety aesthetic. ' +
  'Color palette: concrete gray, steel blue, safety yellow, high-visibility orange, white, green, red, brown, and matte black accessory details. ' +
  'Constraints: no readable text, no logos, no brand marks, no watermarks, no fake UI overlays, no injuries, no distorted helmets, no unsafe behavior.'

const PLAN: ImagePlan[] = [
  {
    key: 'hero',
    aspect: '16:9',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog hero image for hard hat color codes on construction sites. ' +
      'Primary request: color-coded construction hard hats arranged for a procurement and site orientation guide. ' +
      'Scene/backdrop: controlled construction site with concrete floor, safety office table, blurred workers in PPE behind. ' +
      'Subject: clean lineup of white, yellow, blue, green, orange, red, brown, and gray hard hats with safety glasses, blank clipboard, and replacement suspensions. ' +
      'Composition/framing: 16:9 wide editorial hero, color-coded helmets in foreground, room for article crop, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'quick-answer-hard-hat-color-codes-on-construction-sites',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: quick visual overview of construction hard hat color codes without text labels. ' +
      'Scene/backdrop: clean jobsite safety table with concrete texture and blurred construction background. ' +
      'Subject: white, yellow, blue, green, orange, red, brown, and gray hard hats arranged in a neat color lineup with blank inspection card. ' +
      'Composition/framing: 4:3 practical color comparison for B2B buyers, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'are-hard-hat-colors-required-by-osha',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: construction head protection compliance review showing color is separate from safety rating. ' +
      'Scene/backdrop: safety office table with multiple colored hard hats, blank compliance folder, safety glasses, and PPE samples. ' +
      'Subject: safety manager inspecting hard hat shell and suspension without readable markings. ' +
      'Composition/framing: 4:3 medium close-up, professional compliance planning scene. ' +
      BASE_STYLE,
  },
  {
    key: 'common-hard-hat-color-code-chart',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: common construction hard hat color code chart visual without any written chart or labels. ' +
      'Scene/backdrop: organized PPE issue counter in a construction site office. ' +
      'Subject: color-coded hard hats in separate rows with matching blank bins and no readable labels. ' +
      'Composition/framing: 4:3 organized procurement layout for color-coded site issue. ' +
      BASE_STYLE,
  },
  {
    key: 'white-hard-hats-supervisors-engineers-and-visitors',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: white hard hats used for supervisors, engineers, inspectors, and visitors on a construction site. ' +
      'Scene/backdrop: jobsite walkway and safety briefing area with controlled background activity. ' +
      'Subject: white hard hats on a table beside safety glasses and blank visitor badges, supervisor reviewing PPE with worker. ' +
      'Composition/framing: 4:3 documentary construction safety scene, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'yellow-hard-hats-general-construction-crews',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: yellow hard hats for general construction crews and baseline site issue. ' +
      'Scene/backdrop: active but controlled concrete and steel construction area. ' +
      'Subject: workers wearing yellow hard hats, safety glasses, gloves, and hi-vis vests during safe site coordination. ' +
      'Composition/framing: 4:3 practical field scene with yellow hard hats clearly visible. ' +
      BASE_STYLE,
  },
  {
    key: 'blue-hard-hats-electricians-carpenters-and-technical-trades',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: blue hard hats for electricians, carpenters, and technical trades while keeping electrical class separate. ' +
      'Scene/backdrop: controlled MEP construction area with safe distance from electrical equipment and no readable signage. ' +
      'Subject: blue hard hats, insulated gloves, safety glasses, blank checklist, and technical trade PPE samples on a workbench. ' +
      'Composition/framing: 4:3 safe technical trade PPE planning scene. ' +
      BASE_STYLE,
  },
  {
    key: 'green-hard-hats-safety-first-aid-new-workers-or-trainees',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: green hard hats for safety staff, first aid, new workers, or trainees with clear site issue control. ' +
      'Scene/backdrop: construction induction area with PPE table, blank orientation cards, and blurred training group. ' +
      'Subject: green hard hats beside safety glasses, gloves, and blank role markers without readable text. ' +
      'Composition/framing: 4:3 site orientation and safety identification scene. ' +
      BASE_STYLE,
  },
  {
    key: 'orange-red-brown-and-gray-hard-hats',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: orange, red, brown, and gray hard hats for traffic, emergency, hot work, and visitor roles. ' +
      'Scene/backdrop: organized PPE issue shelf with traffic cones blurred in background and hot work PPE samples nearby. ' +
      'Subject: orange, red, brown, and gray hard hats arranged with safety glasses, face shield, gloves, and blank visitor badge. ' +
      'Composition/framing: 4:3 color-coded role identification layout, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'color-codes-are-not-type-class-or-compliance',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: visual distinction between hard hat color coding and Type/Class safety performance. ' +
      'Scene/backdrop: construction safety office table with colored hard hats, non-vented electrical hard hat, vented shell, and accessory samples. ' +
      'Subject: buyer inspecting helmet interior and suspension while colored helmets sit nearby. ' +
      'Composition/framing: 4:3 compliance and procurement review, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'how-to-build-a-site-specific-hard-hat-color-code',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: safety manager building a site-specific hard hat color code for workers, visitors, and trades. ' +
      'Scene/backdrop: jobsite meeting table with colored hard hats, blank planning sheet, PPE samples, and blurred construction background. ' +
      'Subject: supervisor and safety manager arranging colored hard hats by role without readable labels. ' +
      'Composition/framing: 4:3 practical site planning scene. ' +
      BASE_STYLE,
  },
  {
    key: 'procurement-matrix-color-by-role-without-losing-safety-specs',
    aspect: '4:3',
    prompt:
      'Use case: product-mockup. ' +
      'Asset type: blog section image. ' +
      'Primary request: procurement matrix for role-based hard hat colors while preserving Type and Class specs, without text. ' +
      'Scene/backdrop: PPE warehouse desk with hard hats in several colors, accessory parts, blank purchase forms, and cartons. ' +
      'Subject: procurement buyer checking colored hard hat samples and replacement suspensions before bulk order. ' +
      'Composition/framing: 4:3 B2B procurement planning scene, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'logos-stickers-reflective-tape-and-helmet-markings',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: hard hat stickers, reflective tape, and inspection markings without covering required safety areas. ' +
      'Scene/backdrop: clean PPE workbench with colored hard hats, reflective tape rolls, blank labels, safety glasses, and inspection light. ' +
      'Subject: worker applying a blank non-readable label to a hard hat while leaving inspection areas visible. ' +
      'Composition/framing: 4:3 close-up, no readable text, no logos. ' +
      BASE_STYLE,
  },
  {
    key: 'inventory-control-for-color-coded-hard-hats',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: inventory control for color-coded hard hats and separated electrical class stock. ' +
      'Scene/backdrop: organized PPE storage area with shelves, cartons, separated hard hats, suspensions, chin straps, and blank bin labels. ' +
      'Subject: warehouse worker sorting colored hard hats before construction crew issue. ' +
      'Composition/framing: 4:3 practical inventory control scene, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'how-to-write-hard-hat-colors-into-an-rfq',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: RFQ preparation for hard hat colors, Type, Class, accessories, samples, and documentation. ' +
      'Scene/backdrop: procurement desk at construction safety office with laptop screen blurred, blank forms, colored hard hats, and PPE accessories. ' +
      'Subject: buyer comparing color-coded hard hat samples and replacement parts before sending supplier request. ' +
      'Composition/framing: 4:3 B2B procurement planning scene, no readable labels. ' +
      BASE_STYLE,
  },
  {
    key: 'common-mistakes-with-hard-hat-color-codes',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: common mistakes in hard hat color code programs, including mixed stock and wrong role signals. ' +
      'Scene/backdrop: PPE issue station with colored hard hats being sorted into clear groups, blank tags, and accessory samples. ' +
      'Subject: safety manager separating similar-looking hard hats by shell type and color before issue. ' +
      'Composition/framing: 4:3 practical corrective inventory scene, no readable text. ' +
      BASE_STYLE,
  },
  {
    key: 'buyer-checklist',
    aspect: '4:3',
    prompt:
      'Use case: photorealistic-natural. ' +
      'Asset type: blog section image. ' +
      'Primary request: buyer checklist for hard hat color codes, Type/Class verification, stickers, visitor helmets, and replacement stock. ' +
      'Scene/backdrop: safety office table with colored hard hats, blank checklist, replacement suspensions, safety glasses, and gloves. ' +
      'Subject: procurement manager and safety manager reviewing color-coded head protection before bulk purchase. ' +
      'Composition/framing: 4:3 B2B decision planning scene, no readable text. ' +
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

function imageSizeFor(aspect: ImagePlan['aspect']) {
  return aspect === '16:9'
    ? { width: 1600, height: 900 }
    : { width: 1200, height: 900 }
}

function colorSetForKey(key: string): string[] {
  if (key.startsWith('white')) return ['#f8fafc', '#e2e8f0', '#facc15']
  if (key.startsWith('yellow')) return ['#facc15', '#f59e0b', '#f8fafc']
  if (key.startsWith('blue')) return ['#2563eb', '#38bdf8', '#f8fafc']
  if (key.startsWith('green')) return ['#16a34a', '#84cc16', '#f8fafc']
  if (key.startsWith('orange-red-brown-and-gray')) {
    return ['#f97316', '#dc2626', '#92400e', '#64748b']
  }
  if (key.includes('compliance') || key.includes('osha')) {
    return ['#f8fafc', '#facc15', '#2563eb', '#16a34a']
  }
  return ['#f8fafc', '#facc15', '#2563eb', '#16a34a', '#f97316', '#dc2626', '#92400e', '#64748b']
}

function helmetSvg(cx: number, cy: number, scale: number, color: string, index: number) {
  const stroke = color === '#f8fafc' ? '#94a3b8' : '#334155'
  const shadow = color === '#f8fafc' ? '#cbd5e1' : '#1f2937'
  const shine = color === '#f8fafc' ? '#ffffff' : '#ffffff99'
  const ridgeX = -34 + (index % 3) * 14

  return `
    <g transform="translate(${cx} ${cy}) scale(${scale})">
      <ellipse cx="0" cy="72" rx="112" ry="18" fill="#0f172a" opacity="0.16"/>
      <path d="M-96 36 C-91 -52 -42 -94 10 -94 C70 -94 104 -44 103 36 Z" fill="${color}" stroke="${stroke}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M-109 26 H111 C127 26 135 36 132 49 C129 61 116 67 94 65 H-92 C-119 66 -135 58 -137 45 C-139 33 -127 26 -109 26 Z" fill="${color}" stroke="${stroke}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M${ridgeX} -82 C${ridgeX - 15} -42 ${ridgeX - 13} -3 ${ridgeX - 8} 28" fill="none" stroke="${shadow}" stroke-width="8" stroke-linecap="round" opacity="0.42"/>
      <path d="M34 -78 C60 -55 72 -17 72 25" fill="none" stroke="${shine}" stroke-width="8" stroke-linecap="round" opacity="0.55"/>
      <path d="M-66 43 C-28 54 39 55 84 43" fill="none" stroke="${shadow}" stroke-width="7" stroke-linecap="round" opacity="0.26"/>
    </g>
  `
}

function accessorySvg(width: number, height: number) {
  const tableY = height - 178
  return `
    <g opacity="0.95">
      <rect x="${width * 0.08}" y="${tableY}" width="${width * 0.84}" height="88" rx="22" fill="#e2e8f0"/>
      <rect x="${width * 0.14}" y="${tableY + 18}" width="${width * 0.20}" height="48" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4"/>
      <rect x="${width * 0.38}" y="${tableY + 20}" width="${width * 0.24}" height="18" rx="9" fill="#94a3b8" opacity="0.55"/>
      <rect x="${width * 0.38}" y="${tableY + 47}" width="${width * 0.18}" height="12" rx="6" fill="#94a3b8" opacity="0.35"/>
      <path d="M${width * 0.68} ${tableY + 35} C${width * 0.72} ${tableY + 18} ${width * 0.78} ${tableY + 18} ${width * 0.82} ${tableY + 35}" fill="none" stroke="#0f172a" stroke-width="8" stroke-linecap="round" opacity="0.65"/>
      <circle cx="${width * 0.69}" cy="${tableY + 42}" r="18" fill="none" stroke="#0f172a" stroke-width="8" opacity="0.65"/>
      <circle cx="${width * 0.81}" cy="${tableY + 42}" r="18" fill="none" stroke="#0f172a" stroke-width="8" opacity="0.65"/>
    </g>
  `
}

function buildLocalSvg(plan: ImagePlan): string {
  const { width, height } = imageSizeFor(plan.aspect)
  const colors = colorSetForKey(plan.key)
  const isHero = plan.aspect === '16:9'
  const helmetCount = isHero ? Math.min(colors.length, 8) : Math.min(colors.length, 5)
  const startX = width * 0.18
  const gap = (width * 0.64) / Math.max(helmetCount - 1, 1)
  const baseY = isHero ? height * 0.50 : height * 0.46
  const helmets = Array.from({ length: helmetCount }, (_, index) => {
    const x = helmetCount === 1 ? width * 0.5 : startX + gap * index
    const y = baseY + (index % 2) * 34
    const scale = isHero ? 0.82 : 0.92
    return helmetSvg(x, y, scale, colors[index], index)
  }).join('\n')

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#f8fafc"/>
          <stop offset="0.48" stop-color="#dbe4ee"/>
          <stop offset="1" stop-color="#cbd5e1"/>
        </linearGradient>
        <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#d1d5db"/>
          <stop offset="1" stop-color="#94a3b8"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <rect x="0" y="${height * 0.67}" width="${width}" height="${height * 0.33}" fill="url(#floor)"/>
      <g opacity="0.22">
        <path d="M${width * 0.08} ${height * 0.18} H${width * 0.92}" stroke="#64748b" stroke-width="8"/>
        <path d="M${width * 0.16} ${height * 0.12} V${height * 0.66}" stroke="#64748b" stroke-width="8"/>
        <path d="M${width * 0.50} ${height * 0.10} V${height * 0.66}" stroke="#64748b" stroke-width="8"/>
        <path d="M${width * 0.84} ${height * 0.12} V${height * 0.66}" stroke="#64748b" stroke-width="8"/>
        <path d="M${width * 0.08} ${height * 0.28} L${width * 0.92} ${height * 0.62}" stroke="#64748b" stroke-width="6"/>
        <path d="M${width * 0.92} ${height * 0.28} L${width * 0.08} ${height * 0.62}" stroke="#64748b" stroke-width="6"/>
      </g>
      <g opacity="0.18">
        <circle cx="${width * 0.12}" cy="${height * 0.78}" r="110" fill="#f97316"/>
        <circle cx="${width * 0.88}" cy="${height * 0.22}" r="130" fill="#2563eb"/>
      </g>
      ${accessorySvg(width, height)}
      ${helmets}
      <rect x="${width * 0.07}" y="${height * 0.08}" width="${width * 0.18}" height="${height * 0.018}" rx="${height * 0.009}" fill="#f97316" opacity="0.55"/>
      <rect x="${width * 0.07}" y="${height * 0.12}" width="${width * 0.28}" height="${height * 0.012}" rx="${height * 0.006}" fill="#64748b" opacity="0.30"/>
      <rect x="${width * 0.07}" y="${height * 0.15}" width="${width * 0.22}" height="${height * 0.012}" rx="${height * 0.006}" fill="#64748b" opacity="0.22"/>
      <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#e2e8f0" stroke-width="2"/>
    </svg>
  `
}

async function generateLocalImage(plan: ImagePlan): Promise<string> {
  const sharp = (await import('sharp')).default
  if (!existsSync(PUBLIC_OUTPUT_DIR)) {
    await mkdir(PUBLIC_OUTPUT_DIR, { recursive: true })
  }

  const filename = `${plan.key}.webp`
  const outputPath = path.join(PUBLIC_OUTPUT_DIR, filename)
  const svg = buildLocalSvg(plan)
  await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(outputPath)
  return `${PUBLIC_URL_PREFIX}/${filename}`
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
  const local = args.includes('--local')
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
      if (local) {
        const localUrl = await generateLocalImage(plan)
        console.log(`    Generated local WebP: ${localUrl}\n`)
        next[plan.key] = localUrl
      } else {
        const imageUrl = await generateImage(plan)
        console.log(`    Generated: ${imageUrl}`)

        const rawBuffer = await downloadImage(imageUrl)
        console.log(`    Downloaded: ${(rawBuffer.length / 1024).toFixed(1)}KB`)

        const webpBuffer = await optimizeToWebp(rawBuffer)
        const filename = `${plan.key}-${Date.now()}.webp`
        const r2Url = await uploadBlogImage(webpBuffer, filename)
        console.log(`    Uploaded: ${r2Url}\n`)

        next[plan.key] = r2Url
      }
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
  console.log('\nNext step: npm run db:seed:blog -- --slug=hard-hat-color-codes-construction-sites')
}

main().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})
