import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { UPLOADS_DIR } from '@/lib/paths'

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const rawFolder = (formData.get('folder') as string) || 'allgemein'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Folder normalisieren
    const folder = rawFolder.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'allgemein'

    const ext = (file.name.split('.').pop() ?? '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `Dateityp .${ext} nicht erlaubt (${[...ALLOWED_EXTENSIONS].join(', ')})` },
        { status: 400 }
      )
    }

    const folderPath = path.join(UPLOADS_DIR, folder)
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileSize = buffer.length

    // Bilderauflösung prüfen
    let width = 0
    let height = 0
    try {
      const metadata = await sharp(buffer).metadata()
      width = metadata.width ?? 0
      height = metadata.height ?? 0
    } catch (err) {
      return NextResponse.json({ error: 'Ungültiges Bildformat' }, { status: 400 })
    }

    // Mindestanforderung: maxDim >= 2400 und minDim >= 1000 (Quer- oder Hochformat)
    const maxDim = Math.max(width, height)
    const minDim = Math.min(width, height)
    if (maxDim < 2400 || minDim < 1000) {
      return NextResponse.json(
        { error: `Bildauflösung zu gering (${width}x${height}px). Für den Druck ist eine Auflösung von mindestens 2400 x 1000 Pixeln erforderlich.` },
        { status: 400 }
      )
    }

    const filename = crypto.randomUUID()
    const storagePath = `${folder}/${filename}.${ext}`

    fs.writeFileSync(path.join(UPLOADS_DIR, storagePath), buffer)

    // Previews generieren
    let thumb_200_path = ''
    let thumb_200_url = ''
    let thumb_400_path = ''
    let thumb_400_url = ''
    let thumb_800_path = ''
    let thumb_800_url = ''

    try {
      // 200x200 Square Crop
      const t200 = await sharp(buffer)
        .resize(200, 200, { fit: 'cover', position: 'center' })
        .webp({ quality: 80 })
        .toBuffer()
      thumb_200_path = `${folder}/${filename}_200.webp`
      fs.writeFileSync(path.join(UPLOADS_DIR, thumb_200_path), t200)
      thumb_200_url = `/uploads/${thumb_200_path}`

      // 400x400 Aspect Scale
      const t400 = await sharp(buffer)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      thumb_400_path = `${folder}/${filename}_400.webp`
      fs.writeFileSync(path.join(UPLOADS_DIR, thumb_400_path), t400)
      thumb_400_url = `/uploads/${thumb_400_path}`

      // 800x800 Aspect Scale
      const t800 = await sharp(buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      thumb_800_path = `${folder}/${filename}_800.webp`
      fs.writeFileSync(path.join(UPLOADS_DIR, thumb_800_path), t800)
      thumb_800_url = `/uploads/${thumb_800_path}`
    } catch (thumbErr) {
      console.warn('[upload] Previews failed:', thumbErr)
    }

    return NextResponse.json({
      storagePath,
      publicUrl: `/uploads/${storagePath}`,
      thumbnailPath: thumb_400_path || null,
      thumbnailUrl: thumb_400_url || null,
      thumb_200_path: thumb_200_path || null,
      thumb_200_url: thumb_200_url || null,
      thumb_400_path: thumb_400_path || null,
      thumb_400_url: thumb_400_url || null,
      thumb_800_path: thumb_800_path || null,
      thumb_800_url: thumb_800_url || null,
      width,
      height,
      fileSize,
      name: file.name,
    })
  } catch (error) {
    console.error('[upload]', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
