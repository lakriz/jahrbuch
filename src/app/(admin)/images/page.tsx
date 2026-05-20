'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Class, ImageEntry } from '@/types'
import { Upload, Trash2, X, ImageIcon, Loader2 } from 'lucide-react'

const BUCKET = 'jahrbuch26'

/** Fetch pre-signed URLs for a list of storage paths (1 h validity). */
async function fetchSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {}
  const res = await fetch('/api/storage/signed-urls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths }),
  })
  if (!res.ok) return {}
  const { urls } = await res.json()
  return urls as Record<string, string>
}

export default function ImagesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [images, setImages] = useState<ImageEntry[]>([])
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [lightbox, setLightbox] = useState<ImageEntry | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load classes + images
  useEffect(() => {
    supabase.from('classes').select('*').order('name').then(({ data }) => {
      if (data) setClasses(data)
    })
  }, [])

  useEffect(() => {
    const query = supabase.from('images').select('*').order('created_at', { ascending: false })
    if (selectedAlbum === null) {
      query.is('album_id', null)
    } else {
      query.eq('album_id', selectedAlbum)
    }
    query.then(async ({ data }) => {
      if (!data) return
      setImages(data)
      // Resolve signed URLs for all thumbnails (fall back to original if no thumb)
      const paths = data.map((img) => img.thumbnail_path ?? img.storage_path)
      const urls = await fetchSignedUrls(paths)
      setSignedUrls(urls)
    })
  }, [selectedAlbum])

  // Upload files
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    setUploading(true)
    for (const file of list) {
      const folder = selectedAlbum ?? 'allgemein'
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        console.error('Upload failed')
        continue
      }

      const uploadData = await response.json()
      const entry: Omit<ImageEntry, 'id' | 'created_at'> = {
        storage_path:   uploadData.storagePath,
        thumbnail_path: uploadData.thumbnailPath ?? null,
        public_url:     uploadData.publicUrl,
        thumbnail_url:  uploadData.thumbnailUrl ?? null,
        name:      uploadData.name,
        alt_text:  '',
        caption:   '',
        tags:      [],
        album_id:  selectedAlbum,
      }
      const { data } = await supabase.from('images').insert(entry).select().single()
      if (data) {
        setImages((p) => [data, ...p])
        // Fetch signed URL for the new thumbnail
        const thumbPath = data.thumbnail_path ?? data.storage_path
        const urls = await fetchSignedUrls([thumbPath])
        setSignedUrls((prev) => ({ ...prev, ...urls }))
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
    const paths = [img.storage_path, img.thumbnail_path].filter(Boolean) as string[]
    await supabase.storage.from(BUCKET).remove(paths)
    await supabase.from('images').delete().eq('id', img.id)
    setImages((p) => p.filter((i) => i.id !== img.id))
    if (lightbox?.id === img.id) setLightbox(null)
  }

  const albumLabel = selectedAlbum
    ? (classes.find((c) => c.id === selectedAlbum)?.name ?? '…')
    : 'Allgemein'

  return (
    <div className="flex h-full min-h-screen">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-48 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Alben</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <AlbumItem
            label="Allgemein"
            active={selectedAlbum === null}
            onClick={() => setSelectedAlbum(null)}
          />
          {classes.map((c) => (
            <AlbumItem
              key={c.id}
              label={c.name}
              active={selectedAlbum === c.id}
              onClick={() => setSelectedAlbum(c.id)}
            />
          ))}
        </nav>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
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
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
        </div>

        {/* Drop zone (shown when no images or as overlay hint) */}
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

        {/* Drag-over overlay when grid is visible */}
        {images.length > 0 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`
              relative rounded-2xl transition-all
              ${dragOver ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
            `}
          >
            {dragOver && (
              <div className="absolute inset-0 bg-blue-50/80 rounded-2xl z-10 flex items-center justify-center pointer-events-none">
                <p className="text-blue-500 font-medium text-sm">Loslassen zum Hochladen</p>
              </div>
            )}
            <ThumbnailGrid images={images} signedUrls={signedUrls} onDelete={remove} onOpen={setLightbox} />
          </div>
        )}
      </div>

      {/* ── Lightbox ────────────────────────────────────────── */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signedUrls[lightbox.storage_path] ?? lightbox.public_url}
              alt={lightbox.name}
              className="max-w-full max-h-[85vh] rounded-xl object-contain"
            />
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-white/60 text-xs truncate max-w-xs">{lightbox.name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => remove(lightbox)}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs transition-colors"
                >
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
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  )
}

function ThumbnailGrid({
  images,
  signedUrls,
  onDelete,
  onOpen,
}: {
  images: ImageEntry[]
  signedUrls: Record<string, string>
  onDelete: (img: ImageEntry) => void
  onOpen: (img: ImageEntry) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {images.map((img) => {
        const thumbPath = img.thumbnail_path ?? img.storage_path
        const src = signedUrls[thumbPath] ?? img.thumbnail_url ?? img.public_url
        return (
          <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={img.name}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              onClick={() => onOpen(img)}
            />
            {/* Delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(img) }}
              className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
            {/* Name tooltip */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs truncate">{img.name}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
