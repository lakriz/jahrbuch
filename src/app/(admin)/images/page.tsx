'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Class, ImageEntry } from '@/types'
import { Upload, Trash2, X, ImageIcon, Loader2 } from 'lucide-react'

export default function ImagesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [images, setImages] = useState<ImageEntry[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [lightbox, setLightbox] = useState<ImageEntry | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/classes').then((r) => r.json()).then(setClasses)
  }, [])

  const loadImages = useCallback(() => {
    const url = selectedAlbum === null ? '/api/images' : `/api/images?album=${selectedAlbum}`
    fetch(url).then((r) => r.json()).then(setImages)
  }, [selectedAlbum])

  useEffect(() => { loadImages() }, [loadImages])

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    setUploading(true)
    for (const file of list) {
      const folder = selectedAlbum ?? 'allgemein'
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) { console.error('Upload failed'); continue }
      const uploadData = await uploadRes.json()

      const imageRes = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_path:   uploadData.storagePath,
          public_url:     uploadData.publicUrl,
          thumbnail_url:  uploadData.thumbnailUrl ?? null,
          thumbnail_path: uploadData.thumbnailPath ?? null,
          name:      file.name,
          alt_text:  '',
          caption:   '',
          tags:      [],
          album_id:  selectedAlbum,
        }),
      })
      if (imageRes.ok) {
        const entry = await imageRes.json()
        setImages((p) => [entry, ...p])
      }
    }
    setUploading(false)
  }, [selectedAlbum])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files)
  }

  const remove = async (img: ImageEntry) => {
    await fetch(`/api/images/${img.id}`, { method: 'DELETE' })
    setImages((p) => p.filter((i) => i.id !== img.id))
    if (lightbox?.id === img.id) setLightbox(null)
  }

  const albumLabel = selectedAlbum
    ? (classes.find((c) => c.id === selectedAlbum)?.name ?? '…')
    : 'Allgemein'

  return (
    <div className="flex h-full min-h-screen">
      <aside className="w-48 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Alben</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <AlbumItem label="Allgemein" active={selectedAlbum === null} onClick={() => setSelectedAlbum(null)} />
          {classes.map((c) => (
            <AlbumItem key={c.id} label={c.name} active={selectedAlbum === c.id} onClick={() => setSelectedAlbum(c.id)} />
          ))}
        </nav>
      </aside>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-gray-900">{albumLabel}</h1>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {uploading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Hochladen…</>
              : <><Upload className="w-4 h-4" /> Bilder hochladen</>
            }
          </button>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => images.length === 0 && inputRef.current?.click()}
          className={`
            ${images.length === 0 ? 'flex' : 'hidden'}
            flex-col items-center justify-center
            border-2 border-dashed rounded-2xl p-16 cursor-pointer transition-colors
            ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300'}
          `}
        >
          <ImageIcon className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">Bilder hierher ziehen oder klicken zum Hochladen</p>
          <p className="text-xs text-gray-300 mt-1">JPG, PNG, WEBP</p>
        </div>

        {images.length > 0 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative rounded-2xl transition-all ${dragOver ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
          >
            {dragOver && (
              <div className="absolute inset-0 bg-blue-50/80 rounded-2xl z-10 flex items-center justify-center pointer-events-none">
                <p className="text-blue-500 font-medium text-sm">Loslassen zum Hochladen</p>
              </div>
            )}
            <ThumbnailGrid images={images} onDelete={remove} onOpen={setLightbox} />
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.public_url} alt={lightbox.name} className="max-w-full max-h-[85vh] rounded-xl object-contain" />
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-white/60 text-xs truncate max-w-xs">{lightbox.name}</span>
              <div className="flex gap-2">
                <button onClick={() => remove(lightbox)} className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Löschen
                </button>
                <button onClick={() => setLightbox(null)} className="text-white/60 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AlbumItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >{label}</button>
  )
}

function ThumbnailGrid({ images, onDelete, onOpen }: { images: ImageEntry[]; onDelete: (img: ImageEntry) => void; onOpen: (img: ImageEntry) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {images.map((img) => {
        const src = img.thumbnail_url ?? img.public_url
        return (
          <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={img.name} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" onClick={() => onOpen(img)} />
            <button onClick={(e) => { e.stopPropagation(); onDelete(img) }}
              className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
              <X className="w-3 h-3" />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs truncate">{img.name}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
