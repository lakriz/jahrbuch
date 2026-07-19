import db from '@/lib/db'
import type { Page } from '@/types'
import { notFound } from 'next/navigation'
import { getFormatDef, DEFAULT_FORMAT, type BookFormat } from '@/lib/bookFormats'
import { getPageBlocks } from '@/lib/pageBlocks'
import PagePreviewClient from '@/components/PagePreviewClient'

export default async function PagePreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = db.prepare('SELECT * FROM pages WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row) notFound()

  const pg: Page = { ...row, blocks: getPageBlocks(id) } as Page

  const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('book_format') as { value: string } | undefined
  const fmt = getFormatDef((settingRow ? JSON.parse(settingRow.value) : DEFAULT_FORMAT) as BookFormat)

  return <PagePreviewClient pg={pg} fmt={fmt} />
}
