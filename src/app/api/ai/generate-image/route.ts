import { NextRequest, NextResponse } from 'next/server'
import { generateImages } from '@/lib/gemini'
import type {
  GenerateImageRequest,
  GenerateImageResponse,
} from '@/types/ai-generation'

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json()

    if (!body.prompt) {
      return NextResponse.json<GenerateImageResponse>(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const count = body.count || 4

    const result = await generateImages(
      body.prompt,
      body.referenceImages,
      count,
      body.model,
      body.aspectRatio || '1:1',
      body.imageSize
    )

    if (!result.success || !result.images) {
      return NextResponse.json<GenerateImageResponse>(
        { success: false, error: result.error || 'Failed to generate images' },
        { status: 500 }
      )
    }

    return NextResponse.json<GenerateImageResponse>({
      success: true,
      images: result.images,
    })
  } catch (error) {
    console.error('Generate image API error:', error)
    return NextResponse.json<GenerateImageResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
