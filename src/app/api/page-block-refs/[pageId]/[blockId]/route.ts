import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ pageId: string; blockId: string }> }) {
  const { pageId, blockId } = await params
  const { order_index } = await request.json() as { order_index: number }
  db.prepare('UPDATE page_block_refs SET order_index = ? WHERE page_id = ? AND block_id = ?').run(order_index, pageId, blockId)
  return NextResponse.json({ page_id: pageId, block_id: blockId, order_index })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ pageId: string; blockId: string }> }) {
  const { pageId, blockId } = await params
  db.prepare('DELETE FROM page_block_refs WHERE page_id = ? AND block_id = ?').run(pageId, blockId)
  return new NextResponse(null, { status: 204 })
}
