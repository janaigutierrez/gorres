// Admin — Gestió de comandes
// Server component amb fetch de dades + client components per als filtres

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import ComandaFilters from './ComandaFilters'

const STATUS_LABELS: Record<string, { label: string; color: string; border: string }> = {
  NOVA_SOLICITUD: { label: 'Nova sol·licitud', color: 'bg-blue-100 text-blue-700',    border: 'border-l-4 border-blue-400' },
  CONFIRMADA:     { label: 'Confirmada',       color: 'bg-green-100 text-green-700',  border: 'border-l-4 border-green-400' },
  EN_PRODUCCIO:   { label: 'En producció',     color: 'bg-yellow-100 text-yellow-700',border: 'border-l-4 border-yellow-400' },
  PREPARADA:      { label: 'Preparada',        color: 'bg-purple-100 text-purple-700',border: 'border-l-4 border-purple-400' },
  ENVIADA:        { label: 'Enviada',          color: 'bg-sky-100 text-sky-700',      border: 'border-l-4 border-sky-400' },
  COMPLETADA:     { label: 'Completada',       color: 'bg-gray-100 text-gray-600',    border: 'border-l-4 border-gray-300' },
  CANCELLADA:     { label: 'Cancel·lada',      color: 'bg-red-100 text-red-700',      border: 'border-l-4 border-red-400' },
}

async function getComandes(estat?: string, cerca?: string) {
  await connectDB()
  const filter: Record<string, any> = {}
  if (estat) filter.status = estat
  if (cerca) {
    filter.$or = [
      { orderNumber: { $regex: cerca, $options: 'i' } },
      { 'client.name': { $regex: cerca, $options: 'i' } },
      { 'client.email': { $regex: cerca, $options: 'i' } },
    ]
  }
  return Order.find(filter).sort({ createdAt: -1 }).limit(50).lean()
}

export default async function AdminComandes({
  searchParams,
}: {
  searchParams: Promise<{ estat?: string; cerca?: string }>
}) {
  const { estat, cerca } = await searchParams
  const comandes = await getComandes(estat, cerca)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
            <span className="text-gray-300">|</span>
            <h1 className="font-semibold text-gray-900">Comandes</h1>
          </div>
          <nav className="flex gap-6 text-sm">
            <Link href="/admin/comandes" className="text-green-700 font-semibold">Comandes</Link>
            <Link href="/admin/clients" className="text-gray-500 hover:text-gray-800">Clients</Link>
            <Link href="/admin/produccio" className="text-gray-500 hover:text-gray-800">Producció</Link>
            <Link href="/admin/calendari" className="text-gray-500 hover:text-gray-800">Calendari</Link>
            <Link href="/admin/estoc" className="text-gray-500 hover:text-gray-800">Estoc</Link>
            <Link href="/admin/configuracio" className="text-gray-500 hover:text-gray-800">Configuració</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Filtres */}
        <ComandaFilters estatActual={estat} cercaActual={cerca} />

        {/* Taula */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {comandes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">Cap comanda trobada</p>
              {(estat || cerca) && (
                <Link href="/admin/comandes" className="text-green-700 text-sm mt-2 inline-block hover:underline">
                  Treure filtres
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-700 border-r border-gray-200">Comanda</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-r border-gray-200">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-r border-gray-200">Total</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-r border-gray-200">Pagament</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-r border-gray-200">Estat</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-r border-gray-200">Data</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {comandes.map((c: any) => {
                  const si       = STATUS_LABELS[c.status] ?? STATUS_LABELS.NOVA_SOLICITUD
                  const totalQty = c.items.reduce((sum: number, i: any) => sum + i.quantity, 0)
                  const paid     = (c.payment?.depositPaid ?? 0) + (c.payment?.finalPaid ?? 0)
                  const total    = c.pricing.total
                  const payStatus =
                    paid >= total * 0.99  ? { label: 'Pagat',    color: 'text-green-700 font-semibold' } :
                    paid >= total * 0.45  ? { label: 'Bestreta', color: 'text-blue-700 font-semibold'  } :
                                            { label: 'Pendent',  color: 'text-orange-600 font-semibold' }
                  return (
                    <tr key={String(c._id)} className={`hover:bg-amber-50 transition-colors ${si.border}`}>
                      <td className="px-5 py-3.5 border-r border-gray-100">
                        <p className="font-mono font-bold text-gray-900 text-sm">{c.orderNumber}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{totalQty} gorres</p>
                      </td>
                      <td className="px-4 py-3.5 border-r border-gray-100">
                        <p className="font-semibold text-gray-900">{c.client.name}</p>
                        <p className="text-xs text-gray-600">{c.client.company ?? c.client.email}</p>
                      </td>
                      <td className="px-4 py-3.5 border-r border-gray-100">
                        <p className="font-bold text-gray-900">{c.pricing.total.toFixed(2)}€</p>
                        {c.urgent && <p className="text-xs text-orange-600 font-medium">Urgent</p>}
                      </td>
                      <td className="px-4 py-3.5 border-r border-gray-100">
                        <p className={`text-xs ${payStatus.color}`}>{payStatus.label}</p>
                        {paid > 0 && paid < total && (
                          <p className="text-xs text-gray-500">{paid.toFixed(0)}€ / {total.toFixed(0)}€</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 border-r border-gray-100">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${si.color}`}>
                          {si.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 border-r border-gray-100 text-gray-700 text-xs">
                        {new Date(c.createdAt).toLocaleDateString('ca-ES')}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/comandes/${c._id}`}
                          className="inline-block px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all whitespace-nowrap"
                        >
                          Gestionar →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3 text-right">{comandes.length} comandes mostrades</p>
      </div>
    </div>
  )
}
