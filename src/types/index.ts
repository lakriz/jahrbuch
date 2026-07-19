// ── Core domain types ──────────────────────────────────────────────────────

export interface Student {
  id: string
  name: string
  class_id: string
  images: string[]      // Supabase Storage public URLs
  bio_text: string | null
  created_at: string
}

export interface Class {
  id: string
  name: string          // e.g. "10A", "Klasse 3"
  created_at: string
}

export interface ImageEntry {
  id: string
  storage_path: string
  thumbnail_path: string | null
  public_url: string
  thumbnail_url?: string | null
  thumb_200_url?: string | null
  thumb_200_path?: string | null
  thumb_400_url?: string | null
  thumb_400_path?: string | null
  thumb_800_url?: string | null
  thumb_800_path?: string | null
  width?: number | null
  height?: number | null
  file_size?: number | null
  name: string
  alt_text: string
  caption: string
  tags: string[]
  album_id: string | null
  deleted_at?: string | null
  created_at: string
}

// ── Content block types ────────────────────────────────────────────────────

export type ContentBlockType = 'headline' | 'text' | 'image' | 'gallery'

export interface ContentBlock {
  id: string
  type: ContentBlockType
  label: string
  created_at: string
}

export interface BlockHeadline {
  block_id: string
  content: string
  level: 1 | 2 | 3
}

export interface BlockText {
  block_id: string
  content: string
}

export interface BlockImage {
  block_id: string
  image_id: string | null
  alt_text: string
  caption: string
  tags: string[]
  images?: ImageEntry | null
}

export interface BlockGallery {
  block_id: string
  columns: 2 | 3 | 4
}

export interface BlockGalleryItem {
  id: string
  gallery_id: string
  image_id: string | null
  alt_text: string
  caption: string
  tags: string[]
  order_index: number
  images?: ImageEntry | null
}

// Fully joined block (as returned from the DB with all relations)
export interface ContentBlockFull extends ContentBlock {
  block_headlines?: BlockHeadline | null
  block_texts?: BlockText | null
  block_images?: BlockImage | null
  block_galleries?: (BlockGallery & { block_gallery_items: BlockGalleryItem[] }) | null
  page_block_refs?: { page_id: string; pages: { id: string; title: string } | null }[]
}

export interface PageBlockRef {
  page_id: string
  block_id: string
  order_index: number
}



export type PageType = 'cover' | 'back_cover' | 'class_page' | 'student_page' | 'event_page' | 'editorial'

export type { BookFormat } from '@/lib/bookFormats'

export type BlockType = 'photo_grid' | 'photo_single' | 'text' | 'heading'

export interface PhotoGridBlock {
  type: 'photo_grid'
  items: string[]       // image URLs
  columns?: 2 | 3 | 4
}

export interface PhotoSingleBlock {
  type: 'photo_single'
  src: string
  caption?: string
}

export interface TextBlock {
  type: 'text'
  content: string
}

export interface HeadingBlock {
  type: 'heading'
  content: string
  level?: 1 | 2 | 3
}

export type Block = PhotoGridBlock | PhotoSingleBlock | TextBlock | HeadingBlock

export interface Page {
  id: string
  type: PageType
  title: string
  blocks: Block[]
  order_index: number
  created_at: string
}
