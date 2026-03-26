// Admin — Calendari de lliuraments
// Vista mensual de les comandes actives ordenades per data de lliurament estimada

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'

const ACTIVE_STATUSES = ['NOVA_SOLICITUD', 'CONFIRMADA', 'EN_PRODUCCIO', 'PREPARADA', 'ENVIADA']

const STATUS_COLORS: Record<string, { dot: string; badge: string }> = {
  NOVA_SOLICITUD: { dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700' },
  CONFIRMADA:     { dot: 'bg-green-400',  badge: 'bg-green-100 text-green-700' },
  EN_PRODUCCIO:   { dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700' },
  PREPARADA:      { dot: 'bg-purple-400', badge: 'bg-purple-100 text-purple-700' },
  ENVIADA:        { dot: 'bg-sky-400',    badge: 'bg-sky-100 text-sky-700' },
}

const STATUS_LABELS: Record<string, string> = {
  NOVA_SOLICITUD: 'Nova sol·licitud',
  CONFIRMADA:     'Confirmada',
  EN_PRODUCCIO:   'En producció',
  PREPARADA:      'Preparada',
  ENVIADA:        'Enviada',
}

interface OrderRow {
  _id: string
  orderNumber: string
  clientName: string
  status: string
  totalQty: number
  scheduledDate: string | null
  deliveryType: string
  urgent: boolean
}

async function getCalendariData() {
  await connectDB()
  const orders = await Order.find({
    status: { $in: ACTIVE_STATUSES },
  })
    .sort({ 'delivery.scheduledDate': 1, createdAt: 1 })
    .lean()

  return orders.map((o: any) => ({
    _id:           String(o._id),
    orderNumber:   o.orderNumber,
    clientName:    o.client?.name ?? '—',
    status:        o.status,
    totalQty:      (o.items ?? []).reduce((s: number, i: any) => s + i.quantity, 0),
    scheduledDate: o.delivery?.scheduledDate ? new Date(o.delivery.scheduledDate).toISOString() : null,
    deliveryType:  o.delivery?.type ?? 'local',
    urgent:        !!o.urgent,
  })) as OrderRow[]
}

function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString('ca-ES', opts ?? { day: 'numeric', month: 'long', year: 'numeric' })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isOverdue(iso: string) {
  return new Date(iso) < new Date(new Date().toDateString())
}

export default async function CalendariPage() {
  const orders = await getCalendariData()

  const withDate    = orders.filter(o => o.scheduledDate !== null)
  const withoutDate = orders.filter(o => o.scheduledDate === null)

  // Agrupar per data
  const byDate = withDate.reduce((acc, o) => {
    const key = o.scheduledDate!.slice(0, 10)
    if (!acc[key]) acc[key] = []
    acc[key].push(o)
    return acc
  }, {} as Record<string, OrderRow[]>)

  const sortedDates = Object.keys(byDate).sort()
  const today       = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
            <span className="text-gray-300">|</span>
            <h1 className="font-semibold text-gray-900">Calendari de lliuraments</h1>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{orders.length} actives</span>
          </div>
          <nav className="flex gap-6 text-sm">
            <Link href="/admin/comandes"     className="text-gray-500 hover:text-gray-800">Comandes</Link>
            <Link href="/admin/clients"      className="text-gray-500 hover:text-gray-800">Clients</Link>
            <Link href="/admin/produccio"    className="text-gray-500 hover:text-gray-800">Producció</Link>
            <Link href="/admin/calendari"    className="text-green-700 font-semibold">Calendari</Link>
            <Link href="/admin/estoc"        className="text-gray-500 hover:text-gray-800">Estoc</Link>
            <Link href="/admin/configuracio" className="text-gray-500 hover:text-gray-800">Configuració</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {orders.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Cap comanda activa</p>
          </div>
        )}

        {/* Dates */}
        {sortedDates.map(dateKey => {
          const dayOrders = byDate[dateKey]
          const isPast    = dateKey < today
          const isToday   = dateKey === today

          return (
            <div key={dateKey}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`text-sm font-bold px-3 py-1 rounded-lg ${
                  isToday ? 'bg-green-600 text-white' :
                  isPast  ? 'bg-red-100 text-red-700' :
                            'bg-gray-800 text-white'
                }`}>
                  {isToday ? 'Avui — ' : ''}{formatDate(dateKey + 'T12:00:00', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{dayOrders.length} comanda{dayOrders.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {dayOrders.map(o => <OrderCard key={o._id} order={o} overdue={isPast} />)}
              </div>
            </div>
          )
        })}

        {/* Sense data */}
        {withoutDate.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-sm font-bold px-3 py-1 rounded-lg bg-gray-100 text-gray-500">
                Sense data de lliurament
              </div>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">{withoutDate.length} comanda{withoutDate.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {withoutDate.map(o => <OrderCard key={o._id} order={o} overdue={false} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function OrderCard({ order, overdue }: { order: OrderRow; overdue: boolean }) {
  const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS.NOVA_SOLICITUD

  return (
    <Link
      href={`/admin/comandes/${order._id}`}
      className={`flex items-center gap-4 p-4 bg-white rounded-2xl border transition-all hover:shadow-sm hover:border-green-200 group
        ${overdue ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}
    >
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-gray-900 text-sm">{order.orderNumber}</span>
          <span className="font-medium text-gray-700 text-sm">{order.clientName}</span>
          {order.urgent && (
            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Urgent</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
          <span>{order.totalQty} gorres</span>
          <span>·</span>
          <span>{order.deliveryType === 'shipping' ? 'Enviament' : 'Recollida local'}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.badge}`}>
          {STATUS_LABELS[order.status]}
        </span>
        <span className="text-xs font-semibold text-green-700 opacity-0 group-hover:opacity-100 transition-opacity">
          Gestionar →
        </span>
      </div>
    </Link>
  )
}
