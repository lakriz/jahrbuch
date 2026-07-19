import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { UPLOADS_DIR } from '@/lib/paths'

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params

  const absolutePath = path.resolve(UPLOADS_DIR, ...segments)
  // Traversal-Schutz: aufgelöster Pfad muss innerhalb von UPLOADS_DIR bleiben
  if (!absolutePath.startsWith(UPLOADS_DIR + path.sep)) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }

  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const contentType = CONTENT_TYPES[path.extname(absolutePath).toLowerCase()]
  if (!contentType) {
    return NextResponse.json({ error: 'unsupported type' }, { status: 415 })
  }

  const file = fs.readFileSync(absolutePath)
  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': contentType,
      // Dateinamen sind UUIDs und ändern sich nie — aggressiv cachen
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
