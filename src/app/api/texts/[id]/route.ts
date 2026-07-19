import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const row = db.prepare('SELECT * FROM texts WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!row) return NextResponse.json({ error: 'Text not found' }, { status: 404 })
    return NextResponse.json(parseText(row))
  } catch (err) {
    console.error('[Text GET ID]', err)
    return NextResponse.json({ error: 'Failed to fetch text' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json() as {
      title?: string
      content?: string
      tags?: string[]
    }

    const fields: string[] = []
    const values: any[] = []

    if (body.title !== undefined) {
      fields.push('title = ?')
      values.push(body.title.trim())
    }
    if (body.content !== undefined) {
      fields.push('content = ?')
      values.push(body.content)
    }
    if (body.tags !== undefined) {
      fields.push('tags = ?')
      values.push(JSON.stringify(body.tags))
    }

    if (fields.length > 0) {
      values.push(id)
      db.prepare(`UPDATE texts SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    const row = db.prepare('SELECT * FROM texts WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!row) return NextResponse.json({ error: 'Text not found' }, { status: 404 })
    return NextResponse.json(parseText(row))
  } catch (err) {
    console.error('[Text PUT ID]', err)
    return NextResponse.json({ error: 'Failed to update text' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const permanent = request.nextUrl.searchParams.get('permanent') === 'true'

    const row = db.prepare('SELECT id FROM texts WHERE id = ?').get(id)
    if (!row) return new NextResponse(null, { status: 404 })

    if (permanent) {
      db.prepare('DELETE FROM texts WHERE id = ?').run(id)
    } else {
      db.prepare("UPDATE texts SET deleted_at = datetime('now') WHERE id = ?").run(id)
    }

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[Text DELETE ID]', err)
    return NextResponse.json({ error: 'Failed to delete text' }, { status: 500 })
  }
}

function parseText(row: Record<string, unknown>) {
  return { ...row, tags: JSON.parse((row.tags as string) || '[]') }
}
