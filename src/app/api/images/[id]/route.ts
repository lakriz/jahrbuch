import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import path from 'path'
import fs from 'fs'
import { UPLOADS_DIR } from '@/lib/paths'

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
