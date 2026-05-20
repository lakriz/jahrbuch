'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Plus, Search, X, ChevronUp, ChevronDown, Link2Off, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PAGE_TEMPLATES } from '@/lib/templates'
import { TypeBadge, BlockPreview } from '@/components/BlockFormShared'
import BlockForm from '@/components/BlockForm'
import type { Page, ContentBlockFull, ContentBlockType, PageBlockRef } from '@/types'

type PageBlockRow = {
  order_index: number
  content_blocks: ContentBlockFull | ContentBlockFull[] | null
}

function PageBlockCard({
  block,
  isFirst,
  isLast,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  block: ContentBlockFull & { ref_order: number }
  isFirst: boolean
  isLast: boolean
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <TypeBadge type={block.type} />
          <span className="font-medium text-sm text-gray-900 truncate">{block.label}</span>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="p-1.5 text-gray-300 hover:text-gray-700 disabled:opacity-20 rounded-lg">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="p-1.5 text-gray-300 hover:text-gray-700 disabled:opacity-20 rounded-lg">
            <ChevronDown className="w-4 h-4" />
          </button>
          <button onClick={onRemove} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Link2Off className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <BlockPreview block={block} />
    </div>
  )
}

export default function PageEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [page, setPage] = useState<Page | null>(null)
  const [pageBlocks, setPageBlocks] = useState<(ContentBlockFull & { ref_order: number })[]>([])
  const [allBlocks, setAllBlocks] = useState<ContentBlockFull[]>([])
  const [panel, setPanel] = useState<'none' | 'create' | 'pick'>('none')
  const [pickSearch, setPickSearch] = useState('')
  const [pickType, setPickType] = useState<ContentBlockType | 'all'>('all')
  const [loading, setLoading] = useState(true)

  const fetchPage = useCallback(async (pageId: string) => {
    const { data } = await supabase.from('pages').select('*').eq('id', pageId).single()
    return (data as Page) ?? null
  }, [])

  const fetchPageBlocks = useCallback(async (pageId: string) => {
    const { data } = await supabase
      .from('page_block_refs')
      .select(`
        order_index,
        content_blocks(
          *,
          block_headlines(*),
          block_texts(*),
          block_images(*, images(*)),
          block_galleries(*, block_gallery_items(*, images(*)))
        )
      `)
      .eq('page_id', pageId)
      .order('order_index')
    return ((data ?? []) as unknown as PageBlockRow[]).flatMap((row) => {
      const block = Array.isArray(row.content_blocks) ? row.content_blocks[0] : row.content_blocks
      return block ? [{ ...block, ref_order: row.order_index }] : []
    })
  }, [])

  const fetchAllBlocks = useCallback(async () => {
    const { data } = await supabase
      .from('content_blocks')
      .select('*, block_headlines(*), block_texts(*), block_images(*, images(*)), block_galleries(*, block_gallery_items(*, images(*)))')
      .order('created_at', { ascending: false })
    return (data as ContentBlockFull[]) ?? []
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const load = async () => {
      const [pageData, pageBlockData, allBlockData] = await Promise.all([
        fetchPage(id),
        fetchPageBlocks(id),
        fetchAllBlocks(),
      ])
      if (cancelled) return
      setPage(pageData)
      setPageBlocks(pageBlockData)
      setAllBlocks(allBlockData)
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [fetchAllBlocks, fetchPage, fetchPageBlocks, id])

  const nextOrderIndex = useCallback(() => {
    if (pageBlocks.length === 0) return 0
    return Math.max(...pageBlocks.map((block) => block.ref_order)) + 1
  }, [pageBlocks])

  const addExistingBlock = useCallback(async (blockId: string) => {
    if (!id) return
    const ref: PageBlockRef = { page_id: id, block_id: blockId, order_index: nextOrderIndex() }
    await supabase.from('page_block_refs').insert(ref)
    setPageBlocks(await fetchPageBlocks(id))
  }, [fetchPageBlocks, id, nextOrderIndex])

  const removeBlock = useCallback(async (blockId: string) => {
    if (!id) return
    await supabase.from('page_block_refs').delete().eq('page_id', id).eq('block_id', blockId)
    setPageBlocks((current) => current.filter((block) => block.id !== blockId))
  }, [id])

  const moveBlock = useCallback(async (blockId: string, dir: -1 | 1) => {
    if (!id) return
    const currentIndex = pageBlocks.findIndex((block) => block.id === blockId)
    const targetIndex = currentIndex + dir
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= pageBlocks.length) return

    const current = pageBlocks[currentIndex]
    const target = pageBlocks[targetIndex]
    const tempOrder = -Date.now()

    await supabase.from('page_block_refs').update({ order_index: tempOrder }).eq('page_id', id).eq('block_id', current.id)
    await supabase.from('page_block_refs').update({ order_index: current.ref_order }).eq('page_id', id).eq('block_id', target.id)
    await supabase.from('page_block_refs').update({ order_index: target.ref_order }).eq('page_id', id).eq('block_id', current.id)
    setPageBlocks(await fetchPageBlocks(id))
  }, [fetchPageBlocks, id, pageBlocks])

  const onBlockCreated = useCallback(async (blockId: string) => {
    if (!id) return
    const ref: PageBlockRef = { page_id: id, block_id: blockId, order_index: nextOrderIndex() }
    await supabase.from('page_block_refs').insert(ref)
    const [pageBlockData, allBlockData] = await Promise.all([fetchPageBlocks(id), fetchAllBlocks()])
    setPageBlocks(pageBlockData)
    setAllBlocks(allBlockData)
    setPanel('none')
  }, [fetchAllBlocks, fetchPageBlocks, id, nextOrderIndex])

  const linkedIds = useMemo(() => new Set(pageBlocks.map((block) => block.id)), [pageBlocks])
  const pickerBlocks = useMemo(() => {
    return allBlocks.filter((block) => {
      if (linkedIds.has(block.id)) return false
      if (pickType !== 'all' && block.type !== pickType) return false
      if (pickSearch && !block.label.toLowerCase().includes(pickSearch.toLowerCase())) return false
      return true
    })
  }, [allBlocks, linkedIds, pickSearch, pickType])

  const pageTypeLabel = page ? PAGE_TEMPLATES.find((template) => template.type === page.type)?.label ?? page.type : ''

  if (loading) return <div className="p-8 text-gray-500">Laden…</div>
  if (!page) return <div className="p-8 text-gray-500">Seite nicht gefunden.</div>

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200 bg-white flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/pages" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm text-gray-400">Seiten</span>
          <span className="text-gray-300">|</span>
          <h1 className="text-xl font-bold text-gray-900 truncate">{page.title}</h1>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{pageTypeLabel}</span>
        </div>
        <Link href={`/pages/${page.id}/preview`} className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-black transition-colors">
          Vorschau
        </Link>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Blöcke auf dieser Seite</h2>
            <p className="text-sm text-gray-500">Verknüpfte Contentblöcke können hier sortiert und entfernt werden.</p>
          </div>

          {pageBlocks.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400 bg-white">
              <Plus className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Noch keine Blöcke mit dieser Seite verknüpft.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pageBlocks.map((block, index) => (
                <PageBlockCard
                  key={block.id}
                  block={block}
                  isFirst={index === 0}
                  isLast={index === pageBlocks.length - 1}
                  onRemove={() => removeBlock(block.id)}
                  onMoveUp={() => moveBlock(block.id, -1)}
                  onMoveDown={() => moveBlock(block.id, 1)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="w-full lg:w-80 lg:border-l lg:border-gray-200 lg:pl-6">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden sticky top-6">
            <div className="p-4 border-b border-gray-100 space-y-2">
              <button
                onClick={() => setPanel((current) => current === 'pick' ? 'none' : 'pick')}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Vorhandenen Block hinzufügen
              </button>
              <button
                onClick={() => setPanel((current) => current === 'create' ? 'none' : 'create')}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" /> Neuen Block erstellen
              </button>
            </div>

            {panel === 'pick' && (
              <div className="flex flex-col max-h-[70vh]">
                <div className="p-4 border-b border-gray-100 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">Block auswählen</h3>
                    <button onClick={() => setPanel('none')} className="text-gray-400 hover:text-gray-700 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      value={pickSearch}
                      onChange={(e) => setPickSearch(e.target.value)}
                      placeholder="Blockname suchen…"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'headline', 'text', 'image', 'gallery'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setPickType(type)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          pickType === type
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'border-gray-200 text-gray-500 hover:border-gray-400'
                        }`}
                      >
                        {type === 'all' ? 'Alle' : type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {pickerBlocks.map((block) => (
                    <div key={block.id} className="border border-gray-200 rounded-xl p-3 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <TypeBadge type={block.type} />
                          <p className="mt-2 text-sm font-medium text-gray-900 truncate">{block.label}</p>
                        </div>
                        <button
                          onClick={() => addExistingBlock(block.id)}
                          className="flex-shrink-0 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          + Hinzufügen
                        </button>
                      </div>
                      <BlockPreview block={block} />
                    </div>
                  ))}
                  {pickerBlocks.length === 0 && (
                    <div className="text-sm text-center text-gray-400 py-10">Keine passenden Blöcke verfügbar.</div>
                  )}
                </div>
              </div>
            )}

            {panel === 'create' && (
              <div className="flex flex-col max-h-[70vh]">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">Neuer Block</h3>
                  <button onClick={() => setPanel('none')} className="text-gray-400 hover:text-gray-700 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-y-auto p-4">
                  <BlockForm existing={null} onSaved={onBlockCreated} />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
