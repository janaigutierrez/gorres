'use client'

// Component client per als filtres de la llista de comandes

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

const ESTATS = [
  { id: '',               label: 'Totes' },
  { id: 'NOVA_SOLICITUD', label: 'Noves' },
  { id: 'CONFIRMADA',     label: 'Confirmades' },
  { id: 'EN_PRODUCCIO',   label: 'En producció' },
  { id: 'PREPARADA',      label: 'Preparades' },
  { id: 'ENVIADA',        label: 'Enviades' },
  { id: 'COMPLETADA',     label: 'Completades' },
  { id: 'CANCELLADA',     label: "Cancel·lades" },
]

export default function ComandaFilters({
  estatActual,
  cercaActual,
}: {
  estatActual?: string
  cercaActual?: string
}) {
  const router = useRouter()
  const [cerca, setCerca] = useState(cercaActual ?? '')
  const [isPending, startTransition] = useTransition()

  const applyFilter = (estat: string, cercaVal?: string) => {
    const params = new URLSearchParams()
    if (estat) params.set('estat', estat)
    if (cercaVal ?? cerca) params.set('cerca', cercaVal ?? cerca)
    startTransition(() => {
      router.push(`/admin/comandes?${params.toString()}`)
    })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Filtres per estat */}
      <div className="flex gap-2 flex-wrap">
        {ESTATS.map((e) => (
          <button
            key={e.id}
            onClick={() => applyFilter(e.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              (estatActual ?? '') === e.id
                ? 'bg-green-700 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Cerca */}
      <div className="flex gap-2 sm:ml-auto">
        <input
          type="text"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilter(estatActual ?? '')}
          placeholder="Cerca per nom, email, nº comanda..."
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-400 w-64"
        />
        <button
          onClick={() => applyFilter(estatActual ?? '')}
          disabled={isPending}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-all"
        >
          {isPending ? '...' : 'Cercar'}
        </button>
      </div>
    </div>
  )
}
