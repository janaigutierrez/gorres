import { SignJWT, jwtVerify } from 'jose'

export const COOKIE_NAME = 'gorres-session'

const getKey = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET ?? 'default-secret-change-me-min-32-chars!')

export async function encrypt(payload: { role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getKey())
}

export async function decrypt(token: string): Promise<{ role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ['HS256'] })
    return payload as { role: string }
  } catch {
    return null
  }
}
