'use client'

import { useState } from 'react'
import { Type, AlignLeft, ImageIcon, LayoutGrid, X, GripVertical } from 'lucide-react'
import type { ContentBlockType, ContentBlockFull, BlockGalleryItem, ImageEntry } from '@/types'

export const TYPE_META: Record<ContentBlockType, { label: string; icon: typeof Type; color: string }> = {
  headline: { label: 'Überschrift', icon: Type, color: 'bg-violet-100 text-violet-700' },
  text: { label: 'Text', icon: AlignLeft, color: 'bg-blue-100   text-blue-700' },
  image: { label: 'Bild', icon: ImageIcon, color: 'bg-green-100  text-green-700' },
  gallery: { label: 'Galerie', icon: LayoutGrid, color: 'bg-orange-100 text-orange-700' },
}

export function TypeBadge({ type }: { type: ContentBlockType }) {
  const { label, icon: Icon, color } = TYPE_META[type]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  )
}

export function BlockPreview({ block }: { block: ContentBlockFull }) {
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

export function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
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

export function GalleryItemRow({
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
