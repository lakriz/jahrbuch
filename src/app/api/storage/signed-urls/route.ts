import { NextRequest, NextResponse } from 'next/server'
import { createSignedUrl } from '@/lib/storage'

/**
 * POST /api/storage/signed-urls
 * Body: { paths: string[]; expiresIn?: number }
 * Returns: { urls: Record<string, string> }
 *
 * Generates pre-signed S3 URLs for the given storage paths.
 * Signing is done locally — no round-trip to the storage backend.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { paths: string[]; expiresIn?: number }
    const { paths, expiresIn = 3600 } = body

    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'paths must be a non-empty array' }, { status: 400 })
    }

    const entries = await Promise.all(
      paths.map(async (path) => {
        const url = await createSignedUrl(path, expiresIn)
        return [path, url] as [string, string]
      })
    )

    return NextResponse.json({ urls: Object.fromEntries(entries) })
  } catch (err) {
    console.error('[signed-urls]', err)
    return NextResponse.json({ error: 'Failed to sign URLs' }, { status: 500 })
  }
}
