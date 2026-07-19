import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { UPLOADS_DIR } from '@/lib/paths'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json() as { angle?: number }
    const angle = body.angle || 90 // Standardmäßig 90 Grad im Uhrzeigersinn

    const row = db.prepare('SELECT * FROM images WHERE id = ?').get(id) as Record<string, any> | undefined
    if (!row) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

    const fullPath = path.resolve(UPLOADS_DIR, row.storage_path)
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Image file not found on disk' }, { status: 404 })
    }

    const buffer = fs.readFileSync(fullPath)
    
    // Rotation ausführen
    const rotated = await sharp(buffer)
      .rotate(angle)
      .toBuffer()

    // Neue Dimensionen auslesen
    const metadata = await sharp(rotated).metadata()
    const width = metadata.width ?? 0
    const height = metadata.height ?? 0
    const fileSize = rotated.length

    // Überschreiben
    fs.writeFileSync(fullPath, rotated)

    // Previews neu generieren
    const folder = row.storage_path.split('/')[0] || 'allgemein'
    const filename = row.storage_path.split('/').pop()?.split('.')[0] || id

    let thumb_200_path = row.thumb_200_path
    let thumb_400_path = row.thumb_400_path
    let thumb_800_path = row.thumb_800_path

    try {
      // 200x200 Square Crop
      const t200 = await sharp(rotated)
        .resize(200, 200, { fit: 'cover', position: 'center' })
        .webp({ quality: 80 })
        .toBuffer()
      thumb_200_path = `${folder}/${filename}_200.webp`
      fs.writeFileSync(path.join(UPLOADS_DIR, thumb_200_path), t200)

      // 400x400 Aspect Scale
      const t400 = await sharp(rotated)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      thumb_400_path = `${folder}/${filename}_400.webp`
      fs.writeFileSync(path.join(UPLOADS_DIR, thumb_400_path), t400)

      // 800x800 Aspect Scale
      const t800 = await sharp(rotated)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      thumb_800_path = `${folder}/${filename}_800.webp`
      fs.writeFileSync(path.join(UPLOADS_DIR, thumb_800_path), t800)
    } catch (thumbErr) {
      console.warn('[rotate] Previews failed:', thumbErr)
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
      width,
      height,
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
    console.error('[Rotate Image Error]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
