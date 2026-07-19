'use client'
import { useState } from 'react'
import { Download, Loader2, CheckCircle, AlertCircle, FileArchive, FileText } from 'lucide-react'

type Status = 'idle' | 'loading' | 'done' | 'error'

export default function ExportPage() {
  const [pdfStatus, setPdfStatus] = useState<Status>('idle')
  const [pdfErrorMsg, setPdfErrorMsg] = useState('')

  const [zipStatus, setZipStatus] = useState<Status>('idle')
  const [zipErrorMsg, setZipErrorMsg] = useState('')

  const exportPDF = async () => {
    setPdfStatus('loading')
    setPdfErrorMsg('')
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
      setPdfStatus('done')
    } catch (err) {
      setPdfErrorMsg(err instanceof Error ? err.message : 'Unbekannter Fehler')
      setPdfStatus('error')
    }
  }

  const exportZIP = async () => {
    setZipStatus('loading')
    setZipErrorMsg('')
    try {
      const res = await fetch('/api/export/zip')
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Export fehlgeschlagen')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jahrbuch-komplettexport-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
      setZipStatus('done')
    } catch (err) {
      setZipErrorMsg(err instanceof Error ? err.message : 'Unbekannter Fehler')
      setZipStatus('error')
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Exportbereich</h1>
      <p className="text-sm text-gray-500 mb-8">
        Hier kannst du dein fertiges Jahrbuch als druckfertiges PDF generieren oder alle Inhalte für Backups und externe Bearbeitung exportieren.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* PDF Export Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-4 border border-orange-100">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">PDF Buch-Export</h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Generiert ein professionelles, druckfertiges A4-PDF aus allen konfigurierten Jahrbuchseiten. Perfekt zum Senden an die Druckerei.
            </p>
          </div>

          <div>
            <button
              onClick={exportPDF}
              disabled={pdfStatus === 'loading'}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              {pdfStatus === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> PDF wird erstellt…</>
              ) : (
                <><Download className="w-4 h-4" /> PDF generieren</>
              )}
            </button>

            {pdfStatus === 'done' && (
              <div className="mt-3 flex items-center gap-1.5 text-green-600 text-xs font-medium">
                <CheckCircle className="w-4 h-4" /> PDF erfolgreich generiert und heruntergeladen.
              </div>
            )}
            {pdfStatus === 'error' && (
              <div className="mt-3 flex items-center gap-1.5 text-red-600 text-xs font-medium">
                <AlertCircle className="w-4 h-4" /> {pdfErrorMsg}
              </div>
            )}
          </div>
        </div>

        {/* ZIP Export Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 border border-blue-100">
              <FileArchive className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">ZIP Komplettexport</h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Exportiert alle aktiven Bilder in voller Qualität (nach Alben/Klassen sortiert) sowie alle Texte als Markdown-Dateien (.md) inklusive Tags in einer ZIP-Datei.
            </p>
          </div>

          <div>
            <button
              onClick={exportZIP}
              disabled={zipStatus === 'loading'}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              {zipStatus === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> ZIP wird gepackt…</>
              ) : (
                <><Download className="w-4 h-4" /> ZIP exportieren</>
              )}
            </button>

            {zipStatus === 'done' && (
              <div className="mt-3 flex items-center gap-1.5 text-green-600 text-xs font-medium">
                <CheckCircle className="w-4 h-4" /> ZIP erfolgreich exportiert.
              </div>
            )}
            {zipStatus === 'error' && (
              <div className="mt-3 flex items-center gap-1.5 text-red-600 text-xs font-medium">
                <AlertCircle className="w-4 h-4" /> {zipErrorMsg}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
