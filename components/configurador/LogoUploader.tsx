'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'

interface LogoUploaderProps {
  value: string | null
  onChange: (url: string | null) => void
}

export default function LogoUploader({ value, onChange }: LogoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setUploading(true)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/upload/logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error pujant el logo')
      } else {
        onChange(data.url)
      }
    } catch {
      setError('Error de connexió')
    } finally {
      setUploading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white border border-gray-200 shrink-0">
          <Image src={value} alt="Logo pujat" fill className="object-contain p-1" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-700">Logo pujat correctament</p>
          <p className="text-xs text-gray-500 truncate">{value.split('/').pop()}</p>
        </div>
        <button
          type="button"
          onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = '' }}
          className="shrink-0 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Canviar
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all
          ${uploading ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-green-400 hover:bg-green-50'}`}
      >
        {uploading ? (
          <>
            <svg className="w-6 h-6 text-green-500 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-xs text-green-600 font-medium">Pujant logo...</p>
          </>
        ) : (
          <>
            <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 16l4-4 4 4 4-8 4 8" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="2" y="3" width="20" height="18" rx="2" strokeLinecap="round"/>
            </svg>
            <p className="text-sm font-medium text-gray-600">Arrastra el logo aquí o <span className="text-green-700 underline">selecciona fitxer</span></p>
            <p className="text-xs text-gray-400">PNG, JPG o SVG · màx. 5 MB</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
        onChange={handleChange}
        className="hidden"
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}
