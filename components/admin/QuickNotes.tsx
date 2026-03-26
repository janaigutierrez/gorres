'use client'

import { useEffect, useRef, useState } from 'react'

interface Note { _id: string; text: string; createdAt: string }

export default function QuickNotes() {
  const [notes, setNotes]   = useState<Note[]>([])
  const [text, setText]     = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef            = useRef<HTMLTextAreaElement>(null)

  const load = () =>
    fetch('/api/notes').then(r => r.json()).then(d => setNotes(Array.isArray(d) ? d : []))

  useEffect(() => { load() }, [])

  const add = async () => {
    if (!text.trim()) return
    setSaving(true)
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    setText('')
    setSaving(false)
    load()
    inputRef.current?.focus()
  }

  const remove = async (id: string) => {
    await fetch('/api/notes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotes(n => n.filter(x => x._id !== id))
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
      <h2 className="font-semibold text-gray-900 mb-3">Notes ràpides</h2>

      {/* Input */}
      <div className="flex gap-2 mb-4">
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add() } }}
          rows={2}
          placeholder="Afegeix una nota... (Enter per desar)"
          className="flex-1 px-3 py-2 border border-yellow-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:border-yellow-500 focus:outline-none resize-none"
        />
        <button
          onClick={add}
          disabled={saving || !text.trim()}
          className="px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-xl text-sm disabled:opacity-50 transition-all self-start"
        >
          +
        </button>
      </div>

      {/* Llista */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {notes.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-2">Cap nota</p>
        )}
        {notes.map(n => (
          <div key={n._id} className="flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 border border-yellow-100 group">
            <p className="flex-1 text-sm text-gray-800 whitespace-pre-wrap break-words">{n.text}</p>
            <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-1">
              <button
                onClick={() => remove(n._id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-xs leading-none"
              >
                ✕
              </button>
              <span className="text-xs text-gray-400">
                {new Date(n.createdAt).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
