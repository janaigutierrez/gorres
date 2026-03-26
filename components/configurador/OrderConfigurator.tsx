'use client'

// Configurador de comanda — flux de 5 passos
// Estat local amb useState + càlcul de preu en temps real via /api/pressupost

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PRODUCT_NAMES, AVAILABLE_COLORS, SHIPPING_ZONES, getShippingCost, isShippingCustomQuote } from '@/lib/pricing'
import type { ProductType, PackagingType } from '@/types'
import LogoUploader from './LogoUploader'

// --- Estat del configurador ---
interface ConfiguradorState {
  productType: ProductType
  quantity: number
  color: string
  hasLogo: boolean
  logoSize: 'small' | 'large'
  logoImageUrl: string | null
  packaging: PackagingType
  labelInner: boolean
  urgent: boolean
  shippingZone: string
}

const initialState: ConfiguradorState = {
  productType:  'basic',
  quantity:     25,
  color:        'natural',
  hasLogo:      false,
  logoSize:     'small',
  logoImageUrl: null,
  packaging:    'basic',
  labelInner:   false,
  urgent:       false,
  shippingZone: 'local',
}

// --- Schema formulari dades client ---
const ClientSchema = z.object({
  name:         z.string().min(2, 'El nom és obligatori'),
  email:        z.string().email('Email invàlid'),
  phone:        z.string().min(9, 'Telèfon invàlid'),
  company:      z.string().optional(),
  deliveryType: z.enum(['local', 'shipping']),
  address:      z.string().optional(),
  city:         z.string().optional(),
  paymentMethod:z.enum(['bizum', 'transfer', 'cash']),
  clientNotes:  z.string().optional(),
  acceptTerms:  z.boolean().refine(v => v === true, 'Cal acceptar les condicions'),
})
type ClientFormData = z.infer<typeof ClientSchema>

// --- Preu en temps real ---
interface PricingPreview {
  subtotal: number
  discountPct: number
  discountAmt: number
  urgencyAmt: number
  shippingCost: number
  total: number
  deliveryDate: string
  productionDays: number
  shippingCustomQuote?: boolean
}

// --- Productes disponibles ---
const PRODUCTS: Array<{
  id: ProductType
  name: string
  description: string
  basePrice: number
  features: string[]
  image: string
}> = [
  {
    id: 'basic',
    name: 'Gorra Bàsica',
    description: 'Color natural, sense personalització',
    basePrice: 6,
    features: ['Color natural (PET reciclat)', 'Punt bàsic', 'Packaging simple'],
    image: '/productes/basic.jpg',
  },
  {
    id: 'logo',
    name: 'Gorra amb Logo',
    description: 'Color natural amb brodat del teu logo',
    basePrice: 11,
    features: ['Color natural', 'Logo brodat', 'Petit o gran'],
    image: '/productes/logo.jpg',
  },
  {
    id: 'color_logo',
    name: 'Gorra Color + Logo',
    description: 'Color personalitzat amb logo brodat',
    basePrice: 13,
    features: ['10 colors disponibles', 'Logo brodat', 'Més impacte visual'],
    image: '/productes/color_logo.jpg',
  },
  {
    id: 'deluxe',
    name: 'Gorra Deluxe',
    description: 'Acabats premium, packaging de qualitat',
    basePrice: 22,
    features: ['Color premium', 'Logo gran brodat', 'Packaging deluxe', 'Etiqueta interior'],
    image: '/productes/deluxe.jpg',
  },
  {
    id: 'souvenir',
    name: 'Gorra Souvenir',
    description: 'Capsa individual, ideal per a regals',
    basePrice: 25,
    features: ['Capsa individual', 'Targeta personalitzada', 'Packaging premium', 'Ideal per a events'],
    image: '/productes/souvenir.jpg',
  },
]

