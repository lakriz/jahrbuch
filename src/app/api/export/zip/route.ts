import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import path from 'path'
import fs from 'fs'
import { UPLOADS_DIR } from '@/lib/paths'
import AdmZip from 'adm-zip'

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim()
}

export async function GET(request: NextRequest) {
  try {
    // 1. Klassen/Alben für Zuordnungen laden
    const classes = db.prepare('SELECT id, name FROM classes').all() as { id: string; name: string }[]
    const classesMap: Record<string, string> = {}
    classes.forEach((c) => {
      classesMap[c.id] = c.name
    })

    // 2. Aktive Texte aus Datenbank laden
    const texts = db.prepare('SELECT * FROM texts WHERE deleted_at IS NULL').all() as Record<string, any>[]
    const parsedTexts = texts.map((t) => ({
      id: t.id as string,
      title: t.title as string,
      content: t.content as string,
      created_at: t.created_at as string,
      tags: JSON.parse(t.tags || '[]') as string[]
    }))

    // 3. Aktive Bilder aus Datenbank laden
    const images = db.prepare('SELECT * FROM images WHERE deleted_at IS NULL').all() as Record<string, any>[]
    const parsedImages = images.map((img) => ({
      id: img.id as string,
      storage_path: img.storage_path as string,
      name: img.name as string,
      album_id: img.album_id as string | null,
      created_at: img.created_at as string,
      tags: JSON.parse(img.tags || '[]') as string[]
    }))

    // 4. ZIP-Archiv initialisieren
    const zip = new AdmZip()

    // 5. Texte als Markdown-Dateien hinzufügen
    parsedTexts.forEach((t) => {
      const folder = 'texte'
      const safeTitle = slugify(t.title) || 'unbenannter-text'
      const filename = `${safeTitle}-${t.id.substring(0, 8)}.md`
      
      const markdownContent = `---
title: "${t.title.replace(/"/g, '\\"')}"
tags: ${JSON.stringify(t.tags)}
created_at: "${t.created_at}"
---

# ${t.title}

${t.content}
`
      zip.addFile(`${folder}/${filename}`, Buffer.from(markdownContent, 'utf-8'))
    })

    // 6. Bilder nach Alben-Struktur geordnet hinzufügen
    parsedImages.forEach((img) => {
      const albumName = img.album_id ? (classesMap[img.album_id] || 'allgemein') : 'allgemein'
      const folderName = `bilder/${slugify(albumName)}`
      
      const fileExt = img.storage_path.split('.').pop() || 'jpg'
      const originalName = img.name.split('.').slice(0, -1).join('.') || 'bild'
      const safeImgName = `${slugify(originalName)}-${img.id.substring(0, 8)}.${fileExt}`
      
      const fullPath = path.resolve(UPLOADS_DIR, img.storage_path)
      
      // Sicherheitscheck für Verzeichnistraversierung
      if (fullPath.startsWith(UPLOADS_DIR) && fs.existsSync(fullPath)) {
        const fileBuffer = fs.readFileSync(fullPath)
        zip.addFile(`${folderName}/${safeImgName}`, fileBuffer)
      }
    })

    // 7. Übersicht README.md hinzufügen
    const readmeContent = `# Jahrbuch Datenexport

Generiert am: ${new Date().toLocaleString('de-DE')}

## Inhalt der ZIP-Datei:
- \`texte/\`: Alle aktiven Texte im Markdown-Format (.md) mit Metadaten im Frontmatter-Bereich.
- \`bilder/\`: Alle aktiven Bilder in druckfähiger Qualität, sortiert nach Klassen- und Albumordnern.
- \`export_data.json\`: Ein kompletter Metadaten-Export aller Texte und Bilder im JSON-Format für maschinelle Weiterverarbeitung.

Viel Erfolg bei der Gestaltung des Jahrbuchs!
`
    zip.addFile('README.md', Buffer.from(readmeContent, 'utf-8'))

    // 8. Metadaten export_data.json hinzufügen
    const exportMetadata = {
      exported_at: new Date().toISOString(),
      texts: parsedTexts,
      images: parsedImages
    }
    zip.addFile('export_data.json', Buffer.from(JSON.stringify(exportMetadata, null, 2), 'utf-8'))

    // 9. ZIP-Puffer erzeugen und senden
    const zipBuffer = zip.toBuffer()

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="jahrbuch-komplettexport.zip"',
        'Cache-Control': 'no-store, must-revalidate'
      }
    })
  } catch (err) {
    console.error('[ZIP Export Error]', err)
    return NextResponse.json({ error: 'ZIP Export fehlgeschlagen' }, { status: 500 })
  }
}
