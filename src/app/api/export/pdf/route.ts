import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import db from '@/lib/db'
import type { Page, Block } from '@/types'

function renderBlocks(blocks: Block[]): string {
  return blocks.map((block) => {
    switch (block.type) {
      case 'heading':
        return `<h${block.level ?? 1} class="heading">${block.content}</h${block.level ?? 1}>`
      case 'text':
        return `<p class="text-block">${block.content.replace(/\n/g, '<br/>')}</p>`
      case 'photo_single':
        return `
          <figure class="photo-single">
            <img src="${block.src}" alt="${block.caption ?? ''}" />
            ${block.caption ? `<figcaption>${block.caption}</figcaption>` : ''}
          </figure>`
      case 'photo_grid': {
        const cols = block.columns ?? 3
        const imgs = block.items.map((src) => `<img src="${src}" alt="" />`).join('')
        return `<div class="photo-grid cols-${cols}">${imgs}</div>`
      }
      default:
        return ''
    }
  }).join('\n')
}

function buildHTML(pages: Page[], widthMm: number, heightMm: number): string {
  const pagesHtml = pages
    .map((pg) => `
      <section class="page">
        <div class="page-inner">
          ${renderBlocks(pg.blocks)}
        </div>
      </section>`)
    .join('\n')

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; }
    .page { width: ${widthMm}mm; min-height: ${heightMm}mm; page-break-after: always; display: flex; align-items: stretch; }
    .page-inner { padding: 20mm; width: 100%; }
    h1.heading { font-size: 28pt; font-weight: 700; margin-bottom: 12pt; }
    h2.heading { font-size: 22pt; font-weight: 600; margin-bottom: 10pt; }
    h3.heading { font-size: 16pt; font-weight: 600; margin-bottom: 8pt; }
    .text-block { font-size: 11pt; line-height: 1.6; margin-bottom: 12pt; }
    .photo-single { margin-bottom: 12pt; }
    .photo-single img { width: 100%; height: auto; display: block; border-radius: 4pt; }
    figcaption { font-size: 9pt; color: #666; margin-top: 4pt; }
    .photo-grid { display: grid; gap: 6pt; margin-bottom: 12pt; }
    .photo-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
    .photo-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
    .photo-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
    .photo-grid img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 3pt; }
    @media print { .page { page-break-after: always; } }
  </style>
</head>
<body>${pagesHtml}</body>
</html>`
}

export async function GET() {
  try {
    const rows = db.prepare('SELECT * FROM pages ORDER BY order_index').all() as Array<Record<string, unknown>>
    if (!rows.length) return NextResponse.json({ error: 'Keine Seiten gefunden.' }, { status: 404 })

    const pages = rows.map((r) => ({ ...r, blocks: JSON.parse((r.blocks as string) || '[]') })) as Page[]

    const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('book_format') as { value: string } | undefined
    const { getFormatDef, DEFAULT_FORMAT } = await import('@/lib/bookFormats')
    const fmt = getFormatDef(JSON.parse(settingRow?.value ?? `"${DEFAULT_FORMAT}"`))

    const html = buildHTML(pages, fmt.widthMm, fmt.heightMm)

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdf = await page.pdf({
      width: `${fmt.widthMm}mm`,
      height: `${fmt.heightMm}mm`,
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    })
    await browser.close()

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="jahrbuch.pdf"`,
      },
    })
  } catch (err) {
    console.error('[PDF Export]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unbekannter Fehler' },
      { status: 500 }
    )
  }
}
