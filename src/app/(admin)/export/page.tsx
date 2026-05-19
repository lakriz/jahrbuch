'use client'
import { useState } from 'react'
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

type Status = 'idle' | 'loading' | 'done' | 'error'

export default function ExportPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const exportPDF = async () => {
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/export/pdf')
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Export fehlgeschlagen')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jahrbuch-${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setStatus('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unbekannter Fehler')
      setStatus('error')
    }
  }

  return (
    <div className="p-8 max-w-md">
      <h1 className="text-xl font-bold text-gray-900 mb-2">PDF Export</h1>
      <p className="text-sm text-gray-500 mb-8">
        Generiert ein druckfertiges A4-PDF aus allen Jahrbuch-Seiten in der festgelegten Reihenfolge.
      </p>

      <button
        onClick={exportPDF}
        disabled={status === 'loading'}
        className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {status === 'loading' ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> PDF wird erstellt…</>
        ) : (
          <><Download className="w-4 h-4" /> Jahrbuch als PDF exportieren</>
        )}
      </button>

      {status === 'done' && (
        <div className="mt-4 flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle className="w-4 h-4" /> PDF erfolgreich erstellt und heruntergeladen.
        </div>
      )}
      {status === 'error' && (
        <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}
    </div>
  )
}
