// Pàgina /seguiment/[token] — Seguiment de comanda per token (client convidat, sense login)

export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'

interface OrderTracking {
  orderNumber: string
  status: string
  client: { name: string; email: string }
  pricing: { total: number }
  payment: { method: string; status: string; depositPaid: number; finalPaid: number; total: number; pending: number }
  delivery: { type: string; scheduledDate: string | null; deliveredDate: string | null }
  createdAt: string
  updatedAt: string
}

const STATUS_LABELS: Record<string, { label: string; color: string; description: string }> = {
  NOVA_SOLICITUD: { label: 'Sol·licitud rebuda',  color: 'blue',   description: 'Hem rebut la teva sol·licitud. La revisarem aviat.' },
  CONFIRMADA:     { label: 'Confirmada',          color: 'green',  description: 'La teva comanda està confirmada i pendent d\'iniciar producció.' },
  EN_PRODUCCIO:   { label: 'En producció',        color: 'yellow', description: 'Les teves gorres s\'estan fabricant ara mateix!' },
  PREPARADA:      { label: 'Llesta per entregar', color: 'green',  description: 'La comanda està preparada. Ens posarem en contacte per coordinar l\'entrega.' },
  COMPLETADA:     { label: 'Entregada',           color: 'gray',   description: 'Comanda completada. Gràcies per confiar en Gorres PET!' },
  CANCELLADA:     { label: 'Cancel·lada',         color: 'red',    description: 'Aquesta comanda ha estat cancel·lada.' },
}

const ALL_STATUSES = ['NOVA_SOLICITUD', 'CONFIRMADA', 'EN_PRODUCCIO', 'PREPARADA', 'COMPLETADA']

async function getOrder(token: string): Promise<OrderTracking | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/comandes/seguiment/${token}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function SeguimentPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const order = await getOrder(token)

  if (!order) notFound()

  const statusInfo = STATUS_LABELS[order.status] ?? STATUS_LABELS.NOVA_SOLICITUD
  const currentStatusIdx = ALL_STATUSES.indexOf(order.status)
  const isCancelled = order.status === 'CANCELLADA'

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Capçalera */}
        <div className="text-center mb-8">
          <a href="/" className="text-green-700 text-sm font-medium hover:underline">← Gorres PET</a>
          <h1 className="text-3xl font-bold text-gray-900 mt-3 mb-1">Seguiment de comanda</h1>
          <p className="text-gray-500">{order.orderNumber}</p>
        </div>

        {/* Estat actual */}
        <div className={`
          rounded-2xl p-6 mb-6 text-center
          ${statusInfo.color === 'green'  ? 'bg-green-50 border border-green-200' : ''}
          ${statusInfo.color === 'blue'   ? 'bg-blue-50 border border-blue-200' : ''}
          ${statusInfo.color === 'yellow' ? 'bg-yellow-50 border border-yellow-200' : ''}
          ${statusInfo.color === 'gray'   ? 'bg-gray-100 border border-gray-200' : ''}
          ${statusInfo.color === 'red'    ? 'bg-red-50 border border-red-200' : ''}
        `}>
          <div className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-2
            ${statusInfo.color === 'green'  ? 'bg-green-200 text-green-800' : ''}
            ${statusInfo.color === 'blue'   ? 'bg-blue-200 text-blue-800' : ''}
            ${statusInfo.color === 'yellow' ? 'bg-yellow-200 text-yellow-800' : ''}
            ${statusInfo.color === 'gray'   ? 'bg-gray-200 text-gray-700' : ''}
            ${statusInfo.color === 'red'    ? 'bg-red-200 text-red-800' : ''}
          `}>
            {statusInfo.label}
          </div>
          <p className="text-gray-600 text-sm">{statusInfo.description}</p>
          {order.delivery.scheduledDate && order.status !== 'COMPLETADA' && order.status !== 'CANCELLADA' && (
            <p className="text-gray-700 font-medium text-sm mt-2">
              📅 Data estimada d'entrega: {new Date(order.delivery.scheduledDate).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Timeline d'estats */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">Progrés de la comanda</h2>
            <div className="space-y-4">
              {ALL_STATUSES.map((s, i) => {
                const info    = STATUS_LABELS[s]
                const done    = i < currentStatusIdx
                const current = i === currentStatusIdx
                return (
                  <div key={s} className="flex items-center gap-4">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                      ${done    ? 'bg-green-500 text-white' : ''}
                      ${current ? 'bg-green-700 text-white ring-4 ring-green-200' : ''}
                      ${!done && !current ? 'bg-gray-200 text-gray-400' : ''}
                    `}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`text-sm ${current ? 'font-semibold text-gray-900' : done ? 'text-gray-600' : 'text-gray-400'}`}>
                      {info.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Detall de la comanda */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Detall de la comanda</h2>
          <div className="space-y-2 text-sm">
            <RowItem label="Client" value={order.client.name} />
            <RowItem label="Email" value={order.client.email} />
            <RowItem label="Lliurament" value={order.delivery.type === 'local' ? 'Recollida local' : 'Enviament'} />
            <RowItem label="Data sol·licitud" value={new Date(order.createdAt).toLocaleDateString('ca-ES')} />
          </div>
        </div>

        {/* Pagament */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Pagament</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-gray-900">{order.payment.total.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pagat (bestreta 50%)</span>
              <span className={order.payment.depositPaid > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                {order.payment.depositPaid > 0 ? `${order.payment.depositPaid.toFixed(2)}€` : 'Pendent'}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-gray-500">Pendent</span>
              <span className={order.payment.pending > 0 ? 'text-orange-600 font-semibold' : 'text-green-600 font-semibold'}>
                {order.payment.pending > 0 ? `${order.payment.pending.toFixed(2)}€` : '✓ Pagat'}
              </span>
            </div>
          </div>
        </div>

        {/* Contacte */}
        <div className="bg-green-50 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-600 mb-4">Tens alguna pregunta sobre la teva comanda?</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href="https://wa.me/34600000000"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-all"
            >
              WhatsApp
            </a>
            <a
              href="mailto:comandes@gorrespet.cat"
              className="px-5 py-2.5 border border-green-700 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-50 transition-all"
            >
              Email
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Referència: {order.orderNumber}
          </p>
        </div>
      </div>
    </main>
  )
}

function RowItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  )
}
