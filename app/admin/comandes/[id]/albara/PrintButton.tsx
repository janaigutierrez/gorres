'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print fixed top-4 right-4 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-700 shadow-lg text-sm transition-all z-10"
    >
      Imprimir / Guardar PDF
    </button>
  )
}
