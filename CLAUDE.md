@AGENTS.md

# AI_PROJECT_ENGINE.md — Project Memory & Orientation

This file orients the AI assistant at the start of every session. Read it first to understand constraints, current state, and the immediate roadmap.

## 🤖 STANDING INSTRUCTIONS (Execute Automatically)
1. **START of session:** Read the "Progress Log" and "Session Notes". State where we left off and the immediate next micro-step. Do not write code until this is confirmed.
2. **COMPLETING tasks:** Update the Progress Log indicators (`[ ]`, `[~]`, `[x]`) immediately.
3. **END of session:** Remind the user to save state, and update the Progress Log and Session Notes before closing the window.
4. **VERSION CONTROL:** Suggest clean, descriptive git commits after every successful micro-feature implementation.
5. **KEEP THIS FILE CURRENT:** Whenever architecture, stack, or roadmap change, update this document in the same session — it must never describe a stale state again (it described Supabase long after the SQLite migration).

## 📋 PROJECT OVERVIEW
* **Core Objective:** A web-based CMS to design and export a printed school yearbook ("Jahrbuch") for Montessori Schule Kaufering. Editors manage pages, content blocks, student profiles, and photos, then export a print-ready PDF.
* **Core Requirements:** Page layout editor · Reusable content blocks (headline, text, image, gallery) · Image upload & thumbnail management · PDF export respecting the chosen book format · Book format selection (A5/A4/A3/Square/US Letter)
* **Deployment Goal:** Run the whole app in **Docker** — self-contained, portable (DB + file storage move with a single `data/` volume), and self-updating on schema changes via automatic migrations at startup.
* **Documentation Source of Truth:** `src/lib/db.ts` (SQLite schema + init) · `src/types/index.ts` (domain types) · `src/lib/templates.ts` (page templates) · `src/lib/bookFormats.ts` (book format definitions)

## 💻 TECH STACK & ARCHITECTURAL BOUNDARIES
* **Language/Frameworks:** TypeScript · Next.js 16.2.6 (App Router) · React 19 · Tailwind CSS v4
* **Data/Storage:** **SQLite via better-sqlite3** (`data/jahrbuch.db`, WAL mode, foreign keys on) · Images on the **local filesystem** under `data/uploads/`, served via route handler `/uploads/[...path]`. Everything persistent lives under `DATA_DIR` (env, default `./data`) — see `src/lib/paths.ts`. No cloud dependencies.
* **Infrastructure/Deployment:** Local `next dev` for development · Production: single Docker container (`Dockerfile` + `docker-compose.yml`; Next.js standalone build + system Chromium for Puppeteer) with one volume `./data:/app/data` · Puppeteer + sharp for PDF/thumbnail generation (server-side API routes) · Backup/portability = copy the `data/` folder
* **Key Constraints:**
  - All admin pages live under `src/app/(admin)/` with a shared sidebar layout — no public-facing routes yet
  - No auth layer yet (internal-only tool)
  - Schema lives in `src/lib/db.ts` as a **versioned migration array** (`PRAGMA user_version`). Schema changes = append a new migration string at the END of the array — never edit existing entries. Migrations run automatically on startup, so upgraded containers self-update their DB
  - `better-sqlite3` is a native module — must be treated as a server-external package in the Next.js build
  - Next.js 16 has breaking changes vs training data — always read `node_modules/next/dist/docs/` before writing Next.js-specific code
  - The `pages` table stores `blocks` as a JSON string column (legacy); new structured content uses the `content_blocks` + `block_*` + `page_block_refs` tables. The PDF export currently reads only the legacy column — this duplication must be resolved

## 🧑‍💻 DEVELOPER PROFILE & PAIR-PROGRAMMING STYLE
* **Experience Level:** Intermediate full-stack developer; comfortable with React/TypeScript; learning Next.js App Router patterns.
* **Interaction Style:** Break tasks into small, focused steps. Explain architectural decisions briefly. Prefer editing existing files over creating new ones. Do not generate large code blocks without a quick plan check-in first.
* **Safety Rules:** Never commit `.env` files or hardcoded credentials. Never mutate production data silently — schema changes go through the migration system in `db.ts`. Confirm before destructive operations (delete page, drop column, etc.).

## 📈 PROGRESS LOG
*Status Key: [ ] Todo · [~] In Progress · [x] Done*

