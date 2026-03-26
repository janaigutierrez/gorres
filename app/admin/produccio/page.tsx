'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PRODUCT_NAMES } from '@/lib/pricing'
import StockModal from '@/components/admin/StockModal'

const COLUMNS = [
  { id: 'CONFIRMADA',   label: 'Confirmades',    color: 'border-green-400  bg-green-50' },
  { id: 'EN_PRODUCCIO', label: 'En produccio',   color: 'border-yellow-400 bg-yellow-50' },
  { id: 'PREPARADA',    label: 'Llestes',        color: 'border-purple-400 bg-purple-50' },
  { id: 'ENVIADA',      label: 'Enviades',       color: 'border-sky-400    bg-sky-50' },
]

const NEXT_STATUS: Record<string, string> = {
  CONFIRMADA:   'EN_PRODUCCIO',
  EN_PRODUCCIO: 'PREPARADA',
}

const NEXT_LABEL: Record<string, string> = {
  CONFIRMADA:   'Iniciar produccio →',
  EN_PRODUCCIO: 'Marcar com a llesta →',
}

export default function KanbanProduccio() {
  const [comandes, setComandes] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [moving, setMoving]     = useState<string | null>(null)
  const [stockOrder, setStockOrder] = useState<any>(null)

  const load = () => {
    fetch('/api/comandes?limit=100')
      .then(r => r.json())
      .then(d => { setComandes(d.comandes ?? []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const moveStatus = async (orderId: string, newStatus: string) => {
    setMoving(orderId)
    await fetch(`/api/comandes/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    load()
    setMoving(null)
  }

  const byStatus = (status: string) =>
    comandes.filter(c => c.status === status)

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
      Carregant...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-600 hover:text-gray-800 text-sm">← Dashboard</Link>
            <span className="text-gray-300">|</span>
            <h1 className="font-semibold text-gray-900">Kanban de produccio</h1>
          </div>
          <button onClick={load} className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all">↻ Actualitzar</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map(col => {
            const orders = byStatus(col.id)
            return (
              <div key={col.id} className={`rounded-2xl border-2 ${col.color} p-4 min-h-64`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-semibold text-gray-800">{col.label}</h2>
                  <span className="bg-white text-gray-700 text-xs font-bold px-2 py-1 rounded-full">
                    {orders.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {orders.length === 0 && (
                    <p className="text-center text-gray-600 text-sm py-6">Cap comanda</p>
                  )}
                  {orders.map(c => {
                    const totalQty = c.items?.reduce((s: number, i: any) => s + i.quantity, 0) ?? 0
                    const isUrgent = c.pricing?.urgency
                    const daysLeft = c.delivery?.scheduledDate
                      ? Math.ceil((new Date(c.delivery.scheduledDate).getTime() - Date.now()) / 86400000)
                      : null

                    return (
                      <div key={c._id} className={`bg-white rounded-xl p-4 shadow-sm border ${isUrgent ? 'border-orange-300' : 'border-gray-100'}`}>
                        {/* Capcalera */}
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{c.orderNumber}</p>
                            <p className="text-xs text-gray-600">{c.client?.name}</p>
                          </div>
                          <div className="text-right">
                            {isUrgent && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold block mb-1">
                                URGENT
                              </span>
                            )}
                            {daysLeft !== null && (
                              <span className={`text-xs font-semibold ${daysLeft <= 3 ? 'text-red-600' : daysLeft <= 7 ? 'text-orange-500' : 'text-gray-600'}`}>
                                {daysLeft > 0 ? `${daysLeft}d` : 'Vençut'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Productes */}
                        <div className="space-y-1 mb-3">
                          {c.items?.map((item: any, i: number) => (
                            <p key={i} className="text-xs text-gray-700">
                              {item.quantity}x {PRODUCT_NAMES[item.productType] ?? item.productType}
                              {item.color !== 'natural' && ` · ${item.color}`}
                              {item.logo?.hasLogo && ' · logo'}
                            </p>
                          ))}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">{totalQty} gorres · ~{totalQty * 8} ampolles</span>
                          <Link href={`/admin/comandes/${c._id}`} className="text-xs text-gray-600 hover:text-green-700">
                            detall
                          </Link>
                        </div>

                        {/* Boto d'avanc */}
                        {NEXT_STATUS[col.id] && (
                          <button
                            onClick={() => {
                              if (col.id === 'CONFIRMADA') {
                                setStockOrder(c)
                              } else {
                                moveStatus(c._id, NEXT_STATUS[col.id])
                              }
                            }}
                            disabled={moving === c._id}
                            className="mt-3 w-full py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-all"
                          >
                            {moving === c._id ? '...' : NEXT_LABEL[col.id]}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Completades avui */}
        {byStatus('COMPLETADA').length > 0 && (
          <div className="mt-8">
            <h2 className="font-semibold text-gray-700 mb-3">Completades ({byStatus('COMPLETADA').length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {byStatus('COMPLETADA').slice(0, 8).map(c => (
                <Link key={c._id} href={`/admin/comandes/${c._id}`}
                  className="bg-white rounded-xl p-3 border border-gray-100 hover:border-green-300 transition-all">
                  <p className="font-semibold text-sm text-gray-700">{c.orderNumber}</p>
                  <p className="text-xs text-gray-600">{c.client?.name}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {stockOrder && (
        <StockModal
          order={stockOrder}
          onDeducted={() => {
            moveStatus(stockOrder._id, 'EN_PRODUCCIO')
            setStockOrder(null)
          }}
          onCancel={() => setStockOrder(null)}
        />
      )}
    </div>
  )
}
