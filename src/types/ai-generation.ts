// AI 生成功能相关类型定义

// 可用的 Gemini 模型列表
export interface GeminiModel {
  id: string
  name: string
}

export const GEMINI_MODELS: GeminiModel[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.5-flash-thinking', name: 'Gemini 2.5 Flash (Thinking)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
  { id: 'gemini-3-pro-high', name: 'Gemini 3 Pro High' },
  { id: 'gemini-3-pro-low', name: 'Gemini 3 Pro Low' },
  { id: 'gemini-3-pro-image', name: 'Gemini 3 Pro (Image)' },
]

export const DEFAULT_MODEL = 'gemini-3-flash'

// 图片生成模型列表（基础模型，实际使用时会根据 aspectRatio 和 imageSize 动态构建）
export const GEMINI_IMAGE_MODELS: GeminiModel[] = [
  { id: 'gemini-3-pro-image', name: 'Gemini 3 Pro Image (1K)' },
  { id: 'gemini-3-pro-image-2k', name: 'Gemini 3 Pro Image (2K)' },
  { id: 'gemini-3-pro-image-4k', name: 'Gemini 3 Pro Image (4K)' },
]

export const DEFAULT_IMAGE_MODEL = 'gemini-3-pro-image'

export interface Specification {
  name: string
  value: string
}

export interface PriceTier {
  minQuantity: number
  maxQuantity: number | null
  price: number
}

export interface EditorJSBlock {
  id: string
  type: 'header' | 'paragraph' | 'list' | 'image' | 'delimiter' | 'quote'
  data: Record<string, unknown>
}

export interface EditorJSContent {
  time: number
  blocks: EditorJSBlock[]
  version?: string
}

// AI 生成的产品数据结构
export interface AIGeneratedProduct {
  name: string
  slug: string
  description: string
  price: number
  comparePrice: number | null
  stock: number
  sku: string
  isActive: boolean
  isFeatured: boolean
  images: string[] // placeholder URLs initially
  specifications: Specification[]
  content: EditorJSContent
  priceTiers: PriceTier[]
  // Optional fields from presets
  categoryId?: string
  collectionIds?: string[]
}

// 预设选项
export interface PresetOptions {
  categoryId?: string
  collectionIds?: string[]
  basePrice?: number
  language: 'en' | 'zh' | 'both'
}

// API 请求/响应类型
export interface GenerateProductRequest {
  images: string[] // Base64 encoded images
  presets: PresetOptions
  categoryName?: string
  collectionNames?: string[]
  model?: string // Gemini model ID
  customPrompt?: string // 用户自定义提示词
}

export interface GenerateProductResponse {
  success: boolean
  data?: AIGeneratedProduct
  error?: string
}

export interface GenerateImageRequest {
  referenceImages: string[] // Base64 encoded images
  prompt: string
  count?: number // 生成图片数量，默认4
  model?: string // 图片生成模型
  aspectRatio?: string // 宽高比，默认 1:1
  imageSize?: string // 图片尺寸: 1K, 2K, 4K
}

export interface GenerateImageResponse {
  success: boolean
  images?: string[] // Base64 encoded generated images
  error?: string
}

// 第三方图片生成接口配置
export interface ThirdPartyImageConfig {
  url: string
  apiKey: string
  model: string
}

// 第三方图片生成模型列表
export const NANO_BANANA_MODELS = [
  { id: 'nano-banana-fast', name: 'Nano Banana Fast' },
  { id: 'nano-banana', name: 'Nano Banana' },
  { id: 'nano-banana-pro', name: 'Nano Banana Pro' },
  { id: 'nano-banana-pro-vt', name: 'Nano Banana Pro VT' },
  { id: 'nano-banana-pro-cl', name: 'Nano Banana Pro CL' },
  { id: 'nano-banana-pro-vip', name: 'Nano Banana Pro VIP (1K/2K)' },
  { id: 'nano-banana-pro-4k-vip', name: 'Nano Banana Pro 4K VIP' },
]

// 第三方接口请求参数
export interface ThirdPartyImageRequest {
  model: string
  prompt: string
  aspectRatio?: string
  imageSize?: string
  urls?: string[]
  webHook?: string
  shutProgress?: boolean
}

// 第三方接口响应
export interface ThirdPartyImageResponse {
  id: string
  results: Array<{
    url: string
    content?: string
  }>
  progress: number
  status: 'succeeded' | 'processing' | 'failed'
  failure_reason?: string
  error?: string
}

// 图片生成预设提示词
export interface ImagePromptPreset {
  id: string
  name: string
  nameZh: string
  prompt: string
}

// 图片角度预设
export interface ImageAnglePreset {
  id: string
  name: string
  nameZh: string
  prompt: string
}

export const IMAGE_ANGLE_PRESETS: ImageAnglePreset[] = [
  {
    id: 'front',
    name: 'Front View',
    nameZh: '正面',
    prompt: 'front view, facing camera directly',
  },
  {
    id: 'side',
    name: 'Side View',
    nameZh: '侧面',
    prompt: 'side view, 90 degree angle, profile shot',
  },
  {
    id: 'back',
    name: 'Back View',
    nameZh: '背面',
    prompt: 'back view, rear angle, showing back side',
  },
  {
    id: 'top',
    name: 'Top View',
    nameZh: '俯视',
    prompt: 'top-down view, bird eye view, overhead shot',
  },
  {
    id: 'three-quarter',
    name: '3/4 View',
    nameZh: '45度角',
    prompt: 'three-quarter view, 45 degree angle, dynamic perspective',
  },
  {
    id: 'bottom',
    name: 'Bottom View',
    nameZh: '仰视',
    prompt: 'bottom view, low angle shot, looking up',
  },
]

