'use client'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import type { Class, ImageEntry } from '@/types'
import { Upload, Trash2, X, ImageIcon, Loader2, ArrowLeftRight, RefreshCw, Plus, Tag, ShieldAlert, Check, RotateCw, RotateCcw, Crop } from 'lucide-react'

export default function ImagesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [images, setImages] = useState<ImageEntry[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [lightbox, setLightbox] = useState<ImageEntry | null>(null)
  
  // Custom states for Simplified structures & features
  const [currentTab, setCurrentTab] = useState<'active' | 'trash'>('active')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [availableTags, setAvailableTags] = useState<string[]>([
    'sommerfest', 'klassiker', 'cover', 'portrait', 'sportfest', 'ausflug'
  ])
  const [newTagInput, setNewTagInput] = useState('')

  // Multi-select / Batch tagging states
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set())

  // Image editing states (Rotate, Crop)
  const [cacheBuster, setCacheBuster] = useState(Date.now())
  const [isCropMode, setIsCropMode] = useState(false)
  const [cropLeft, setCropLeft] = useState(10)
  const [cropTop, setCropTop] = useState(10)
  const [cropWidth, setCropWidth] = useState(80)
  const [cropHeight, setCropHeight] = useState(80)

  // Edit metadata form states
  const [editName, setEditName] = useState('')
  const [editAltText, setEditAltText] = useState('')
  const [editCaption, setEditCaption] = useState('')
  const [editAlbumId, setEditAlbumId] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const replaceFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/classes').then((r) => r.json()).then(setClasses)
  }, [])

  const loadImages = useCallback(() => {
    const isTrash = currentTab === 'trash'
    const url = selectedAlbum === null 
      ? `/api/images?deleted=${isTrash}` 
      : `/api/images?album=${selectedAlbum}&deleted=${isTrash}`
    
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setImages(data)
        } else {
          setImages([])
        }
      })
      .catch((err) => {
        console.error(err)
        setImages([])
      })
  }, [selectedAlbum, currentTab])

  useEffect(() => { loadImages() }, [loadImages])

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    setUploading(true)
    setUploadError(null)
    
    for (const file of list) {
      const folder = selectedAlbum ?? 'allgemein'
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      try {
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        if (!uploadRes.ok) {
          const errData = await uploadRes.json()
          throw new Error(errData.error || 'Upload fehlgeschlagen')
        }
        const uploadData = await uploadRes.json()

        const imageRes = await fetch('/api/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storage_path:   uploadData.storagePath,
            public_url:     uploadData.publicUrl,
            thumbnail_url:  uploadData.thumbnailUrl ?? null,
            thumbnail_path: uploadData.thumbnailPath ?? null,
            thumb_200_url:  uploadData.thumb_200_url ?? null,
            thumb_200_path: uploadData.thumb_200_path ?? null,
            thumb_400_url:  uploadData.thumb_400_url ?? null,
            thumb_400_path: uploadData.thumb_400_path ?? null,
            thumb_800_url:  uploadData.thumb_800_url ?? null,
            thumb_800_path: uploadData.thumb_800_path ?? null,
            width:          uploadData.width,
            height:         uploadData.height,
            fileSize:       uploadData.fileSize,
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
      } catch (err: any) {
        setUploadError(err.message)
      }
    }
    setUploading(false)
  }, [selectedAlbum])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files)
  }

  // Soft Delete
  const remove = async (img: ImageEntry) => {
    const res = await fetch(`/api/images/${img.id}`, { method: 'DELETE' })
    if (res.ok) {
      setImages((p) => p.filter((i) => i.id !== img.id))
      if (lightbox?.id === img.id) setLightbox(null)
    }
  }

  // Restore
  const restoreFromTrash = async (img: ImageEntry) => {
    const res = await fetch(`/api/images/${img.id}/restore`, { method: 'POST' })
    if (res.ok) {
      setImages((p) => p.filter((i) => i.id !== img.id))
      if (lightbox?.id === img.id) setLightbox(null)
    }
  }

  // Permanent Delete
  const deletePermanently = async (img: ImageEntry) => {
    if (!confirm('Dieses Bild wird unwiderruflich von der Festplatte gelöscht. Fortfahren?')) return
    const res = await fetch(`/api/images/${img.id}?permanent=true`, { method: 'DELETE' })
    if (res.ok) {
      setImages((p) => p.filter((i) => i.id !== img.id))
      if (lightbox?.id === img.id) setLightbox(null)
    }
  }

  // Empty Trash
  const emptyTrash = async () => {
    if (!confirm('Möchtest du den Papierkorb wirklich leeren? Alle Bilder darin werden unwiderruflich gelöscht.')) return
    setUploading(true)
    try {
      await Promise.all(images.map((img) => fetch(`/api/images/${img.id}?permanent=true`, { method: 'DELETE' })))
      setImages([])
    } catch (e) {
      console.error(e)
    } finally {
      setUploading(false)
    }
  }

  // Replace image file
  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !lightbox) return
    setSavingEdit(true)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/images/${lightbox.id}/replace`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Ersetzen fehlgeschlagen')
      }
      const updated = await res.json() as ImageEntry
      setImages((p) => p.map((i) => i.id === updated.id ? updated : i))
      setLightbox(updated)
      setEditName(updated.name)
      setEditAltText(updated.alt_text || '')
      setEditCaption(updated.caption || '')
      setEditAlbumId(updated.album_id)
      setCacheBuster(Date.now())
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  // Image manipulation functions
  const rotateImage = async (angle: number) => {
    if (!lightbox) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/images/${lightbox.id}/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angle })
      })
      if (res.ok) {
        const updated = await res.json() as ImageEntry
        setImages((p) => p.map((i) => i.id === updated.id ? updated : i))
        setLightbox(updated)
        setCacheBuster(Date.now())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingEdit(false)
    }
  }

  const applyCrop = async () => {
    if (!lightbox) return
    setSavingEdit(true)
    const origW = lightbox.width || 0
    const origH = lightbox.height || 0
    
    // Berechne Pixel-Koordinaten
    const left = (cropLeft / 100) * origW
    const top = (cropTop / 100) * origH
    const width = (cropWidth / 100) * origW
    const height = (cropHeight / 100) * origH

    try {
      const res = await fetch(`/api/images/${lightbox.id}/crop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ left, top, width, height })
      })
      if (res.ok) {
        const updated = await res.json() as ImageEntry
        setImages((p) => p.map((i) => i.id === updated.id ? updated : i))
        setLightbox(updated)
        setIsCropMode(false)
        setCacheBuster(Date.now())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingEdit(false)
    }
  }

  // Lightbox & details panel setup
  const openLightbox = (img: ImageEntry) => {
    setLightbox(img)
    setEditName(img.name)
    setEditAltText(img.alt_text || '')
    setEditCaption(img.caption || '')
    setEditAlbumId(img.album_id)
    setUploadError(null)
    setIsCropMode(false)
    setCropLeft(10)
    setCropTop(10)
    setCropWidth(80)
    setCropHeight(80)
  }

  const saveMetadata = async () => {
    if (!lightbox) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/images/${lightbox.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          alt_text: editAltText,
          caption: editCaption,
          album_id: editAlbumId || null,
        })
      })
      if (res.ok) {
        const updated = await res.json() as ImageEntry
        setImages((p) => p.map((i) => i.id === updated.id ? updated : i))
        if (selectedAlbum !== updated.album_id && selectedAlbum !== null) {
          setImages((p) => p.filter((i) => i.id !== updated.id))
        }
        setLightbox(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingEdit(false)
    }
  }

  const updateImageMetadata = async (imgId: string, payload: Partial<ImageEntry>) => {
    try {
      const res = await fetch(`/api/images/${imgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const updated = await res.json() as ImageEntry
        setImages((p) => p.map((i) => i.id === updated.id ? updated : i))
        if (lightbox && lightbox.id === imgId) {
          setLightbox(updated)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const addCustomTag = () => {
    const t = newTagInput.trim().toLowerCase()
    if (t && !availableTags.includes(t)) {
      setAvailableTags([...availableTags, t])
    }
    setNewTagInput('')
  }

  // Multi-select operations
  const toggleImageSelection = (id: string) => {
    setSelectedImageIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const cancelSelection = () => {
    setSelectedImageIds(new Set())
    setIsMultiSelectMode(false)
  }

  const addTagToSelected = async (tag: string) => {
    setUploading(true)
    const ids = Array.from(selectedImageIds)
    try {
      await Promise.all(
        ids.map(async (id) => {
          const img = images.find((i) => i.id === id)
          if (img && !img.tags?.includes(tag)) {
            const updatedTags = [...(img.tags || []), tag]
            await fetch(`/api/images/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tags: updatedTags }),
            })
          }
        })
      )
      loadImages()
      setSelectedImageIds(new Set())
      setIsMultiSelectMode(false)
    } catch (e) {
      console.error(e)
    } finally {
      setUploading(false)
    }
  }

  const removeTagFromSelected = async (tag: string) => {
    setUploading(true)
    const ids = Array.from(selectedImageIds)
    try {
      await Promise.all(
        ids.map(async (id) => {
          const img = images.find((i) => i.id === id)
          if (img && img.tags?.includes(tag)) {
            const updatedTags = img.tags.filter((t) => t !== tag)
            await fetch(`/api/images/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tags: updatedTags }),
            })
          }
        })
      )
      loadImages()
      setSelectedImageIds(new Set())
      setIsMultiSelectMode(false)
    } catch (e) {
      console.error(e)
    } finally {
      setUploading(false)
    }
  }

  const deleteSelected = async () => {
    const isTrash = currentTab === 'trash'
    if (isTrash) {
      if (!confirm(`${selectedImageIds.size} Bilder endgültig von der Festplatte löschen?`)) return
    } else {
      if (!confirm(`${selectedImageIds.size} Bilder in den Papierkorb verschieben?`)) return
    }
    
    setUploading(true)
    const ids = Array.from(selectedImageIds)
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/images/${id}${isTrash ? '?permanent=true' : ''}`, {
            method: 'DELETE',
          })
        )
      )
      loadImages()
      setSelectedImageIds(new Set())
      setIsMultiSelectMode(false)
    } catch (e) {
      console.error(e)
    } finally {
      setUploading(false)
    }
  }

  const restoreSelected = async () => {
    setUploading(true)
    const ids = Array.from(selectedImageIds)
    try {
      await Promise.all(
        ids.map((id) => fetch(`/api/images/${id}/restore`, { method: 'POST' }))
      )
      loadImages()
      setSelectedImageIds(new Set())
      setIsMultiSelectMode(false)
    } catch (e) {
      console.error(e)
    } finally {
      setUploading(false)
    }
  }

  // Intelligent filter & sorting
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    images.forEach((img) => {
      img.tags?.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1
      })
    })
    return counts
  }, [images])

  const filteredImages = useMemo(() => {
    if (!selectedTag) return images
    return images.filter((img) => img.tags?.includes(selectedTag))
  }, [images, selectedTag])

  const albumLabel = selectedAlbum
    ? (classes.find((c) => c.id === selectedAlbum)?.name ?? '…')
    : 'Allgemein'

  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar for Albums & Tags */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Alben</span>
        </div>
        <nav className="p-2 space-y-0.5 max-h-[40vh] overflow-y-auto border-b border-gray-100">
          <button
            onClick={() => { setSelectedAlbum(null); setSelectedTag(null); cancelSelection() }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedAlbum === null ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            Allgemein
          </button>
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedAlbum(c.id); setSelectedTag(null); cancelSelection() }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedAlbum === c.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {c.name}
            </button>
          ))}
        </nav>

        {/* Intelligent Tag Drag & Drop Sidebar */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sortier-Tags</span>
          {selectedTag && (
            <button onClick={() => setSelectedTag(null)} className="text-xs text-blue-600 hover:underline">
              alle
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {availableTags.map((tag) => {
            const count = tagCounts[tag] || 0
            const active = selectedTag === tag
            return (
              <div
                key={tag}
                draggable
                onDragStart={(e) => {
                  if (!isMultiSelectMode) {
                    e.dataTransfer.setData('text/plain', `tag:${tag}`)
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault()
                  if (!isMultiSelectMode) {
                    const data = e.dataTransfer.getData('text/plain')
                    if (data.startsWith('image:')) {
                      const imgId = data.substring(6)
                      const img = images.find(i => i.id === imgId)
                      if (img && !img.tags.includes(tag)) {
                        const updatedTags = [...img.tags, tag]
                        await updateImageMetadata(imgId, { tags: updatedTags })
                      }
                    }
                  }
                }}
                onClick={() => setSelectedTag(active ? null : tag)}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer border transition-all ${
                  active 
                    ? 'bg-orange-50 border-orange-200 text-orange-700 font-medium' 
                    : 'border-transparent hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                }`}
                title="Tag auf ein Bild ziehen oder Bild hierher ziehen"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{tag}</span>
                </div>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    active ? 'bg-orange-200/50 text-orange-800' : 'bg-gray-100 text-gray-500'
                  }`}>{count}</span>
                )}
              </div>
            )
          })}
          
          <div className="pt-2 px-1">
            <div className="flex gap-1">
              <input
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="Neuer Tag…"
                className="flex-1 text-[11px] border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={addCustomTag}
                className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 italic leading-tight">
              Tipp: Tags per Drag & Drop auf Bilder ziehen, um sie zuzuweisen!
            </p>
          </div>
        </div>
      </aside>

      {/* Main Grid Workspace */}
      <div className="flex-1 p-6 flex flex-col min-h-0 bg-gray-50 overflow-y-auto">
        {/* Upper Header and Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-4 mb-5 gap-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">{albumLabel}</h1>
            <div className="flex bg-gray-200/60 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => { setCurrentTab('active'); setSelectedTag(null); cancelSelection() }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  currentTab === 'active' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Aktive Bilder
              </button>
              <button
                onClick={() => { setCurrentTab('trash'); setSelectedTag(null); cancelSelection() }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  currentTab === 'trash' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Papierkorb
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {images.length > 0 && (
              <button
                onClick={() => {
                  if (isMultiSelectMode) {
                    cancelSelection()
                  } else {
                    setIsMultiSelectMode(true)
                  }
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  isMultiSelectMode 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
              >
                {isMultiSelectMode ? 'Auswahl beenden' : 'Bilder auswählen'}
              </button>
            )}

            {currentTab === 'trash' && images.length > 0 && !isMultiSelectMode && (
              <button
                onClick={emptyTrash}
                disabled={uploading}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm transition-colors border border-red-200 font-medium"
              >
                <Trash2 className="w-4 h-4" /> Papierkorb leeren
              </button>
            )}
            
            {currentTab === 'active' && !isMultiSelectMode && (
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Hochladen…</>
                ) : (
                  <><Upload className="w-4 h-4" /> Bilder hochladen</>
                )}
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            />
          </div>
        </div>

        {/* Dynamic Resolution Error Alert */}
        {uploadError && (
          <div className="mb-5 bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-xl flex items-start gap-2 text-sm shadow-sm">
            <ShieldAlert className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Anforderungsfehler:</span> {uploadError}
              <p className="text-xs text-orange-700/80 mt-1">
                Druckfähige Bilder müssen eine Auflösung von mindestens 2400 x 1000 Pixeln (oder 1000 x 2400 Pixeln) aufweisen.
              </p>
            </div>
            <button onClick={() => setUploadError(null)} className="text-orange-400 hover:text-orange-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Drag & Drop Upload Zone */}
        {currentTab === 'active' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => filteredImages.length === 0 && inputRef.current?.click()}
            className={`
              ${filteredImages.length === 0 ? 'flex' : 'hidden'}
              flex-col items-center justify-center flex-1
              border-2 border-dashed rounded-2xl p-16 cursor-pointer transition-colors min-h-[40vh]
              ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}
            `}
          >
            <ImageIcon className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-medium">Druckfähige Bilder hochladen</p>
            <p className="text-xs text-gray-400 mt-1">Mindestgröße: 2400 × 1000 Pixel (Quer- oder Hochformat)</p>
            <p className="text-xs text-gray-300 mt-2">Bilder hierher ziehen oder klicken zum Auswählen</p>
          </div>
        )}

        {/* Images Grid */}
        {filteredImages.length > 0 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative rounded-2xl transition-all flex-1 ${dragOver ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
          >
            {dragOver && currentTab === 'active' && (
              <div className="absolute inset-0 bg-blue-50/80 rounded-2xl z-10 flex items-center justify-center pointer-events-none">
                <p className="text-blue-500 font-medium text-sm">Loslassen zum Hochladen</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredImages.map((img) => {
                const src = img.thumb_200_url ?? img.thumbnail_url ?? img.public_url
                const isSelected = selectedImageIds.has(img.id)
                return (
                  <div
                    key={img.id}
                    draggable={!isMultiSelectMode}
                    onDragStart={(e) => {
                      if (!isMultiSelectMode) {
                        e.dataTransfer.setData('text/plain', `image:${img.id}`)
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      e.preventDefault()
                      if (!isMultiSelectMode) {
                        const data = e.dataTransfer.getData('text/plain')
                        if (data.startsWith('tag:')) {
                          const tag = data.substring(4)
                          if (!img.tags?.includes(tag)) {
                            const updatedTags = [...(img.tags || []), tag]
                            await updateImageMetadata(img.id, { tags: updatedTags })
                          }
                        }
                      }
                    }}
                    onClick={() => {
                      if (isMultiSelectMode) {
                        toggleImageSelection(img.id)
                      } else {
                        openLightbox(img)
                      }
                    }}
                    className={`group relative aspect-square rounded-xl overflow-hidden bg-white border cursor-pointer shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 ${
                      isSelected ? 'ring-2 ring-blue-600 ring-offset-2 border-blue-600' : 'border-gray-200'
                    }`}
                  >
                    {/* Multi-select checkmark indicator */}
                    {isMultiSelectMode && (
                      <div className="absolute top-2 left-2 z-20">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white/80 border-gray-400 text-transparent'
                        }`}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    )}

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${src}?cb=${cacheBuster}`} alt={img.name} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                    
                    {/* Quick Info & Action Overlay */}
                    {!isMultiSelectMode && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
                        <div className="flex justify-end">
                          {currentTab === 'active' ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); remove(img) }}
                              className="bg-black/60 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                              title="In den Papierkorb verschieben"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); restoreFromTrash(img) }}
                                className="bg-black/60 hover:bg-green-600 text-white rounded-full p-1.5 transition-colors"
                                title="Wiederherstellen"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deletePermanently(img) }}
                                className="bg-black/60 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                                title="Endgültig löschen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-white text-xs font-medium truncate">{img.name}</p>
                          {img.width && img.height && (
                            <p className="text-white/60 text-[10px]">{img.width} × {img.height} px</p>
                          )}
                          {img.tags && img.tags.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {img.tags.slice(0, 2).map((t) => (
                                <span key={t} className="bg-orange-500/80 text-white text-[9px] px-1 rounded truncate max-w-[60px]">{t}</span>
                              ))}
                              {img.tags.length > 2 && <span className="bg-orange-500/80 text-white text-[9px] px-1 rounded">+</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {filteredImages.length === 0 && images.length > 0 && (
          <div className="text-center py-20 text-gray-400 bg-white border border-gray-200 rounded-2xl flex-1">
            <ImageIcon className="w-8 h-8 mx-auto opacity-30 mb-2" />
            <p className="text-sm">Keine Bilder für diesen Filter gefunden.</p>
          </div>
        )}

        {images.length === 0 && currentTab === 'trash' && (
          <div className="text-center py-20 text-gray-400 bg-white border border-gray-200 rounded-2xl flex-1">
            <Trash2 className="w-8 h-8 mx-auto opacity-30 mb-2" />
            <p className="text-sm">Der Papierkorb ist leer.</p>
          </div>
        )}
      </div>

      {/* Floating Action Bar for Bulk Tagging & Actions */}
      {isMultiSelectMode && selectedImageIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex flex-wrap items-center gap-4 border border-gray-800 backdrop-blur z-40 animate-fade-in text-xs">
          <span className="font-semibold text-gray-200">
            {selectedImageIds.size} Bild{selectedImageIds.size > 1 ? 'er' : ''} ausgewählt
          </span>

          <div className="h-4 w-px bg-gray-700" />

          {currentTab === 'active' ? (
            <>
              {/* Add tags dropdown */}
              <div className="relative group">
                <button type="button" className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-colors">
                  <Tag className="w-3.5 h-3.5 text-gray-400" /> Tag hinzufügen
                </button>
                <div className="absolute bottom-full mb-2 left-0 hidden group-hover:block bg-gray-800 border border-gray-700 rounded-lg p-1.5 min-w-[150px] shadow-lg max-h-48 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTagToSelected(tag)}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-gray-700 rounded text-gray-200 hover:text-white transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remove tags dropdown */}
              <div className="relative group">
                <button type="button" className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-colors">
                  <X className="w-3.5 h-3.5 text-gray-400" /> Tag entfernen
                </button>
                <div className="absolute bottom-full mb-2 left-0 hidden group-hover:block bg-gray-800 border border-gray-700 rounded-lg p-1.5 min-w-[150px] shadow-lg max-h-48 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => removeTagFromSelected(tag)}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-gray-700 rounded text-gray-200 hover:text-white transition-colors"
                    >
                      - {tag}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={deleteSelected}
                className="bg-red-950/80 hover:bg-red-900 border border-red-900/50 text-red-200 px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> In Papierkorb
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={restoreSelected}
                className="bg-green-950/80 hover:bg-green-900 border border-green-900/50 text-green-200 px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Wiederherstellen
              </button>
              
              <button
                type="button"
                onClick={deleteSelected}
                className="bg-red-950/80 hover:bg-red-900 border border-red-900/50 text-red-200 px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Endgültig löschen
              </button>
            </>
          )}

          <button
            type="button"
            onClick={cancelSelection}
            className="text-gray-400 hover:text-white px-2 py-1.5 rounded transition-colors"
          >
            Auswahl aufheben
          </button>
        </div>
      )}

      {/* Extended Modal Lightbox / Editor */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 md:p-10 animate-fade-in" onClick={() => setLightbox(null)}>
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl" onClick={(e) => e.stopPropagation()}>
            
            {/* Left side: Zoomable image view & Rotation toolbar */}
            <div className="flex-1 bg-neutral-950 flex flex-col justify-between p-6 min-h-[40vh] md:min-h-0 relative select-none">
              
              {/* Image view box with visual crop overlay */}
              <div className="flex-1 flex items-center justify-center relative">
                <div className="relative max-w-full max-h-[65vh]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${lightbox.thumb_800_url ?? lightbox.public_url}?cb=${cacheBuster}`}
                    alt={lightbox.name}
                    className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-lg border border-white/5"
                  />
                  {isCropMode && (
                    <div
                      className="absolute border-2 border-dashed border-yellow-400 bg-black/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] overflow-hidden rounded-lg"
                      style={{
                        left: `${cropLeft}%`,
                        top: `${cropTop}%`,
                        width: `${cropWidth}%`,
                        height: `${cropHeight}%`,
                      }}
                    >
                      {/* Grid lines (Rule of Thirds) */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-35 pointer-events-none">
                        <div className="border-r border-b border-white/40" />
                        <div className="border-r border-b border-white/40" />
                        <div className="border-b border-white/40" />
                        <div className="border-r border-b border-white/40" />
                        <div className="border-r border-b border-white/40" />
                        <div className="border-b border-white/40" />
                        <div className="border-r border-white/40" />
                        <div className="border-r border-white/40" />
                        <div />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rotation & Crop Toolbar */}
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 gap-4">
                {currentTab === 'active' && !isCropMode ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => rotateImage(270)}
                      disabled={savingEdit}
                      className="flex items-center justify-center gap-1.5 bg-white/5 border border-white/15 hover:bg-white/10 text-white text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer"
                      title="90° nach links drehen"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> 90° Links
                    </button>
                    <button
                      onClick={() => rotateImage(90)}
                      disabled={savingEdit}
                      className="flex items-center justify-center gap-1.5 bg-white/5 border border-white/15 hover:bg-white/10 text-white text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer"
                      title="90° nach rechts drehen"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> 90° Rechts
                    </button>
                    <button
                      onClick={() => setIsCropMode(true)}
                      disabled={savingEdit}
                      className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                      title="Bild zuschneiden"
                    >
                      <Crop className="w-3.5 h-3.5" /> Zuschneiden
                    </button>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}

                {/* Replace Image Block */}
                {!isCropMode && (
                  <div className="flex items-center gap-3 backdrop-blur-sm">
                    <button
                      onClick={() => replaceFileRef.current?.click()}
                      disabled={savingEdit}
                      className="flex items-center gap-1.5 bg-white/10 text-white border border-white/20 hover:bg-white/20 text-xs px-3.5 py-2 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Motiv austauschen
                    </button>
                    <input
                      ref={replaceFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleReplaceFile}
                    />
                  </div>
                )}
              </div>

              <button onClick={() => setLightbox(null)} className="absolute top-4 left-4 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors border border-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Right side: Metadata Editing / Crop Slider Panel */}
            <div className="w-full md:w-96 flex flex-col border-l border-gray-100 bg-white">
              
              {isCropMode ? (
                /* Crop Sliders Panel */
                <div className="flex flex-col h-full justify-between">
                  <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                      <Crop className="w-4 h-4 text-blue-600" /> Zuschneiden einstellen
                    </h3>
                    <button onClick={() => setIsCropMode(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs text-gray-600">
                    <p className="text-gray-500 leading-normal mb-4">
                      Verschiebe den Ausschnitt und passe die Größe mit den Schiebereglern an. Das Originalbild wird permanent auf diesen Ausschnitt zugeschnitten.
                    </p>

                    <div>
                      <div className="flex justify-between font-medium text-gray-700 mb-1">
                        <span>Ausschnitt Links (X)</span>
                        <span>{cropLeft}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={100 - cropWidth}
                        value={cropLeft}
                        onChange={(e) => setCropLeft(Math.min(Number(e.target.value), 100 - cropWidth))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between font-medium text-gray-700 mb-1">
                        <span>Ausschnitt Oben (Y)</span>
                        <span>{cropTop}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={100 - cropHeight}
                        value={cropTop}
                        onChange={(e) => setCropTop(Math.min(Number(e.target.value), 100 - cropHeight))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between font-medium text-gray-700 mb-1">
                        <span>Breite des Ausschnitts</span>
                        <span>{cropWidth}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max={100 - cropLeft}
                        value={cropWidth}
                        onChange={(e) => setCropWidth(Math.min(Number(e.target.value), 100 - cropLeft))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between font-medium text-gray-700 mb-1">
                        <span>Höhe des Ausschnitts</span>
                        <span>{cropHeight}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max={100 - cropTop}
                        value={cropHeight}
                        onChange={(e) => setCropHeight(Math.min(Number(e.target.value), 100 - cropTop))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>

                  <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsCropMode(false)}
                      className="px-4 py-2 text-xs text-gray-500 hover:bg-gray-200 rounded-lg transition-colors font-medium cursor-pointer"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={applyCrop}
                      disabled={savingEdit}
                      className="px-4 py-2 text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors font-semibold shadow-sm cursor-pointer"
                    >
                      {savingEdit ? 'Zuschneiden…' : 'Zuschneiden anwenden'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Metadata Panel */
                <div className="flex flex-col h-full justify-between">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="font-semibold text-gray-900 text-sm">Bild bearbeiten</h3>
                    {currentTab === 'active' ? (
                      <button
                        onClick={() => remove(lightbox)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                        title="In Papierkorb verschieben"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          onClick={() => restoreFromTrash(lightbox)}
                          className="text-gray-400 hover:text-green-600 transition-colors p-1.5 rounded-lg hover:bg-green-50 cursor-pointer"
                          title="Wiederherstellen"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePermanently(lightbox)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                          title="Dauerhaft löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Upload Resolution Error in Lightbox */}
                    {uploadError && (
                      <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-lg text-xs">
                        <span className="font-semibold">Fehler:</span> {uploadError}
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Dateiname</label>
                      <input
                        value={editName}
                        disabled={currentTab === 'trash'}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Album / Klasse</label>
                      <select
                        value={editAlbumId || ''}
                        disabled={currentTab === 'trash'}
                        onChange={(e) => setEditAlbumId(e.target.value || null)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50"
                      >
                        <option value="">Allgemein</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Edit Tags inside Lightbox */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tags</label>
                      <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-lg min-h-[40px] bg-gray-50/50">
                        {lightbox.tags && lightbox.tags.map((t) => (
                          <span key={t} className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-800 text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm">
                            {t}
                            {currentTab === 'active' && (
                              <button
                                onClick={() => {
                                  const updated = lightbox.tags.filter(x => x !== t)
                                  updateImageMetadata(lightbox.id, { tags: updated })
                                }}
                                className="text-orange-400 hover:text-red-500"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </span>
                        ))}
                        {(!lightbox.tags || lightbox.tags.length === 0) && (
                          <span className="text-xs text-gray-400 italic">Keine Tags zugewiesen.</span>
                        )}
                      </div>
                      {currentTab === 'active' && (
                        <div className="mt-1.5 flex gap-1 flex-wrap max-h-24 overflow-y-auto p-1 bg-gray-50 rounded border border-dashed border-gray-200">
                          {availableTags
                            .filter(t => !lightbox.tags?.includes(t))
                            .map(t => (
                              <button
                                key={t}
                                onClick={async () => {
                                  const updated = [...(lightbox.tags || []), t]
                                  await updateImageMetadata(lightbox.id, { tags: updated })
                                }}
                                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 px-2 py-1 rounded-lg transition-colors font-semibold"
                              >
                                + {t}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Alt-Text</label>
                      <input
                        value={editAltText}
                        disabled={currentTab === 'trash'}
                        onChange={(e) => setEditAltText(e.target.value)}
                        placeholder="Bildbeschreibung für Screenreader"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bildunterschrift (Caption)</label>
                      <textarea
                        value={editCaption}
                        disabled={currentTab === 'trash'}
                        onChange={(e) => setEditCaption(e.target.value)}
                        placeholder="Bildunterschrift im Jahrbuch"
                        rows={3}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>

                    {/* Displaying Image Metadata */}
                    <div className="border-t border-gray-100 pt-4 space-y-2">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Datei-Metadaten</h4>
                      <table className="w-full text-xs text-left text-gray-500 space-y-1">
                        <tbody>
                          {lightbox.width && lightbox.height && (
                            <tr>
                              <td className="py-1 font-medium text-gray-400 w-24">Auflösung:</td>
                              <td className="py-1 text-gray-800 font-semibold">{lightbox.width} × {lightbox.height} px</td>
                            </tr>
                          )}
                          {lightbox.file_size && (
                            <tr>
                              <td className="py-1 font-medium text-gray-400">Dateigröße:</td>
                              <td className="py-1 text-gray-800 font-semibold">{(lightbox.file_size / (1024 * 1024)).toFixed(2)} MB</td>
                            </tr>
                          )}
                          <tr>
                            <td className="py-1 font-medium text-gray-400">Pfad:</td>
                            <td className="py-1 text-gray-800 font-mono text-[10px] break-all">uploads/{lightbox.storage_path}</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-medium text-gray-400">Hochgeladen:</td>
                            <td className="py-1 text-gray-800">{new Date(lightbox.created_at).toLocaleString('de-DE')}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50">
                    <button onClick={() => setLightbox(null)} className="px-4 py-2 text-xs text-gray-500 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer">
                      Schließen
                    </button>
                    {currentTab === 'active' && (
                      <button
                        onClick={saveMetadata}
                        disabled={savingEdit || !editName.trim()}
                        className="px-4 py-2 text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                      >
                        {savingEdit ? 'Speichert…' : 'Speichern'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
