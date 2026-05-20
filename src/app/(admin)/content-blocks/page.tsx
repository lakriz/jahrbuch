'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ContentBlockFull, ContentBlockType } from '@/types'
import { Plus, Trash2, Pencil, ArrowLeft, Link2 } from 'lucide-react'
import { TYPE_META, TypeBadge, BlockPreview } from '@/components/BlockFormShared'
import BlockForm from '@/components/BlockForm'

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
              onSaved={() => closePanel()}
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

