// Middleware de protecció de rutes — s'executa a Edge runtime
// Protegeix: pàgines /admin/* i rutes API exclusivament admin

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'gorres-session'

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return false
  try {
    const key = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET ?? 'default-secret-change-me-min-32-chars!'
    )
    await jwtVerify(token, key, { algorithms: ['HS256'] })
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pàgines admin
  if (pathname.startsWith('/admin')) {
    const authed = await isAuthenticated(request)
    if (!authed) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // Rutes API exclusivament admin
  if (pathname.startsWith('/api/export/') || pathname.startsWith('/api/admin/')) {
    const authed = await isAuthenticated(request)
    if (!authed) {
      return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/export/:path*', '/api/admin/:path*'],
}
