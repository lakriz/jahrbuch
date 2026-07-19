import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getPageBlocks } from '@/lib/pageBlocks'

function parsePage(row: Record<string, unknown>) {
  return { ...row, blocks: getPageBlocks(row.id as string) }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = db.prepare('SELECT * FROM pages WHERE id = ?').get(id)
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(parsePage(row as Record<string, unknown>))
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json() as { order_index?: number }
  if (body.order_index !== undefined) {
    db.prepare('UPDATE pages SET order_index = ? WHERE id = ?').run(body.order_index, id)
  }
  const row = db.prepare('SELECT * FROM pages WHERE id = ?').get(id)
  return NextResponse.json(parsePage(row as Record<string, unknown>))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  db.prepare('DELETE FROM pages WHERE id = ?').run(id)
  return new NextResponse(null, { status: 204 })
}
