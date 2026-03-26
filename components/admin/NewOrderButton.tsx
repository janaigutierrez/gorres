'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PRODUCT_NAMES } from '@/lib/pricing'

type ProductType = 'basic' | 'logo' | 'color_logo' | 'deluxe' | 'souvenir'

const PRODUCTS: { id: ProductType; price: number }[] = [
  { id: 'basic',      price: 6  },
  { id: 'logo',       price: 11 },
  { id: 'color_logo', price: 13 },
  { id: 'deluxe',     price: 22 },
  { id: 'souvenir',   price: 25 },
]

export default function NewOrderButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="block w-full px-4 py-2.5 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 transition-all text-center"
      >
        + Nova comanda manual
      </button>
      {open && <QuickOrderModal onClose={() => setOpen(false)} />}
    </>
  )
}

function QuickOrderModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()

  const [name,          setName]          = useState('')
  const [phone,         setPhone]         = useState('')
  const [email,         setEmail]         = useState('')
  const [company,       setCompany]       = useState('')
  const [productType,   setProductType]   = useState<ProductType>('logo')
  const [quantity,      setQuantity]      = useState(25)
  const [urgent,        setUrgent]        = useState(false)
  const [deliveryType,  setDeliveryType]  = useState<'local' | 'shipping'>('local')
  const [paymentMethod, setPaymentMethod] = useState<'bizum' | 'transfer' | 'cash'>('bizum')
  const [notes,         setNotes]         = useState('')
  const [pricing,       setPricing]       = useState<any>(null)
  const [loadingPrice,  setLoadingPrice]  = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [error,         setError]         = useState('')
  const [done,          setDone]          = useState<string | null>(null)

  const calcPrice = useCallback(async (type: ProductType, qty: number, urg: boolean) => {
    setLoadingPrice(true)
    try {
      const res = await fetch('/api/pressupost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ productType: type, quantity: qty, color: 'natural',
            logo: { hasLogo: false, size: null, imageUrl: null, notes: null },
            packaging: 'basic', labelInner: false }],
          urgent: urg,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setPricing({ ...data.pricing, deliveryDate: data.deliveryDate })
      }
    } catch {}
    setLoadingPrice(false)
  }, [])

  useEffect(() => { calcPrice(productType, quantity, urgent) }, [])

  const updateProduct  = (t: ProductType) => { setProductType(t);  calcPrice(t,           quantity, urgent) }
  const updateQuantity = (q: number)      => { setQuantity(q);     calcPrice(productType,  q,        urgent) }
  const updateUrgent   = (u: boolean)     => { setUrgent(u);       calcPrice(productType,  quantity, u)     }

  const submit = async () => {
    if (!name.trim() || !phone.trim()) { setError('Nom i telèfon són obligatoris'); return }
    if (quantity < 10)                  { setError('Mínim 10 unitats'); return }
    setSubmitting(true)
    setError('')
    const emailFinal = email.trim() || `manual.${Date.now()}@gorrespet.cat`
    const res = await fetch('/api/comandes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productType, quantity, color: 'natural',
          logo: { hasLogo: false, size: null, imageUrl: null, notes: null },
          packaging: 'basic', labelInner: false }],
        urgent,
        client: { name: name.trim(), email: emailFinal, phone: phone.trim(), company: company.trim() || null },
        delivery: { type: deliveryType, address: null, city: null, notes: null },
        payment: { method: paymentMethod },
        clientNotes: notes.trim() || null,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setDone(data.orderNumber)
      router.refresh()
    } else {
      setError(data.error ?? 'Error en crear la comanda')
    }
    setSubmitting(false)
  }

  // Pantalla d'èxit
  if (done) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <p className="font-bold text-gray-900 text-lg mb-1">Comanda creada!</p>
          <p className="text-green-700 font-bold text-2xl mb-4">{done}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
              Tancar
            </button>
            <a
              href={`/admin/comandes`}
              className="flex-1 py-2.5 bg-green-700 text-white font-semibold rounded-xl text-sm text-center hover:bg-green-800"
            >
              Veure comanda →
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-6">

        {/* Capçalera */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Nova comanda manual</h2>
            <p className="text-xs text-gray-500">Per a clients de WhatsApp, email o telèfon</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-6 space-y-6">

          {/* Client */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Client</p>
            <div className="grid grid-cols-2 gap-3">
              <ModalField label="Nom i cognoms *">
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Anna Garcia" className={iCls} autoFocus />
              </ModalField>
              <ModalField label="Telèfon *">
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="600 000 000" className={iCls} />
              </ModalField>
              <ModalField label="Email">
                <input value={email} onChange={e => setEmail(e.target.value)}
                  type="email" placeholder="anna@exemple.cat (opcional)" className={iCls} />
              </ModalField>
              <ModalField label="Empresa">
                <input value={company} onChange={e => setCompany(e.target.value)}
                  placeholder="Empresa SL (opcional)" className={iCls} />
              </ModalField>
            </div>
          </section>

          {/* Producte */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Producte</p>
            <div className="grid grid-cols-5 gap-2">
              {PRODUCTS.map(p => (
                <button key={p.id} type="button" onClick={() => updateProduct(p.id)}
                  className={`p-2.5 rounded-xl border-2 text-center transition-all ${productType === p.id ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <p className="text-xs font-semibold text-gray-900 leading-tight mb-0.5">{PRODUCT_NAMES[p.id]}</p>
                  <p className="text-xs font-bold text-green-700">{p.price}€</p>
                </button>
              ))}
            </div>
          </section>

          {/* Quantitat + opcions */}
          <div className="grid grid-cols-2 gap-6">
            <section>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Quantitat</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => updateQuantity(Math.max(10, quantity - 5))}
                  className="w-10 h-10 rounded-lg border border-gray-300 text-lg font-bold text-gray-700 hover:bg-gray-50">−</button>
                <input type="number" value={quantity}
                  onChange={e => updateQuantity(parseInt(e.target.value) || 10)}
                  onFocus={e => e.target.select()}
                  className="w-20 text-center px-2 py-2 border border-gray-300 rounded-lg text-lg font-bold text-gray-900 focus:border-green-500 focus:outline-none" />
                <button type="button" onClick={() => updateQuantity(quantity + 5)}
                  className="w-10 h-10 rounded-lg border border-gray-300 text-lg font-bold text-gray-700 hover:bg-gray-50">+</button>
              </div>
            </section>

            <section>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Opcions</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={urgent} onChange={e => updateUrgent(e.target.checked)}
                    className="w-4 h-4 accent-orange-500" />
                  <span className="text-sm text-gray-700 font-medium">Urgent (+20%) — 7 dies</span>
                </label>
                <div className="flex gap-4">
                  {([['local', 'Recollida'], ['shipping', 'Enviament']] as const).map(([v, l]) => (
                    <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" checked={deliveryType === v} onChange={() => setDeliveryType(v)}
                        className="accent-green-600" />
                      <span className="text-sm text-gray-700">{l}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-4">
                  {([['bizum', 'Bizum'], ['transfer', 'Transferència'], ['cash', 'Efectiu']] as const).map(([v, l]) => (
                    <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" checked={paymentMethod === v} onChange={() => setPaymentMethod(v)}
                        className="accent-green-600" />
                      <span className="text-sm text-gray-700">{l}</span>
                    </label>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Preu en temps real */}
          {pricing && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex justify-between items-center">
              <div className="text-sm space-y-0.5 text-gray-700">
                <div className="flex gap-5">
                  <span>Subtotal: <strong className="text-gray-900">{pricing.subtotal?.toFixed(2)}€</strong></span>
                  {pricing.discountAmt > 0 && (
                    <span className="text-green-700">Descompte: <strong>-{pricing.discountAmt?.toFixed(2)}€</strong></span>
                  )}
                  {pricing.urgencyAmt > 0 && (
                    <span className="text-orange-600">Urgència: <strong>+{pricing.urgencyAmt?.toFixed(2)}€</strong></span>
                  )}
                </div>
                {pricing.deliveryDate && (
                  <p className="text-xs text-gray-500">
                    Data estimada: {new Date(pricing.deliveryDate).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                <p className="text-xs text-gray-400">Bestreta: {(pricing.total / 2).toFixed(2)}€ · Final: {(pricing.total / 2).toFixed(2)}€</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-3xl font-black text-green-700">{loadingPrice ? '...' : `${pricing.total?.toFixed(2)}€`}</p>
                <p className="text-xs text-gray-500">total</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <ModalField label="Notes (color, logo, detalls del client...)">
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} className={iCls + ' resize-none'}
              placeholder="Color específic, detalls del logo, dates importants..." />
          </ModalField>
        </div>

        {/* Peu */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          {error && <p className="text-sm text-red-500 flex-1">{error}</p>}
          <div className="ml-auto flex gap-3">
            <button onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
              Cancel·lar
            </button>
            <button onClick={submit} disabled={submitting || !name.trim() || !phone.trim()}
              className="px-6 py-2.5 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 disabled:opacity-60 text-sm transition-all">
              {submitting ? 'Creant...' : 'Crear comanda →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const iCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none'
