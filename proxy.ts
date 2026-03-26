import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt, COOKIE_NAME } from '@/lib/session'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const session = token ? await decrypt(token) : null

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
