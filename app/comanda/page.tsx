// Pàgina /comanda — Configurador de comanda (pública)

import OrderConfigurator from '@/components/configurador/OrderConfigurator'

export const metadata = {
  title: 'Fes la teva comanda — Gorres PET',
  description: 'Configura i sol·licita les teves gorres artesanals de PET reciclat',
}

export default function ComandaPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto mb-10 text-center">
        <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full mb-3">
          100% PET reciclat
        </span>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Configura la teva comanda
        </h1>
        <p className="text-gray-500 text-lg">
          Gorres artesanals fetes amb ampolles PET reciclades. Personalitza, calcula el preu i sol·licita la teva comanda en minuts.
        </p>
      </div>

      <OrderConfigurator />

      <div className="max-w-3xl mx-auto mt-12 flex flex-col sm:flex-row justify-center gap-6 text-center text-sm text-gray-400">
        <span>🔒 Sense registre necessari</span>
        <span>♻️ Producció artesanal sostenible</span>
        <span>📦 Lliurament Valles i enviament nacional</span>
      </div>
    </main>
  )
}
