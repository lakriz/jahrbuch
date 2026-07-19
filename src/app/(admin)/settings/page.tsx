'use client'

import { useEffect, useState } from 'react'
import { BOOK_FORMATS, DEFAULT_FORMAT, type BookFormat } from '@/lib/bookFormats'
import { Save, Check } from 'lucide-react'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function SettingsPage() {
  const [format, setFormat] = useState<BookFormat>(DEFAULT_FORMAT)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SaveStatus>('idle')

  useEffect(() => {
    fetch('/api/settings/book_format')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.value) setFormat(data.value as BookFormat)
        setLoading(false)
      })
  }, [])

  const save = async () => {
    setStatus('saving')
    const res = await fetch('/api/settings/book_format', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: format }),
    })
    if (res.ok) {
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      setStatus('error')
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Laden…</div>

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Einstellungen</h1>
      <p className="text-sm text-gray-500 mb-8">Grundlegende Konfiguration des Jahrbuchs.</p>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Buchformat / Seitengröße</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {BOOK_FORMATS.map((f) => {
            const selected = format === f.id
            const previewH = 56
            const previewW = Math.round((f.widthMm / f.heightMm) * previewH)

            return (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`text-left p-4 rounded-xl border-2 transition-colors ${
                  selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex justify-center mb-3">
                  <div
                    className={`rounded border ${selected ? 'border-blue-400 bg-blue-100' : 'border-gray-300 bg-gray-100'}`}
                    style={{ width: previewW, height: previewH }}
                  />
                </div>
                <div className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-gray-800'}`}>{f.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{f.widthMm} × {f.heightMm} mm</div>
                <div className="text-xs text-gray-400 mt-1 leading-snug">{f.description}</div>
              </button>
            )
          })}
        </div>

        <button
          onClick={save}
          disabled={status === 'saving'}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {status === 'saved' ? (
            <><Check className="w-4 h-4" /> Gespeichert</>
          ) : (
            <><Save className="w-4 h-4" /> {status === 'saving' ? 'Speichern…' : 'Speichern'}</>
          )}
        </button>

        {status === 'error' && (
          <p className="mt-3 text-sm text-red-500">Fehler beim Speichern. Bitte nochmals versuchen.</p>
        )}
      </section>
    </div>
  )
}
