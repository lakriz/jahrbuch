export type BookFormat = 'din_a5' | 'din_a4' | 'din_a3' | 'square_210' | 'us_letter'

export interface BookFormatDef {
  id: BookFormat
  label: string
  widthMm: number
  heightMm: number
  description: string
}

export const BOOK_FORMATS: BookFormatDef[] = [
  {
    id: 'din_a5',
    label: 'DIN A5',
    widthMm: 148,
    heightMm: 210,
    description: '148 × 210 mm – klassisches Bücherformat',
  },
  {
    id: 'din_a4',
    label: 'DIN A4',
    widthMm: 210,
    heightMm: 297,
    description: '210 × 297 mm – Standard-Druckformat',
  },
  {
    id: 'din_a3',
    label: 'DIN A3',
    widthMm: 297,
    heightMm: 420,
    description: '297 × 420 mm – großformatiges Jahrbuch',
  },
  {
    id: 'square_210',
    label: 'Quadrat',
    widthMm: 210,
    heightMm: 210,
    description: '210 × 210 mm – quadratisches Format',
  },
  {
    id: 'us_letter',
    label: 'US Letter',
    widthMm: 216,
    heightMm: 279,
    description: '216 × 279 mm – amerikanisches Standardformat',
  },
]

export const DEFAULT_FORMAT: BookFormat = 'din_a4'

export function getFormatDef(id: BookFormat): BookFormatDef {
  return BOOK_FORMATS.find((f) => f.id === id) ?? BOOK_FORMATS.find((f) => f.id === DEFAULT_FORMAT)!
}
