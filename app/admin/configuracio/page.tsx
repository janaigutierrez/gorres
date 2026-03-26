'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PricingConfigData } from '@/types'
import { DEFAULT_PRICING, PRODUCT_NAMES } from '@/lib/pricing'

// --- Helpers ---
function currentMonthOptions() {
  const opts = []
  const now = new Date()
  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })
    opts.push({ value, label })
  }
  return opts
}

const MONTH_OPTIONS = currentMonthOptions()

// --- Tipus local per al formulari ---
interface DiscountRow { minQty: number; maxQty: number; discount: number }

const EXTRA_LABELS: Record<string, string> = {
  color:             'Color tenyit',
  logoLarge:         'Logo gran',
  packagingDeluxe:   'Packaging Deluxe',
  packagingSouvenir: 'Packaging Souvenir',
  labelInner:        'Etiqueta interior',
}

function NumInput({
  value, onChange, min = 0, step = 0.5, unit,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  step?: number
  unit?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        onFocus={e => e.target.select()}
        className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 text-right focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-200"
      />
      {unit && <span className="text-sm text-gray-500">{unit}</span>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 border-b border-gray-100 pb-2">
      {children}
    </h2>
  )
}

export default function ConfiguracioPage() {
  const [config, setConfig]   = useState<PricingConfigData>(DEFAULT_PRICING)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  // Exportació
  const [exportMes, setExportMes] = useState(MONTH_OPTIONS[0].value)

  // Zona de perill
  const [deleteMonths, setDeleteMonths]     = useState(6)
  const [confirmReset, setConfirmReset]     = useState('')
  const [dangerMsg, setDangerMsg]           = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [dangerLoading, setDangerLoading]   = useState(false)

  const deleteOld = async () => {
    if (!confirm(`Eliminaràs totes les comandes COMPLETADES i CANCEL·LADES de fa més de ${deleteMonths} mesos. Continuar?`)) return
    setDangerLoading(true)
    setDangerMsg(null)
    const res = await fetch('/api/admin/dades', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-old', months: deleteMonths }),
    })
    const data = await res.json()
    setDangerMsg(res.ok
      ? { type: 'ok', text: `${data.deleted} comandes eliminades` }
      : { type: 'error', text: data.error ?? 'Error' }
    )
    setDangerLoading(false)
  }

  const resetAll = async () => {
    if (confirmReset !== 'ESBORRAR TOT') return
    setDangerLoading(true)
    setDangerMsg(null)
    const res = await fetch('/api/admin/dades', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-all' }),
    })
    const data = await res.json()
    setDangerMsg(res.ok
      ? { type: 'ok', text: `${data.deleted} comandes eliminades. Base de dades neta.` }
      : { type: 'error', text: data.error ?? 'Error' }
    )
    setConfirmReset('')
    setDangerLoading(false)
  }

  useEffect(() => {
    fetch('/api/configuracio')
      .then(r => r.json())
      .then(d => { setConfig(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const setProduct = (key: keyof PricingConfigData['products'], price: number) =>
    setConfig(c => ({ ...c, products: { ...c.products, [key]: { basePrice: price } } }))

  const setExtra = (key: keyof PricingConfigData['extras'], field: 'price' | 'multiplier', val: number) =>
    setConfig(c => ({ ...c, extras: { ...c.extras, [key]: { [field]: val } } }))

  const setDiscount = (i: number, field: keyof DiscountRow, val: number) =>
    setConfig(c => {
      const rows = [...c.volumeDiscounts]
      rows[i] = { ...rows[i], [field]: val }
      return { ...c, volumeDiscounts: rows }
    })

  const addDiscount = () =>
    setConfig(c => ({
      ...c,
      volumeDiscounts: [...c.volumeDiscounts, { minQty: 0, maxQty: 0, discount: 0 }],
    }))

  const removeDiscount = (i: number) =>
    setConfig(c => ({ ...c, volumeDiscounts: c.volumeDiscounts.filter((_, idx) => idx !== i) }))

  const save = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/configuracio', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(config),
      })
      setMsg(res.ok
        ? { type: 'ok',    text: '✓ Configuració desada correctament' }
        : { type: 'error', text: 'Error desant la configuració' }
      )
    } catch {
      setMsg({ type: 'error', text: 'Error de connexió' })
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Carregant...</div>
  )

  const urgencyPct = Math.round((config.extras.urgency.multiplier - 1) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
            <span className="text-gray-300">|</span>
            <h1 className="font-semibold text-gray-900">Configuració de preus</h1>
          </div>
          <div className="flex items-center gap-3">
            {msg && (
              <span className={`text-sm font-medium ${msg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                {msg.text}
              </span>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 disabled:opacity-60 transition-all"
            >
              {saving ? 'Desant...' : 'Guardar canvis'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Preus base */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle>Preus base per producte</SectionTitle>
          <div className="space-y-3">
            {(Object.keys(config.products) as Array<keyof PricingConfigData['products']>).map(key => (
              <div key={key} className="flex justify-between items-center py-1">
                <div>
                  <p className="text-sm font-medium text-gray-800">{PRODUCT_NAMES[key]}</p>
                  <p className="text-xs text-gray-400">Preu unitari sense extres</p>
                </div>
                <NumInput
                  value={config.products[key].basePrice}
                  onChange={v => setProduct(key, v)}
                  step={0.5}
                  unit="€/u"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Extres */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle>Extres i recàrrecs</SectionTitle>
          <div className="space-y-3">
            {(Object.keys(EXTRA_LABELS) as Array<keyof typeof EXTRA_LABELS>).map(key => (
              <div key={key} className="flex justify-between items-center py-1">
                <p className="text-sm font-medium text-gray-800">{EXTRA_LABELS[key]}</p>
                <NumInput
                  value={(config.extras[key as keyof PricingConfigData['extras']] as { price: number }).price}
                  onChange={v => setExtra(key as keyof PricingConfigData['extras'], 'price', v)}
                  step={0.5}
                  unit="€/u"
                />
              </div>
            ))}
            {/* Urgència com a % */}
            <div className="flex justify-between items-center py-1 pt-3 border-t border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-800">Recàrrec urgència</p>
                <p className="text-xs text-gray-400">S&apos;aplica sobre el total amb descompte</p>
              </div>
              <NumInput
                value={urgencyPct}
                onChange={v => setExtra('urgency', 'multiplier', 1 + v / 100)}
                min={0}
                step={5}
                unit="%"
              />
            </div>
          </div>
        </div>

        {/* Dies de producció */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle>Dies de producció</SectionTitle>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-1">
              <div>
                <p className="text-sm font-medium text-gray-800">Termini estàndard</p>
                <p className="text-xs text-gray-400">Dies hàbils des de la confirmació</p>
              </div>
              <NumInput
                value={config.productionDays.standard}
                onChange={v => setConfig(c => ({ ...c, productionDays: { ...c.productionDays, standard: Math.round(v) } }))}
                min={1}
                step={1}
                unit="dies"
              />
            </div>
            <div className="flex justify-between items-center py-1">
              <div>
                <p className="text-sm font-medium text-gray-800">Termini urgent</p>
                <p className="text-xs text-gray-400">Dies hàbils amb recàrrec d&apos;urgència</p>
              </div>
              <NumInput
                value={config.productionDays.urgent}
                onChange={v => setConfig(c => ({ ...c, productionDays: { ...c.productionDays, urgent: Math.round(v) } }))}
                min={1}
                step={1}
                unit="dies"
              />
            </div>
          </div>
        </div>

        {/* Descomptes per volum */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle>Descomptes per volum</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-3 font-medium text-gray-500">Mínim (u)</th>
                  <th className="pb-3 font-medium text-gray-500">Màxim (u)</th>
                  <th className="pb-3 font-medium text-gray-500">Descompte</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {config.volumeDiscounts.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4">
                      <NumInput value={row.minQty} onChange={v => setDiscount(i, 'minQty', Math.round(v))} min={1} step={1} />
                    </td>
                    <td className="py-2 pr-4">
                      <NumInput value={row.maxQty} onChange={v => setDiscount(i, 'maxQty', Math.round(v))} min={1} step={1} />
                    </td>
                    <td className="py-2 pr-4">
                      <NumInput
                        value={Math.round(row.discount * 100)}
                        onChange={v => setDiscount(i, 'discount', v / 100)}
                        min={0} step={5} unit="%"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => removeDiscount(i)}
                        className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                        title="Eliminar tram"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={addDiscount}
            className="mt-4 text-sm text-green-700 hover:text-green-800 font-medium"
          >
            + Afegir tram
          </button>
          <p className="text-xs text-gray-400 mt-3">
            El descompte s&apos;aplica sobre el subtotal de productes (sense urgència).
          </p>
        </div>

        {/* Boto final preus */}
        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 disabled:opacity-60 transition-all"
          >
            {saving ? 'Desant...' : 'Guardar canvis'}
          </button>
        </div>

        {/* ─── Exportació de dades ─── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle>Exportació de dades</SectionTitle>
          <div className="space-y-6">

            {/* Comandes */}
            <div>
              <p className="text-sm font-medium text-gray-800 mb-1">Comandes</p>
              <p className="text-xs text-gray-400 mb-3">Exporta les comandes d'un mes concret o totes les de l'historial en format CSV (compatible amb Excel).</p>
              <div className="flex gap-3 flex-wrap items-center">
                <select
                  value={exportMes}
                  onChange={e => setExportMes(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-green-500 focus:outline-none"
                >
                  {MONTH_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <a
                  href={`/api/export/comandes?mes=${exportMes}`}
                  download
                  className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 transition-all"
                >
                  Descarregar CSV del mes
                </a>
                <a
                  href="/api/export/comandes"
                  download
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Totes les comandes
                </a>
              </div>
            </div>

            {/* Clients */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-800 mb-1">Agenda de clients</p>
              <p className="text-xs text-gray-400 mb-3">Exporta tots els clients amb el seu nom, email, telèfon, empresa, nombre de comandes i total gastat.</p>
              <a
                href="/api/export/clients"
                download
                className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all"
              >
                Descarregar agenda de clients (CSV)
              </a>
            </div>
          </div>
        </div>

        {/* ─── Informació del sistema ─── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle>Informació del sistema</SectionTitle>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">Email admin</span>
              <span className="font-medium text-gray-900">{process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '(configurat al servidor)'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">Email de sortida</span>
              <span className="font-medium text-gray-900">onboarding@resend.dev</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">Emmagatzematge de logos</span>
              <span className="font-medium text-gray-900">Cloudinary</span>
            </div>
            <p className="text-xs text-gray-400 pt-2">
              Per canviar les credencials d&apos;accés o afegir nous usuaris, edita el fitxer <code className="bg-gray-100 px-1 rounded">.env.local</code> al servidor.
            </p>
          </div>
        </div>

        {/* ─── Zona de perill ─── */}
        <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-6">
          <SectionTitle>⚠ Zona de perill</SectionTitle>

          {dangerMsg && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${dangerMsg.type === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {dangerMsg.text}
            </div>
          )}

          <div className="space-y-6">

            {/* Eliminar comandes antigues */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Eliminar comandes antigues</p>
              <p className="text-xs text-gray-500 mb-3">
                Elimina totes les comandes amb estat <strong>Completada</strong> o <strong>Cancel·lada</strong> anteriors als mesos indicats. Les comandes actives no s'eliminen.
              </p>
              <div className="flex gap-3 items-center flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Més antigues de</span>
                  <select
                    value={deleteMonths}
                    onChange={e => setDeleteMonths(Number(e.target.value))}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-red-400 focus:outline-none"
                  >
                    {[3, 6, 12, 24].map(m => (
                      <option key={m} value={m}>{m} mesos</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={deleteOld}
                  disabled={dangerLoading}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60 transition-all"
                >
                  Eliminar comandes antigues
                </button>
              </div>
            </div>

            {/* Reset total */}
            <div className="pt-4 border-t border-red-200">
              <p className="text-sm font-semibold text-gray-900 mb-1">Resetejar tota la base de dades</p>
              <p className="text-xs text-gray-500 mb-3">
                Elimina <strong>totes les comandes</strong> sense excepció. Aquesta acció és <strong>irreversible</strong>. Escriu <code className="bg-red-100 px-1 rounded font-mono">ESBORRAR TOT</code> per confirmar.
              </p>
              <div className="flex gap-3 items-center flex-wrap">
                <input
                  type="text"
                  value={confirmReset}
                  onChange={e => setConfirmReset(e.target.value)}
                  placeholder="ESBORRAR TOT"
                  className="px-3 py-2 border border-red-300 rounded-lg text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-200 w-44"
                />
                <button
                  onClick={resetAll}
                  disabled={confirmReset !== 'ESBORRAR TOT' || dangerLoading}
                  className="px-4 py-2 bg-red-800 text-white text-sm font-semibold rounded-xl hover:bg-red-900 disabled:opacity-40 transition-all"
                >
                  Resetejar tot
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pb-8" />

      </div>
    </div>
  )
}
