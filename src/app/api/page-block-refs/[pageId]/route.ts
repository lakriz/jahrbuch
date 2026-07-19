import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { buildFullBlock } from '@/app/api/content-blocks/shared'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params
  const refs = db.prepare(`
    SELECT pbr.order_index, cb.*
    FROM page_block_refs pbr
    JOIN content_blocks cb ON pbr.block_id = cb.id
    WHERE pbr.page_id = ?
    ORDER BY pbr.order_index
  `).all(pageId) as Array<Record<string, unknown>>

  return NextResponse.json(refs.map((r) => ({
    ref_order: r.order_index,
    ...buildFullBlock(r),
  })))
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params
  const { block_id, order_index } = await request.json() as { block_id: string; order_index: number }
  db.prepare('INSERT OR IGNORE INTO page_block_refs (page_id, block_id, order_index) VALUES (?, ?, ?)').run(pageId, block_id, order_index)
  return NextResponse.json({ page_id: pageId, block_id, order_index }, { status: 201 })
}
