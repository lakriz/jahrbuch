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

─────────────────────────────────────────────────────────
-- Create a public bucket called "images" in the Supabase dashboard
-- or run:
--
--   insert into storage.buckets (id, name, public)
--   values ('images', 'images', true);
--
-- ── RLS (disable for internal-only use, enable if auth is added) ─────────────
-- alter table classes  enable row level security;
-- alter table students enable row level security;
-- alter table pages    enable row level security;
