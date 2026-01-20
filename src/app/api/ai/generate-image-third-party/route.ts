import { NextRequest, NextResponse } from 'next/server'
import type {
  GenerateImageResponse,
  ThirdPartyImageRequest,
  ThirdPartyImageResponse,
} from '@/types/ai-generation'

interface RequestBody {
  url: string
  apiKey: string
  model: string
  prompt: string
  aspectRatio?: string
  imageSize?: string
  referenceImages?: string[] // Base64 or URLs
}

// 提交任务响应
interface SubmitResponse {
  code: number
  msg: string
  data: {
    id: string
  }
}

// 结果查询响应
interface ResultResponse {
  code: number
  msg: string
  data: ThirdPartyImageResponse
}

// 轮询获取结果
async function pollForResult(
  baseUrl: string,
  taskId: string,
  apiKey: string,
  maxAttempts = 120, // 最多轮询 120 次
  interval = 2000 // 每 2 秒轮询一次
): Promise<ThirdPartyImageResponse> {
  // 从 url 提取 base path，构建 result 接口 URL
  // 例如: https://xxx/v1/draw/nano-banana -> https://xxx/v1/draw/result
  const resultUrl = baseUrl.replace(/\/draw\/[^/]+$/, '/draw/result')

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(resultUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ id: taskId }),
    })

    if (!response.ok) {
      throw new Error(`Result API error: ${response.status}`)
    }

    const result: ResultResponse = await response.json()

    console.log(`[Poll attempt ${attempt + 1}] Result:`, JSON.stringify(result, null, 2))

    if (result.code !== 0) {
      throw new Error(result.msg || 'Failed to get result')
    }

    const data = result.data

    // 检查是否完成
    if (data.status === 'succeeded') {
      return data
    }

    if (data.status === 'failed') {
      console.error('Generation failed, full response:', JSON.stringify(result, null, 2))
      throw new Error(
        data.failure_reason ||
        (data.error && data.error !== 'error' ? data.error : null) ||
        `Generation failed (status: ${data.status}, progress: ${data.progress})`
      )
    }

    // 未完成，等待后继续轮询
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error('Timeout waiting for image generation')
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()

    if (!body.url || !body.apiKey) {
      return NextResponse.json<GenerateImageResponse>(
        { success: false, error: 'URL and API Key are required' },
        { status: 400 }
      )
    }

    if (!body.prompt) {
      return NextResponse.json<GenerateImageResponse>(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // 构建第三方请求参数
    // 使用 webHook: "-1" 立即返回 id，然后轮询结果
    const thirdPartyRequest: ThirdPartyImageRequest = {
      model: body.model || 'nano-banana-fast',
      prompt: body.prompt,
      aspectRatio: body.aspectRatio || 'auto',
      imageSize: body.imageSize || '1K',
      urls: body.referenceImages || [],
      webHook: '-1', // 立即返回 id
      shutProgress: true, // 关闭进度回复
    }

    console.log('Submitting to third-party API:', {
      url: body.url,
      request: { ...thirdPartyRequest, urls: `[${thirdPartyRequest.urls?.length || 0} images]` },
    })

    // 提交任务
    const submitResponse = await fetch(body.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${body.apiKey}`,
      },
      body: JSON.stringify(thirdPartyRequest),
    })

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text()
      console.error('Third-party API submit error:', errorText)
      return NextResponse.json<GenerateImageResponse>(
        {
          success: false,
          error: `Third-party API error: ${submitResponse.status} ${submitResponse.statusText}`,
        },
        { status: submitResponse.status }
      )
    }

    const submitResult: SubmitResponse = await submitResponse.json()

    if (submitResult.code !== 0 || !submitResult.data?.id) {
      return NextResponse.json<GenerateImageResponse>(
        {
          success: false,
          error: submitResult.msg || 'Failed to submit task',
        },
        { status: 500 }
      )
    }

    const taskId = submitResult.data.id
    console.log('Task submitted, ID:', taskId)

    // 轮询获取结果
    const resultUrl = body.url.replace(/\/draw\/[^/]+$/, '/draw/result')
    console.log('Polling result from:', resultUrl)

    const result = await pollForResult(body.url, taskId, body.apiKey)

    // 提取生成的图片 URL
    const images = result.results?.map((r) => r.url).filter(Boolean) || []

    if (images.length === 0) {
      return NextResponse.json<GenerateImageResponse>(
        { success: false, error: 'No images generated' },
        { status: 500 }
      )
    }

    return NextResponse.json<GenerateImageResponse>({
      success: true,
      images,
    })
  } catch (error) {
    console.error('Third-party generate image API error:', error)
    return NextResponse.json<GenerateImageResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
