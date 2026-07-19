import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { UPLOADS_DIR } from '@/lib/paths'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json() as {
      left: number
      top: number
      width: number
      height: number
    }

    const { left, top, width, height } = body
    if (width <= 0 || height <= 0 || left < 0 || top < 0) {
      return NextResponse.json({ error: 'Ungültige Zuschneideparameter' }, { status: 400 })
    }

    const row = db.prepare('SELECT * FROM images WHERE id = ?').get(id) as Record<string, any> | undefined
    if (!row) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

    const fullPath = path.resolve(UPLOADS_DIR, row.storage_path)
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Image file not found on disk' }, { status: 404 })
    }

    const buffer = fs.readFileSync(fullPath)
    
    // Originalmaße ermitteln zum Schutz vor Überläufen
    const originalMetadata = await sharp(buffer).metadata()
    const origW = originalMetadata.width ?? 0
    const origH = originalMetadata.height ?? 0

    // Runde Werte und stelle sicher, dass sie innerhalb des Bildes liegen
    const safeLeft = Math.max(0, Math.min(origW - 1, Math.round(left)))
    const safeTop = Math.max(0, Math.min(origH - 1, Math.round(top)))
    const safeWidth = Math.max(1, Math.min(origW - safeLeft, Math.round(width)))
    const safeHeight = Math.max(1, Math.min(origH - safeTop, Math.round(height)))

    // Zuschneiden ausführen
    const cropped = await sharp(buffer)
      .extract({ left: safeLeft, top: safeTop, width: safeWidth, height: safeHeight })
      .toBuffer()

    const fileSize = cropped.length

    // Überschreiben
    fs.writeFileSync(fullPath, cropped)

    // Previews neu generieren
    const folder = row.storage_path.split('/')[0] || 'allgemein'
    const filename = row.storage_path.split('/').pop()?.split('.')[0] || id

    let thumb_200_path = row.thumb_200_path
    let thumb_400_path = row.thumb_400_path
    let thumb_800_path = row.thumb_800_path

    try {
      // 200x200 Square Crop
      const t200 = await sharp(cropped)
        .resize(200, 200, { fit: 'cover', position: 'center' })
        .webp({ quality: 80 })
        .toBuffer()
      thumb_200_path = `${folder}/${filename}_200.webp`
      fs.writeFileSync(path.join(UPLOADS_DIR, thumb_200_path), t200)

      // 400x400 Aspect Scale
      const t400 = await sharp(cropped)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      thumb_400_path = `${folder}/${filename}_400.webp`
      fs.writeFileSync(path.join(UPLOADS_DIR, thumb_400_path), t400)

      // 800x800 Aspect Scale
      const t800 = await sharp(cropped)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      thumb_800_path = `${folder}/${filename}_800.webp`
      fs.writeFileSync(path.join(UPLOADS_DIR, thumb_800_path), t800)
    } catch (thumbErr) {
      console.warn('[crop] Previews failed:', thumbErr)
    }

    db.prepare(`
      UPDATE images 
      SET width = ?, height = ?, file_size = ?,
          thumbnail_path = ?, thumbnail_url = ?,
          thumb_200_path = ?, thumb_200_url = ?,
          thumb_400_path = ?, thumb_400_url = ?,
          thumb_800_path = ?, thumb_800_url = ?
      WHERE id = ?
    `).run(
      safeWidth,
      safeHeight,
      fileSize,
      thumb_400_path,
      `/uploads/${thumb_400_path}`,
      thumb_200_path,
      `/uploads/${thumb_200_path}`,
      thumb_400_path,
      `/uploads/${thumb_400_path}`,
      thumb_800_path,
      `/uploads/${thumb_800_path}`,
      id
    )

    const updated = db.prepare('SELECT * FROM images WHERE id = ?').get(id) as Record<string, unknown>
    return NextResponse.json({
      ...updated,
      tags: JSON.parse((updated.tags as string) || '[]')
    })
  } catch (err) {
    console.error('[Crop Image Error]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
