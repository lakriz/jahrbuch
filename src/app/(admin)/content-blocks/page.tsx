'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  ContentBlockFull, ContentBlockType,
  BlockHeadline, BlockText, BlockImage, BlockGallery, BlockGalleryItem,
  ImageEntry,
} from '@/types'
import {
  Plus, Trash2, Pencil, ArrowLeft, Type, AlignLeft,
  ImageIcon, LayoutGrid, Link2, X, GripVertical,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const ImagePicker = dynamic(() => import('@/components/ImagePicker'), { ssr: false })

// ── helpers ────────────────────────────────────────────────────────────────

const TYPE_META: Record<ContentBlockType, { label: string; icon: React.ElementType; color: string }> = {
  headline: { label: 'Überschrift', icon: Type,        color: 'bg-violet-100 text-violet-700' },
  text:     { label: 'Text',        icon: AlignLeft,   color: 'bg-blue-100   text-blue-700'   },
  image:    { label: 'Bild',        icon: ImageIcon,   color: 'bg-green-100  text-green-700'  },
  gallery:  { label: 'Galerie',     icon: LayoutGrid,  color: 'bg-orange-100 text-orange-700' },
}

function TypeBadge({ type }: { type: ContentBlockType }) {
  const { label, icon: Icon, color } = TYPE_META[type]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  )
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')
  const add = () => {
    const t = input.trim().toLowerCase()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))}>
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Tag hinzufügen…"
          className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button type="button" onClick={add}
          className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1.5 rounded-lg transition-colors">
          +
        </button>
      </div>
    </div>
  )
}

// ── Fetch all blocks ───────────────────────────────────────────────────────

async function fetchBlocks(): Promise<ContentBlockFull[]> {
  const { data } = await supabase
    .from('content_blocks')
    .select(`
      *,
      block_headlines(*),
      block_texts(*),
      block_images(*, images(*)),
      block_galleries(*, block_gallery_items(*, images(*))),
      page_block_refs(page_id, pages(id, title))
    `)
    .order('created_at', { ascending: false })
  return (data as ContentBlockFull[]) ?? []
}

// ── Main page ──────────────────────────────────────────────────────────────

type View = 'list' | 'create' | 'edit'

