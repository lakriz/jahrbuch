import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { UPLOADS_DIR } from '@/lib/paths'

const THUMBNAIL_SIZE = 300
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const rawFolder = (formData.get('folder') as string) || 'allgemein'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Folder strikt auf einen einzelnen, harmlosen Pfadbestandteil normalisieren
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
    const filename = crypto.randomUUID()
    const storagePath = `${folder}/${filename}.${ext}`

    fs.writeFileSync(path.join(UPLOADS_DIR, storagePath), buffer)

    let thumbnailPath: string | null = null
    let thumbnailUrl: string | null = null

    try {
      const thumbBuffer = await sharp(buffer)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover', position: 'center' })
        .webp({ quality: 80 })
        .toBuffer()

      thumbnailPath = `${folder}/${filename}_thumb.webp`
      fs.writeFileSync(path.join(UPLOADS_DIR, thumbnailPath), thumbBuffer)
      thumbnailUrl = `/uploads/${thumbnailPath}`
    } catch (thumbErr) {
      console.warn('[upload] Thumbnail failed:', thumbErr)
    }

    return NextResponse.json({
      storagePath,
      publicUrl: `/uploads/${storagePath}`,
      thumbnailPath,
      thumbnailUrl,
      name: file.name,
    })
  } catch (error) {
    console.error('[upload]', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