export default function OrderConfigurator() {
  const [step, setStep] = useState(1)

  const goToStep = (n: number) => {
    setStep(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const [config, setConfig] = useState<ConfiguradorState>(initialState)
  const [pricing, setPricing] = useState<PricingPreview | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ orderNumber: string; guestToken: string; total: number } | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ClientFormData>({
    resolver: zodResolver(ClientSchema),
    defaultValues: { deliveryType: 'local', paymentMethod: 'bizum' },
  })

  // Actualitza la configuració i recalcula el preu
  const updateConfig = useCallback(async (updates: Partial<ConfiguradorState>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)

    const deliveryType = watch('deliveryType') ?? 'local'

    setLoadingPrice(true)
    try {
      const res = await fetch('/api/pressupost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            productType: newConfig.productType,
            quantity:    newConfig.quantity,
            color:       newConfig.color,
            logo: {
              hasLogo:  newConfig.hasLogo,
              size:     newConfig.hasLogo ? newConfig.logoSize : null,
              imageUrl: newConfig.logoImageUrl,
              notes:    null,
            },
            packaging:  newConfig.packaging,
            labelInner: newConfig.labelInner,
          }],
          urgent:       newConfig.urgent,
          deliveryType,
          shippingZone: newConfig.shippingZone,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setPricing({ ...data.pricing, deliveryDate: data.deliveryDate, productionDays: data.productionDays, shippingCustomQuote: data.shippingCustomQuote })
      }
    } catch {
      // Silenciar errors de xarxa durant l'edició
    } finally {
      setLoadingPrice(false)
    }
  }, [config, watch])

  // Enviament final de la comanda
  const onSubmit = async (clientData: ClientFormData) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/comandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            productType: config.productType,
            quantity:    config.quantity,
            color:       config.color,
            logo: {
              hasLogo:  config.hasLogo,
              size:     config.hasLogo ? config.logoSize : null,
              imageUrl: config.logoImageUrl,
              notes:    null,
            },
            packaging:  config.packaging,
            labelInner: config.labelInner,
          }],
          urgent: config.urgent,
          client: {
            name:    clientData.name,
            email:   clientData.email,
            phone:   clientData.phone,
            company: clientData.company || null,
          },
          delivery: {
            type:         clientData.deliveryType,
            address:      clientData.address || null,
            city:         clientData.city || null,
            notes:        null,
            shippingZone: clientData.deliveryType === 'shipping' ? config.shippingZone : null,
          },
          payment: {
            method: clientData.paymentMethod,
          },
          clientNotes: clientData.clientNotes || null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setResult({ orderNumber: data.orderNumber, guestToken: data.guestToken, total: data.total })
        setStep(6) // Confirmació
      } else {
        const err = await res.json()
        alert(`Error: ${err.error}`)
      }
    } catch {
      alert('Error de connexió. Torna a intentar-ho.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Renderitzat per passos ---

  if (step === 6 && result) {
    return <ConfirmacioStep result={result} />
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Indicador de passos */}
      <StepIndicator currentStep={step} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mt-6">
        {step === 1 && (
          <Pas1Producte
            selected={config.productType}
            onSelect={(p) => {
              const packaging =
                p === 'deluxe'   ? 'deluxe' :
                p === 'souvenir' ? 'souvenir_box' : 'basic'
              updateConfig({ productType: p, packaging })
              goToStep(2)
            }}
          />
        )}
        {step === 2 && (
          <Pas2Personalitzacio
            config={config}
            onChange={updateConfig}
            onNext={() => goToStep(3)}
            onBack={() => goToStep(1)}
          />
        )}
        {step === 3 && (
          <Pas3Quantitat
            config={config}
            pricing={pricing}
            loadingPrice={loadingPrice}
            onChange={updateConfig}
            onNext={() => goToStep(4)}
            onBack={() => goToStep(2)}
          />
        )}
        {step === 4 && (
          <Pas4Resum
            config={config}
            pricing={pricing}
            loadingPrice={loadingPrice}
            onNext={() => goToStep(5)}
            onBack={() => goToStep(3)}
          />
        )}
        {step === 5 && (
          <Pas5DadesClient
            register={register}
            errors={errors}
            watch={watch}
            config={config}
            pricing={pricing}
            onShippingZoneChange={(z) => updateConfig({ shippingZone: z })}
            onSubmit={handleSubmit(onSubmit)}
            submitting={submitting}
            onBack={() => goToStep(4)}
          />
        )}
      </div>
    </div>
  )
}

