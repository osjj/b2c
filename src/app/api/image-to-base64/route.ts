import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    // 如果已经是 base64，直接返回
    if (url.startsWith('data:')) {
      return NextResponse.json({ success: true, base64: url })
    }

    // 获取图片
    const response = await fetch(url)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch image: ${response.status}` },
        { status: 500 }
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')

    // 获取 Content-Type
    const contentType = response.headers.get('content-type') || 'image/png'

    return NextResponse.json({
      success: true,
      base64: `data:${contentType};base64,${base64}`,
    })
  } catch (error) {
    console.error('Image to base64 error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
