'use client'

import { useState } from 'react'
import type { Page, Block, HeadingBlock, PhotoSingleBlock, TextBlock } from '@/types'
import type { BookFormatDef } from '@/lib/bookFormats'
import Link from 'next/link'

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

interface PagePreviewClientProps {
  pg: Page
  fmt: BookFormatDef
}

export default function PagePreviewClient({ pg, fmt }: PagePreviewClientProps) {
  const [zoom, setZoom] = useState<number>(0.75) // Default to 75% so A4 fits standard screen heights

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/pages" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Zurück
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">Vorschau: {pg.title}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            {fmt.label} · {fmt.widthMm}×{fmt.heightMm} mm
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-gray-100 p-1 rounded-lg">
          <span className="text-xs text-gray-500 px-2">Zoom:</span>
          {([0.5, 0.75, 1.0, 1.25] as const).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`text-xs px-2.5 py-1 rounded transition-all duration-150 ${
                zoom === z ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-950'
              }`}
            >
              {z * 100}%
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-auto border border-gray-200 bg-gray-50 p-8 rounded-2xl flex items-center justify-center min-h-[65vh]">
        <div
          style={{ width: `${fmt.widthMm * zoom}mm`, height: `${fmt.heightMm * zoom}mm` }}
          className="flex items-center justify-center transition-all duration-200"
        >
          <div
            className="bg-white shadow-2xl border border-gray-200 p-[20mm] origin-top-left transition-transform duration-200 relative overflow-hidden"
            style={{
              width: `${fmt.widthMm}mm`,
              height: `${fmt.heightMm}mm`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              flexShrink: 0,
            }}
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
      </div>
    </div>
  )
}