// --- Sub-components de cada pas ---

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = ['Producte', 'Personalització', 'Quantitat', 'Resum', 'Dades']
  return (
    <div className="flex items-center justify-between">
      {steps.map((label, i) => {
        const n = i + 1
        const active  = n === currentStep
        const done    = n < currentStep
        return (
          <div key={n} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                ${done   ? 'bg-green-500 text-white' : ''}
                ${active ? 'bg-green-700 text-white' : ''}
                ${!done && !active ? 'bg-gray-200 text-gray-500' : ''}
              `}>
                {done ? '✓' : n}
              </div>
              <span className={`text-xs mt-1 hidden sm:block ${active ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Pas1Producte({ selected, onSelect }: { selected: ProductType; onSelect: (p: ProductType) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Quin tipus de gorra?</h2>
      <p className="text-gray-500 mb-6">Tria el producte que s'adapta millor a les teves necessitats</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRODUCTS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`
              text-left rounded-xl border-2 overflow-hidden transition-all
              ${selected === p.id
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
              }
            `}
          >
            <div className="relative w-full aspect-[4/3] bg-gray-100">
              <Image
                src={p.image}
                alt={p.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
              {selected === p.id && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-gray-900">{p.name}</span>
                <span className="text-green-700 font-bold text-sm">des de {p.basePrice}€</span>
              </div>
              <p className="text-sm text-gray-500 mb-2">{p.description}</p>
              <ul className="space-y-0.5">
                {p.features.map((f) => (
                  <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Pas2Personalitzacio({
  config, onChange, onNext, onBack
}: {
  config: ConfiguradorState
  onChange: (u: Partial<ConfiguradorState>) => void
  onNext: () => void
  onBack: () => void
}) {
  const needsColor = ['color_logo', 'deluxe', 'souvenir'].includes(config.productType)
  const canHaveLogo = ['logo', 'color_logo', 'deluxe', 'souvenir'].includes(config.productType)

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Personalització</h2>
      <p className="text-gray-500 mb-6">Configura els detalls de la teva gorra</p>

      <div className="space-y-6">
        {/* Color */}
        {needsColor && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Color del fil</label>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onChange({ color: c.id })}
                  title={c.name}
                  className={`
                    w-10 h-10 rounded-full border-4 transition-all
                    ${config.color === c.id ? 'border-green-600 scale-110' : 'border-transparent hover:border-gray-300'}
                  `}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Seleccionat: {AVAILABLE_COLORS.find(c => c.id === config.color)?.name ?? 'Natural'}
            </p>
          </div>
        )}

        {/* Logo */}
        {canHaveLogo && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Logo brodat</label>
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => onChange({ hasLogo: true })}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${config.hasLogo ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}
              >
                Sí, vull logo
              </button>
              <button
                onClick={() => onChange({ hasLogo: false })}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${!config.hasLogo ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}
              >
                Sense logo
              </button>
            </div>
            {config.hasLogo && (
              <div className="space-y-3 pl-2 border-l-2 border-green-200">
                <div>
                  <p className="text-xs text-gray-500 mb-2">Mida del logo (+2€ per logo gran)</p>
                  <div className="flex gap-3">
                    {(['small', 'large'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => onChange({ logoSize: s })}
                        className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-all ${config.logoSize === s ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}
                      >
                        {s === 'small' ? 'Petit (3cm)' : 'Gran (6cm) +2€'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">Fitxer del logo</p>
                  <LogoUploader
                    value={config.logoImageUrl}
                    onChange={url => onChange({ logoImageUrl: url })}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Packaging — determinat pel model, només informatiu */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <span className="text-sm text-gray-600">Packaging inclòs:</span>
          <span className="text-sm font-semibold text-gray-900">
            {{ basic: 'Bàsic (bossa simple)', deluxe: 'Deluxe (capsa + paper de seda)', souvenir_box: 'Souvenir (capsa individual premium)' }[config.packaging]}
          </span>
          <span className="text-xs text-gray-400 ml-auto">ve determinat pel model</span>
        </div>

        {/* Etiqueta interior */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.labelInner}
            onChange={(e) => onChange({ labelInner: e.target.checked })}
            className="w-4 h-4 accent-green-600"
          />
          <span className="text-sm text-gray-700">
            Etiqueta interior personalitzada (+0.50€/u) — nom empresa o web
          </span>
        </label>
      </div>

      <div className="flex gap-3 mt-8">
        <button onClick={onBack} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all">
          ← Enrere
        </button>
        <button onClick={onNext} className="flex-1 px-6 py-3 rounded-xl bg-green-700 text-white font-semibold hover:bg-green-800 transition-all">
          Continuar →
        </button>
      </div>
    </div>
  )
}

function Pas3Quantitat({
  config, pricing, loadingPrice, onChange, onNext, onBack
}: {
  config: ConfiguradorState
  pricing: PricingPreview | null
  loadingPrice: boolean
  onChange: (u: Partial<ConfiguradorState>) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Quantitat</h2>
      <p className="text-gray-500 mb-6">Mínim 10 unitats. Descomptes a partir de 25 unitats.</p>

      <div className="space-y-6">
        {/* Input quantitat */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de gorres</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onChange({ quantity: Math.max(10, config.quantity - 5) })}
              className="w-11 h-11 rounded-xl border-2 border-gray-300 text-xl font-bold text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all"
            >−</button>
            <input
              type="number"
              min={10}
              value={config.quantity}
              onChange={(e) => onChange({ quantity: parseInt(e.target.value) || 10 })}
              onFocus={(e) => e.target.select()}
              onBlur={(e) => { const v = parseInt(e.target.value); if (v < 10) onChange({ quantity: 10 }) }}
              className="w-24 px-2 py-3 text-xl font-bold border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none text-center text-gray-900"
            />
            <button
              type="button"
              onClick={() => onChange({ quantity: config.quantity + 5 })}
              className="w-11 h-11 rounded-xl border-2 border-gray-300 text-xl font-bold text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all"
            >+</button>
          </div>
        </div>

        {/* Escala de descomptes */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Descomptes per volum</p>
          <div className="space-y-2">
            {[
              { range: '10-24', pct: '0%', label: 'Preu base' },
              { range: '25-49', pct: '-10%', label: '' },
              { range: '50-99', pct: '-15%', label: '' },
              { range: '100-199', pct: '-20%', label: '' },
              { range: '200+', pct: '-25%', label: '' },
            ].map(({ range, pct, label }) => {
              const qty = config.quantity
              const [min, max] = range.includes('+')
                ? [parseInt(range), Infinity]
                : range.split('-').map(Number)
              const active = qty >= min && qty <= max
              return (
                <div key={range} className={`flex justify-between items-center px-3 py-1.5 rounded-lg text-sm ${active ? 'bg-green-100 font-semibold text-green-800' : 'text-gray-500'}`}>
                  <span>{range} unitats {label}</span>
                  <span>{pct}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Urgència */}
        <label className="flex items-center gap-3 cursor-pointer p-4 border-2 border-dashed border-orange-300 rounded-xl hover:border-orange-400 transition-all">
          <input
            type="checkbox"
            checked={config.urgent}
            onChange={(e) => onChange({ urgent: e.target.checked })}
            className="w-4 h-4 accent-orange-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-800">Urgència (+20%)</span>
            <p className="text-xs text-gray-500">Termini de 7 dies hàbils en lloc de 21</p>
          </div>
        </label>

        {/* Preview preu */}
        {pricing && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Subtotal</span>
              <span>{loadingPrice ? '...' : `${pricing.subtotal.toFixed(2)}€`}</span>
            </div>
            {pricing.discountAmt > 0 && (
              <div className="flex justify-between text-sm text-green-700 mb-1">
                <span>Descompte ({(pricing.discountPct * 100).toFixed(0)}%)</span>
                <span>-{pricing.discountAmt.toFixed(2)}€</span>
              </div>
            )}
            {pricing.urgencyAmt > 0 && (
              <div className="flex justify-between text-sm text-orange-600 mb-1">
                <span>Recàrrec urgencia (+20%)</span>
                <span>+{pricing.urgencyAmt.toFixed(2)}€</span>
              </div>
            )}
            {pricing.shippingCustomQuote ? (
              <div className="flex justify-between text-sm text-orange-600 mb-1">
                <span>Enviament ({SHIPPING_ZONES.find(z => z.id === config.shippingZone)?.label})</span>
                <span>A pressupost</span>
              </div>
            ) : pricing.shippingCost > 0 && (
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Enviament ({SHIPPING_ZONES.find(z => z.id === config.shippingZone)?.label})</span>
                <span>+{pricing.shippingCost.toFixed(2)}€</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-green-200 pt-2 mt-2">
              <span>Total</span>
              <span>{loadingPrice ? '...' : `${pricing.total.toFixed(2)}€`}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-8">
        <button onClick={onBack} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all">
          ← Enrere
        </button>
        <button
          onClick={onNext}
          disabled={config.quantity < 10}
          className="flex-1 px-6 py-3 rounded-xl bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-50 transition-all"
        >
          Continuar →
        </button>
      </div>
    </div>
  )
}

function Pas4Resum({
  config, pricing, loadingPrice, onNext, onBack
}: {
  config: ConfiguradorState
  pricing: PricingPreview | null
  loadingPrice: boolean
  onNext: () => void
  onBack: () => void
}) {
  const product = PRODUCTS.find(p => p.id === config.productType)
  const color   = AVAILABLE_COLORS.find(c => c.id === config.color)

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Resum de la comanda</h2>
      <p className="text-gray-500 mb-6">Comprova els detalls abans de continuar</p>

      <div className="space-y-4">
        {product && (
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-200 shrink-0">
              <Image src={product.image} alt={product.name} fill className="object-cover" sizes="80px" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{product.name}</p>
              <p className="text-sm text-gray-500">{product.description}</p>
            </div>
          </div>
        )}
        <div className="bg-gray-50 rounded-xl p-5 space-y-3">
          <Row label="Producte" value={product?.name ?? config.productType} />
          <Row label="Quantitat" value={`${config.quantity} unitats`} />
          <Row label="Color" value={color?.name ?? config.color} />
          {config.hasLogo && <Row label="Logo" value={`${config.logoSize === 'large' ? 'Gran (6cm)' : 'Petit (3cm)'}`} />}
          <Row label="Packaging" value={{ basic: 'Bàsic', deluxe: 'Deluxe (+4€)', souvenir_box: 'Souvenir (+6€)' }[config.packaging]} />
          {config.labelInner && <Row label="Etiqueta interior" value="Sí (+0.50€/u)" />}
          {config.urgent && <Row label="Urgència" value="Sí (+20%)" highlight />}
        </div>

        {pricing ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <div className="space-y-2 text-sm text-gray-600 mb-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{pricing.subtotal.toFixed(2)}€</span>
              </div>
              {pricing.discountAmt > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Descompte ({(pricing.discountPct * 100).toFixed(0)}%)</span>
                  <span>-{pricing.discountAmt.toFixed(2)}€</span>
                </div>
              )}
              {pricing.urgencyAmt > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Recàrrec urgència</span>
                  <span>+{pricing.urgencyAmt.toFixed(2)}€</span>
                </div>
              )}
            </div>
            <div className="flex justify-between font-bold text-xl border-t border-green-200 pt-3">
              <span>Total</span>
              <span className="text-green-700">{loadingPrice ? '...' : `${pricing.total.toFixed(2)}€`}</span>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              50% bestreta al confirmar · 50% restant a l'entrega
            </p>
            {pricing.deliveryDate && (
              <p className="text-xs text-gray-600 mt-1">
                📅 Data estimada: <strong>{new Date(pricing.deliveryDate).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                {' '}({pricing.productionDays} dies hàbils)
              </p>
            )}
          </div>
        ) : (
          <div className="bg-gray-100 rounded-xl p-5 text-center text-gray-400 text-sm">
            Calculant preu...
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-8">
        <button onClick={onBack} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all">
          ← Enrere
        </button>
        <button onClick={onNext} className="flex-1 px-6 py-3 rounded-xl bg-green-700 text-white font-semibold hover:bg-green-800 transition-all">
          Sol·licitar comanda →
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${highlight ? 'text-orange-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  )
}

function Pas5DadesClient({
  register, errors, watch, config, pricing, onShippingZoneChange, onSubmit, submitting, onBack
}: {
  register: any
  errors: any
  watch: any
  config: ConfiguradorState
  pricing: PricingPreview | null
  onShippingZoneChange: (zone: string) => void
  onSubmit: () => void
  submitting: boolean
  onBack: () => void
}) {
  const deliveryType = watch('deliveryType')
  const acceptTerms  = watch('acceptTerms')

  return (
    <form onSubmit={onSubmit}>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Les teves dades</h2>
      <p className="text-gray-500 mb-6">Necessitem les teves dades per preparar la comanda</p>

      <div className="space-y-4">
        {/* Dades personals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nom i cognoms *" error={errors.name?.message}>
            <input {...register('name')} placeholder="Anna Garcia" className={inputClass} />
          </Field>
          <Field label="Empresa / Organitzacio" error={errors.company?.message}>
            <input {...register('company')} placeholder="Empresa SL (opcional)" className={inputClass} />
          </Field>
          <Field label="Email *" error={errors.email?.message}>
            <input {...register('email')} type="email" placeholder="anna@exemple.cat" className={inputClass} />
          </Field>
          <Field label="Telefon *" error={errors.phone?.message}>
            <input {...register('phone')} placeholder="600 000 000" className={inputClass} />
          </Field>
        </div>

        {/* Lliurament */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipus de lliurament *</label>
          <div className="flex gap-3">
            {[
              { id: 'local', label: 'Recollida local (Valles / provincia)' },
              { id: 'shipping', label: 'Enviament per missatgeria' },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={opt.id} {...register('deliveryType')} className="accent-green-600" />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {deliveryType === 'shipping' && (
          <div className="space-y-4 pl-4 border-l-2 border-green-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Adreca" error={errors.address?.message}>
                <input {...register('address')} placeholder="Carrer, numero" className={inputClass} />
              </Field>
              <Field label="Localitat" error={errors.city?.message}>
                <input {...register('city')} placeholder="Vic, Barcelona..." className={inputClass} />
              </Field>
            </div>

            {/* Zona d'enviament */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zona d'enviament</label>
              <div className="grid grid-cols-3 gap-2">
                {SHIPPING_ZONES.map(zone => {
                  const customQuote = isShippingCustomQuote(config.quantity, 'shipping')
                  const cost = customQuote ? null : getShippingCost(zone.id, 'shipping', config.quantity)
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => onShippingZoneChange(zone.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        config.shippingZone === zone.id
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-xs font-medium text-gray-900">{zone.label}</p>
                      <p className={`text-xs font-semibold mt-0.5 ${config.shippingZone === zone.id ? 'text-green-700' : 'text-gray-500'}`}>
                        {customQuote ? 'A pressupost' : cost === 0 ? 'Gratuït' : `+${cost?.toFixed(2)}€`}
                      </p>
                    </button>
                  )
                })}
              </div>
              {isShippingCustomQuote(config.quantity, 'shipping') && (
                <p className="text-xs text-orange-600 font-medium mt-2">
                  ⚠ Comanda gran (&gt;400 u): us contactarem per pactar el cost d'enviament.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Pagament */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Preferència de pagament (informatiu)</label>
          <div className="flex gap-3 flex-wrap">
            {[
              { id: 'bizum', label: 'Bizum' },
              { id: 'transfer', label: 'Transferència bancària' },
              { id: 'cash', label: 'Efectiu' },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={opt.id} {...register('paymentMethod')} className="accent-green-600" />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <Field label="Notes addicionals" error={errors.clientNotes?.message}>
          <textarea
            {...register('clientNotes')}
            rows={3}
            placeholder="Algun detall especial de la comanda, dates a tenir en compte..."
            className={`${inputClass} resize-none`}
          />
        </Field>

        {/* Condicions */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" {...register('acceptTerms')} className="mt-0.5 w-4 h-4 accent-green-600" />
          <span className="text-sm text-gray-600">
            Accepto les condicions de venda i entenc que el preu final és orientatiu fins a la confirmació per part de Gorres PET.
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="text-xs text-red-500 -mt-2">{errors.acceptTerms.message}</p>
        )}
      </div>

      {/* Resum de preu final */}
      {pricing && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm space-y-1.5">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal productes</span>
            <span>{pricing.subtotal.toFixed(2)}€</span>
          </div>
          {pricing.discountAmt > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Descompte ({(pricing.discountPct * 100).toFixed(0)}%)</span>
              <span>−{pricing.discountAmt.toFixed(2)}€</span>
            </div>
          )}
          {pricing.urgencyAmt > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>Recàrrec urgència (+20%)</span>
              <span>+{pricing.urgencyAmt.toFixed(2)}€</span>
            </div>
          )}
          {deliveryType === 'shipping' && (
            <div className="flex justify-between text-gray-600">
              <span>Enviament — {SHIPPING_ZONES.find(z => z.id === config.shippingZone)?.label}</span>
              {pricing.shippingCustomQuote
                ? <span className="text-orange-600 font-medium">A pressupost</span>
                : <span>+{pricing.shippingCost.toFixed(2)}€</span>
              }
            </div>
          )}
          <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-200 pt-2 mt-1">
            <span>Total</span>
            <span className="text-green-700">{pricing.total.toFixed(2)}€</span>
          </div>
          <p className="text-xs text-gray-400 pt-1">50% bestreta ara · 50% a l'entrega</p>
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button type="button" onClick={onBack} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all">
          ← Enrere
        </button>
        <button
          type="submit"
          disabled={submitting || !acceptTerms}
          className="flex-1 px-6 py-3 rounded-xl bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-60 transition-all"
        >
          {submitting ? 'Enviant comanda...' : 'Enviar sol·licitud →'}
        </button>
      </div>
    </form>
  )
}

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function ConfirmacioStep({ result }: { result: { orderNumber: string; guestToken: string; total: number } }) {
  return (
    <div className="max-w-lg mx-auto text-center py-12">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">✓</span>
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Sol·licitud enviada!</h2>
      <p className="text-gray-500 mb-6">
        Hem rebut la teva sol·licitud. Ens posarem en contacte en les pròximes 24h per confirmar la comanda i les instruccions de pagament.
      </p>
      <div className="bg-gray-50 rounded-2xl p-6 text-left mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-gray-500 text-sm">Número de comanda</span>
          <span className="font-bold text-gray-900">{result.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 text-sm">Total orientatiu</span>
          <span className="font-bold text-green-700">{result.total.toFixed(2)}€</span>
        </div>
      </div>
      <a
        href={`/seguiment/${result.guestToken}`}
        className="block w-full py-3 px-6 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-all"
      >
        Seguir l'estat de la comanda →
      </a>
      <p className="text-xs text-gray-400 mt-3">Guarda l'URL de seguiment — no cal registre</p>
    </div>
  )
}
