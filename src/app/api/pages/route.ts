import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Block, PageType, HeadingBlock, TextBlock, PhotoSingleBlock, PhotoGridBlock } from '@/types'
import { getPageBlocks } from '@/lib/pageBlocks'

export async function GET() {
  const rows = db.prepare('SELECT * FROM pages ORDER BY order_index').all() as Record<string, unknown>[]
  return NextResponse.json(rows.map(parsePage))
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { title: string; type: PageType; blocks: Block[]; order_index: number }
  if (!body.title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })
  const id = crypto.randomUUID()

  const insertPageTx = db.transaction((pageId: string, title: string, type: PageType, orderIndex: number, blocks: Block[]) => {
    db.prepare('INSERT INTO pages (id, type, title, blocks, order_index) VALUES (?, ?, ?, ?, ?)').run(
      pageId,
      type,
      title,
      JSON.stringify(blocks),
      orderIndex
    )

    blocks.forEach((block, idx) => {
      const blockId = crypto.randomUUID()
      let mappedType: string = 'text'
      if (block.type === 'heading') mappedType = 'headline'
      else if (block.type === 'text') mappedType = 'text'
      else if (block.type === 'photo_single') mappedType = 'image'
      else if (block.type === 'photo_grid') mappedType = 'gallery'

      const label = `${title} - Block ${idx + 1} (${mappedType})`
      
      db.prepare('INSERT INTO content_blocks (id, type, label) VALUES (?, ?, ?)').run(
        blockId,
        mappedType,
        label
      )

      if (mappedType === 'headline') {
        const hBlock = block as HeadingBlock
        db.prepare('INSERT INTO block_headlines (block_id, content, level) VALUES (?, ?, ?)')
          .run(blockId, hBlock.content ?? '', hBlock.level ?? 1)
      } else if (mappedType === 'text') {
        const tBlock = block as TextBlock
        db.prepare('INSERT INTO block_texts (block_id, content) VALUES (?, ?)')
          .run(blockId, tBlock.content ?? '')
      } else if (mappedType === 'image') {
        const iBlock = block as PhotoSingleBlock
        db.prepare('INSERT INTO block_images (block_id, image_id, alt_text, caption, tags) VALUES (?, NULL, ?, ?, ?)')
          .run(blockId, '', iBlock.caption ?? '', '[]')
      } else if (mappedType === 'gallery') {
        const gBlock = block as PhotoGridBlock
        db.prepare('INSERT INTO block_galleries (block_id, columns) VALUES (?, ?)')
          .run(blockId, gBlock.columns ?? 3)
      }

      db.prepare('INSERT INTO page_block_refs (page_id, block_id, order_index) VALUES (?, ?, ?)')
        .run(pageId, blockId, idx)
    })
  })

  insertPageTx(id, body.title.trim(), body.type, body.order_index ?? 0, body.blocks ?? [])

  const row = db.prepare('SELECT * FROM pages WHERE id = ?').get(id)
  return NextResponse.json(parsePage(row as Record<string, unknown>), { status: 201 })
}

export function parsePage(row: Record<string, unknown>) {
  return { ...row, blocks: getPageBlocks(row.id as string) }
}
