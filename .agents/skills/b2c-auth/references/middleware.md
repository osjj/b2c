# Middleware

## middleware.ts (project root)

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isAdmin = req.auth?.user?.role === 'ADMIN'

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
  ],
}
```

## Route Protection Summary

| Route | Protection |
|-------|------------|
| `/admin/*` | Admin only |
| `/account/*` | Logged in users |
| `/login`, `/register` | Guests only (redirect if logged in) |
| `/`, `/products/*`, etc. | Public |
