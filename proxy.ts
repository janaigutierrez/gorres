import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt, COOKIE_NAME } from '@/lib/session'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(COOKIE_NAME)?.value
  const session = token ? await decrypt(token) : null

  // Rutes API exclusivament admin
  if (pathname.startsWith('/api/export/') || pathname.startsWith('/api/admin/')) {
    if (!session) {
      return NextResponse.json({ error: 'No autoritzat' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Pàgines admin
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/export/:path*', '/api/admin/:path*'],
}