// 默认的4角度组合
export const DEFAULT_ANGLE_COMBINATION = ['front', 'side', 'back', 'top']

// 电商白底图专用 prompt
export const WHITE_BG_BASE_PROMPT =
  'Single product photo, centered, isolated on pure white background (#FFFFFF). ' +
  'Professional e-commerce studio lighting, subtle contact shadow, no harsh reflections. ' +
  'Product fully visible, not cropped, consistent scale, 3/4 height framing with safe margins. ' +
  'High detail, sharp focus, realistic materials, accurate colors, no distortion.'

export const WHITE_BG_NEGATIVE_PROMPT =
  'No text, no watermark, no logo, no badge, no price tag, no border, no collage, ' +
  'no extra objects, no props, no hands, no people, no background scene, ' +
  'no reflections of environment, no dramatic lighting, no vignetting.'

export const IMAGE_PROMPT_PRESETS: ImagePromptPreset[] = [
  {
    id: 'white-bg',
    name: 'White Background',
    nameZh: '电商白底图',
    prompt: `${WHITE_BG_BASE_PROMPT} [Negative: ${WHITE_BG_NEGATIVE_PROMPT}]`,
  },
  // {
  //   id: 'scene',
  //   name: 'Scene Photo',
  //   nameZh: '场景图',
  //   prompt: 'Product in use scenario, lifestyle photography, natural lighting, professional commercial photography, showing product in real-world context',
  // },
  {
    id: 'scene-industrial-worker',
    name: 'Industrial Worker Action',
    nameZh: '车间工人操作图',
    // 注意：这里需要占位符 [Product Name]，实际使用时替换
    prompt: 'Professional B2B photography inside a modern manufacturing facility. A skilled technician wearing appropriate PPE (uniform, safety glasses, gloves) is actively using the [Product Name] to perform a precision task. Focus on the product and hands in action. Blurred automated equipment background. Cool-tone functional lighting. Medium shot.',
  },
  // 更新：施工工人场景
  {
    id: 'scene-construction-worker',
    name: 'Construction Worker Action',
    nameZh: '施工工人作业图',
    // 注意：这里需要占位符 [Product Name]，实际使用时替换
    prompt: 'Rugged professional photography at an active engineering construction site. A construction worker wearing hard hat, high-vis vest, and gloves is using the [Product Name] in a real-world scenario (e.g., kneeling or operating tool). Product looks durable and engaged in work. Blurred background of steel structures and heavy machinery. Natural outdoor daylight. Low-angle shot.',
  },
  {
    id: 'detail',
    name: 'Detail Shot',
    nameZh: '细节特写',
    prompt: 'Macro close-up shot of product details, high resolution, showing texture and craftsmanship, professional product photography',
  },
  {
    id: 'angle',
    name: 'Multiple Angles',
    nameZh: '多角度展示',
    prompt: 'Product from different angles, front view, side view, top view, professional e-commerce photography, white background',
  },
  {
    id: 'exploded-safety-shoe',
    name: 'Exploded View (Safety Shoe)',
    nameZh: '产品拆解图（劳保鞋）',
    prompt:
      'A professional technical infographic, an exploded material breakdown view, based on the reference image of the safety shoe. ' +
      'Style: Clean pure white background, studio lighting, high resolution, photorealistic rendering emphasizing realistic material textures (suede, rubber, metal, fabric). ' +
      'Composition: 1. Main Assembly - At the top center, show the complete, fully assembled safety shoe, looking solid and high-quality. ' +
      '2. Exploded Components - Below the main product, separate and isolate key internal components arranged horizontally, including: a steel toe cap, a yellow Kevlar puncture-resistant midsole layer, and a black rubber outsole. Render these parts with technical precision. ' +
      '3. Connections - Draw glowing, translucent lines (yellow light beams) connecting these separated components from below back to their hidden internal positions within the main assembly above, showing where they fit. ' +
      'Labels & Details: Add clean blue pointer lines with arrows pointing to various features on the main product and the separated components. ' +
      'Include professional English text labels, for example: "Anti-impact steel head" pointing to the toe cap, "KEVLAR MIDSOLE" pointing to the middle layer, and "RUBBER SOLE" pointing to the bottom layer. ' +
      'Optional: Add small inset close-up views at the bottom showing specific textures (e.g., anti-slip tread pattern).',
  },
  {
    id: 'split-detail',
    name: 'Split Detail View',
    nameZh: '上下细节图',
    prompt:
      'A professional technical photograph, divided horizontally into two distinct macro sections (split-screen view, top and bottom). ' +
      'Top Section Composition: Extreme macro close-up capturing the raw texture of the heavy-duty full-grain leather upper. ' +
      'Bottom Section Composition: Extreme macro close-up capturing the raw texture of the high-density slip-resistant rubber sole. ' +
      'Visual Details (Applied to both sections): In both halves, show flawless execution: double-row heavy-duty stitching with perfect tension and uniform spacing, OR clean, smooth welding beads with zero porosity or spatter, OR a perfectly flush joint with no gaps, glue residue, or misalignment. The assembly looks robust, industrial-grade, and built to last. ' +
      'Lighting & Style: Consistent professional studio lighting across the entire frame, designed to cast micro-shadows that highlight the depth and tactile quality of both surface textures equally. No blurring, highly detailed texture map style.'+
      'Add clean, technical text labels in the corner of each section. Top left corner says: "MATERIAL A: [Name of Top Material]". Bottom left corner says: "MATERIAL B: [Name of Bottom Material]'
  },
]
