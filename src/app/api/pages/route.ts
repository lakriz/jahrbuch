import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Block, PageType } from '@/types'

export async function GET() {
  const rows = db.prepare('SELECT * FROM pages ORDER BY order_index').all() as Record<string, unknown>[]
  return NextResponse.json(rows.map(parsePage))
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { title: string; type: PageType; blocks: Block[]; order_index: number }
  if (!body.title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO pages (id, type, title, blocks, order_index) VALUES (?, ?, ?, ?, ?)').run(
    id,
    body.type,
    body.title.trim(),
    JSON.stringify(body.blocks ?? []),
    body.order_index ?? 0,
  )
  const row = db.prepare('SELECT * FROM pages WHERE id = ?').get(id)
  return NextResponse.json(parsePage(row as Record<string, unknown>), { status: 201 })
}

export function parsePage(row: Record<string, unknown>) {
  return { ...row, blocks: JSON.parse((row.blocks as string) || '[]') }
}
