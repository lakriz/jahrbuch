import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const rows = db.prepare('SELECT * FROM students ORDER BY name').all() as Record<string, unknown>[]
  return NextResponse.json(rows.map(parseStudent))
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { name: string; class_id?: string; bio_text?: string }
  if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO students (id, name, class_id, bio_text, images) VALUES (?, ?, ?, ?, ?)').run(
    id,
    body.name.trim(),
    body.class_id || null,
    body.bio_text || null,
    '[]',
  )
  const row = db.prepare('SELECT * FROM students WHERE id = ?').get(id)
  return NextResponse.json(parseStudent(row as Record<string, unknown>), { status: 201 })
}

function parseStudent(row: Record<string, unknown>) {
  return { ...row, images: JSON.parse((row.images as string) || '[]') }
}
