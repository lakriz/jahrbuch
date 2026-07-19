import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const size = request.nextUrl.searchParams.get('size')
    
    const row = db.prepare('SELECT * FROM images WHERE id = ?').get(id) as Record<string, any> | undefined
    if (!row) {
      return new NextResponse('Image not found', { status: 404 })
    }

    // Bestimmen, welche URL zurückgegeben werden soll (Original oder Vorschau)
    let targetUrl = row.public_url
    if (size === '200' && row.thumb_200_url) {
      targetUrl = row.thumb_200_url
    } else if (size === '400' && row.thumb_400_url) {
      targetUrl = row.thumb_400_url
    } else if (size === '800' && row.thumb_800_url) {
      targetUrl = row.thumb_800_url
    }

    // 307 Temporäre Weiterleitung (wird vom Browser nicht permanent gecached)
    return NextResponse.redirect(new URL(targetUrl, request.url), { status: 307 })
  } catch (err) {
    console.error('[Image File Redirect Error]', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
