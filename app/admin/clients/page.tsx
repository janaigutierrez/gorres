// Admin — Gestió de clients
// Agrupació de comandes per email/empresa per veure regularitat i volum

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'

const STATUS_ACTIU = ['NOVA_SOLICITUD', 'CONFIRMADA', 'EN_PRODUCCIO', 'PREPARADA']

async function getClients() {
  await connectDB()
  const result = await Order.aggregate([
    {
      $group: {
        _id:            '$client.email',
        email:          { $first: '$client.email' },
        name:           { $last:  '$client.name' },
        company:        { $last:  '$client.company' },
        phone:          { $last:  '$client.phone' },
        totalComandes:  { $sum: 1 },
        totalGastat:    { $sum: '$pricing.total' },
        ultimaComanda:  { $max: '$createdAt' },
        primeraComanda: { $min: '$createdAt' },
        comandesActives: {
          $sum: {
            $cond: [{ $in: ['$status', STATUS_ACTIU] }, 1, 0],
          },
        },
        gorresTotal: {
          $sum: { $sum: '$items.quantity' },
        },
      },
    },
    { $sort: { totalComandes: -1 } },
  ])
  return result
}

function regularitatLabel(total: number): { label: string; color: string } {
  if (total >= 5) return { label: 'Client habitual',  color: 'bg-green-100 text-green-700' }
  if (total >= 3) return { label: 'Client recurrent', color: 'bg-blue-100 text-blue-700' }
  if (total >= 2) return { label: 'Repetit',          color: 'bg-yellow-100 text-yellow-700' }
  return             { label: 'Primera vegada',        color: 'bg-gray-100 text-gray-600' }
}

export default async function ClientsPage() {
  const clients = await getClients()
  const isInternal = (email: string) => email.includes('@gorrespet.cat') || email.includes('@manual.')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
            <span className="text-gray-300">|</span>
            <h1 className="font-semibold text-gray-900">Clients</h1>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{clients.length}</span>
          </div>
          <nav className="flex gap-6 text-sm">
            <Link href="/admin/comandes" className="text-gray-500 hover:text-gray-800">Comandes</Link>
            <Link href="/admin/clients" className="text-green-700 font-semibold">Clients</Link>
            <Link href="/admin/produccio" className="text-gray-500 hover:text-gray-800">Producció</Link>
            <Link href="/admin/calendari" className="text-gray-500 hover:text-gray-800">Calendari</Link>
            <Link href="/admin/estoc" className="text-gray-500 hover:text-gray-800">Estoc</Link>
            <Link href="/admin/configuracio" className="text-gray-500 hover:text-gray-800">Configuració</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Resum */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Clients totals',    value: String(clients.length) },
            { label: 'Habituals (3+)',     value: String(clients.filter((c: any) => c.totalComandes >= 3).length) },
            { label: 'Amb actives',       value: String(clients.filter((c: any) => c.comandesActives > 0).length) },
            { label: 'Gorres produïdes',  value: String(clients.reduce((s: number, c: any) => s + (c.gorresTotal ?? 0), 0)) },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Taula de clients */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Tots els clients</h2>
            <p className="text-xs text-gray-400">Ordenats per nombre de comandes</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-700">Client</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Comandes</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Total gastat</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Gorres</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Regularitat</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Última comanda</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Actives</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((c: any) => {
                const reg     = regularitatLabel(c.totalComandes)
                const emailOk = !isInternal(c.email)
                return (
                  <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      {c.company && <p className="text-xs text-gray-600 font-medium">{c.company}</p>}
                      <div className="flex gap-3 mt-0.5">
                        {emailOk && <p className="text-xs text-gray-400">{c.email}</p>}
                        {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-lg font-bold text-gray-900">{c.totalComandes}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-bold text-gray-900">{c.totalGastat?.toFixed(0)}€</span>
                      <p className="text-xs text-gray-400">{c.totalComandes > 0 ? (c.totalGastat / c.totalComandes).toFixed(0) : 0}€/comanda</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-semibold text-gray-700">{c.gorresTotal ?? 0}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${reg.color}`}>
                        {reg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-700">
                        {new Date(c.ultimaComanda).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-400">
                        Des de {new Date(c.primeraComanda).toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {c.comandesActives > 0 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                          {c.comandesActives}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={emailOk
                          ? `/admin/comandes?cerca=${encodeURIComponent(c.email)}`
                          : `/admin/comandes?cerca=${encodeURIComponent(c.name)}`
                        }
                        className="inline-block px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all whitespace-nowrap"
                      >
                        Veure comandes →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {clients.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p>Encara no hi ha clients</p>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3 text-right">
          Les comandes creades manualment sense email apareixen agrupades per nom
        </p>
      </div>
    </div>
  )
}
