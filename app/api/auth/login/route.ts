import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { encrypt, COOKIE_NAME } from '@/lib/session'

export async function POST(req: Request) {
  const { email, password } = await req.json()

  // Suport multi-admin via ADMIN_USERS (JSON array) + retrocompatibilitat amb ADMIN_EMAIL/PASSWORD
  let valid = false
  try {
    const users: Array<{ email: string; password: string }> =
      JSON.parse(process.env.ADMIN_USERS ?? '[]')
    valid = users.some(u => u.email === email && u.password === password)
  } catch { /* ADMIN_USERS no definida o format incorrecte */ }

  if (!valid) {
    valid = email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD
  }

  if (!valid) {
    return NextResponse.json({ error: 'Credencials incorrectes' }, { status: 401 })
  }

  const token = await encrypt({ role: 'admin' })
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return NextResponse.json({ ok: true })
}