### Phase 1 — Core CMS (Local MVP)
- [x] Admin scaffold with sidebar navigation (`src/app/(admin)/layout.tsx`)
- [x] Dashboard with quick-access cards (`src/app/(admin)/page.tsx`)
- [x] Classes CRUD page (`/classes`)
- [x] Students CRUD page (`/students`)
- [x] Image upload with thumbnail generation (sharp) to local filesystem (`/images`, `/api/upload`)
- [x] Content blocks system — headline, text, image, gallery (`/content-blocks`)
- [x] Bidirectional page ↔ block references (`page_block_refs` table)
- [x] Layout editor — create, reorder, and delete pages (`/layout-editor`)
- [x] Page editor — link/unlink/reorder content blocks on a page (`/pages/[id]`)
- [x] Page preview route (`/pages/[id]/preview`)
- [x] PDF export via Puppeteer (`/export`, `/api/export/pdf`)
- [x] Book format settings — DIN A5/A4/A3/Square/US Letter (`/settings`)
- [x] Migration from Supabase (Postgres + Storage) to SQLite + local filesystem — `src/lib/db.ts` replaces `supabase.ts`/`storage.ts`; REST API routes under `src/app/api/*` replace direct Supabase client calls

### Phase 2 — Dockerization & Portability (CURRENT FOCUS)
- [x] Commit the uncommitted SQLite-migration + Docker changes (large modified/untracked set, see `git status`)
- [x] Versioned migration system in `db.ts` via `PRAGMA user_version` — schema changes auto-apply on startup ("nachinstallierbar"); concurrency-safe (`BEGIN IMMEDIATE` + version check inside tx, `busy_timeout`) because parallel Next build workers open the DB simultaneously
- [x] Central `src/lib/paths.ts`: `DATA_DIR` (env-overridable, default `./data`) holds DB + `uploads/` — single portable volume
- [x] Uploads moved from `public/uploads/` to `data/uploads/`, served via route handler `/uploads/[...path]` (immutable cache headers; URL scheme `/uploads/...` unchanged)
- [x] Fixed path traversal + added extension allowlist (jpg/jpeg/png/webp/gif) in `/api/upload`; delete route also hardened
- [x] `next.config.ts`: `output: 'standalone'` (better-sqlite3/puppeteer/sharp are auto-externalized in Next 16 — no `serverExternalPackages` needed)
- [x] `Dockerfile` (multi-stage, node:22-bookworm-slim) with system Chromium, `PUPPETEER_SKIP_DOWNLOAD=1`, `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`, `DATA_DIR=/app/data` + `.dockerignore`
- [x] `docker-compose.yml` — one service, one volume (`./data:/app/data`), port 3000
- [x] PDF export fixes: no base URL in `page.setContent` so relative `/uploads/...` images break; block content is interpolated unescaped (HTML injection)

### Phase 3 — Feature Expansion
- [x] Decide + implement: PDF renderer should read the new `content_blocks` tables, not (only) legacy `pages.blocks`
- [x] Preview page: render content respecting the selected book format dimensions
- [x] Gallery block editor UI — add/reorder images within a gallery block
- [x] Student page auto-generation — create student pages from student data
- [x] Image picker inside block forms — connect ImagePicker component fully
- [x] Class album linking — assign images to a class album and use in class pages

### Phase 4 — Hardening
- [ ] Authentication / access control (basic password protection is likely enough for an internal tool)
- [ ] Print bleed/margin configuration per book format
- [ ] Final PDF quality review and font embedding
- [ ] Backup story: document that backing up = copying the `data/` volume

## 📝 SESSION NOTES
*(Append newest notes to the top with dates. Focus on architectural decisions, hurdles, and changes to the baseline plan.)*

