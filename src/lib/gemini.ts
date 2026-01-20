// Gemini API 封装 - 通过代理服务调用

const GEMINI_API_ENDPOINT = process.env.GEMINI_API_ENDPOINT || 'http://127.0.0.1:8045'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

// 默认模型配置
const DEFAULT_TEXT_MODEL = 'gemini-3-flash'
const DEFAULT_IMAGE_MODEL = 'gemini-3-pro-image'

/**
 * 根据参数构建图片生成模型名称
 * 模型命名规则：gemini-3-pro-image[-{size}][-{aspectRatio}]
 * 例如：gemini-3-pro-image, gemini-3-pro-image-2k, gemini-3-pro-image-2k-16x9
 */
function buildImageModelName(
  baseModel: string,
  aspectRatio?: string,
  imageSize?: string
): string {
  // 如果已经包含具体的 ratio 或 size，直接使用
  if (baseModel.includes('-2k') || baseModel.includes('-4k') ||
      baseModel.includes('x') || baseModel.includes('1x1')) {
    return baseModel
  }

  let modelName = baseModel

  // 添加尺寸后缀 (2k, 4k)
  if (imageSize && imageSize !== '1K') {
    modelName = `${modelName}-${imageSize.toLowerCase()}`
  }

  // 添加宽高比后缀 (将 16:9 转为 16x9)
  if (aspectRatio && aspectRatio !== '1:1') {
    const ratioSuffix = aspectRatio.replace(':', 'x')
    modelName = `${modelName}-${ratioSuffix}`
  }

  return modelName
}

interface GeminiPart {
  text?: string
  inline_data?: {
    mime_type: string
    data: string // Base64
  }
  // API 可能返回 camelCase 格式
  inlineData?: {
    mimeType: string
    data: string // Base64
  }
}

interface GeminiContent {
  parts: GeminiPart[]
  role?: 'user' | 'model'
}

interface GeminiRequest {
  contents: GeminiContent[]
  generationConfig?: {
    temperature?: number
    maxOutputTokens?: number
    responseMimeType?: string
    responseModalities?: string[]
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text?: string
        inline_data?: {
          mime_type: string
          data: string
        }
        // API 可能返回 camelCase 格式
        inlineData?: {
          mimeType: string
          data: string
        }
      }>
      role: string
    }
    finishReason: string
  }>
  error?: {
    message: string
    code: number
  }
}

/**
 * 调用 Gemini API 进行文本生成（支持图片输入）
 */
export async function generateText(
  prompt: string,
  images?: string[], // Base64 encoded images (without data:image prefix)
  options?: {
    temperature?: number
    maxTokens?: number
    model?: string
  }
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const parts: GeminiPart[] = []

    // 添加图片
    if (images && images.length > 0) {
      for (const imageData of images) {
        // 移除可能的 data:image/xxx;base64, 前缀
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: base64Data,
          },
        })
      }
    }

    // 添加文本提示
    parts.push({ text: prompt })

    const requestBody: GeminiRequest = {
      contents: [{ parts, role: 'user' }],
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 8192,
      },
    }

    const modelId = options?.model || DEFAULT_TEXT_MODEL

    const response = await fetch(
      `${GEMINI_API_ENDPOINT}/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      return { success: false, error: `API request failed: ${response.status}` }
    }

    const data: GeminiResponse = await response.json()

    if (data.error) {
      return { success: false, error: data.error.message }
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return { success: false, error: 'No response generated' }
    }

    return { success: true, text }
  } catch (error) {
    console.error('Gemini API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 调用 Gemini API 进行图片生成
 */
export async function generateImages(
  prompt: string,
  referenceImages?: string[], // Base64 encoded reference images
  count: number = 4,
  model?: string,
  aspectRatio: string = '1:1',
  imageSize?: string
): Promise<{ success: boolean; images?: string[]; error?: string }> {
  try {
    const parts: GeminiPart[] = []

    // 先添加文本提示
    parts.push({
      text: prompt,
    })

    // 再添加参考图片
    if (referenceImages && referenceImages.length > 0) {
      for (const imageData of referenceImages) {
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
        parts.push({
          inline_data: {
            mime_type: 'image/png',
            data: base64Data,
          },
        })
      }
    }

    const requestBody: GeminiRequest = {
      contents: [{ parts, role: 'user' }],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    }

    // 生成多张图片需要多次调用
    const generatedImages: string[] = []
    const baseModel = model || DEFAULT_IMAGE_MODEL
    const modelId = buildImageModelName(baseModel, aspectRatio, imageSize)
    console.log(`Using image model: ${modelId} (base: ${baseModel}, ratio: ${aspectRatio}, size: ${imageSize})`)
    console.log(`GEMINI_API_ENDPOINT------:${GEMINI_API_ENDPOINT}`)
    for (let i = 0; i < count; i++) {
      const response = await fetch(
        `${GEMINI_API_ENDPOINT}/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Gemini image API error [${response.status}]:`, errorText)
        continue
      }

      const data: GeminiResponse = await response.json()
      console.log('Gemini image API response:', JSON.stringify(data, null, 2))

      // 检查是否有错误
      if (data.error) {
        console.error('Gemini API returned error:', data.error)
        continue
      }

      // 提取生成的图片 (支持 snake_case 和 camelCase 两种格式)
      const imagePart = data.candidates?.[0]?.content?.parts?.find(
        (part) => part.inline_data || part.inlineData
      )

      const imageData = imagePart?.inline_data || imagePart?.inlineData
      if (imageData) {
        const mimeType = ('mime_type' in imageData ? imageData.mime_type : imageData.mimeType) || 'image/png'
        const imageBase64 = `data:${mimeType};base64,${imageData.data}`
        generatedImages.push(imageBase64)
      } else {
        console.error('No image found in response. Parts:', data.candidates?.[0]?.content?.parts)
      }
    }

    if (generatedImages.length === 0) {
      return { success: false, error: 'Failed to generate images. Check server logs for details.' }
    }

    return { success: true, images: generatedImages }
  } catch (error) {
    console.error('Gemini image API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 解析 AI 返回的 JSON 数据
 */
export function parseJSONResponse<T>(text: string): T | null {
  try {
    // 尝试直接解析
    return JSON.parse(text)
  } catch {
    // 尝试从 markdown 代码块中提取
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim())
      } catch {
        console.error('Failed to parse JSON from code block')
      }
    }

    // 尝试找到 JSON 对象
    const objectMatch = text.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0])
      } catch {
        console.error('Failed to parse JSON object')
      }
    }

    return null
  }
}
