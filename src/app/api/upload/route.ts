import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase'

const BUCKET = 'jahrbuch26'
const THUMBNAIL_SIZE = 300

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'allgemein'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const filename = crypto.randomUUID()
    const originalPath = `${folder}/${filename}.${ext}`

    // ── Upload original ───────────────────────────────────────
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(originalPath, buffer, { contentType: file.type })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: originalUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(originalPath)

    // ── Generate & upload thumbnail ───────────────────────────
    let thumbnailPath: string | null = null
    let thumbnailUrl: string | null = null

    try {
      const thumbBuffer = await sharp(buffer)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover', position: 'center' })
        .webp({ quality: 80 })
        .toBuffer()

      thumbnailPath = `${folder}/${filename}_thumb.webp`

      const { error: thumbError } = await supabase.storage
        .from(BUCKET)
        .upload(thumbnailPath, thumbBuffer, { contentType: 'image/webp' })

      if (thumbError) {
        console.warn('[upload] Thumbnail upload failed:', thumbError.message)
        thumbnailPath = null
      } else {
        thumbnailUrl = supabase.storage.from(BUCKET).getPublicUrl(thumbnailPath).data.publicUrl
      }
    } catch (thumbErr) {
      console.warn('[upload] Thumbnail generation failed:', thumbErr)
    }

    return NextResponse.json({
      storagePath:   originalPath,
      publicUrl:     originalUrlData.publicUrl,
      thumbnailPath,
      thumbnailUrl,
      name: file.name,
    })
  } catch (error) {
    console.error('[upload]', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
