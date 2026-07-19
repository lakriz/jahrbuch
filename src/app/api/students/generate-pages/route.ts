import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { classId } = await request.json() as { classId?: string }

    // Fetch students
    let query = 'SELECT * FROM students'
    const params: string[] = []
    if (classId) {
      query += ' WHERE class_id = ?'
      params.push(classId)
    }
    const students = db.prepare(query).all(...params) as Array<{
      id: string
      name: string
      class_id: string | null
      images: string // JSON array
      bio_text: string | null
    }>

    if (!students.length) {
      return NextResponse.json({ success: true, generatedCount: 0, skippedCount: 0, message: 'Keine Schüler gefunden.' })
    }

    let generatedCount = 0
    let skippedCount = 0

    // Get max order index for page order
    const maxOrderRow = db.prepare('SELECT MAX(order_index) as max_order FROM pages').get() as { max_order: number | null }
    let nextOrder = (maxOrderRow?.max_order ?? -1) + 1

    const generateTx = db.transaction(() => {
      for (const student of students) {
        const pageTitle = `Steckbrief: ${student.name}`
        
        // Check if page already exists
        const exists = db.prepare("SELECT 1 FROM pages WHERE type = 'student_page' AND title = ?").get(pageTitle)
        if (exists) {
          skippedCount++
          continue
        }

        const pageId = crypto.randomUUID()
        
        // Parse student images
        let firstImage = ''
        try {
          const imgs = JSON.parse(student.images || '[]')
          if (Array.isArray(imgs) && imgs.length > 0) {
            firstImage = imgs[0]
          }
        } catch (e) {
          console.error(`Failed to parse images for student ${student.name}`, e)
        }

        // Define default blocks for student page
        const blocks = [
          { type: 'heading', content: student.name, level: 2 },
          { type: 'photo_single', src: firstImage, caption: '' },
          { type: 'text', content: student.bio_text ?? '' }
        ]

        // Insert page
        db.prepare('INSERT INTO pages (id, type, title, blocks, order_index) VALUES (?, ?, ?, ?, ?)').run(
          pageId,
          'student_page',
          pageTitle,
          JSON.stringify(blocks),
          nextOrder++
        )

        // Insert blocks into content_blocks & page_block_refs
        blocks.forEach((block, idx) => {
          const blockId = crypto.randomUUID()
          let mappedType: string = 'text'
          if (block.type === 'heading') mappedType = 'headline'
          else if (block.type === 'text') mappedType = 'text'
          else if (block.type === 'photo_single') mappedType = 'image'

          const label = `${pageTitle} - ${mappedType}`
          
          db.prepare('INSERT INTO content_blocks (id, type, label) VALUES (?, ?, ?)').run(
            blockId,
            mappedType,
            label
          )

          if (mappedType === 'headline') {
            db.prepare('INSERT INTO block_headlines (block_id, content, level) VALUES (?, ?, ?)')
              .run(blockId, block.content, block.level)
          } else if (mappedType === 'text') {
            db.prepare('INSERT INTO block_texts (block_id, content) VALUES (?, ?)')
              .run(blockId, block.content)
          } else if (mappedType === 'image') {
            let imageId: string | null = null
            if (firstImage) {
              const imgRow = db.prepare('SELECT id FROM images WHERE public_url = ? OR storage_path = ?').get(firstImage, firstImage) as { id: string } | undefined
              if (imgRow) {
                imageId = imgRow.id
              }
            }
            db.prepare('INSERT INTO block_images (block_id, image_id, alt_text, caption, tags) VALUES (?, ?, ?, ?, ?)')
              .run(blockId, imageId, '', '', '[]')
          }

          db.prepare('INSERT INTO page_block_refs (page_id, block_id, order_index) VALUES (?, ?, ?)')
            .run(pageId, blockId, idx)
        })

        generatedCount++
      }
    })

    generateTx()

    return NextResponse.json({
      success: true,
      generatedCount,
      skippedCount,
    })
  } catch (err) {
    console.error('[Generate Pages Error]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
