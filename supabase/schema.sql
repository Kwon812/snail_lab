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


-- ------------------------------------------------------------------
--  자료실 (관리자 전용): resources 테이블 + 비공개 스토리지 버킷
--  읽기·쓰기·다운로드 모두 로그인한 관리자(authenticated)만.
-- ------------------------------------------------------------------
create table if not exists public.resources (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  path        text not null,           -- 비공개 버킷 내 파일 경로
  file_name   text not null,
  file_type   text,                    -- mime type
  file_size   bigint,                  -- bytes
  is_public   boolean not null default false, -- true인 자료만 /resources 공개 페이지에 노출
  created_at  timestamptz not null default now()
);

alter table public.resources add column if not exists is_public boolean not null default false;

alter table public.resources enable row level security;
drop policy if exists "resources admin all" on public.resources;
create policy "resources admin all" on public.resources for all
  to authenticated using (true) with check (true);

-- 목록(제목·설명 등)은 누구나 조회 가능. 실제 파일 다운로드는 is_public = true인 것만 —
-- storage.objects의 "resources bucket public read" 정책에서 별도로 강제한다.
drop policy if exists "resources public read" on public.resources;
create policy "resources public read" on public.resources for select
  to public using (true);

-- 비공개 버킷 (public: false) → 서명 URL로만 다운로드
insert into storage.buckets (id, name, public)
values ('resources', 'resources', false)
on conflict (id) do nothing;

drop policy if exists "resources bucket admin" on storage.objects;
create policy "resources bucket admin" on storage.objects
  for all to authenticated
  using (bucket_id = 'resources') with check (bucket_id = 'resources');

-- 공개 자료의 파일도 서명 URL 발급이 가능해야 하므로, 해당 파일 경로에 한해 익명 select 허용
drop policy if exists "resources bucket public read" on storage.objects;
create policy "resources bucket public read" on storage.objects
  for select to public
  using (
    bucket_id = 'resources'
    and exists (
      select 1 from public.resources r
      where r.path = storage.objects.name and r.is_public = true
    )
  );
