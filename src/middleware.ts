import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const PRIMARY_HOST = 'www.laifappe.com'
const LEGACY_HOSTS = new Set(['laifappe.com'])

export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname

  if (LEGACY_HOSTS.has(hostname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.hostname = PRIMARY_HOST
    redirectUrl.protocol = 'https'

    return NextResponse.redirect(redirectUrl, 301)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
