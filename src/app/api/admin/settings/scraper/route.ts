import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  get1688Cookie,
  set1688Cookie,
  getScraperStatus,
  getOrCreateBrowserApiKey,
  generateNewBrowserApiKey,
} from '@/lib/scraper/settings'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [status, apiKey] = await Promise.all([
    getScraperStatus(),
    getOrCreateBrowserApiKey(),
  ])
  return NextResponse.json({ ...status, apiKey })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // 更新 Cookie
  if (body.cookie !== undefined) {
    const { cookie } = body
    if (!cookie || typeof cookie !== 'string' || !cookie.trim()) {
      return NextResponse.json({ error: 'Cookie 不能为空' }, { status: 400 })
    }
    await set1688Cookie(cookie)
    return NextResponse.json({ success: true })
  }

  // 重新生成 API Key
  if (body.action === 'regenerate-api-key') {
    const apiKey = await generateNewBrowserApiKey()
    return NextResponse.json({ apiKey })
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 })
}
