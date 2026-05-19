import { supabase } from '@/lib/supabase'
import type { Block, Page } from '@/types'
import { notFound } from 'next/navigation'

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading':
      return <div className={`font-bold mb-2 ${block.level === 1 ? 'text-3xl' : block.level === 2 ? 'text-2xl' : 'text-xl'}`}>{block.content}</div>
    case 'text':
      return <p className="text-sm leading-relaxed mb-4 whitespace-pre-wrap">{block.content}</p>
    case 'photo_single':
      return (
        <figure className="mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.src} alt={block.caption ?? ''} className="w-full rounded-lg" />
          {block.caption && <figcaption className="text-xs text-gray-500 mt-1">{block.caption}</figcaption>}
        </figure>
      )
    case 'photo_grid': {
      const cols = block.columns ?? 3
      const gridClass = cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3'
      return (
        <div className={`grid ${gridClass} gap-2 mb-4`}>
          {block.items.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="w-full aspect-square object-cover rounded" />
          ))}
        </div>
      )
    }
  }
}

export default async function PagePreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await supabase.from('pages').select('*').eq('id', id).single()
  if (!data) notFound()
  const pg = data as Page

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <a href="/pages" className="text-sm text-gray-400 hover:text-gray-600">← Zurück</a>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-medium text-gray-700">Vorschau: {pg.title}</span>
      </div>

      {/* A4 preview */}
      <div className="w-[210mm] min-h-[297mm] bg-white shadow-lg border border-gray-200 p-[20mm] mx-auto">
        {pg.blocks.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
      </div>
    </div>
  )
}
