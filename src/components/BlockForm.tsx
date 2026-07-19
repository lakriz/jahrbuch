'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
import type { ContentBlockType, ContentBlockFull, BlockGalleryItem, ImageEntry } from '@/types'
import { TYPE_META, TagInput, GalleryItemRow } from '@/components/BlockFormShared'

const ImagePicker = dynamic(() => import('@/components/ImagePicker'), { ssr: false })

interface BlockFormProps {
  existing: ContentBlockFull | null
  onSaved: (blockId: string) => void
}

type HeadlineForm = { content: string; level: 1 | 2 | 3 }
type TextForm = { content: string }
type ImageForm = { image_id: string | null; image?: ImageEntry | null; alt_text: string; caption: string; tags: string[] }
type GalleryForm = { columns: 2 | 3 | 4; items: (BlockGalleryItem & { image?: ImageEntry | null })[] }

export default function BlockForm({ existing, onSaved }: BlockFormProps) {
  const [label, setLabel] = useState(existing?.label ?? '')
  const [type, setType] = useState<ContentBlockType>(existing?.type ?? 'headline')
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false)

  const [headline, setHeadline] = useState<HeadlineForm>({
    content: existing?.block_headlines?.content ?? '',
    level: (existing?.block_headlines?.level as 1 | 2 | 3) ?? 1,
  })
  const [text, setText] = useState<TextForm>({ content: existing?.block_texts?.content ?? '' })
  const [image, setImage] = useState<ImageForm>({
    image_id: existing?.block_images?.image_id ?? null,
    image: existing?.block_images?.images ?? null,
    alt_text: existing?.block_images?.alt_text ?? '',
    caption: existing?.block_images?.caption ?? '',
    tags: existing?.block_images?.tags ?? [],
  })
  const [gallery, setGallery] = useState<GalleryForm>({
    columns: (existing?.block_galleries?.columns as 2 | 3 | 4) ?? 3,
    items: existing?.block_galleries?.block_gallery_items?.map((i) => ({ ...i, image: i.images })) ?? [],
  })

  const save = async () => {
    if (!label.trim()) return
    setSaving(true)

    let blockId = existing?.id ?? null

    if (!blockId) {
      const res = await fetch('/api/content-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, label }),
      })
      if (!res.ok) { setSaving(false); return }
      const data = await res.json()
      blockId = data.id
    }

    const payload: Record<string, unknown> = { label }

    if (type === 'headline') payload.headline = headline
    else if (type === 'text') payload.text = text
    else if (type === 'image') payload.image = { image_id: image.image_id, alt_text: image.alt_text, caption: image.caption, tags: image.tags }
    else if (type === 'gallery') {
      payload.gallery = {
        columns: gallery.columns,
        items: gallery.items.map((item, i) => ({
          image_id: item.image_id,
          alt_text: item.alt_text,
          caption: item.caption,
          tags: item.tags,
          order_index: i,
        })),
      }
    }

    await fetch(`/api/content-blocks/${blockId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (blockId) onSaved(blockId)
  }

  const removeGalleryItem = (idx: number) =>
    setGallery((g) => ({ ...g, items: g.items.filter((_, i) => i !== idx) }))

  const moveGalleryItem = (idx: number, dir: -1 | 1) =>
    setGallery((g) => {
      const items = [...g.items]
      const next = idx + dir
      if (next < 0 || next >= items.length) return g
      ;[items[idx], items[next]] = [items[next], items[idx]]
      return { ...g, items }
    })

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>Interner Name *</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Titelseite Überschrift" className={inputCls} />
      </div>

      {!existing && (
        <div>
          <label className={labelCls}>Typ</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TYPE_META) as ContentBlockType[]).map((t) => {
              const { label: tl, icon: Icon, color } = TYPE_META[t]
              return (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                    type === t ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`p-1 rounded-lg ${color}`}><Icon className="w-3.5 h-3.5" /></span>
                  {tl}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <hr className="border-gray-100" />

      {type === 'headline' && (
        <>
          <div>
            <label className={labelCls}>Überschrift</label>
            <input value={headline.content} onChange={(e) => setHeadline((h) => ({ ...h, content: e.target.value }))} placeholder="Überschrift…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ebene</label>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((l) => (
                <button key={l} type="button" onClick={() => setHeadline((h) => ({ ...h, level: l }))}
                  className={`px-4 py-1.5 rounded-lg border text-sm font-bold transition-colors ${
                    headline.level === l ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >H{l}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {type === 'text' && (
        <div>
          <label className={labelCls}>Inhalt</label>
          <textarea value={text.content} onChange={(e) => setText({ content: e.target.value })} rows={6} placeholder="Text…" className={inputCls} />
        </div>
      )}

      {type === 'image' && (
        <>
          <div>
            <label className={labelCls}>Bild</label>
            {image.image ? (
              <div className="flex items-center gap-3 p-2 border border-gray-200 rounded-xl mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.image.public_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 truncate">{image.image.name}</p>
                </div>
                <button type="button" onClick={() => setImage((i) => ({ ...i, image_id: null, image: null }))}
                  className="text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : null}
            <button type="button" onClick={() => setPickerOpen(true)}
              className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
              {image.image ? 'Bild wechseln' : '+ Bild auswählen'}
            </button>
          </div>
          <div>
            <label className={labelCls}>Alt-Text *</label>
            <input value={image.alt_text} onChange={(e) => setImage((i) => ({ ...i, alt_text: e.target.value }))} placeholder="Bildbeschreibung für Screenreader" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Caption</label>
            <input value={image.caption} onChange={(e) => setImage((i) => ({ ...i, caption: e.target.value }))} placeholder="Bildunterschrift" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tags</label>
            <TagInput tags={image.tags} onChange={(t) => setImage((i) => ({ ...i, tags: t }))} />
          </div>
          {pickerOpen && (
            <ImagePicker
              selected={image.image_id ? [image.image_id] : []}
              multiple={false}
              onConfirm={([img]) => { setImage((i) => ({ ...i, image_id: img.id, image: img })); setPickerOpen(false) }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </>
      )}

      {type === 'gallery' && (
        <>
          <div>
            <label className={labelCls}>Spalten</label>
            <div className="flex gap-2">
              {([2, 3, 4] as const).map((c) => (
                <button key={c} type="button" onClick={() => setGallery((g) => ({ ...g, columns: c }))}
                  className={`px-4 py-1.5 rounded-lg border text-sm transition-colors ${
                    gallery.columns === c ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Bilder ({gallery.items.length})</label>
            <div className="space-y-2 mb-2">
              {gallery.items.map((item, idx) => (
                <GalleryItemRow key={idx} item={item} isFirst={idx === 0} isLast={idx === gallery.items.length - 1}
                  onChange={(updated) => setGallery((g) => { const items = [...g.items]; items[idx] = updated; return { ...g, items } })}
                  onRemove={() => removeGalleryItem(idx)}
                  onMove={(dir) => moveGalleryItem(idx, dir)}
                />
              ))}
            </div>
            <button type="button" onClick={() => setGalleryPickerOpen(true)}
              className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
              + Bilder hinzufügen
            </button>
          </div>
          {galleryPickerOpen && (
            <ImagePicker
              selected={gallery.items.map((i) => i.image_id).filter((id): id is string => Boolean(id))}
              multiple={true}
              onConfirm={(imgs) => {
                const existing = new Set(gallery.items.map((i) => i.image_id))
                const newItems = imgs
                  .filter((img) => !existing.has(img.id))
                  .map((img, i) => ({
                    id: '',
                    gallery_id: '',
                    image_id: img.id,
                    image: img,
                    alt_text: img.alt_text ?? '',
                    caption: img.caption ?? '',
                    tags: img.tags ?? [],
                    order_index: gallery.items.length + i,
                  }))
                setGallery((g) => ({ ...g, items: [...g.items, ...newItems] }))
                setGalleryPickerOpen(false)
              }}
              onClose={() => setGalleryPickerOpen(false)}
            />
          )}
        </>
      )}

      <button type="button" onClick={save} disabled={saving || !label.trim()}
        className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
        {saving ? 'Speichern…' : existing ? 'Änderungen speichern' : 'Block erstellen'}
      </button>
    </div>
  )
}
