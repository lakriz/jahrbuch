import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BUCKET = 'jahrbuch26'
const THUMBNAIL_WIDTH = 300
const THUMBNAIL_HEIGHT = 300

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const filename = crypto.randomUUID()
    const originalPath = `${folder}/${filename}.${ext}`

    // Upload original image
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(originalPath, buffer, {
        contentType: file.type,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      )
    }

    // Generate thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 80 })
      .toBuffer()

    const thumbnailPath = `${folder}/${filename}_thumb.webp`

    const { error: thumbError } = await supabase.storage
      .from(BUCKET)
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: 'image/webp',
      })

    if (thumbError) {
      console.error('Thumbnail upload error:', thumbError)
      // Don't fail if thumbnail fails, still save the original
    }

    const { data: originalUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(originalPath)

    const { data: thumbUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(thumbnailPath)

    return NextResponse.json({
      storagePath: originalPath,
      publicUrl: originalUrlData.publicUrl,
      thumbnailPath: thumbnailPath,
      thumbnailUrl: thumbUrlData.publicUrl,
      name: file.name,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
