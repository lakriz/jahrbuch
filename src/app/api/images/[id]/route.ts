import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import path from 'path'
import fs from 'fs'
import { UPLOADS_DIR } from '@/lib/paths'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json() as {
      name?: string
      alt_text?: string
      caption?: string
      tags?: string[]
      album_id?: string | null
    }

    const fields: string[] = []
    const values: any[] = []

    if (body.name !== undefined) {
      fields.push('name = ?')
      values.push(body.name)
    }
    if (body.alt_text !== undefined) {
      fields.push('alt_text = ?')
      values.push(body.alt_text)
    }
    if (body.caption !== undefined) {
      fields.push('caption = ?')
      values.push(body.caption)
    }
    if (body.tags !== undefined) {
      fields.push('tags = ?')
      values.push(JSON.stringify(body.tags))
    }
    if (body.album_id !== undefined) {
      fields.push('album_id = ?')
      values.push(body.album_id)
    }

    if (fields.length > 0) {
      values.push(id)
      db.prepare(`UPDATE images SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    const row = db.prepare('SELECT * FROM images WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
    
    return NextResponse.json({
      ...row,
      tags: JSON.parse((row.tags as string) || '[]')
    })
  } catch (err) {
    console.error('[Update Image Error]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = db.prepare('SELECT storage_path, thumbnail_path FROM images WHERE id = ?').get(id) as
    | { storage_path: string; thumbnail_path: string | null }
    | undefined

  if (row) {
    for (const p of [row.storage_path, row.thumbnail_path].filter(Boolean)) {
      const abs = path.resolve(UPLOADS_DIR, p as string)
      if (!abs.startsWith(UPLOADS_DIR + path.sep)) continue
      try { fs.unlinkSync(abs) } catch { /* already gone */ }
    }
    db.prepare('DELETE FROM images WHERE id = ?').run(id)
  }

  return new NextResponse(null, { status: 204 })
}
