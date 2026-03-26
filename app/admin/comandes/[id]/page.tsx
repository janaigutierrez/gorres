'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PRODUCT_NAMES, AVAILABLE_COLORS } from '@/lib/pricing'
import StockModal from '@/components/admin/StockModal'

function waLink(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const number = digits.startsWith('34') ? digits : '34' + digits
  return `https://wa.me/${number}`
}

const STATUS_OPTIONS = [
  { id: 'NOVA_SOLICITUD', label: 'Nova sol·licitud',  color: 'bg-blue-100 text-blue-700' },
  { id: 'CONFIRMADA',     label: 'Confirmada',        color: 'bg-green-100 text-green-700' },
  { id: 'EN_PRODUCCIO',   label: 'En producció',      color: 'bg-yellow-100 text-yellow-700' },
  { id: 'PREPARADA',      label: 'Preparada',         color: 'bg-purple-100 text-purple-700' },
  { id: 'ENVIADA',        label: 'Enviada',           color: 'bg-sky-100 text-sky-700' },
  { id: 'COMPLETADA',     label: 'Completada',        color: 'bg-gray-100 text-gray-600' },
  { id: 'CANCELLADA',     label: 'Cancel·lada',       color: 'bg-red-100 text-red-700' },
]

export default function ComandaDetall() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [showStockModal, setShowStockModal] = useState(false)
  const [pendingTransition, setPendingTransition] = useState<{ status: string; printUrl?: string } | null>(null)

  const [status, setStatus]               = useState('')
  const [notes, setNotes]                 = useState('')
  const [prodNotes, setProdNotes]         = useState('')
  const [bottles, setBottles]             = useState(0)
  const [deposit, setDeposit]             = useState(0)
  const [depositDate, setDepositDate]     = useState('')
  const [finalPaid, setFinalPaid]         = useState(0)
  const [finalDate, setFinalDate]         = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [trackingNotes, setTrackingNotes] = useState('')

  useEffect(() => {
    fetch(`/api/comandes/${id}`)
      .then(r => r.json())
      .then(data => {
        setOrder(data)
        setStatus(data.status)
        setNotes(data.notes ?? '')
        setProdNotes(data.production?.notes ?? '')
        setBottles(data.production?.bottlesUsed ?? 0)
        setDeposit(data.payment?.depositPaid ?? 0)
        setDepositDate(data.payment?.depositDate ? data.payment.depositDate.slice(0, 10) : '')
        setFinalPaid(data.payment?.finalPaid ?? 0)
        setFinalDate(data.payment?.finalDate ? data.payment.finalDate.slice(0, 10) : '')
        setScheduledDate(data.delivery?.scheduledDate ? data.delivery.scheduledDate.slice(0, 10) : '')
        setTrackingNotes(data.delivery?.notes ?? '')
        setLoading(false)
      })
  }, [id])

  const save = async (overrideStatus?: string): Promise<boolean> => {
    setSaving(true)
    setMsg('')
    const res = await fetch(`/api/comandes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status:               overrideStatus ?? status,
        notes,
        productionNotes:      prodNotes,
        productionBottlesUsed: bottles,
        depositPaid:          deposit,
        depositDate:          depositDate || undefined,
        finalPaid,
        finalDate:            finalDate || undefined,
        scheduledDate:        scheduledDate || undefined,
        trackingNotes:        trackingNotes || undefined,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setOrder(data.order)
      setStatus(data.order.status)
      setMsg('Guardat correctament')
      setSaving(false)
      return true
    }
    setMsg('Error en guardar')
    setSaving(false)
    return false
  }

  // Transita a un nou estat, opcionalment obrint una URL d'impressió
  const transition = async (newStatus: string, printUrl?: string) => {
    if (newStatus === 'EN_PRODUCCIO' && order?.status !== 'EN_PRODUCCIO') {
      setPendingTransition({ status: newStatus, printUrl })
      setStatus(newStatus)
      setShowStockModal(true)
      return
    }
    setStatus(newStatus)
    // Obrim la finestra síncronament (cal fer-ho sincrò per evitar el popup blocker)
    if (printUrl) window.open(printUrl, '_blank')
    await save(newStatus)
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">Carregant...</div>
  if (!order)  return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">Comanda no trobada</div>

  const si        = STATUS_OPTIONS.find(s => s.id === order.status) ?? STATUS_OPTIONS[0]
  const totalQty  = order.items?.reduce((s: number, i: any) => s + i.quantity, 0) ?? 0
  const totalPaid = (order.payment?.depositPaid ?? 0) + (order.payment?.finalPaid ?? 0)
  const pending   = order.pricing.total - totalPaid

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/admin/comandes" className="text-gray-600 hover:text-gray-800 text-sm">← Comandes</Link>
            <span className="text-gray-300">|</span>
            <h1 className="font-bold text-gray-900">{order.orderNumber}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${si.color}`}>{si.label}</span>
          </div>
          <div className="flex items-center gap-3">
            {msg && <span className={`text-sm ${msg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{msg}</span>}
            <button
              onClick={() => save()}
              disabled={saving}
              className="px-5 py-2 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 disabled:opacity-60 text-sm transition-all"
            >
              {saving ? 'Guardant...' : 'Guardar canvis'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna esquerra */}
        <div className="lg:col-span-2 space-y-5">

          {/* Productes */}
          <Card title="Productes de la comanda">
            <div className="space-y-3">
              {order.items?.map((item: any, i: number) => {
                const color = AVAILABLE_COLORS.find(c => c.id === item.color)
                return (
                  <div key={i} className="flex justify-between items-start p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-semibold text-gray-900">{PRODUCT_NAMES[item.productType] ?? item.productType}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-600 flex-wrap">
                        <span>{item.quantity} unitats</span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full inline-block border" style={{ backgroundColor: color?.hex ?? '#ccc' }} />
                          {color?.name ?? item.color}
                        </span>
                        {item.logo?.hasLogo && (
                          <span className="flex items-center gap-1">
                            Logo {item.logo.size === 'large' ? 'gran' : 'petit'}
                            {item.logo.imageUrl && (
                              <a href={item.logo.imageUrl} target="_blank" rel="noreferrer" className="ml-1">
                                <span className="relative inline-block w-6 h-6 rounded border border-gray-200 bg-white overflow-hidden align-middle">
                                  <Image src={item.logo.imageUrl} alt="Logo" fill className="object-contain p-0.5" />
                                </span>
                              </a>
                            )}
                            {!item.logo.imageUrl && (
                              <span className="ml-1 text-orange-500 font-medium">(pendent)</span>
                            )}
                          </span>
                        )}
                        {item.packaging !== 'basic' && <span>Packaging {item.packaging}</span>}
                        {item.labelInner && <span>Etiqueta interior</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{item.subtotal?.toFixed(2)}€</p>
                      <p className="text-xs text-gray-600">{item.unitPrice?.toFixed(2)}€/u</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 text-sm">
              <Row label="Subtotal" value={`${order.pricing.subtotal?.toFixed(2)}€`} />
              {order.pricing.discountAmt > 0 && (
                <Row label={`Descompte (${(order.pricing.discount * 100).toFixed(0)}%)`} value={`-${order.pricing.discountAmt?.toFixed(2)}€`} green />
              )}
              {order.pricing.urgencyAmt > 0 && (
                <Row label="Recàrrec urgència (+20%)" value={`+${order.pricing.urgencyAmt?.toFixed(2)}€`} />
              )}
              {order.pricing.shippingCost > 0 && (
                <Row label="Cost d'enviament" value={`+${order.pricing.shippingCost?.toFixed(2)}€`} />
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                <span className="text-gray-700">Total</span>
                <span className="text-green-700">{order.pricing.total?.toFixed(2)}€</span>
              </div>
            </div>
          </Card>

          {/* Client */}
          <Card title="Client">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Row label="Nom"     value={order.client?.name} />
              <Row label="Email"   value={order.client?.email} />
              <Row label="Telèfon" value={order.client?.phone} />
              {order.client?.company && <Row label="Empresa" value={order.client.company} />}
              <Row
                label="Lliurament"
                value={
                  order.delivery?.type === 'shipping'
                    ? `Enviament — ${[order.delivery.address, order.delivery.city].filter(Boolean).join(', ')}`
                    : 'Recollida local (Vallès / província)'
                }
              />
              {scheduledDate && (
                <Row label="Data estimada" value={new Date(scheduledDate + 'T12:00:00').toLocaleDateString('ca-ES')} />
              )}
            </div>
            {order.clientNotes && (
              <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-gray-800 border border-yellow-200">
                <span className="font-medium text-gray-900">Notes del client:</span> {order.clientNotes}
              </div>
            )}
            <div className="mt-4 flex gap-2 flex-wrap">
              {order.client?.phone && (
                <a
                  href={waLink(order.client.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition-all"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp {order.client.phone}
                </a>
              )}
              {order.client?.phone && (
                <a
                  href={`tel:${order.client.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-all"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8a16 16 0 006.29 6.29l1.17-1.17a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15.38v1.54z"/>
                  </svg>
                  Trucar
                </a>
              )}
              {order.client?.email && !order.client.email.includes('@manual.') && (
                <CopyButton text={order.client.email} label="Copiar email" />
              )}
            </div>
          </Card>

          {/* Producció */}
          <Card title="Producció">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Ampolles PET usades (estimat: ~{totalQty * 8})
                </label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setBottles(b => Math.max(0, b - 1))}
                    className="w-9 h-9 rounded-lg border border-gray-300 text-lg font-bold text-gray-700 hover:bg-gray-50">−</button>
                  <input
                    type="number" value={bottles}
                    onChange={e => setBottles(parseInt(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    className={inputClass + ' w-24 text-center'}
                  />
                  <button type="button" onClick={() => setBottles(b => b + 1)}
                    className="w-9 h-9 rounded-lg border border-gray-300 text-lg font-bold text-gray-700 hover:bg-gray-50">+</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Notes de producció</label>
                <textarea
                  value={prodNotes} onChange={e => setProdNotes(e.target.value)}
                  rows={3} className={inputClass + ' resize-none'}
                  placeholder="Color especial, incidències, observacions..."
                />
              </div>
            </div>
          </Card>

          {/* Gestió enviament — només PREPARADA */}
          {order.status === 'PREPARADA' && (
            <Card title="Gestió d'enviament">
              <div className="space-y-4">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">Tipus de lliurament</p>
                  {order.delivery?.type === 'shipping' ? (
                    <p className="text-gray-700">
                      Enviament per missatgeria — {[order.delivery.address, order.delivery.city].filter(Boolean).join(', ')}
                    </p>
                  ) : (
                    <p className="text-gray-700">Recollida local — Vallès / província</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Data d'entrega / recollida</label>
                  <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Notes de transport (agrupació amb altres comandes, nº seguiment Correus...)
                  </label>
                  <textarea
                    value={trackingNotes} onChange={e => setTrackingNotes(e.target.value)}
                    rows={2} className={inputClass + ' resize-none'}
                    placeholder="Ex: Agrupada amb GPT-2025-012 · Correus paquet nº 1234567..."
                  />
                </div>
                <Link href="/admin/comandes?estat=PREPARADA" className="block text-xs text-purple-700 hover:underline font-medium">
                  Veure totes les comandes preparades →
                </Link>
              </div>
            </Card>
          )}

          {/* Notes internes */}
          <Card title="Notes internes (només admin)">
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} className={inputClass + ' resize-none'}
              placeholder="Notes privades sobre aquesta comanda..."
            />
          </Card>

          {/* Barra d'accions contextual */}
          <ActionBar order={order} id={id as string} saving={saving} onTransition={transition} />
        </div>

        {/* Columna dreta */}
        <div className="space-y-5">

          {/* Estat */}
          <Card title="Estat de la comanda">
            <div className="space-y-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (opt.id === 'EN_PRODUCCIO' && order.status !== 'EN_PRODUCCIO') {
                      setPendingTransition({ status: 'EN_PRODUCCIO' })
                      setStatus('EN_PRODUCCIO')
                      setShowStockModal(true)
                    } else {
                      setStatus(opt.id)
                    }
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    status === opt.id
                      ? 'border-green-600 ' + opt.color
                      : 'border-transparent bg-gray-50 text-gray-700 hover:border-gray-200'
                  }`}
                >
                  {status === opt.id && '● '}{opt.label}
                  {opt.id === 'EN_PRODUCCIO' && (
                    <span className="text-xs text-gray-500 ml-2">(gestiona estoc)</span>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Pagament */}
          <Card title="Pagament">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between font-semibold text-base border-b pb-2 mb-2">
                <span className="text-gray-700">Total</span>
                <span className="text-gray-900">{order.pricing.total?.toFixed(2)}€</span>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Bestreta pagada (50%)</label>
                <div className="flex gap-2">
                  <input type="number" value={deposit}
                    onChange={e => setDeposit(parseFloat(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    className={inputClass + ' flex-1'} />
                  <input type="date" value={depositDate}
                    onChange={e => setDepositDate(e.target.value)}
                    className={inputClass + ' flex-1'} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Pagament final</label>
                <div className="flex gap-2">
                  <input type="number" value={finalPaid}
                    onChange={e => setFinalPaid(parseFloat(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    className={inputClass + ' flex-1'} />
                  <input type="date" value={finalDate}
                    onChange={e => setFinalDate(e.target.value)}
                    className={inputClass + ' flex-1'} />
                </div>
              </div>

              <div className={`flex justify-between font-semibold pt-2 border-t ${pending > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                <span>{pending > 0 ? 'Pendent' : 'Pagat completament'}</span>
                <span>{pending > 0 ? `${pending.toFixed(2)}€` : '✓'}</span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setDeposit(order.pricing.total / 2); setDepositDate(new Date().toISOString().slice(0, 10)) }}
                  className="flex-1 text-xs py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium"
                >
                  Bestreta 50%
                </button>
                <button
                  onClick={() => { setFinalPaid(order.pricing.total / 2); setFinalDate(new Date().toISOString().slice(0, 10)) }}
                  className="flex-1 text-xs py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium"
                >
                  Final 50%
                </button>
              </div>
            </div>
          </Card>

          {/* Data lliurament (no durant PREPARADA, que ja té la seva secció) */}
          {order.status !== 'PREPARADA' && (
            <Card title="Lliurament">
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Data estimada</label>
                  <input type="date" value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className={inputClass} />
                </div>
                {order.delivery?.deliveredDate && (
                  <p className="text-xs text-green-600 font-medium">
                    Entregada el {new Date(order.delivery.deliveredDate).toLocaleDateString('ca-ES')}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* URL de seguiment */}
          {order.guestToken && (
            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600">
              <p className="font-medium text-gray-700 mb-1">URL de seguiment del client</p>
              <a href={`/seguiment/${order.guestToken}`} target="_blank"
                className="text-green-700 hover:underline break-all">
                /seguiment/{order.guestToken.slice(0, 16)}...
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Modal de stock */}
      {showStockModal && (
        <StockModal
          order={order}
          onDeducted={() => {
            setShowStockModal(false)
            const pt = pendingTransition
            setPendingTransition(null)
            save(pt?.status ?? 'EN_PRODUCCIO').then(ok => {
              if (ok && pt?.printUrl) window.open(pt.printUrl, '_blank')
            })
          }}
          onCancel={() => {
            setShowStockModal(false)
            setStatus(order.status)
            setPendingTransition(null)
          }}
        />
      )}
    </div>
  )
}

// --- Barra d'accions contextual (baix de la columna esquerra) ---
function ActionBar({ order, id, saving, onTransition }: {
  order: any
  id: string
  saving: boolean
  onTransition: (status: string, printUrl?: string) => void
}) {
  const s          = order.status
  const total      = order.pricing?.total ?? 0
  const deposit    = order.payment?.depositPaid ?? 0
  const finalPaid  = order.payment?.finalPaid ?? 0
  const totalPaid  = deposit + finalPaid
  const halfTotal  = total / 2
  const pending    = total - totalPaid

  const depositOk  = deposit >= halfTotal * 0.9   // bestreta ~50% pagada
  const fullPaid   = pending <= 0.5               // pràcticament tot pagat

  if (s === 'NOVA_SOLICITUD') {
    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
        <h3 className="font-bold text-gray-900 mb-1">Revisat? Confirma la comanda</h3>
        <p className="text-sm text-gray-700 mb-4">
          Un cop confirmada, comunica al client que cal la bestreta de{' '}
          <strong>{halfTotal.toFixed(2)}€</strong> per iniciar la producció.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => onTransition('CONFIRMADA', `/admin/comandes/${id}/albara`)}
            disabled={saving}
            className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 text-sm transition-all"
          >
            Confirmar comanda i imprimir albarà →
          </button>
          <button
            onClick={() => onTransition('CONFIRMADA')}
            disabled={saving}
            className="flex-1 py-3 border-2 border-blue-600 text-blue-700 font-semibold rounded-xl hover:bg-blue-50 disabled:opacity-60 text-sm transition-all"
          >
            Confirmar sense imprimir
          </button>
        </div>
      </div>
    )
  }

  if (s === 'CONFIRMADA') {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6">
        <h3 className="font-bold text-gray-900 mb-2">Llestos per iniciar producció?</h3>

        {/* Estat de la bestreta */}
        <div className={`flex items-center gap-3 p-3 rounded-xl mb-4 text-sm ${depositOk ? 'bg-green-100 border border-green-200' : 'bg-orange-100 border border-orange-200'}`}>
          <span className="text-xl">{depositOk ? '✓' : '⚠'}</span>
          <div>
            {depositOk ? (
              <p className="font-semibold text-green-800">Bestreta rebuda — {deposit.toFixed(2)}€</p>
            ) : (
              <>
                <p className="font-semibold text-orange-800">Bestreta pendent — {halfTotal.toFixed(2)}€</p>
                <p className="text-xs text-orange-700">
                  {deposit > 0 ? `Rebuts ${deposit.toFixed(2)}€, falten ${(halfTotal - deposit).toFixed(2)}€` : 'El client encara no ha pagat la bestreta del 50%'}
                </p>
              </>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-4">
          Es descomptarà estoc de gorres blank. Imprimeix la fitxa de producció per al taller.
          {!depositOk && <span className="block text-orange-700 font-medium mt-1">Recomanat: confirmar el pagament de la bestreta abans de produir.</span>}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => onTransition('EN_PRODUCCIO', `/admin/comandes/${id}/fitxa-produccio`)}
            disabled={saving}
            className="flex-1 py-3 bg-yellow-600 text-white font-semibold rounded-xl hover:bg-yellow-700 disabled:opacity-60 text-sm transition-all"
          >
            Iniciar producció i imprimir fitxa →
          </button>
          <button
            onClick={() => onTransition('EN_PRODUCCIO')}
            disabled={saving}
            className="flex-1 py-3 border-2 border-yellow-600 text-yellow-700 font-semibold rounded-xl hover:bg-yellow-50 disabled:opacity-60 text-sm transition-all"
          >
            Iniciar sense imprimir
          </button>
        </div>
      </div>
    )
  }

  if (s === 'EN_PRODUCCIO') {
    return (
      <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6">
        <h3 className="font-bold text-gray-900 mb-3">Producció finalitzada?</h3>
        <div className={`flex items-center gap-3 p-3 rounded-xl mb-4 text-sm ${depositOk ? 'bg-green-100 border border-green-200' : 'bg-orange-100 border border-orange-200'}`}>
          <span className="text-xl">{depositOk ? '✓' : '⚠'}</span>
          <p className={`font-semibold ${depositOk ? 'text-green-800' : 'text-orange-800'}`}>
            {depositOk ? `Bestreta confirmada — ${deposit.toFixed(2)}€` : `Bestreta pendent — ${halfTotal.toFixed(2)}€`}
          </p>
        </div>
        <p className="text-sm text-gray-700 mb-4">
          Marca la comanda com a preparada quan les gorres estiguin llestes per lliurar.
        </p>
        <button
          onClick={() => onTransition('PREPARADA')}
          disabled={saving}
          className="w-full py-3 bg-purple-700 text-white font-semibold rounded-xl hover:bg-purple-800 disabled:opacity-60 text-sm transition-all"
        >
          Marcar com a Preparada →
        </button>
      </div>
    )
  }

  if (s === 'PREPARADA') {
    const isShipping = order.delivery?.type === 'shipping'

    const paymentBlock = (
      <div className={`flex items-center gap-3 p-3 rounded-xl mb-4 text-sm ${fullPaid ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'}`}>
        <span className="text-xl">{fullPaid ? '✓' : '⚠'}</span>
        <div>
          {fullPaid ? (
            <p className="font-semibold text-green-800">Pagament complet — {total.toFixed(2)}€ rebuts</p>
          ) : (
            <>
              <p className="font-semibold text-red-800">Pagament pendent — {pending.toFixed(2)}€ per cobrar</p>
              <p className="text-xs text-red-700">
                Rebuts: {totalPaid.toFixed(2)}€ · Pendent: {pending.toFixed(2)}€
                {' '}— <strong>no entregar sense confirmar el pagament</strong>
              </p>
            </>
          )}
        </div>
      </div>
    )

    if (isShipping) {
      return (
        <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-2">Paquet llest per enviar</h3>
          {paymentBlock}
          <p className="text-sm text-gray-700 mb-4">
            Imprimeix l'albarà d'enviament per adjuntar al paquet i lliurar al transportista.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => onTransition('ENVIADA', `/admin/comandes/${id}/albara-enviament`)}
              disabled={saving}
              className="flex-1 py-3 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-700 disabled:opacity-60 text-sm transition-all"
            >
              Marcar com a enviada i imprimir albarà →
            </button>
            <button
              onClick={() => onTransition('ENVIADA')}
              disabled={saving}
              className="flex-1 py-3 border-2 border-sky-600 text-sky-700 font-semibold rounded-xl hover:bg-sky-50 disabled:opacity-60 text-sm transition-all"
            >
              Marcar com a enviada
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-6">
        <h3 className="font-bold text-gray-900 mb-2">Lliurament completat?</h3>
        {paymentBlock}
        <p className="text-sm text-gray-700 mb-4">
          Imprimeix l'albarà de venda per adjuntar a la comanda.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => onTransition('COMPLETADA', `/admin/comandes/${id}/albara`)}
            disabled={saving}
            className="flex-1 py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 disabled:opacity-60 text-sm transition-all"
          >
            Confirmar entrega i imprimir albarà →
          </button>
          <button
            onClick={() => onTransition('COMPLETADA')}
            disabled={saving}
            className="flex-1 py-3 border-2 border-green-700 text-green-700 font-semibold rounded-xl hover:bg-green-50 disabled:opacity-60 text-sm transition-all"
          >
            Confirmar entrega
          </button>
        </div>
      </div>
    )
  }

  if (s === 'ENVIADA') {
    return (
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <p className="font-semibold text-gray-900">Paquet enviat ✈</p>
            <p className="text-sm text-gray-600">
              Quan el client confirmi la recepció, marca la comanda com a completada.
            </p>
          </div>
          <a
            href={`/admin/comandes/${id}/albara-enviament`}
            target="_blank"
            className="shrink-0 px-4 py-2 border border-sky-300 bg-white text-sky-700 font-medium rounded-xl hover:bg-sky-50 text-sm transition-all whitespace-nowrap"
          >
            Reimprimir albarà →
          </a>
        </div>
        <div className={`flex items-center gap-2 text-sm p-2 rounded-lg mb-3 ${fullPaid ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
          <span>{fullPaid ? '✓' : '⚠'}</span>
          <span className="font-medium">
            {fullPaid ? `Pagament complet — ${total.toFixed(2)}€` : `Pendent ${pending.toFixed(2)}€ per cobrar`}
          </span>
        </div>
        <button
          onClick={() => onTransition('COMPLETADA')}
          disabled={saving}
          className="w-full py-2.5 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 disabled:opacity-60 text-sm transition-all"
        >
          Confirmar recepció pel client → Completada
        </button>
      </div>
    )
  }

  if (s === 'COMPLETADA') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <p className="font-semibold text-gray-900">Comanda completada</p>
            <p className="text-sm text-gray-600">Pots reimprimir l'albarà en qualsevol moment.</p>
          </div>
          <a
            href={`/admin/comandes/${id}/albara`}
            target="_blank"
            className="shrink-0 px-5 py-2.5 border border-gray-300 bg-white text-gray-700 font-medium rounded-xl hover:bg-gray-50 text-sm transition-all"
          >
            Reimprimir albarà →
          </a>
        </div>
        <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${fullPaid ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
          <span>{fullPaid ? '✓' : '⚠'}</span>
          <span className="font-medium">
            {fullPaid ? `Pagament complet — ${total.toFixed(2)}€` : `Pendent ${pending.toFixed(2)}€ — ${totalPaid.toFixed(2)}€ de ${total.toFixed(2)}€ rebuts`}
          </span>
        </div>
      </div>
    )
  }

  return null
}

// --- Components genèrics ---
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, value, green }: { label: string; value?: string; green?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium ${green ? 'text-green-600' : 'text-gray-900'}`}>{value ?? '—'}</span>
    </div>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-all"
    >
      {copied ? '✓ Copiat' : label}
    </button>
  )
}

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none'
