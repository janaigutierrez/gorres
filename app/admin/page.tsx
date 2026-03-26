// Panel admin — Dashboard principal
// TODO: Protegir amb NextAuth (rol admin)

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import { Stock } from '@/models/Stock'
import QuickNotes from '@/components/admin/QuickNotes'
import NewOrderButton from '@/components/admin/NewOrderButton'

async function getDashboardStats() {
  await connectDB()

  const [
    totalComandes,
    comandesActives,
    comandesPendents,
    comandesCompletades,
    stockItems,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: { $in: ['CONFIRMADA', 'EN_PRODUCCIO', 'PREPARADA', 'ENVIADA'] } }),
    Order.countDocuments({ status: 'NOVA_SOLICITUD' }),
    Order.countDocuments({ status: 'COMPLETADA' }),
    Stock.find().lean(),
  ])

  // Ingressos del mes actual
  const ara = new Date()
  const iniciiMes = new Date(ara.getFullYear(), ara.getMonth(), 1)
  const ingressosMes = await Order.aggregate([
    { $match: { status: 'COMPLETADA', createdAt: { $gte: iniciiMes } } },
    { $group: { _id: null, total: { $sum: '$pricing.total' } } },
  ])

  // Gorres produïdes totals
  const gorresTotal = await Order.aggregate([
    { $match: { status: 'COMPLETADA' } },
    { $unwind: '$items' },
    { $group: { _id: null, total: { $sum: '$items.quantity' } } },
  ])

  // Ampolles reciclades estimades (~8 per gorra)
  const gorresCount = gorresTotal[0]?.total ?? 0

  // Alertes d'estoc
  const stockAlertes = stockItems.filter(s => s.quantity <= s.minAlert)

  // Comandes recents
  const comandesRecents = await Order.find()
    .sort({ createdAt: -1 })
    .limit(8)
    .lean()

  return {
    totalComandes,
    comandesActives,
    comandesPendents,
    comandesCompletades,
    ingressosMes: ingressosMes[0]?.total ?? 0,
    gorresTotal: gorresCount,
    ampolllesReciclades: gorresCount * 8,
    stockAlertes,
    comandesRecents,
  }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NOVA_SOLICITUD: { label: 'Nova sol·licitud', color: 'bg-blue-100 text-blue-700' },
  CONFIRMADA:     { label: 'Confirmada',       color: 'bg-green-100 text-green-700' },
  EN_PRODUCCIO:   { label: 'En producció',     color: 'bg-yellow-100 text-yellow-700' },
  PREPARADA:      { label: 'Preparada',        color: 'bg-purple-100 text-purple-700' },
  ENVIADA:        { label: 'Enviada',          color: 'bg-sky-100 text-sky-700' },
  COMPLETADA:     { label: 'Completada',       color: 'bg-gray-100 text-gray-600' },
  CANCELLADA:     { label: "Cancel·lada",      color: 'bg-red-100 text-red-700' },
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header admin */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-900">Gorres PET</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Panel Admin</span>
          </div>
          <nav className="flex gap-6 text-sm">
            <Link href="/admin" className="text-green-700 font-semibold">Dashboard</Link>
            <Link href="/admin/comandes" className="text-gray-500 hover:text-gray-800">Comandes</Link>
            <Link href="/admin/clients" className="text-gray-500 hover:text-gray-800">Clients</Link>
            <Link href="/admin/produccio" className="text-gray-500 hover:text-gray-800">Producció</Link>
            <Link href="/admin/calendari" className="text-gray-500 hover:text-gray-800">Calendari</Link>
            <Link href="/admin/estoc" className="text-gray-500 hover:text-gray-800">Estoc</Link>
            <Link href="/admin/configuracio" className="text-gray-500 hover:text-gray-800">Configuració</Link>
            <Link href="/" className="text-gray-400 hover:text-gray-600">← Web</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label="Comandes actives"
            value={String(stats.comandesActives)}
            sub="en curs"
            color="green"
          />
          <KpiCard
            label="Pendents revisió"
            value={String(stats.comandesPendents)}
            sub="nova sol·licitud"
            color={stats.comandesPendents > 0 ? 'orange' : 'gray'}
            badge={stats.comandesPendents > 0}
          />
          <KpiCard
            label="Ingressos mes"
            value={`${stats.ingressosMes.toFixed(0)}€`}
            sub="comandes completades"
            color="blue"
          />
          <KpiCard
            label="Ampolles reciclades"
            value={String(stats.ampolllesReciclades)}
            sub={`${stats.gorresTotal} gorres produïdes`}
            color="teal"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Comandes recents */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-900">Comandes recents</h2>
              <Link href="/admin/comandes" className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all">Veure-les totes →</Link>
            </div>
            <div className="space-y-3">
              {stats.comandesRecents.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Cap comanda encara</p>
              ) : (
                stats.comandesRecents.map((c: any) => {
                  const si = STATUS_LABELS[c.status] ?? STATUS_LABELS.NOVA_SOLICITUD
                  return (
                    <Link key={String(c._id)} href={`/admin/comandes/${c._id}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-green-50 transition-all border border-transparent hover:border-green-100 group">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{c.orderNumber}</p>
                        <p className="text-xs text-gray-600">{c.client.name} — {c.pricing.total.toFixed(2)}€</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${si.color}`}>
                          {si.label}
                        </span>
                        <span className="text-xs font-semibold text-green-700 opacity-0 group-hover:opacity-100 transition-opacity">
                          Gestionar →
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>

          {/* Alertes i accions ràpides */}
          <div className="space-y-4">
            {/* Alertes estoc */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">
                Alertes d&apos;estoc
                {stats.stockAlertes.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {stats.stockAlertes.length}
                  </span>
                )}
              </h2>
              {stats.stockAlertes.length === 0 ? (
                <p className="text-green-600 text-sm">✓ Tot en ordre</p>
              ) : (
                <div className="space-y-2">
                  {stats.stockAlertes.map((s: any) => (
                    <div key={String(s._id)} className="flex justify-between text-sm">
                      <span className="text-gray-700">{s.name}</span>
                      <span className="text-red-600 font-semibold">{s.quantity} {s.unit}</span>
                    </div>
                  ))}
                  <Link href="/admin/estoc" className="inline-block mt-2 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all">
                    Gestionar estoc →
                  </Link>
                </div>
              )}
            </div>

            {/* Accions ràpides */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Accions ràpides</h2>
              <div className="space-y-2">
                <NewOrderButton />
                <Link href="/admin/comandes?estat=NOVA_SOLICITUD" className="block w-full px-4 py-2.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-xl hover:bg-blue-100 transition-all text-center">
                  Revisar noves sol·licituds
                  {stats.comandesPendents > 0 && (
                    <span className="ml-2 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">{stats.comandesPendents}</span>
                  )}
                </Link>
                <Link href="/admin/produccio" className="block w-full px-4 py-2.5 bg-yellow-50 text-yellow-700 text-sm font-medium rounded-xl hover:bg-yellow-100 transition-all text-center">
                  Kanban de producció
                </Link>
                <Link href="/admin/clients" className="block w-full px-4 py-2.5 bg-purple-50 text-purple-700 text-sm font-medium rounded-xl hover:bg-purple-100 transition-all text-center">
                  Gestió de clients
                </Link>
                <Link href="/admin/estoc" className="block w-full px-4 py-2.5 bg-gray-50 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 transition-all text-center">
                  Actualitzar estoc
                </Link>
              </div>
            </div>

            {/* Resum total */}
            <div className="bg-green-50 rounded-2xl border border-green-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Resum global</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Total comandes</span>
                  <span className="font-semibold text-gray-900">{stats.totalComandes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Completades</span>
                  <span className="font-semibold text-green-700">{stats.comandesCompletades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Gorres produïdes</span>
                  <span className="font-semibold text-gray-900">{stats.gorresTotal}</span>
                </div>
              </div>
            </div>

            {/* Notes ràpides */}
            <QuickNotes />
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label, value, sub, color, badge
}: {
  label: string
  value: string
  sub: string
  color: 'green' | 'orange' | 'blue' | 'teal' | 'gray'
  badge?: boolean
}) {
  const colors = {
    green:  'bg-green-50  border-green-100  text-green-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
    blue:   'bg-blue-50   border-blue-100   text-blue-700',
    teal:   'bg-teal-50   border-teal-100   text-teal-700',
    gray:   'bg-gray-50   border-gray-100   text-gray-600',
  }
  return (
    <div className={`rounded-2xl border p-5 relative ${colors[color]}`}>
      {badge && (
        <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
      )}
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs opacity-70 mt-0.5">{sub}</p>
    </div>
  )
}
