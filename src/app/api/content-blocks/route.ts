import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { buildFullBlock } from './shared'

export async function GET() {
  const blocks = db.prepare('SELECT * FROM content_blocks ORDER BY created_at DESC').all()
  return NextResponse.json(blocks.map((b) => buildFullBlock(b as Record<string, unknown>)))
}

export async function POST(request: NextRequest) {
  const { type, label } = await request.json() as { type: string; label: string }
  if (!label?.trim()) return NextResponse.json({ error: 'label required' }, { status: 400 })
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO content_blocks (id, type, label) VALUES (?, ?, ?)').run(id, type, label.trim())
  const row = db.prepare('SELECT * FROM content_blocks WHERE id = ?').get(id)
  return NextResponse.json(buildFullBlock(row as Record<string, unknown>), { status: 201 })
}
