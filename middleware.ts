import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// 已永久删除的历史路径，返回 410 Gone 让搜索引擎尽快从索引剔除
const GONE_PATHS = new Set<string>([
  '/us',
  '/us/cases',
  '/us/news',
  '/us/store',
  '/sustainability',
  '/shipping',
  '/$',
])

// 已永久下架的产品 slug（删除产品时把 slug 加到这里，搜索引擎会尽快从索引剔除）
const GONE_PRODUCT_SLUGS = new Set<string>([
  'wireless-keyboard-touch-id-numeric-keypad',
])

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isAdmin = req.auth?.user?.role === 'ADMIN'

  // 410 Gone：精确匹配已删除的历史 URL 或产品 slug
  const pathname = nextUrl.pathname.replace(/\/$/, '') || '/'
  const productSlugMatch = pathname.match(/^\/products\/([^/]+)$/)
  const isGoneProduct = productSlugMatch && GONE_PRODUCT_SLUGS.has(productSlugMatch[1])
  if (GONE_PATHS.has(pathname) || isGoneProduct) {
    return new NextResponse(
      '<!doctype html><html><head><meta name="robots" content="noindex"><title>410 Gone</title></head><body><h1>410 Gone</h1><p>This page has been permanently removed.</p></body></html>',
      {
        status: 410,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': 'noindex',
        },
      }
    )
  }

  // Admin routes protection
  if (nextUrl.pathname.startsWith('/admin')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login?callbackUrl=/admin', nextUrl))
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/', nextUrl))
    }
  }

  // Auth pages - redirect if already logged in
  if (nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')) {
    if (isLoggedIn) {
      const callbackUrl = nextUrl.searchParams.get('callbackUrl') || '/'
      return NextResponse.redirect(new URL(callbackUrl, nextUrl))
    }
  }

  // Account pages protection
  if (nextUrl.pathname.startsWith('/account')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login?callbackUrl=' + nextUrl.pathname, nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/admin/:path*',
    '/account/:path*',
    '/login',
    '/register',
    // 410 Gone 历史 URL
    '/us',
    '/us/:path*',
    '/sustainability',
    '/shipping',
    '/$',
    '/products/:slug',
  ],
}