* **2026-07-19 (Feature-Erweiterung & PDF/Preview Fixes):** Phase 2 und Phase 3 vollständig abgeschlossen.
  - Die PDF-Generierung (`/api/export/pdf`) und die Seitenvorschau (`/pages/[id]/preview`) wurden migriert, um Blöcke aus dem neuen Datenbankschema (`content_blocks` / `page_block_refs`) über eine neue Hilfsfunktion `getPageBlocks` in `src/lib/pageBlocks.ts` zu laden.
  - Das Erstellen einer neuen Seite (`POST /api/pages`) initialisiert nun automatisch die Standard-Blöcke des Templates in den neuen Tabellen und verknüpft sie atomar über eine Datenbank-Transaktion.
  - Die Seitenvorschau wurde verbessert, um ein präzises Skalieren basierend auf dem ausgewählten Buchformat (A5, A4, A3, etc.) mit anpassbaren Zoom-Stufen (50%, 75%, 100%, 125%) in einer neuen Client-Komponente `PagePreviewClient` zu ermöglichen.
  - Ein API-Endpunkt zur automatischen Generierung von Steckbrief-Seiten (`POST /api/students/generate-pages`) wurde implementiert, und die UI im Schüler-Bereich bietet nun eine bequeme Ein-Klick-Generierung mit Schutz vor Duplikaten.
  - Bilder können nun in der Mediathek nachträglich bearbeitet (Dateiname, Alt-Text, Caption) und Alben (Klassen) zugewiesen werden.
  - Die ImagePicker-Komponente wurde erweitert, sodass sie beim Bearbeiten einer Klassenseite automatisch das passende Klassenalbum vorselektiert.

* **2026-07-19 (Windows-Ziel):** Deployment target is (also) a Windows machine → linux/amd64. Decision: no registry, the target builds natively (`docker compose up -d --build`); amd64 cross-build verified from the Mac via buildx. README gained a full Docker ops section (start, update, backup, Windows caveats). Important Windows caveat documented: SQLite on Windows bind mounts (project under `C:\`) has locking issues — recommended to clone into the WSL2 filesystem, alternatively use the named-volume variant now commented in `docker-compose.yml`.
* **2026-07-19 (Dockerisierung DB + Storage):** Phase 2 largely done. New: `src/lib/paths.ts` (DATA_DIR/UPLOADS_DIR), versioned migrations in `db.ts` (baseline = idempotent full schema, so pre-migration DBs at user_version 0 are adopted losslessly), `/uploads/[...path]` route handler, hardened `/api/upload` (folder sanitization, extension allowlist), `Dockerfile` + `.dockerignore` + `docker-compose.yml`, `output: 'standalone'`. **Hurdle:** parallel Next build workers all open the DB at build time ("collect page data") → SQLITE_BUSY; fixed with `busy_timeout=10000` + `BEGIN IMMEDIATE` transaction that re-checks `user_version` inside the tx. Also fixed 3 pre-existing TS errors that broke `next build` (`content-blocks/shared.ts`, `images/route.ts`, `pages/route.ts`). Verified: standalone server smoke-tested (migrations, upload, serving, traversal guard, restart idempotency). `public/uploads/` is empty/obsolete. Everything still uncommitted!

* **2026-07-19 (Repo-Analyse & Docker-Plan):** Full repo analysis done. Confirmed the codebase already runs fully local: better-sqlite3 (`data/jahrbuch.db`) + filesystem uploads; `supabase.ts`/`storage.ts` deleted, `supabase/schema.sql` is obsolete (kept only as historical reference — schema truth is `db.ts`). This document was stale (still described Supabase) and has been rewritten. Docker plan agreed: single container, standalone Next build, system Chromium for Puppeteer, single `data/` volume for DB + uploads, startup migrations via `PRAGMA user_version`. Findings to fix along the way: path traversal in `/api/upload` (`folder` param), PDF export can't resolve relative image URLs (`setContent` without base URL) and doesn't escape block HTML, PDF still reads only legacy `pages.blocks`. Next micro-step: commit current state, then build the migration system.
* **2026-06-18:** Settings page (`/settings`) and `bookFormats.ts` added — book format persisted in a `settings` key-value table. Cover/back-cover page types added to schema + templates.
* **Earlier:** Content blocks system built with a bidirectional reference table (`page_block_refs`) so blocks can be reused across pages. Thumbnails are generated server-side with sharp on upload (300px webp).

## ❓ OPEN QUESTIONS / BLOCKED ITEMS
- [ ] Should the PDF renderer pull content from the new `content_blocks` tables or from the legacy JSONB-style `pages.blocks` column? (Both exist; export currently uses only the legacy column.)
- [ ] What should the page preview look like — pixel-accurate WYSIWYG scaled to the book format, or a structured content list?
- [ ] Is authentication required before first use by a real school editor, or acceptable to stay unprotected while self-hosted internally?
- [ ] Docker host details beyond "a Windows machine" (NAS/VPS later?) — for now the answer is: build natively on the target via `docker compose up --build`, no registry needed.
