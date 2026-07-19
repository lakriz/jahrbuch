import Database from 'better-sqlite3'
import path from 'path'
import { DATA_DIR } from './paths'

const DB_PATH = path.join(DATA_DIR, 'jahrbuch.db')

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined
}

// Versionierte Migrationen: Index i wird angewendet, wenn PRAGMA user_version <= i.
// Neue Schema-Änderungen IMMER als neuen Eintrag ANS ENDE anhängen — nie
// bestehende Einträge editieren, sonst laufen bereits migrierte DBs auseinander.
// Migration 1 ist die idempotente Baseline (IF NOT EXISTS), damit DBs aus der
// Zeit vor dem Migrationssystem (user_version 0) verlustfrei übernommen werden.
const migrations: string[] = [
  // 1 — Baseline: komplettes Schema Stand Juli 2026
  `
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
      images TEXT NOT NULL DEFAULT '[]',
      bio_text TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('cover','back_cover','class_page','student_page','event_page','editorial')),
      title TEXT NOT NULL,
      blocks TEXT NOT NULL DEFAULT '[]',
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      storage_path TEXT NOT NULL,
      public_url TEXT NOT NULL,
      thumbnail_url TEXT,
      thumbnail_path TEXT,
      name TEXT NOT NULL,
      alt_text TEXT NOT NULL DEFAULT '',
      caption TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      album_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content_blocks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('headline','text','image','gallery')),
      label TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS block_headlines (
      block_id TEXT PRIMARY KEY REFERENCES content_blocks(id) ON DELETE CASCADE,
      content TEXT NOT NULL DEFAULT '',
      level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3)
    );

    CREATE TABLE IF NOT EXISTS block_texts (
      block_id TEXT PRIMARY KEY REFERENCES content_blocks(id) ON DELETE CASCADE,
      content TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS block_images (
      block_id TEXT PRIMARY KEY REFERENCES content_blocks(id) ON DELETE CASCADE,
      image_id TEXT REFERENCES images(id) ON DELETE SET NULL,
      alt_text TEXT NOT NULL DEFAULT '',
      caption TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS block_galleries (
      block_id TEXT PRIMARY KEY REFERENCES content_blocks(id) ON DELETE CASCADE,
      columns INTEGER NOT NULL DEFAULT 3 CHECK (columns BETWEEN 2 AND 4)
    );

    CREATE TABLE IF NOT EXISTS block_gallery_items (
      id TEXT PRIMARY KEY,
      gallery_id TEXT NOT NULL REFERENCES block_galleries(block_id) ON DELETE CASCADE,
      image_id TEXT REFERENCES images(id) ON DELETE CASCADE,
      alt_text TEXT NOT NULL DEFAULT '',
      caption TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS page_block_refs (
      page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      block_id TEXT NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (page_id, block_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('book_format', '"din_a4"');
  `,
  // 2 — Drei Vorschaubilder, Dimensionen, Dateigröße + Soft-Delete für Bilder
  `
    ALTER TABLE images ADD COLUMN thumb_200_url TEXT;
    ALTER TABLE images ADD COLUMN thumb_200_path TEXT;
    ALTER TABLE images ADD COLUMN thumb_400_url TEXT;
    ALTER TABLE images ADD COLUMN thumb_400_path TEXT;
    ALTER TABLE images ADD COLUMN thumb_800_url TEXT;
    ALTER TABLE images ADD COLUMN thumb_800_path TEXT;
    ALTER TABLE images ADD COLUMN width INTEGER;
    ALTER TABLE images ADD COLUMN height INTEGER;
    ALTER TABLE images ADD COLUMN file_size INTEGER;
    ALTER TABLE images ADD COLUMN deleted_at TEXT;
  `,
  // 3 — Tabelle für eigenständige Texte mit Tags, Markdown und Papierkorb-Unterstützung
  `
    CREATE TABLE IF NOT EXISTS texts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT
    );
  `,
]

function runMigrations(instance: Database.Database) {
  // BEGIN IMMEDIATE + Versions-Check innerhalb der Transaktion: mehrere Prozesse
  // (z. B. parallele Next-Build-Worker) serialisieren sich über das Write-Lock,
  // und wer warten musste, überspringt bereits angewendete Migrationen.
  const applyNext = instance.transaction(() => {
    const version = instance.pragma('user_version', { simple: true }) as number
    if (version >= migrations.length) return false
    instance.exec(migrations[version])
    instance.pragma(`user_version = ${version + 1}`)
    console.log(`[db] Migration ${version + 1}/${migrations.length} angewendet`)
    return true
  })

  while (applyNext.immediate()) { /* nächste Migration */ }
}

function initDb(): Database.Database {
  const instance = new Database(DB_PATH)
  instance.pragma('journal_mode = WAL')
  instance.pragma('foreign_keys = ON')
  instance.pragma('busy_timeout = 10000')

  runMigrations(instance)

  return instance
}

const db: Database.Database = global.__db ?? (global.__db = initDb())

export default db
