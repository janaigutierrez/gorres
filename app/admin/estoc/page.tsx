'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const TYPE_LABELS: Record<string, string> = {
  blank_hat:   'Gorres blank',
  pet_bottles: 'Ampolles PET',
  yarn:        'Fil',
  packaging:   'Packaging',
}

const UNIT_LABELS: Record<string, string> = {
  units:   'unitats',
  kg:      'kg',
  bottles: 'ampolles',
}

const DEFAULT_ITEMS = [
  { type: 'blank_hat',   name: 'Gorres blank natural', unit: 'units',   minAlert: 20  },
  { type: 'pet_bottles', name: 'Ampolles PET 1.5L',    unit: 'bottles', minAlert: 100 },
  { type: 'yarn',        name: 'Fil reciclat natural',  unit: 'kg',      minAlert: 2   },
  { type: 'packaging',   name: 'Bosses packaging',      unit: 'units',   minAlert: 50  },
]

export default function EstocPage() {
  const [items, setItems]         = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState<'estoc' | 'historial'>('estoc')
  const [moviments, setMoviments] = useState<any[]>([])
  const [loadingMov, setLoadingMov] = useState(false)
  const [showAdd, setShowAdd]     = useState(false)
  const [moviment, setMoviment]   = useState<any>(null) // { item, type }
  const [movQty, setMovQty]       = useState(0)
  const [movReason, setMovReason] = useState('')
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')

  const load = () => {
    fetch('/api/estoc')
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
  }

  const loadMoviments = () => {
    setLoadingMov(true)
    fetch('/api/estoc/moviments?limit=100')
      .then(r => r.json())
      .then(d => { setMoviments(Array.isArray(d) ? d : []); setLoadingMov(false) })
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (view === 'historial') loadMoviments()
  }, [view])

  // Inicialitzar estoc per defecte si no n'hi ha
  const initStock = async () => {
    setSaving(true)
    for (const item of DEFAULT_ITEMS) {
      await fetch('/api/estoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, quantity: 0 }),
      })
    }
    load()
    setSaving(false)
    setMsg('✓ Estoc inicialitzat')
  }

  const registrarMoviment = async () => {
    if (!moviment || movQty <= 0) return
    setSaving(true)
    const res = await fetch('/api/estoc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _action: 'moviment',
        stockId: moviment.item._id,
        type:    moviment.type,
        quantity: movQty,
        reason:  movReason || (moviment.type === 'in' ? 'Entrada manual' : 'Sortida manual'),
      }),
    })
    if (res.ok) {
      setMsg(`✓ Estoc actualitzat`)
      setMoviment(null)
      setMovQty(0)
      setMovReason('')
      load()
    }
    setSaving(false)
  }

  const alertLevel = (item: any) => {
    if (item.quantity <= 0)              return 'red'
    if (item.quantity <= item.minAlert)  return 'yellow'
    return 'green'
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Carregant...</div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
              <span className="text-gray-300">|</span>
              <h1 className="font-semibold text-gray-900">Estoc</h1>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              <button onClick={() => setView('estoc')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'estoc' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                Estoc
              </button>
              <button onClick={() => setView('historial')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'historial' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                Historial
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {msg && <span className="text-sm text-green-600">{msg}</span>}
            {items.length === 0 && view === 'estoc' && (
              <button onClick={initStock} disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60">
                Inicialitzar estoc per defecte
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Vista historial */}
        {view === 'historial' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Historial de moviments</h2>
              <button onClick={loadMoviments} className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all">↻ Actualitzar</button>
            </div>
            {loadingMov ? (
              <p className="text-center py-12 text-gray-400">Carregant...</p>
            ) : moviments.length === 0 ? (
              <p className="text-center py-12 text-gray-400">Cap moviment registrat</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ítem</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tipus</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Quantitat</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Motiu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {moviments.map((m: any) => (
                    <tr key={m._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(m.date).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {(m.stockId as any)?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          m.type === 'in'         ? 'bg-green-100 text-green-700' :
                          m.type === 'out'        ? 'bg-red-100 text-red-600' :
                                                    'bg-blue-100 text-blue-700'
                        }`}>
                          {m.type === 'in' ? '+ Entrada' : m.type === 'out' ? '− Sortida' : '⟳ Ajust'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${
                        m.type === 'in' ? 'text-green-700' : m.type === 'out' ? 'text-red-600' : 'text-blue-700'
                      }`}>
                        {m.type === 'in' ? '+' : m.type === 'out' ? '−' : ''}{m.quantity}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Vista estoc */}
        {view === 'estoc' && items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-4">Cap ítem d&apos;estoc configurat</p>
            <button onClick={initStock} disabled={saving}
              className="px-6 py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800">
              Crear estoc per defecte
            </button>
          </div>
        ) : view === 'estoc' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map(item => {
              const level = alertLevel(item)
              return (
                <div key={item._id} className={`bg-white rounded-2xl border-2 p-5 ${
                  level === 'red'    ? 'border-red-300' :
                  level === 'yellow' ? 'border-yellow-300' :
                                       'border-gray-100'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-600">{TYPE_LABELS[item.type]}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full mt-1 ${
                      level === 'red' ? 'bg-red-500' : level === 'yellow' ? 'bg-yellow-400' : 'bg-green-500'
                    }`} />
                  </div>

                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-4xl font-bold text-gray-900">{item.quantity}</span>
                    <span className="text-gray-600 mb-1">{UNIT_LABELS[item.unit]}</span>
                  </div>

                  {level !== 'green' && (
                    <p className={`text-xs mb-3 font-medium ${level === 'red' ? 'text-red-600' : 'text-yellow-600'}`}>
                      {level === 'red' ? '⚠ Sense estoc!' : `⚠ Baix (mínim: ${item.minAlert})`}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setMoviment({ item, type: 'in' }); setMovQty(0); setMovReason('') }}
                      className="flex-1 py-2 text-sm font-medium bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-all"
                    >
                      + Entrada
                    </button>
                    <button
                      onClick={() => { setMoviment({ item, type: 'out' }); setMovQty(0); setMovReason('') }}
                      className="flex-1 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                    >
                      − Sortida
                    </button>
                    <button
                      onClick={() => { setMoviment({ item, type: 'adjustment' }); setMovQty(item.quantity); setMovReason('Ajust manual') }}
                      className="py-2 px-3 text-sm font-medium bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all"
                    >
                      ⟳
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      {/* Modal moviment */}
      {moviment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-bold text-gray-900 mb-1">
              {moviment.type === 'in' ? 'Registrar entrada' :
               moviment.type === 'out' ? 'Registrar sortida' : 'Ajust manual'}
            </h2>
            <p className="text-sm text-gray-500 mb-5">{moviment.item.name}</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  {moviment.type === 'adjustment' ? 'Quantitat total (nou valor)' : 'Quantitat'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={movQty}
                  onChange={e => setMovQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-lg font-bold text-gray-900 text-center focus:border-green-500 focus:outline-none"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1 text-center">
                  {UNIT_LABELS[moviment.item.unit]}
                  {moviment.type !== 'adjustment' && ` · Actual: ${moviment.item.quantity}`}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Motiu</label>
                <input
                  type="text"
                  value={movReason}
                  onChange={e => setMovReason(e.target.value)}
                  placeholder="Recollida ampolles, producció GPT-001..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setMoviment(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Cancel·lar
              </button>
              <button onClick={registrarMoviment} disabled={saving || movQty <= 0}
                className="flex-1 py-2.5 bg-green-700 text-white font-semibold rounded-xl text-sm hover:bg-green-800 disabled:opacity-60">
                {saving ? '...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
