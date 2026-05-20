-- ============================================================
-- Jahrbuch CMS – Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Classes
create table if not exists classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz default now()
);

-- Students
create table if not exists students (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  class_id    uuid references classes(id) on delete set null,
  images      text[] default '{}',   -- Supabase Storage public URLs
  bio_text    text,
  created_at  timestamptz default now()
);

-- Pages (yearbook pages)
create table if not exists pages (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in ('cover','back_cover','class_page','student_page','event_page','editorial')),
  title        text not null,
  blocks       jsonb not null default '[]',
  order_index  integer not null default 0,
  created_at   timestamptz default now()
);

-- Images
create table if not exists images (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,
  public_url   text not null,
  name         text not null,
  album_id     uuid references classes(id) on delete set null,
  created_at   timestamptz default now()
);

-- ── Images: metadata fields ──────────────────────────────────────────────────
alter table images add column if not exists alt_text text    not null default '';
alter table images add column if not exists caption  text    not null default '';
alter table images add column if not exists tags     text[]  not null default '{}';

-- ── Content blocks registry ───────────────────────────────────────────────────
create table if not exists content_blocks (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('headline','text','image','gallery')),
  label      text not null,
  created_at timestamptz default now()
);

-- Headline block
create table if not exists block_headlines (
  block_id uuid primary key references content_blocks(id) on delete cascade,
  content  text not null default '',
  level    int  not null default 1 check (level between 1 and 3)
);

-- Text block
create table if not exists block_texts (
  block_id uuid primary key references content_blocks(id) on delete cascade,
  content  text not null default ''
);

-- Image block (references images table; fields can override image defaults)
create table if not exists block_images (
  block_id uuid primary key references content_blocks(id) on delete cascade,
  image_id uuid references images(id) on delete set null,
  alt_text text not null default '',
  caption  text not null default '',
  tags     text[] not null default '{}'
);

-- Gallery block
create table if not exists block_galleries (
  block_id uuid primary key references content_blocks(id) on delete cascade,
  columns  int  not null default 3 check (columns between 2 and 4)
);

-- Gallery items (each image in a gallery, with its own metadata)
create table if not exists block_gallery_items (
  id          uuid primary key default gen_random_uuid(),
  gallery_id  uuid not null references block_galleries(block_id) on delete cascade,
  image_id    uuid references images(id) on delete cascade,
  alt_text    text   not null default '',
  caption     text   not null default '',
  tags        text[] not null default '{}',
  order_index int    not null default 0
);

-- ── Bidirectional page ↔ block references ─────────────────────────────────────
create table if not exists page_block_refs (
  page_id     uuid not null references pages(id)          on delete cascade,
  block_id    uuid not null references content_blocks(id) on delete cascade,
  order_index int  not null default 0,
  primary key (page_id, block_id)
);

-- Disable RLS for new tables
alter table content_blocks       disable row level security;
alter table block_headlines      disable row level security;
alter table block_texts          disable row level security;
alter table block_images         disable row level security;
alter table block_galleries      disable row level security;
alter table block_gallery_items  disable row level security;
alter table page_block_refs      disable row level security;


-- ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('jahrbuch26', 'jahrbuch26', true)
on conflict (id) do nothing;

-- ── RLS: disabled for internal-only use (no auth) ────────────────────────────
-- If RLS was accidentally enabled on any table, run these to allow all access:
alter table classes  disable row level security;
alter table students disable row level security;
alter table pages    disable row level security;
alter table images   disable row level security;

-- ── Storage RLS policies for the jahrbuch26 bucket ───────────────────────────
-- Allow anyone to upload, read, update, and delete objects in the bucket.
create policy "Public upload jahrbuch26"
  on storage.objects for insert
  with check (bucket_id = 'jahrbuch26');

create policy "Public read jahrbuch26"
  on storage.objects for select
  using (bucket_id = 'jahrbuch26');

create policy "Public update jahrbuch26"
  on storage.objects for update
  using (bucket_id = 'jahrbuch26');

create policy "Public delete jahrbuch26"
  on storage.objects for delete
  using (bucket_id = 'jahrbuch26');
