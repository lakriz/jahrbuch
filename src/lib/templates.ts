import type { Block, PageType } from '@/types'

// ── Template definitions ───────────────────────────────────────────────────

export interface PageTemplate {
  type: PageType
  label: string
  description: string
  defaultBlocks: Block[]
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    type: 'cover',
    label: 'Titelseite',
    description: 'Deckblatt mit großem Titelbild, Schulname und Jahreszahl',
    defaultBlocks: [
      { type: 'photo_single', src: '', caption: '' },
      { type: 'heading', content: 'Jahrbuch', level: 1 },
      { type: 'text', content: '' },
    ],
  },
  {
    type: 'back_cover',
    label: 'Rückseite',
    description: 'Abschlussseite mit Abschlussbild und Schlusstext',
    defaultBlocks: [
      { type: 'photo_single', src: '', caption: '' },
      { type: 'text', content: '' },
    ],
  },
  {
    type: 'class_page',
    label: 'Klassenübersicht',
    description: 'Fotoraster aller Schüler einer Klasse',
    defaultBlocks: [
      { type: 'heading', content: 'Unsere Klasse', level: 1 },
      { type: 'photo_grid', items: [], columns: 3 },
      { type: 'text', content: '' },
    ],
  },
  {
    type: 'student_page',
    label: 'Schüler-Seite',
    description: 'Einzelne Schüler-Vorstellung mit Foto und Steckbrief',
    defaultBlocks: [
      { type: 'heading', content: '', level: 2 },
      { type: 'photo_single', src: '', caption: '' },
      { type: 'text', content: '' },
    ],
  },
  {
    type: 'event_page',
    label: 'Event-Seite',
    description: 'Mehrere Bilder mit Beschreibung',
    defaultBlocks: [
      { type: 'heading', content: '', level: 1 },
      { type: 'text', content: '' },
      { type: 'photo_grid', items: [], columns: 2 },
    ],
  },
  {
    type: 'editorial',
    label: 'Editorial / Danksagung',
    description: 'Freitext-Seite für Grußworte oder Danksagungen',
    defaultBlocks: [
      { type: 'heading', content: '', level: 1 },
      { type: 'text', content: '' },
    ],
  },
]

export const getTemplate = (type: PageType): PageTemplate =>
  PAGE_TEMPLATES.find((t) => t.type === type)!
