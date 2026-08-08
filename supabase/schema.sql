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

    -- ------------------------------------------------------------------
    --  강사 일정 (관리자 전용): schedules 테이블
    --  읽기·쓰기 모두 로그인한 관리자(authenticated)만. 공개 페이지 없음.
    -- ------------------------------------------------------------------
    create table if not exists public.schedules (
      id          uuid primary key default gen_random_uuid(),
      date        date not null,
      title       text not null,
      memo        text,
      created_at  timestamptz not null default now(),
      updated_at  timestamptz not null default now()
    );

    create index if not exists schedules_date_idx on public.schedules (date);

    drop trigger if exists schedules_set_updated_at on public.schedules;
    create trigger schedules_set_updated_at
      before update on public.schedules
      for each row execute function public.set_updated_at();

    alter table public.schedules enable row level security;
    drop policy if exists "schedules admin all" on public.schedules;
    create policy "schedules admin all" on public.schedules for all
      to authenticated using (true) with check (true);

    -- 일정 알림: 각 일정의 알림 시각(remind_at). 네이티브 앱(choi-media-calendar-app)이 이 값으로
    -- 기기 로컬 알림을 예약한다. remind_sent는 컬럼만 유지(앱 insert가 기본값으로 세팅) — 소비하는
    -- 크론은 없다. 예전 PWA 웹푸시 크론은 네이티브 전환으로 제거됨.
    alter table public.schedules add column if not exists remind_at timestamptz;
    alter table public.schedules add column if not exists remind_sent boolean not null default false;

    create index if not exists schedules_remind_at_idx
      on public.schedules (remind_at)
      where remind_at is not null and remind_sent = false;

    -- ------------------------------------------------------------------
    --  Realtime: 갤럭시 Expo 앱이 schedules 변경을 구독한다(choi-media-calendar-app).
    --  publication에 등록된 테이블만 postgres_changes 이벤트가 발행되므로 RLS와 별개로 필요.
    -- ------------------------------------------------------------------
    do $$
    begin
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedules'
      ) then
        alter publication supabase_realtime add table public.schedules;
      end if;
    end $$;

    -- ------------------------------------------------------------------
    --  바이브 코딩 — 수강생 사전 등록 + OpenAI API 키 자동 발급
    --
    --  흐름: 관리자가 /admin/vibe-coding에서 이름·전화번호·과정명을 사전 등록 → 수강생이
    --  /vibe-coding에서 같은 값으로 본인인증 → 서버(/api/vibe-coding/issue)가 service_role로
    --  대조 후 OpenAI Project + 그 프로젝트 전용 Service Account(=API 키)를 발급한다.
    --  키 값 자체는 절대 저장하지 않는다 — service_account/키 id만 남기고, 값은 발급 응답에서
    --  단 한 번만 내려준다. 분실 시 관리자가 재발급을 허용(기존 프로젝트 archive + 상태 초기화)한다.
    --
    --  예산 감시: 프로젝트별 "금액" 한도는 OpenAI API로 설정할 수 없어(대시보드 전용),
    --  /api/cron/vibe-budget-guard가 주기적으로 Costs API를 조회해 학생별 누적 지출이
    --  OPENAI_PROJECT_BUDGET_KRW를 넘으면 프로젝트를 archive하고 status를 BLOCKED로 바꾼다.
    --  BLOCKED는 PENDING과 달리 본인인증 페이지에서 스스로 재발급받을 수 없고, 관리자가
    --  "재발급 허용"을 눌러야만 다시 PENDING으로 풀린다(예산 초과를 셀프 우회하지 못하게).
    --
    --  RLS: anon 정책을 아예 두지 않는다 = 기본 거부. 관리자 페이지는 로그인 세션(authenticated)
    --  으로 CRUD하고, 본인인증·키 발급·예산 감시는 로그인 세션이 없는 호출이므로
    --  supabaseAdmin()(service_role)으로 RLS를 우회해 서버에서만 처리한다.
    -- ------------------------------------------------------------------
    create table if not exists public.vibe_students (
      id                         uuid primary key default gen_random_uuid(),
      name                       text not null,
      phone                      text not null,                    -- 숫자만 정규화해 저장(01012345678)
      course_id                  text not null,                    -- 과정명(자유 입력)
      status                     text not null default 'PENDING',  -- PENDING | ISSUED | BLOCKED
      openai_project_id          text,
      openai_service_account_id text,
      openai_api_key_id          text,                             -- 키 id만 저장(실제 키 값은 저장 안 함)
      issued_at                  timestamptz,
      budget_blocked_at          timestamptz,                      -- 예산 감시 크론이 자동 차단한 시각
      created_at                 timestamptz not null default now(),
      updated_at                 timestamptz not null default now()
    );

    alter table public.vibe_students add column if not exists budget_blocked_at timestamptz;

    create unique index if not exists vibe_students_identity_idx
      on public.vibe_students (name, phone, course_id);

    drop trigger if exists vibe_students_set_updated_at on public.vibe_students;
    create trigger vibe_students_set_updated_at
      before update on public.vibe_students
      for each row execute function public.set_updated_at();

    alter table public.vibe_students enable row level security;
    drop policy if exists "vibe_students admin all" on public.vibe_students;
    create policy "vibe_students admin all" on public.vibe_students for all
      to authenticated using (true) with check (true);
    -- anon용 정책은 의도적으로 없음 — select/insert/update/delete 전부 기본 거부.

    -- ------------------------------------------------------------------
    --  expo_push_tokens (관리자 전용): 갤럭시 Expo 앱의 FCM 푸시 토큰.
    --  schedules가 바뀌면 /api/webhooks/schedule-changed가 이 토큰들로 "조용한" 푸시를 보내서
    --  앱을 깨우고, 앱은 그 신호로 로컬 알림(remind_at)을 다시 동기화한다. 실제 알람 표시는
    --  여전히 기기의 로컬 알림이 담당 — 이 테이블/푸시는 순수 "동기화 트리거" 용도.
    -- ------------------------------------------------------------------
    create table if not exists public.expo_push_tokens (
      id          uuid primary key default gen_random_uuid(),
      token       text unique not null,
      created_at  timestamptz not null default now()
    );

    alter table public.expo_push_tokens enable row level security;
    drop policy if exists "expo_push_tokens admin all" on public.expo_push_tokens;
    create policy "expo_push_tokens admin all" on public.expo_push_tokens for all
      to authenticated using (true) with check (true);

    -- ------------------------------------------------------------------
    --  schedules 변경 → /api/webhooks/schedule-changed 호출 (pg_net으로 직접, Supabase 대시보드의
    --  Database Webhooks 기능은 안 씀 — 그 기능은 내부적으로 supabase_functions 스키마가 필요한데
    --  이 프로젝트에서 프로비저닝이 안 돼 있어서 pg_net 확장으로 직접 트리거를 건다).
    --  실행 전에 아래 두 자리표시자를 실제 값으로 바꿔서 SQL Editor에서 실행할 것:
    --    <SITE_URL>            예: https://snailbook.cloud
    --    <SCHEDULE_WEBHOOK_SECRET>   .env의 SCHEDULE_WEBHOOK_SECRET 값과 동일해야 함
    -- ------------------------------------------------------------------
    create or replace function public.notify_schedule_changed()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $$
    begin
      perform net.http_post(
        url := '<SITE_URL>/api/webhooks/schedule-changed',
        body := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', '<SCHEDULE_WEBHOOK_SECRET>'
        )
      );
      return null;
    end;
    $$;

    drop trigger if exists schedules_notify_changed on public.schedules;
    create trigger schedules_notify_changed
      after insert or update or delete on public.schedules
      for each statement execute function public.notify_schedule_changed();


    -- ------------------------------------------------------------------
    --  notification_events (관리자 전용): 갤럭시 앱이 가로챈 카톡/문자 알림.
    --
    --  흐름: 앱(NotificationListenerService) → /api/notifications/ingest
    --        → 원문을 pending으로 즉시 저장 → 키워드 1차 필터 → 통과분만 AI 분류.
    --  앱은 "기기에만 있는 정보"(패키지·알림 플래그·중복)로만 거르고, 계속 손보게 될
    --  키워드 규칙은 서버(lectureFilter.ts)에 둔다 — 재빌드 없이 고치고, 걸러진 것도
    --  filtered로 남겨서 "놓친 문의"를 관리자 페이지에서 확인·교정할 수 있게.
    --
    --  insert는 라우트 핸들러가 service_role로 하므로(로그인 세션 없음) anon 정책은 두지 않는다.
    -- ------------------------------------------------------------------
    create table if not exists public.notification_events (
      id           uuid primary key default gen_random_uuid(),
      device_id    text not null,
      app_package  text not null,               -- com.kakao.talk 등
      source       text not null,               -- kakao | sms | other
      sender       text,                        -- 알림 제목 = 발신자/방 이름
      body         text not null,
      posted_at    timestamptz not null,        -- 기기에서 알림이 뜬 시각
      -- 카톡은 같은 메시지를 갱신하며 여러 번 post 한다. 앱의 메모리 LRU는 프로세스가 재시작되면
      -- 비므로, 이 unique 제약이 최종 방어선이다(라우트는 23505를 정상으로 보고 200을 돌려준다).
      dedupe_key   text unique not null,

      status       text not null default 'pending',  -- pending | classified | filtered | error
      filter_reason text,                       -- blocked | no_content | low_score
      filter_score integer,
      category     text,                        -- 강의문의|시간조율|강의취소|강사모집|강의확정|정산/계약|기타
      confidence   real,
      summary      text,
      extracted    jsonb,
      needs_action boolean not null default false,

      is_read      boolean not null default false,
      handled      boolean not null default false,
      schedule_id  uuid references public.schedules(id) on delete set null,
      error        text,

      created_at   timestamptz not null default now(),
      updated_at   timestamptz not null default now()
    );

    create index if not exists notification_events_created_idx
      on public.notification_events (created_at desc);
    create index if not exists notification_events_inbox_idx
      on public.notification_events (status, needs_action, created_at desc);
    create index if not exists notification_events_category_idx
      on public.notification_events (category, created_at desc);

    drop trigger if exists notification_events_set_updated_at on public.notification_events;
    create trigger notification_events_set_updated_at
      before update on public.notification_events
      for each row execute function public.set_updated_at();

    alter table public.notification_events enable row level security;
    drop policy if exists "notification_events admin all" on public.notification_events;
    create policy "notification_events admin all" on public.notification_events for all
      to authenticated using (true) with check (true);

    -- Realtime: publication에 등록된 테이블만 postgres_changes 이벤트가 발행된다(schedules와 동일).
    -- /admin/notifications가 INSERT를 실시간으로 받으려면 필수.
    do $$
    begin
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public' and tablename = 'notification_events'
      ) then
        alter publication supabase_realtime add table public.notification_events;
      end if;
    end $$;
