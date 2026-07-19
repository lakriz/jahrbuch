import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    const row = db.prepare('SELECT id FROM images WHERE id = ?').get(id)
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })

    db.prepare('UPDATE images SET deleted_at = NULL WHERE id = ?').run(id)

    const updated = db.prepare('SELECT * FROM images WHERE id = ?').get(id) as Record<string, unknown>
    return NextResponse.json({
      ...updated,
      tags: JSON.parse((updated.tags as string) || '[]')
    })
  } catch (err) {
    console.error('[Restore Image Error]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
