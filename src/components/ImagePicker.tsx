'use client'
import { useEffect, useState } from 'react'
import type { Class, ImageEntry } from '@/types'
import { X, Check, Search } from 'lucide-react'

interface Props {
  selected: string[]
  multiple?: boolean
  onConfirm: (imgs: ImageEntry[]) => void
  onClose: () => void
}

export default function ImagePicker({ selected, multiple = false, onConfirm, onClose }: Props) {
  const [classes, setClasses] = useState<Class[]>([])
  const [images, setImages] = useState<ImageEntry[]>([])
  const [album, setAlbum] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set(selected))

  useEffect(() => {
    fetch('/api/classes').then((r) => r.json()).then(setClasses)
  }, [])

  useEffect(() => {
    const url = album === null ? '/api/images' : `/api/images?album=${album}`
    fetch(url).then((r) => r.json()).then(setImages)
  }, [album])

  const toggle = (id: string) => {
    if (multiple) {
      setPicked((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else {
      setPicked(new Set([id]))
    }
  }

  const confirm = () => onConfirm(images.filter((i) => picked.has(i.id)))

  const filtered = search
    ? images.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : images

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Bild auswählen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <aside className="w-40 border-r border-gray-100 p-2 flex-shrink-0 overflow-y-auto">
            <AlbumBtn label="Allgemein" active={album === null} onClick={() => setAlbum(null)} />
            {classes.map((c) => (
              <AlbumBtn key={c.id} label={c.name} active={album === c.id} onClick={() => setAlbum(c.id)} />
            ))}
          </aside>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suchen…"
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-4 gap-2 content-start">
              {filtered.map((img) => {
                const sel = picked.has(img.id)
                const src = img.thumbnail_url ?? img.public_url
                return (
                  <button key={img.id} onClick={() => toggle(img.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      sel ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={img.alt_text || img.name} className="w-full h-full object-cover" />
                    {sel && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <div className="bg-blue-500 rounded-full p-1">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <p className="col-span-4 text-center text-gray-400 text-sm py-10">Keine Bilder gefunden.</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {picked.size > 0 ? `${picked.size} Bild${picked.size > 1 ? 'er' : ''} ausgewählt` : 'Kein Bild ausgewählt'}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              Abbrechen
            </button>
            <button onClick={confirm} disabled={picked.size === 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
              Übernehmen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AlbumBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >{label}</button>
  )
}
