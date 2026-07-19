import db from '@/lib/db'
import { buildFullBlock } from '@/app/api/content-blocks/shared'
import type { Block, ContentBlockFull } from '@/types'

export function mapContentBlockToLegacyBlock(block: ContentBlockFull): Block | null {
  switch (block.type) {
    case 'headline':
      return {
        type: 'heading',
        content: block.block_headlines?.content ?? '',
        level: (block.block_headlines?.level as 1 | 2 | 3) ?? 1,
      }
    case 'text':
      return {
        type: 'text',
        content: block.block_texts?.content ?? '',
      }
    case 'image':
      return {
        type: 'photo_single',
        src: block.block_images?.images?.public_url ?? '',
        caption: block.block_images?.caption || block.block_images?.images?.caption || '',
      }
    case 'gallery':
      return {
        type: 'photo_grid',
        items: (block.block_galleries?.block_gallery_items ?? [])
          .map((item) => item.images?.public_url ?? '')
          .filter(Boolean),
        columns: (block.block_galleries?.columns as 2 | 3 | 4) ?? 3,
      }
    default:
      return null
  }
}

export function getPageBlocks(pageId: string): Block[] {
  const refs = db.prepare(`
    SELECT pbr.order_index, cb.*
    FROM page_block_refs pbr
    JOIN content_blocks cb ON pbr.block_id = cb.id
    WHERE pbr.page_id = ?
    ORDER BY pbr.order_index
  `).all(pageId) as Array<Record<string, unknown>>

  return refs
    .map((r) => {
      const fullBlock = buildFullBlock(r)
      return mapContentBlockToLegacyBlock(fullBlock)
    })
    .filter((b): b is Block => b !== null)
}
