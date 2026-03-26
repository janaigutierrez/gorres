'use client'

// Modal de gestió d'estoc — apareix quan una comanda passa a EN_PRODUCCIO
// No es pot tancar sense prendre una acció

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface StockModalProps {
  order: { _id: string; orderNumber: string; items: Array<{ quantity: number; productType: string }> }
  onDeducted: () => void   // cridat despres de deducció exitosa o estoc alternatiu usat
  onCancel: () => void     // cridat quan l'usuari cancel·la — reverteix l'estat
}

export default function StockModal({ order, onDeducted, onCancel }: StockModalProps) {
  const [stockItems, setStockItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [altDesc, setAltDesc] = useState('')
  const [showAlt, setShowAlt] = useState(false)

  const totalQty = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0

  useEffect(() => {
    fetch('/api/estoc')
      .then(r => r.json())
      .then(data => {
        setStockItems(Array.isArray(data) ? data.filter((i: any) => i.type === 'blank_hat') : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const descomptar = async (stockId: string) => {
    setSaving(true)
    await fetch('/api/estoc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _action: 'moviment',
        stockId,
        type: 'out',
        quantity: totalQty,
        reason: `Comanda ${order.orderNumber}`,
      }),
    })
    setSaving(false)
    onDeducted()
  }

  const confirmarAlt = async () => {
    if (!altDesc.trim()) return
    setSaving(true)
    await fetch('/api/estoc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _action: 'moviment',
        stockId: stockItems[0]?._id ?? null,
        type: 'note',
        quantity: totalQty,
        reason: `Estoc alternatiu — Comanda ${order.orderNumber}: ${altDesc}`,
      }),
    }).catch(() => {})
    setSaving(false)
    onDeducted()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="font-bold text-gray-900 text-lg mb-1">Gestionar estoc de gorres</h2>
        <p className="text-sm text-gray-700 mb-4">
          Comanda <strong>{order.orderNumber}</strong> — necessita <strong>{totalQty} gorres blank</strong>
        </p>

        {/* Resum d'ítems */}
        <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-1">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.quantity} gorres</span>
              <span className="font-medium text-gray-900">{item.productType}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold border-t border-gray-200 pt-2 mt-1 text-sm">
            <span className="text-gray-900">Total necessari</span>
            <span className="text-gray-900">{totalQty} u</span>
          </div>
        </div>

        {/* Opcions */}
        <div className="space-y-3">

          {/* Opció 1: Descomptar de gorres blank */}
          <div className="border-2 border-gray-200 rounded-xl p-4">
            <p className="font-semibold text-gray-900 text-sm mb-2">
              Descomptar de gorres blank
            </p>
            {loading ? (
              <p className="text-sm text-gray-600">Carregant estoc...</p>
            ) : stockItems.length === 0 ? (
              <div>
                <p className="text-sm text-gray-700 mb-2">No hi ha gorres blank a l'estoc.</p>
                <Link
                  href="/admin/estoc"
                  className="text-sm text-green-700 font-medium hover:underline"
                >
                  Afegeix estoc primer →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {stockItems.map(s => {
                  const enough = s.quantity >= totalQty
                  return (
                    <button
                      key={s._id}
                      onClick={() => descomptar(s._id)}
                      disabled={saving}
                      className={`w-full flex justify-between items-center px-4 py-3 rounded-xl border-2 text-sm transition-all disabled:opacity-60 ${
                        enough
                          ? 'border-green-300 hover:border-green-500 hover:bg-green-50'
                          : 'border-orange-300 hover:border-orange-400 hover:bg-orange-50'
                      }`}
                    >
                      <span className="font-medium text-gray-900">{s.name}</span>
                      <span className={`font-bold ${enough ? 'text-green-700' : 'text-orange-600'}`}>
                        {s.quantity} u{!enough && ' — insuficient'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Opció 2: Estoc alternatiu */}
          <div className="border-2 border-gray-200 rounded-xl p-4">
            <button
              className="w-full text-left"
              onClick={() => setShowAlt(v => !v)}
            >
              <p className="font-semibold text-gray-900 text-sm">
                Estoc alternatiu
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                Gorres tenyides de comandes cancel·lades, excedent de producció, etc.
              </p>
            </button>
            {showAlt && (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={altDesc}
                  onChange={e => setAltDesc(e.target.value)}
                  placeholder="Descriu l'estoc usat"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none"
                />
                <button
                  onClick={confirmarAlt}
                  disabled={saving || !altDesc.trim()}
                  className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Guardant...' : 'Confirmar estoc alternatiu'}
                </button>
              </div>
            )}
          </div>

          {/* Opció 3: Cancel·lar canvi d'estat */}
          <button
            onClick={onCancel}
            disabled={saving}
            className="w-full py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancel·lar canvi d'estat
          </button>
        </div>
      </div>
    </div>
  )
}
