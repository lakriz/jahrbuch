import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * S3-compatible client for Supabase Storage.
 * Credentials: Supabase Dashboard → Storage → S3 Access Keys
 */
export const s3 = new S3Client({
  forcePathStyle: true,
  region: process.env.SUPABASE_S3_REGION!,
  endpoint: process.env.SUPABASE_S3_ENDPOINT!,
  credentials: {
    accessKeyId:     process.env.SUPABASE_S3_ACCESS_KEY!,
    secretAccessKey: process.env.SUPABASE_S3_SECRET_KEY!,
  },
})

export const S3_BUCKET = process.env.SUPABASE_S3_BUCKET ?? 'jahrbuch26'

/** Build the public CDN URL for an object in a public bucket. */
export function publicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${base}/storage/v1/object/public/${S3_BUCKET}/${storagePath}`
}

/**
 * Generate a time-limited pre-signed URL for a private object.
 * Signing is done locally (no network call required).
 * @param storagePath  Path inside the bucket, e.g. "allgemein/abc123.jpg"
 * @param expiresIn    Validity in seconds (default: 3600 = 1 hour)
 */
export async function createSignedUrl(
  storagePath: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: storagePath })
  return getSignedUrl(s3, command, { expiresIn })
}
