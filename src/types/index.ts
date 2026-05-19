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

// ── Page / Template types ──────────────────────────────────────────────────

export type PageType = 'class_page' | 'student_page' | 'event_page' | 'editorial'

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
