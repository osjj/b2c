import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next()
  }

  // Apply intl middleware first
  const intlResponse = intlMiddleware(request)

  // Extract locale from the response or pathname
  const localeMatch = pathname.match(/^\/(en|zh|ar)(\/|$)/)
  const locale = localeMatch?.[1] || routing.defaultLocale

  // Check auth for protected routes (with locale prefix)
  const protectedPatterns = [
    new RegExp(`^/${locale}/admin`),
    new RegExp(`^/${locale}/account`),
  ]
  const authPatterns = [
    new RegExp(`^/${locale}/login`),
    new RegExp(`^/${locale}/register`),
  ]

  const isProtectedRoute = protectedPatterns.some((p) => p.test(pathname))
  const isAuthRoute = authPatterns.some((p) => p.test(pathname))

  if (isProtectedRoute || isAuthRoute) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
    })

    if (isProtectedRoute && !token) {
      const loginUrl = new URL(`/${locale}/login`, request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (isAuthRoute && token) {
      return NextResponse.redirect(new URL(`/${locale}/`, request.url))
    }

    // Check admin access
    if (pathname.includes('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL(`/${locale}/`, request.url))
    }
  }

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
