import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const rows = db.prepare('SELECT * FROM classes ORDER BY name').all()
  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const { name } = await request.json() as { name: string }
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO classes (id, name) VALUES (?, ?)').run(id, name.trim())
  const row = db.prepare('SELECT * FROM classes WHERE id = ?').get(id)
  return NextResponse.json(row, { status: 201 })
}
