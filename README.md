# 달팽이 그림책 연구소

미디어 리터러시 · 그림책 · 아동심리학 강의를 하는 강사 최미선의 공개 사이트이자,
강의 문의부터 일정 관리까지 이어지는 1인 업무 도구입니다.

공개 페이지(소개 · 강의 · 블로그 · 자료실)와 관리자 화면이 한 프로젝트 안에 있고,
갤럭시 앱([snail_lab_app](https://github.com/snailbooklab/snail_lab_app))과 하나의 Supabase를 공유합니다.

---
 

## 이 프로젝트가 푸는 문제

강의 문의는 대부분 **카톡·문자로** 옵니다. 하루에도 여러 건이 다른 대화들 사이에 섞여 들어오고,
그중 하나를 놓치면 강의 하나를 놓칩니다.

그래서 폰에 도착한 알림을 앱이 가로채 서버로 보내고, 서버가 강의 관련 메시지만 걸러
유형을 나누고 필요한 값(기관 · 날짜 · 인원 · 연락처)을 뽑아 **알림함**에 쌓습니다.
거기서 버튼 한 번이면 캘린더 일정이 되고, 그 일정은 다시 폰의 알람으로 돌아옵니다.

```
카톡·문자 알림
   ↓ 앱이 가로챔 (기기 필터: 앱 패키지 · 중복 · 빈 내용)
POST /api/notifications/ingest
   ↓ 키워드 1차 필터 → 통과분만 저장
   ↓ 응답을 먼저 돌려주고, 분류는 그 뒤에 (AI)
알림함  →  일정 만들기  →  일정 변경 웹훅  →  폰 로컬 알람 · 위젯
```

1차 필터를 **저장하기 전에** 두는 것이 이 파이프라인의 핵심 제약입니다.
이 엔드포인트로는 강의와 무관한 사적인 대화까지 올라오는데, 일단 저장하고 상태만 바꾸면
원문이 서버에 남기 때문입니다. 걸러진 메시지는 DB에 들어가지 않습니다.

---

## 기능

### 공개 페이지

| 경로 | 내용 |
|---|---|
| `/` | 랜딩 — 강의 분야 세 갈래와 소개 |
| `/about` | 강사 소개와 이력 |
| `/lectures` | 강의 목록 — 분야 · 대상 · 커리큘럼 |
| `/blog`, `/blog/[slug]` | 블로그. 상세는 SSG + ISR |
| `/resources` | 자료실 — 공개로 설정된 파일만 내려받기 |
| `/contact` | 강의 문의 |

### 관리자 (`/admin`, 로그인 필요)

- **캘린더** — 일정 등록·수정·반복 생성, 당일 알림 시각 지정. 변경은 실시간으로 앱과 공유됩니다.
- **알림함** — 분류된 카톡·문자 문의를 유형별로 보고, 확인 처리하거나 바로 일정으로 만듭니다.
- **글 · 강의 작성** — Tiptap 에디터. 이미지는 붙여넣기·드래그로 바로 업로드됩니다.
- **강의안 초안 생성** — 강의계획서 PDF를 넣으면 소개·대상·커리큘럼 초안이 채워집니다.
- **자료실 관리** — 업로드, 공개 여부 토글, 삭제(파일과 메타를 함께).

---

## 기술 스택

- **Next.js 16** (App Router) · **React 19** · TypeScript
- **Tailwind CSS v4** — 색·타이포·라운드 토큰은 `app/globals.css` 한 곳에서 관리
- **Supabase** — Postgres(RLS) · Auth · Storage · Realtime
- **TanStack Query** — 서버 액션 위에 캐시·낙관적 갱신
- **Vercel AI SDK + Anthropic Claude** — 알림 분류, 강의안 초안 생성
- **Tiptap** — 본문 편집·렌더링 (저장은 JSON, 출력은 정제된 HTML)

---

## 구조

```
app/
├ page.tsx  about/  lectures/  blog/  resources/  contact/   공개 페이지
├ admin/
│  ├ calendar/        일정 · 반복 · 구형 앱 백업 이관
│  ├ notifications/   알림함
│  ├ blog/new/  lectures/new/  archive/
│  └ login/
├ api/
│  ├ notifications/ingest/       앱 → 서버 (알림 수집)
│  │   └ _lib/  lectureFilter · classify · pipeline
│  └ webhooks/schedule-changed/  DB → 서버 (기기 재동기화)
├ _lib/     supabase 클라이언트 3종 · 공용 타입 · 업로드 · SEO
└ _components/
proxy.ts              세션 갱신 + /admin 접근 제어
supabase/schema.sql   테이블 · RLS · 트리거의 단일 원본
```

라우트 폴더마다 `_actions`(서버) · `_hooks`(클라이언트) · `_lib`(순수 함수)를 함께 둡니다.
앱 저장소도 같은 역할을 `api/` · `hooks/` · `lib/`로 나눠, 한쪽을 고칠 때 다른 쪽 대응 파일을 바로 찾을 수 있습니다.

---

## 시작하기

```bash
npm install
touch .env.local   # 아래 표의 값을 채웁니다
npm run dev
```

DB는 Supabase 대시보드의 SQL Editor에서 `supabase/schema.sql`을 실행해 만듭니다.
테이블·인덱스·RLS 정책·트리거가 모두 이 파일 하나에 있고, 여러 번 실행해도 안전합니다.
파일 끝의 웹훅 트리거는 실행 전에 `<SITE_URL>`과 `<SCHEDULE_WEBHOOK_SECRET>`을 실제 값으로 바꿔야 합니다.

### 환경변수

| 이름 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 주소 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저용 공개 키 — 실제 방어선은 RLS |
| `NEXT_PUBLIC_SITE_URL` | 메타데이터·공유 카드의 기준 주소 |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS 우회. 아래 두 API 라우트에서만 사용 |
| `NOTIFY_INGEST_SECRET` | 앱 → 인제스트 라우트 인증 |
| `SCHEDULE_WEBHOOK_SECRET` | DB 트리거 → 웹훅 라우트 인증 |
| `ANTHROPIC_API_KEY` | 알림 분류 · 강의안 생성 |
| `ANTHROPIC_MODEL` | (선택) 기본값 `claude-haiku-4-5-20251001` |

`NEXT_PUBLIC_` 이 붙은 값만 브라우저 번들에 들어갑니다. 나머지는 서버에서만 읽히며,
특히 service-role 키는 어떤 경로로도 클라이언트에 노출되면 안 됩니다.

---

## 데이터 모델

| 테이블 | 담는 것 | 읽기 |
|---|---|---|
| `posts` | 블로그 글 (Tiptap JSON 본문) | 공개 — 발행된 글만 |
| `lectures` | 강의 소개 · 커리큘럼 | 공개 — 발행된 것만 |
| `resources` | 자료실 파일 메타 | 공개 — 공개 설정된 것만 |
| `schedules` | 강사 일정 · 알림 시각 | 관리자 |
| `notification_events` | 가로챈 알림과 분류 결과 | 관리자 |
| `expo_push_tokens` | 기기 푸시 토큰 | 관리자 |

Storage 버킷은 둘입니다. `media`는 공개 읽기(썸네일·본문 이미지),
`resources`는 파일의 공개 여부를 `resources` 테이블에서 조회해 판단하므로 DB 한 줄로 링크를 막을 수 있습니다.

---

## 함께 쓰는 앱

[snail_lab_app](https://github.com/snailbooklab/snail_lab_app) — Expo · 안드로이드 전용.
폰에서만 할 수 있는 일을 맡습니다.

- 카톡·문자 알림 감지 (`NotificationListenerService`)
- 기기 로컬 알람 — 서버가 시각 맞춰 푸시를 쏘는 대신, 기기에 직접 예약합니다
- 홈·잠금화면 위젯
- 캘린더 · 알림함 (웹 관리자 화면과 같은 데이터)

두 저장소는 코드를 공유하지 않고 **스키마와 규약**만 공유합니다.

---

## 배포

Vercel에 배포합니다. 위 환경변수를 프로젝트 설정에 넣고, `main` 브랜치에 푸시하면 반영됩니다.
