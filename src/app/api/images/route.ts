import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(request: NextRequest) {
  const album = request.nextUrl.searchParams.get('album')
  let rows: Record<string, unknown>[]
  if (album === null) {
    rows = db.prepare('SELECT * FROM images WHERE album_id IS NULL ORDER BY created_at DESC').all() as Record<string, unknown>[]
  } else if (album === '__all__') {
    rows = db.prepare('SELECT * FROM images ORDER BY created_at DESC').all() as Record<string, unknown>[]
  } else {
    rows = db.prepare('SELECT * FROM images WHERE album_id = ? ORDER BY created_at DESC').all(album) as Record<string, unknown>[]
  }
  return NextResponse.json(rows.map(parseImage))
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    storage_path: string
    public_url: string
    thumbnail_url?: string | null
    thumbnail_path?: string | null
    name: string
    alt_text?: string
    caption?: string
    tags?: string[]
    album_id?: string | null
  }
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO images (id, storage_path, public_url, thumbnail_url, thumbnail_path, name, alt_text, caption, tags, album_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    body.storage_path,
    body.public_url,
    body.thumbnail_url ?? null,
    body.thumbnail_path ?? null,
    body.name,
    body.alt_text ?? '',
    body.caption ?? '',
    JSON.stringify(body.tags ?? []),
    body.album_id ?? null,
  )
  const row = db.prepare('SELECT * FROM images WHERE id = ?').get(id)
  return NextResponse.json(parseImage(row as Record<string, unknown>), { status: 201 })
}

function parseImage(row: Record<string, unknown>) {
  return { ...row, tags: JSON.parse((row.tags as string) || '[]') }
}
