import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt, COOKIE_NAME } from '@/lib/session'
import { logout } from '@/app/actions/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = token ? await decrypt(token) : null

  if (!session) redirect('/login')

  return (
    <>
      {children}
      <form action={logout} className="fixed bottom-4 right-4 z-50 print:hidden">
        <button
          type="submit"
          className="text-xs text-gray-400 hover:text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg shadow-sm transition-all"
        >
          Sortir →
        </button>
      </form>
    </>
  )
}
