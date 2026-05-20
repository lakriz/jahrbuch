import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { s3, S3_BUCKET, publicUrl } from '@/lib/storage'

const THUMBNAIL_SIZE = 300

export async function POST(request: NextRequest) {
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

    // ── Upload original via S3 ────────────────────────────────
    await s3.send(new PutObjectCommand({
      Bucket:      S3_BUCKET,
      Key:         originalPath,
      Body:        buffer,
      ContentType: file.type,
    }))

    // ── Generate & upload thumbnail via S3 ────────────────────
    let thumbnailPath: string | null = null
    let thumbnailUrl: string | null = null

    try {
      const thumbBuffer = await sharp(buffer)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover', position: 'center' })
        .webp({ quality: 80 })
        .toBuffer()

      thumbnailPath = `${folder}/${filename}_thumb.webp`

      await s3.send(new PutObjectCommand({
        Bucket:      S3_BUCKET,
        Key:         thumbnailPath,
        Body:        thumbBuffer,
        ContentType: 'image/webp',
      }))

      thumbnailUrl = publicUrl(thumbnailPath)
    } catch (thumbErr) {
      console.warn('[upload] Thumbnail failed:', thumbErr)
      thumbnailPath = null
    }

    return NextResponse.json({
      storagePath:   originalPath,
      publicUrl:     publicUrl(originalPath),
      thumbnailPath,
      thumbnailUrl,
      name: file.name,
    })
  } catch (error) {
    console.error('[upload]', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
