import db from '@/lib/db'
import type { ContentBlockFull } from '@/types'

type Row = Record<string, unknown>

function parseJson<T>(v: unknown, fallback: T): T {
  if (typeof v !== 'string') return fallback
  try { return JSON.parse(v) } catch { return fallback }
}

function parseImage(row: Row) {
  return { ...row, tags: parseJson(row.tags, []) }
}

export function buildFullBlock(block: Row): ContentBlockFull {
  const id = block.id as string
  const type = block.type as string
  const result: ContentBlockFull = {
    id,
    type: type as ContentBlockFull['type'],
    label: block.label as string,
    created_at: block.created_at as string,
  }

  if (type === 'headline') {
    result.block_headlines = (db.prepare('SELECT * FROM block_headlines WHERE block_id = ?').get(id) ?? null) as ContentBlockFull['block_headlines']
  }

  if (type === 'text') {
    result.block_texts = (db.prepare('SELECT * FROM block_texts WHERE block_id = ?').get(id) ?? null) as ContentBlockFull['block_texts']
  }

  if (type === 'image') {
    const bi = db.prepare('SELECT * FROM block_images WHERE block_id = ?').get(id) as Row | undefined
    if (bi) {
      const img = bi.image_id
        ? (db.prepare('SELECT * FROM images WHERE id = ?').get(bi.image_id as string) as Row | undefined)
        : undefined
      result.block_images = {
        block_id: bi.block_id as string,
        image_id: bi.image_id as string | null,
        alt_text: bi.alt_text as string,
        caption: bi.caption as string,
        tags: parseJson(bi.tags, []),
        images: img ? parseImage(img) as ContentBlockFull['block_images'] extends { images?: infer I } ? I : never : null,
      }
    }
  }

  if (type === 'gallery') {
    const bg = db.prepare('SELECT * FROM block_galleries WHERE block_id = ?').get(id) as Row | undefined
    if (bg) {
      const items = (db.prepare(`
        SELECT bgi.*, i.id as i_id, i.storage_path, i.public_url, i.thumbnail_url, i.thumbnail_path,
               i.name, i.alt_text as i_alt, i.caption as i_cap, i.tags as i_tags, i.album_id, i.created_at as i_cat
        FROM block_gallery_items bgi
        LEFT JOIN images i ON bgi.image_id = i.id
        WHERE bgi.gallery_id = ?
        ORDER BY bgi.order_index
      `).all(id) as Row[]).map((r) => ({
        id: r.id as string,
        gallery_id: r.gallery_id as string,
        image_id: r.image_id as string | null,
        alt_text: r.alt_text as string,
        caption: r.caption as string,
        tags: parseJson(r.tags, []),
        order_index: r.order_index as number,
        images: r.i_id ? {
          id: r.i_id as string,
          storage_path: r.storage_path as string,
          public_url: r.public_url as string,
          thumbnail_url: r.thumbnail_url as string | null,
          thumbnail_path: r.thumbnail_path as string | null,
          name: r.name as string,
          alt_text: r.i_alt as string,
          caption: r.i_cap as string,
          tags: parseJson(r.i_tags, []),
          album_id: r.album_id as string | null,
          created_at: r.i_cat as string,
        } : null,
      }))
      result.block_galleries = {
        block_id: bg.block_id as string,
        columns: bg.columns as 2 | 3 | 4,
        block_gallery_items: items,
      }
    }
  }

  const refs = (db.prepare(`
    SELECT pbr.page_id, p.id as pid, p.title
    FROM page_block_refs pbr
    LEFT JOIN pages p ON pbr.page_id = p.id
    WHERE pbr.block_id = ?
  `).all(id) as Row[]).map((r) => ({
    page_id: r.page_id as string,
    pages: r.pid ? { id: r.pid as string, title: r.title as string } : null,
  }))
  result.page_block_refs = refs as ContentBlockFull['page_block_refs']

  return result
}
