-- Supabase SQL Editor에서 실행하세요. (Dashboard > SQL Editor > New query)

-- ------------------------------------------------------------------
--  posts
-- ------------------------------------------------------------------
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text unique not null,
  content      jsonb not null,              -- Tiptap JSON document
  excerpt      text,
  thumbnail    text,
  category     text not null,
  tags         text[] not null default '{}',
  status       text not null default 'DRAFT', -- DRAFT | PUBLISHED
  published_at timestamptz,
  view_count   integer not null default 0,
  meta_desc    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists posts_status_published_at_idx
  on public.posts (status, published_at desc);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
--  lectures
-- ------------------------------------------------------------------
create table if not exists public.lectures (
  id          uuid primary key default gen_random_uuid(),
  field       text not null,                 -- media-literacy | picture-book | child-psychology
  title       text not null,
  slug        text unique not null,
  level       text,
  mode        text,
  target      text,
  intro       text,
  tone        jsonb,
  curriculum  text[] not null default '{}',
  status      text not null default 'DRAFT', -- DRAFT | PUBLISHED
  "order"     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists lectures_set_updated_at on public.lectures;
create trigger lectures_set_updated_at
  before update on public.lectures
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
--  RLS 정책
--  읽기: 누구나(anon) 가능. 쓰기: 로그인한 사용자(authenticated)만.
--  → /admin 은 Supabase Auth 로그인으로 보호되고, 서버 액션은 세션 쿠키를
--    태우므로 로그인한 관리자만 insert/update/delete 가능합니다.
-- ------------------------------------------------------------------
alter table public.posts    enable row level security;
alter table public.lectures enable row level security;

-- posts
drop policy if exists "posts read"   on public.posts;
drop policy if exists "posts write"  on public.posts;
create policy "posts read"  on public.posts for select using (true);
create policy "posts write" on public.posts for all
  to authenticated using (true) with check (true);

-- lectures
alter table public.lectures add column if not exists thumbnail text;
drop policy if exists "lectures read"  on public.lectures;
drop policy if exists "lectures write" on public.lectures;
create policy "lectures read"  on public.lectures for select using (true);
create policy "lectures write" on public.lectures for all
  to authenticated using (true) with check (true);


-- ------------------------------------------------------------------
--  Storage: 이미지 업로드 버킷 (public 읽기 / authenticated 쓰기)
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
drop policy if exists "media auth write"  on storage.objects;
create policy "media public read" on storage.objects
  for select to public using (bucket_id = 'media');
create policy "media auth write" on storage.objects
  for all to authenticated
  using (bucket_id = 'media') with check (bucket_id = 'media');
