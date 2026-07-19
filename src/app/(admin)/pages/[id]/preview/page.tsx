import Link from 'next/link'
import db from '@/lib/db'
import type { Block, Page, PhotoSingleBlock, TextBlock, HeadingBlock } from '@/types'
import { notFound } from 'next/navigation'
import { getFormatDef, DEFAULT_FORMAT, type BookFormat } from '@/lib/bookFormats'

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

function ClassPageView({ blocks }: { blocks: Block[] }) {
  const heading = blocks.find((b): b is HeadingBlock => b.type === 'heading')
  const photo = blocks.find((b): b is PhotoSingleBlock => b.type === 'photo_single')
  const nameList = blocks.find((b): b is TextBlock => b.type === 'text')

  return (
    <div className="h-full flex flex-col gap-6">
      {heading && <h1 className="text-3xl font-bold text-gray-900">{heading.content}</h1>}
      <div className="flex gap-6 flex-1">
        <div className="flex-[3] min-w-0">
          {photo?.src ? (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.caption ?? 'Klassenfoto'} className="w-full rounded-lg object-cover" />
              {photo.caption && <figcaption className="text-xs text-gray-500 mt-1">{photo.caption}</figcaption>}
            </figure>
          ) : (
            <div className="w-full aspect-[4/3] rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
              Gruppenfoto
            </div>
          )}
        </div>
        <div className="flex-[2] min-w-0">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Schülerinnen &amp; Schüler</h2>
          {nameList?.content ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">{nameList.content}</p>
          ) : (
            <p className="text-sm text-gray-300 italic">Namenliste…</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default async function PagePreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = db.prepare('SELECT * FROM pages WHERE id = ?').get(id) as (Record<string, unknown> & { blocks: string }) | undefined
  if (!row) notFound()

  const pg: Page = { ...row, blocks: JSON.parse(row.blocks || '[]') } as Page

  const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('book_format') as { value: string } | undefined
  const fmt = getFormatDef((settingRow ? JSON.parse(settingRow.value) : DEFAULT_FORMAT) as BookFormat)

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/pages" className="text-sm text-gray-400 hover:text-gray-600">← Zurück</Link>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-medium text-gray-700">Vorschau: {pg.title}</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{fmt.label} · {fmt.widthMm}×{fmt.heightMm} mm</span>
      </div>

      <div
        className="bg-white shadow-lg border border-gray-200 p-[20mm] mx-auto"
        style={{ width: `${fmt.widthMm}mm`, minHeight: `${fmt.heightMm}mm` }}
      >
        {pg.type === 'class_page' ? (
          <ClassPageView blocks={pg.blocks} />
        ) : (
          pg.blocks.map((block, i) => (
            <BlockView key={i} block={block} />
          ))
        )}
      </div>
    </div>
  )
}
