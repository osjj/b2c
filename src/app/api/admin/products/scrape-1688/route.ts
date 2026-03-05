import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { scrape1688Product } from '@/lib/scraper/1688-collector'
import { extractOfferId } from '@/lib/scraper/utils'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: '请提供 1688 商品链接' },
        { status: 400 }
      )
    }

    const offerId = extractOfferId(url)
    if (!offerId) {
      return NextResponse.json(
        { error: '无效的 1688 商品链接，请检查 URL 格式' },
        { status: 400 }
      )
    }

    const result = await scrape1688Product(url)

    if (!result.success) {
      console.error('[scrape-1688] FAILED:', JSON.stringify(result.error), 'duration:', result.duration)
      return NextResponse.json(
        {
          error: result.error?.message || '采集失败',
          code: result.error?.code,
          duration: result.duration,
        },
        { status: 422 }
      )
    }

    return NextResponse.json({
      data: result.data,
      warnings: result.warnings,
      duration: result.duration,
    })
  } catch (error) {
    console.error('[scrape-1688] Unexpected error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