export default function ContentBlocksPage() {
  const [blocks, setBlocks] = useState<ContentBlockFull[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [activeBlock, setActiveBlock] = useState<ContentBlockFull | null>(null)
  const [filterType, setFilterType] = useState<ContentBlockType | 'all'>('all')

  const reload = useCallback(() =>
    fetchBlocks().then((data) => { setBlocks(data); setLoading(false) }), [])

  useEffect(() => { reload() }, [reload])

  const openCreate = () => { setActiveBlock(null); setView('create') }
  const openEdit = (b: ContentBlockFull) => { setActiveBlock(b); setView('edit') }
  const closePanel = () => { setView('list'); setActiveBlock(null); reload() }

  const remove = async (id: string) => {
    await supabase.from('content_blocks').delete().eq('id', id)
    setBlocks((p) => p.filter((b) => b.id !== id))
  }

  const filtered = filterType === 'all' ? blocks : blocks.filter((b) => b.type === filterType)

  if (loading) return <div className="p-8 text-gray-500">Laden…</div>

  return (
    <div className="flex h-full min-h-screen">

      {/* ── List panel ──────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${view !== 'list' ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-6 border-b border-gray-200 bg-white flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-900 flex-shrink-0">Contentblöcke</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'headline', 'text', 'image', 'gallery'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  filterType === t
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                {t === 'all' ? 'Alle' : TYPE_META[t].label}
              </button>
            ))}
          </div>
          <button
            onClick={openCreate}
            className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Neuer Block
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filtered.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              onEdit={() => openEdit(block)}
              onDelete={() => remove(block.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
              <Plus className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Noch keine Blöcke – erstelle den ersten.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit panel ──────────────────────────────── */}
      {(view === 'create' || view === 'edit') && (
        <div className="w-full lg:w-[480px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <button onClick={closePanel} className="text-gray-400 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold text-gray-900">
              {view === 'create' ? 'Neuer Block' : 'Block bearbeiten'}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <BlockForm
              existing={activeBlock}
              onSaved={closePanel}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Block card ─────────────────────────────────────────────────────────────

function BlockCard({
  block, onEdit, onDelete,
}: {
  block: ContentBlockFull
  onEdit: () => void
  onDelete: () => void
}) {
  const refs = block.page_block_refs ?? []

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <TypeBadge type={block.type} />
          <span className="font-medium text-gray-900 text-sm truncate">{block.label}</span>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview */}
      <BlockPreview block={block} />

      {/* Bidirectional refs */}
      {refs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
          <Link2 className="w-3 h-3 text-gray-300 flex-shrink-0" />
          {refs.map((r) => (
            <span key={r.page_id} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {r.pages?.title ?? r.page_id}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function BlockPreview({ block }: { block: ContentBlockFull }) {
  if (block.type === 'headline' && block.block_headlines) {
    const lvl = block.block_headlines.level
    const sizes = ['text-xl font-bold', 'text-lg font-semibold', 'text-base font-semibold']
    return <p className={`text-gray-700 truncate ${sizes[lvl - 1]}`}>{block.block_headlines.content || '—'}</p>
  }
  if (block.type === 'text' && block.block_texts) {
    return <p className="text-gray-500 text-sm line-clamp-2">{block.block_texts.content || '—'}</p>
  }
  if (block.type === 'image' && block.block_images?.images) {
    const img = block.block_images.images
    return (
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.public_url} alt={block.block_images.alt_text || img.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-gray-500 truncate">{block.block_images.alt_text || img.name}</p>
          {block.block_images.caption && <p className="text-xs text-gray-400 truncate">{block.block_images.caption}</p>}
          {block.block_images.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {block.block_images.tags.map((t) => (
                <span key={t} className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
  if (block.type === 'gallery' && block.block_galleries) {
    const items = block.block_galleries.block_gallery_items ?? []
    return (
      <div className="flex gap-1.5 flex-wrap">
        {items.slice(0, 6).map((item) => item.images && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.id} src={item.images.public_url} alt={item.alt_text} className="w-12 h-12 rounded-lg object-cover" />
        ))}
        {items.length > 6 && (
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400">
            +{items.length - 6}
          </div>
        )}
        {items.length === 0 && <span className="text-sm text-gray-400">Noch keine Bilder.</span>}
      </div>
    )
  }
  return null
}

// ── Block form (create + edit) ──────────────────────────────────────────────

type HeadlineForm  = { content: string; level: 1 | 2 | 3 }
type TextForm      = { content: string }
type ImageForm     = { image_id: string | null; image?: ImageEntry | null; alt_text: string; caption: string; tags: string[] }
type GalleryForm   = { columns: 2 | 3 | 4; items: (BlockGalleryItem & { image?: ImageEntry | null })[] }

function BlockForm({ existing, onSaved }: { existing: ContentBlockFull | null; onSaved: () => void }) {
  const [label, setLabel] = useState(existing?.label ?? '')
  const [type, setType] = useState<ContentBlockType>(existing?.type ?? 'headline')
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false)

  const [headline, setHeadline] = useState<HeadlineForm>({
    content: existing?.block_headlines?.content ?? '',
    level:   (existing?.block_headlines?.level as 1|2|3) ?? 1,
  })
  const [text, setText] = useState<TextForm>({
    content: existing?.block_texts?.content ?? '',
  })
  const [image, setImage] = useState<ImageForm>({
    image_id: existing?.block_images?.image_id ?? null,
    image:    existing?.block_images?.images ?? null,
    alt_text: existing?.block_images?.alt_text ?? '',
    caption:  existing?.block_images?.caption ?? '',
    tags:     existing?.block_images?.tags ?? [],
  })
  const [gallery, setGallery] = useState<GalleryForm>({
    columns: (existing?.block_galleries?.columns as 2|3|4) ?? 3,
    items:   existing?.block_galleries?.block_gallery_items?.map((i) => ({ ...i, image: i.images })) ?? [],
  })

  const save = async () => {
    if (!label.trim()) return
    setSaving(true)

    let blockId = existing?.id ?? null

    if (!blockId) {
      // Create base record
      const { data } = await supabase.from('content_blocks').insert({ type, label }).select().single()
      if (!data) { setSaving(false); return }
      blockId = data.id
    } else {
      await supabase.from('content_blocks').update({ label }).eq('id', blockId)
    }

    // Upsert type-specific data
    if (type === 'headline') {
      await supabase.from('block_headlines').upsert({ block_id: blockId, ...headline })
    } else if (type === 'text') {
      await supabase.from('block_texts').upsert({ block_id: blockId, ...text })
    } else if (type === 'image') {
      await supabase.from('block_images').upsert({
        block_id: blockId,
        image_id: image.image_id,
        alt_text: image.alt_text,
        caption:  image.caption,
        tags:     image.tags,
      })
    } else if (type === 'gallery') {
      await supabase.from('block_galleries').upsert({ block_id: blockId, columns: gallery.columns })
      // Replace gallery items
      await supabase.from('block_gallery_items').delete().eq('gallery_id', blockId)
      if (gallery.items.length > 0) {
        await supabase.from('block_gallery_items').insert(
          gallery.items.map((item, i) => ({
            gallery_id:  blockId,
            image_id:    item.image_id,
            alt_text:    item.alt_text,
            caption:     item.caption,
            tags:        item.tags,
            order_index: i,
          }))
        )
      }
    }

    setSaving(false)
    onSaved()
  }

  const removeGalleryItem = (idx: number) =>
    setGallery((g) => ({ ...g, items: g.items.filter((_, i) => i !== idx) }))

  const moveGalleryItem = (idx: number, dir: -1 | 1) =>
    setGallery((g) => {
      const items = [...g.items]
      const next = idx + dir
      if (next < 0 || next >= items.length) return g;
      [items[idx], items[next]] = [items[next], items[idx]]
      return { ...g, items }
    })

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="space-y-5">
      {/* Label */}
      <div>
        <label className={labelCls}>Interner Name *</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Titelseite Überschrift" className={inputCls} />
      </div>

      {/* Type (only when creating) */}
      {!existing && (
        <div>
          <label className={labelCls}>Typ</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TYPE_META) as ContentBlockType[]).map((t) => {
              const { label: tl, icon: Icon, color } = TYPE_META[t]
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
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

      {/* ── Headline ─────────────────────────────────────────── */}
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
                <button
                  key={l}
                  type="button"
                  onClick={() => setHeadline((h) => ({ ...h, level: l }))}
                  className={`px-4 py-1.5 rounded-lg border text-sm font-bold transition-colors ${
                    headline.level === l ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  H{l}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Text ─────────────────────────────────────────────── */}
      {type === 'text' && (
        <div>
          <label className={labelCls}>Inhalt</label>
          <textarea
            value={text.content}
            onChange={(e) => setText({ content: e.target.value })}
            rows={6}
            placeholder="Text…"
            className={inputCls}
          />
        </div>
      )}

      {/* ── Image ────────────────────────────────────────────── */}
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
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
            >
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

      {/* ── Gallery ──────────────────────────────────────────── */}
      {type === 'gallery' && (
        <>
          <div>
            <label className={labelCls}>Spalten</label>
            <div className="flex gap-2">
              {([2, 3, 4] as const).map((c) => (
                <button key={c} type="button"
                  onClick={() => setGallery((g) => ({ ...g, columns: c }))}
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
                <GalleryItemRow
                  key={idx}
                  item={item}
                  isFirst={idx === 0}
                  isLast={idx === gallery.items.length - 1}
                  onChange={(updated) => setGallery((g) => {
                    const items = [...g.items]; items[idx] = updated; return { ...g, items }
                  })}
                  onRemove={() => removeGalleryItem(idx)}
                  onMove={(dir) => moveGalleryItem(idx, dir)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setGalleryPickerOpen(true)}
              className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
            >
              + Bilder hinzufügen
            </button>
          </div>
          {galleryPickerOpen && (
            <ImagePicker
              selected={gallery.items.map((i) => i.image_id ?? '').filter(Boolean)}
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

      <button
        type="button"
        onClick={save}
        disabled={saving || !label.trim()}
        className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
      >
        {saving ? 'Speichern…' : existing ? 'Änderungen speichern' : 'Block erstellen'}
      </button>
    </div>
  )
}

// ── Gallery item row ────────────────────────────────────────────────────────

function GalleryItemRow({
  item, isFirst, isLast, onChange, onRemove, onMove,
}: {
  item: BlockGalleryItem & { image?: ImageEntry | null }
  isFirst: boolean; isLast: boolean
  onChange: (i: BlockGalleryItem & { image?: ImageEntry | null }) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const [open, setOpen] = useState(false)
  const inputCls = 'w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-2">
        <div className="flex flex-col">
          <button type="button" disabled={isFirst} onClick={() => onMove(-1)}
            className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors text-xs">▲</button>
          <button type="button" disabled={isLast} onClick={() => onMove(1)}
            className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors text-xs">▼</button>
        </div>
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image.public_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-600 truncate">{item.image?.name ?? '—'}</p>
          {item.alt_text && <p className="text-xs text-gray-400 truncate">{item.alt_text}</p>}
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)}
          className="text-gray-400 hover:text-blue-500 transition-colors p-1">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors p-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {open && (
        <div className="border-t border-gray-100 p-3 space-y-2 bg-gray-50">
          <input value={item.alt_text} onChange={(e) => onChange({ ...item, alt_text: e.target.value })}
            placeholder="Alt-Text *" className={inputCls} />
          <input value={item.caption} onChange={(e) => onChange({ ...item, caption: e.target.value })}
            placeholder="Caption" className={inputCls} />
          <TagInput tags={item.tags} onChange={(t) => onChange({ ...item, tags: t })} />
        </div>
      )}
    </div>
  )
}
