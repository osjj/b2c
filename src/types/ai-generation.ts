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

// 图片生成预设提示词
export interface ImagePromptPreset {
  id: string
  name: string
  nameZh: string
  prompt: string
}

export const IMAGE_PROMPT_PRESETS: ImagePromptPreset[] = [
  {
    id: 'white-bg',
    name: 'White Background',
    nameZh: '电商白底图',
    prompt: 'Professional product photography on pure white background, studio lighting, high resolution, e-commerce style, clean and minimal',
  },
  {
    id: 'scene',
    name: 'Scene Photo',
    nameZh: '场景图',
    prompt: 'Product in use scenario, lifestyle photography, natural lighting, professional commercial photography, showing product in real-world context',
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
]
