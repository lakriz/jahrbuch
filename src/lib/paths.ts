import path from 'path'
import fs from 'fs'

// Alles Persistente (SQLite-DB + Uploads) lebt unter DATA_DIR, damit im
// Docker-Betrieb ein einzelnes Volume genügt (Standard: ./data, Override via env).
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data')

export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')

for (const dir of [DATA_DIR, UPLOADS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}
