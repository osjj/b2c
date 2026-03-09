import { NextRequest, NextResponse } from 'next/server'
import { validateBrowserApiKey } from '@/lib/scraper/settings'
import { saveProductCore } from '@/lib/scraper/save-product'
import type { ScrapedProduct } from '@/lib/scraper/types'

export async function POST(request: NextRequest) {
  // 用 API Key 鉴权（油猴插件无法携带 session cookie）
  const apiKey = request.headers.get('x-scraper-key') || ''
  const isValid = await validateBrowserApiKey(apiKey)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 })
  }

  const data = body as ScrapedProduct

  if (!data.name || !data.offerId) {
    return NextResponse.json({ error: '缺少必要字段 name / offerId' }, { status: 400 })
  }

  try {
    const result = await saveProductCore(data)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[collect-from-browser] error:', err)
    return NextResponse.json({ error: '保存失败，请检查服务器日志' }, { status: 500 })
  }
}
