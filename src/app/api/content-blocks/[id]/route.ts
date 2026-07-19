import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { buildFullBlock } from '../shared'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = db.prepare('SELECT * FROM content_blocks WHERE id = ?').get(id)
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(buildFullBlock(row as Record<string, unknown>))
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json() as {
    label?: string
    headline?: { content: string; level: number }
    text?: { content: string }
    image?: { image_id: string | null; alt_text: string; caption: string; tags: string[] }
    gallery?: { columns: number; items: Array<{ image_id: string | null; alt_text: string; caption: string; tags: string[]; order_index: number }> }
  }

  if (body.label !== undefined) {
    db.prepare('UPDATE content_blocks SET label = ? WHERE id = ?').run(body.label, id)
  }

  if (body.headline) {
    db.prepare(`
      INSERT INTO block_headlines (block_id, content, level) VALUES (?, ?, ?)
      ON CONFLICT(block_id) DO UPDATE SET content = excluded.content, level = excluded.level
    `).run(id, body.headline.content, body.headline.level)
  }

  if (body.text !== undefined) {
    db.prepare(`
      INSERT INTO block_texts (block_id, content) VALUES (?, ?)
      ON CONFLICT(block_id) DO UPDATE SET content = excluded.content
    `).run(id, body.text.content)
  }

  if (body.image !== undefined) {
    db.prepare(`
      INSERT INTO block_images (block_id, image_id, alt_text, caption, tags) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(block_id) DO UPDATE SET image_id = excluded.image_id, alt_text = excluded.alt_text, caption = excluded.caption, tags = excluded.tags
    `).run(id, body.image.image_id, body.image.alt_text, body.image.caption, JSON.stringify(body.image.tags))
  }

  if (body.gallery !== undefined) {
    db.prepare(`
      INSERT INTO block_galleries (block_id, columns) VALUES (?, ?)
      ON CONFLICT(block_id) DO UPDATE SET columns = excluded.columns
    `).run(id, body.gallery.columns)
    db.prepare('DELETE FROM block_gallery_items WHERE gallery_id = ?').run(id)
    const insertItem = db.prepare(
      'INSERT INTO block_gallery_items (id, gallery_id, image_id, alt_text, caption, tags, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    for (const item of body.gallery.items) {
      insertItem.run(crypto.randomUUID(), id, item.image_id, item.alt_text, item.caption, JSON.stringify(item.tags), item.order_index)
    }
  }

  const row = db.prepare('SELECT * FROM content_blocks WHERE id = ?').get(id)
  return NextResponse.json(buildFullBlock(row as Record<string, unknown>))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  db.prepare('DELETE FROM content_blocks WHERE id = ?').run(id)
  return new NextResponse(null, { status: 204 })
}
