// OpenAI-compatible API 封装 - 通过代理服务调用

const OPENAI_API_ENDPOINT = process.env.OPENAI_API_ENDPOINT || 'http://127.0.0.1:8317'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

// 默认模型配置
const DEFAULT_TEXT_MODEL = 'gpt-5.4'
const DEFAULT_IMAGE_MODEL = 'gpt-5.4'

// 宽高比 → OpenAI 标准尺寸映射
function buildImageSize(aspectRatio: string): string {
  const sizeMap: Record<string, string> = {
    '1:1': '1024x1024',
    '16:9': '1792x1024',
    '9:16': '1024x1792',
  }
  return sizeMap[aspectRatio] || '1024x1024'
}

/**
 * 调用 OpenAI API 进行文本生成（支持图片输入）
 */
export async function generateText(
  prompt: string,
  images?: string[], // Base64 encoded images (with or without data:image prefix)
  options?: {
    temperature?: number
    maxTokens?: number
    model?: string
  }
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    type ContentPart =
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }

    const content: ContentPart[] = []

    // 添加图片
    if (images && images.length > 0) {
      for (const imageData of images) {
        const url = imageData.startsWith('data:')
          ? imageData
          : `data:image/jpeg;base64,${imageData}`
        content.push({ type: 'image_url', image_url: { url } })
      }
    }

    // 添加文本提示
    content.push({ type: 'text', text: prompt })

    const requestBody = {
      model: options?.model || DEFAULT_TEXT_MODEL,
      messages: [{ role: 'user', content }],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 8192,
      reasoning_effort: 'high',
    }

    const response = await fetch(`${OPENAI_API_ENDPOINT}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', errorText)
      return { success: false, error: `API request failed: ${response.status}` }
    }

    const data = await response.json()

    if (data.error) {
      return { success: false, error: data.error.message }
    }

    const text = data.choices?.[0]?.message?.content
    if (!text) {
      return { success: false, error: 'No response generated' }
    }

    return { success: true, text }
  } catch (error) {
    console.error('OpenAI API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 调用 OpenAI API 进行图片生成
 */
export async function generateImages(
  prompt: string,
  referenceImages?: string[], // Base64 encoded reference images (暂不支持，OpenAI images API 不接受参考图)
  count: number = 4,
  model?: string,
  aspectRatio: string = '1:1',
  imageSize?: string
): Promise<{ success: boolean; images?: string[]; error?: string }> {
  try {
    const modelId = model || DEFAULT_IMAGE_MODEL
    const size = buildImageSize(aspectRatio)

    console.log(`Using image model: ${modelId}, size: ${size}`)
    console.log(`OPENAI_API_ENDPOINT: ${OPENAI_API_ENDPOINT}`)

    const requestBody = {
      model: modelId,
      prompt,
      n: count,
      size,
      response_format: 'b64_json',
    }

    const response = await fetch(`${OPENAI_API_ENDPOINT}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenAI image API error [${response.status}]:`, errorText)
      return { success: false, error: `Image API request failed: ${response.status}` }
    }

    const data = await response.json()

    if (data.error) {
      return { success: false, error: data.error.message }
    }

    const generatedImages: string[] = []
    for (const item of data.data || []) {
      if (item.b64_json) {
        generatedImages.push(`data:image/png;base64,${item.b64_json}`)
      } else if (item.url) {
        generatedImages.push(item.url)
      }
    }

    if (generatedImages.length === 0) {
      return { success: false, error: 'Failed to generate images. Check server logs for details.' }
    }

    return { success: true, images: generatedImages }
  } catch (error) {
    console.error('OpenAI image API error:', error)
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

    // 尝试找到 JSON 数组
    const arrayMatch = text.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0])
      } catch {
        console.error('Failed to parse JSON array')
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
