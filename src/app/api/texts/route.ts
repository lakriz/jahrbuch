import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const showDeleted = request.nextUrl.searchParams.get('deleted') === 'true'
    const deletedCond = showDeleted ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL'
    
    const rows = db.prepare(`SELECT * FROM texts WHERE ${deletedCond} ORDER BY created_at DESC`).all() as Record<string, unknown>[]
    return NextResponse.json(rows.map(parseText))
  } catch (err) {
    console.error('[Texts GET]', err)
    return NextResponse.json({ error: 'Failed to fetch texts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      title: string
      content: string
      tags?: string[]
    }

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 })
    }

    const id = crypto.randomUUID()
    db.prepare(`
      INSERT INTO texts (id, title, content, tags)
      VALUES (?, ?, ?, ?)
    `).run(
      id,
      body.title.trim(),
      body.content || '',
      JSON.stringify(body.tags ?? [])
    )

    const row = db.prepare('SELECT * FROM texts WHERE id = ?').get(id)
    return NextResponse.json(parseText(row as Record<string, unknown>), { status: 201 })
  } catch (err) {
    console.error('[Texts POST]', err)
    return NextResponse.json({ error: 'Failed to create text' }, { status: 500 })
  }
}

function parseText(row: Record<string, unknown>) {
  return { ...row, tags: JSON.parse((row.tags as string) || '[]') }
}
