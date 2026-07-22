# 미디어 프리랜서 강사 소개 페이지 — 프로젝트 명세서

> 개인 브랜딩 웹사이트. 강사 소개 + 포트폴리오 + **자체 구축 블로그(에디터 포함)**.
> 핵심 목표: **방문자가 3초 안에 실력을 확인하고, 강의 문의까지 이어지게 만든다.**

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | 미디어 강사 개인 브랜딩 사이트 |
| 대상 사용자 | 잠재 수강생(개인), 출강 담당자(기업/기관), 협업 제안자 |
| 핵심 가치 | 비주얼 중심 포트폴리오 + 검색 유입용 블로그 + 문의 전환 |
| 콘텐츠 관리 | **자체 어드민 + WYSIWYG 에디터**로 글 작성/관리 (외부 CMS 없음) |

---

## 2. 페이지 구성 및 콘텐츠

### 2.1 공개 페이지 (Public)

#### 메인 `/`
| 섹션 | 내용 | 비고 |
|------|------|------|
| Hero | 프로필 사진(또는 쇼릴 배경 영상), 한 줄 포지셔닝 문구, CTA 버튼(강의 문의) | 첫 화면에서 "무엇을 가르치는 사람인지" 즉시 전달 |
| 쇼릴/대표작 | 대표 영상 1개 임베드 (YouTube/Vimeo) | 자동재생 무음 루프 고려 |
| 강의 분야 | 카드형 카테고리: 영상 편집 / 촬영 / 유튜브 운영 / SNS 콘텐츠 등 | 각 카드 → 상세 커리큘럼 페이지 |
| 출강 이력 | 기업·기관·학교 로고 그리드 또는 무한 롤링 배너 | 신뢰도 핵심 요소 |
| 수강생 후기 | 후기 카드 슬라이더 (이름, 소속, 코멘트, 별점) | 수강생 작품 비포/애프터 포함 시 효과 ↑ |
| 최신 블로그 | 최근 글 3~4개 카드 | DB에서 fetch |
| 문의 CTA | 문의 폼 or 카카오톡 채널/오픈채팅 버튼 | 페이지 하단 고정 배치 |

#### 소개 `/about`
- 경력 타임라인 (연도별), 자격증·수상·강의 실적 (누적 수강생 수 등 숫자 강조)
- 강의 철학 / 스타일, 미디어 노출 이력

#### 포트폴리오 `/works`
- 필터링 가능한 그리드 (영상 / 디자인 / 콘텐츠)
- 작품 상세: 임베드 영상 or 이미지 갤러리, 프로젝트 설명, 역할, 사용 툴

#### 강의 소개 `/lectures`
- 강의별 상세: 커리큘럼, 대상, 난이도, 진행 방식(온/오프라인), 신청/문의 CTA
- 강의 일정 캘린더 (Phase 3)

#### 블로그 `/blog`, `/blog/[slug]`
- 목록: 카테고리 필터 (강의 소식 / 튜토리얼 / 작업 일지), 태그, 검색, 페이지네이션
- 상세: 본문 렌더링, 목차(TOC) 자동 생성, 조회수, 이전/다음 글, 관련 글
- 코드 하이라이팅 (튜토리얼 글 대비), 영상 임베드 지원

#### 문의 `/contact`
- 폼: 이름, 연락처, 문의 유형(개인 수강/기업 출강/협업), 내용
- 제출 → 이메일 알림 + DB 저장
- 대안 채널: 카카오톡 채널, 이메일, 인스타그램 DM

### 2.2 어드민 페이지 (Admin) `/admin` — 🔒 인증 필수

| 기능 | 내용 |
|------|------|
| 로그인 | 관리자 단일 계정 (본인만 사용) |
| 대시보드 | 최근 문의, 글 목록, 조회수 요약 |
| 글 작성/수정 | **WYSIWYG 에디터**, 임시저장(draft), 발행/비공개 토글, 예약 발행(선택) |
| 이미지 업로드 | 에디터 내 드래그앤드롭 업로드 → 오브젝트 스토리지 저장 |
| 포트폴리오 관리 | 작품 CRUD, 노출 순서 변경 |
| 후기 관리 | 후기 CRUD, 공개/비공개 |
| 문의함 | 문의 목록, 상태 관리 (신규/답변완료) |
| SEO 설정 | 글별 meta description, OG 이미지 지정 |

### 2.3 공통
- 반응형 (모바일 우선), 헤더/푸터, SNS 링크, 다크모드(선택)

---

## 3. 기술 스택

### 3.1 프론트엔드

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | **Next.js 14+ (App Router)** | 공개 페이지 SSG/ISR로 SEO + 어드민은 CSR, 한 프로젝트로 해결 |
| 언어 | TypeScript | 전 구간 타입 안정성 |
| 스타일링 | Tailwind CSS | 빠른 반응형 구현 |
| 애니메이션 | Framer Motion | 포트폴리오 인터랙션 |
| 영상 임베드 | lite-youtube-embed / react-player | LCP 최적화 |

### 3.2 글 작성 에디터 (핵심 선택)

| 후보 | 특징 | 추천도 |
|------|------|--------|
| **Tiptap** | ProseMirror 기반, 확장성 최고, 커스텀 블록(영상 임베드, 콜아웃 등) 자유롭게 제작, JSON 저장 | ⭐ 1순위 |
| Toast UI Editor | 국산(NHN), 마크다운+WYSIWYG 듀얼 모드, 한글 문서 풍부 | 마크다운 선호 시 |
| Lexical | Meta 제작, 성능 좋음, 아직 생태계 성장 중 | 대안 |
| BlockNote | Tiptap 기반 노션 스타일 블록 에디터, 빠른 구축 | 노션 UX 원하면 |

**추천: Tiptap**
- 저장 포맷: JSON (Tiptap document) → 렌더링 시 HTML 변환 or `generateHTML`
- 필요 확장: Image, Link, CodeBlock(lowlight), Youtube embed, Placeholder, Table
- 서버 렌더링: 공개 페이지에서는 저장된 JSON → HTML 변환 후 정적 렌더 (에디터 번들 미포함 → 성능 확보)

### 3.3 백엔드 / 데이터

| 영역 | 선택 | 비고 |
|------|------|------|
| API | Next.js Route Handlers (또는 Server Actions) | 별도 서버 불필요 |
| DB | **PostgreSQL** | 글/포트폴리오/후기/문의 저장 |
| ORM | **Prisma** | 스키마 관리, 타입 자동 생성 |
| DB 호스팅 | Supabase / Neon | 무료 티어로 시작 가능 |
| 인증 | **Auth.js (NextAuth v5)** — Credentials 단일 관리자 | 미들웨어로 `/admin/*` 보호 |
| 이미지 스토리지 | **Cloudflare R2** (또는 S3, Supabase Storage) | R2는 egress 무료 — 이미지 많은 미디어 블로그에 유리 |
| 이미지 처리 | 업로드 시 리사이즈/WebP 변환 (sharp) + next/image | |
| 이메일 알림 | Resend | 문의 접수 알림 |
| 검색 | Postgres full-text search (초기) → 필요 시 확장 | 글 수백 개 수준이면 충분 |

### 3.4 인프라 / 기타

| 영역 | 선택 | 비고 |
|------|------|------|
| 배포 | Vercel | ISR + on-demand revalidation (글 발행 시 해당 경로 revalidate) |
| 스팸 방지 | Cloudflare Turnstile | 문의 폼 |
| 분석 | GA4 또는 Vercel Analytics | 블로그 → 문의 전환 추적 |
| SEO | next-sitemap(동적 생성), 글별 메타태그, `@vercel/og`로 OG 이미지 자동 생성, RSS 피드 | |

---

## 4. DB 스키마 (Prisma 기준)

```prisma
model Post {
  id          String    @id @default(cuid())
  title       String
  slug        String    @unique
  content     Json      // Tiptap JSON document
  excerpt     String?   // 목록/SEO용 요약
  thumbnail   String?
  category    Category  @relation(fields: [categoryId], references: [id])
  categoryId  String
  tags        Tag[]
  status      PostStatus @default(DRAFT) // DRAFT | PUBLISHED
  publishedAt DateTime?
  viewCount   Int       @default(0)
  metaDesc    String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Category {
  id    String @id @default(cuid())
  name  String @unique  // 강의 소식 / 튜토리얼 / 작업 일지
  slug  String @unique
  posts Post[]
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  posts Post[]
}

model Work {           // 포트폴리오
  id          String  @id @default(cuid())
  title       String
  category    String  // 영상 / 디자인 / 콘텐츠
  videoUrl    String?
  thumbnail   String
  description String
  tools       String[]
  order       Int     @default(0)
  visible     Boolean @default(true)
}

model Testimonial {
  id          String  @id @default(cuid())
  name        String
  affiliation String?
  content     String
  rating      Int
  visible     Boolean @default(true)
}

model Inquiry {
  id        String   @id @default(cuid())
  name      String
  contact   String
  type      String   // 개인 수강 / 기업 출강 / 협업
  message   String
  status    String   @default("신규")
  createdAt DateTime @default(now())
}

model User {           // 관리자
  id       String @id @default(cuid())
  email    String @unique
  password String // bcrypt hash
}
```

---

## 5. 핵심 플로우

### 글 발행 플로우
```
어드민 에디터 작성 → 임시저장(DRAFT) → 발행 버튼
→ status=PUBLISHED, publishedAt 기록
→ revalidatePath('/blog') + revalidatePath('/blog/[slug]') + sitemap 갱신
```

### 이미지 업로드 플로우
```
에디터 드래그앤드롭 → presigned URL 발급 API → 클라이언트에서 R2 직접 업로드
→ (서버) sharp로 WebP 변환·리사이즈 → 에디터에 URL 삽입
```

---

## 6. 개발 단계 (Phase)

### Phase 1 — MVP (2~3주)
- [ ] DB/Prisma 셋업, 관리자 인증
- [ ] 어드민: Tiptap 에디터 + 글 CRUD + 이미지 업로드
- [ ] 공개 블로그: 목록/상세, 카테고리 필터
- [ ] 메인 페이지 (Hero, 강의 분야, 출강 이력, CTA)
- [ ] 문의 폼 (이메일 알림 + DB 저장)
- [ ] 반응형 + 기본 SEO

### Phase 2 — 확장
- [ ] 포트폴리오/후기 어드민 CRUD + 공개 페이지
- [ ] 강의 상세 페이지
- [ ] TOC, 관련 글, 조회수, RSS
- [ ] OG 이미지 자동 생성, sitemap
- [ ] 글 검색 (Postgres FTS)

### Phase 3 — 고도화
- [ ] 예약 발행 (cron / Vercel Cron)
- [ ] 강의 일정 캘린더
- [ ] 어드민 대시보드 (조회수 통계)
- [ ] 다크모드, 뉴스레터(선택)

---

## 7. 주의사항 / 리스크

1. **에디터 콘텐츠 저장 포맷** — HTML 문자열보다 Tiptap JSON 저장 권장. 추후 렌더러 교체·마이그레이션·검색 인덱싱에 유리. XSS 방지 위해 렌더링 시 sanitize 필수.
2. **에디터 번들 크기** — 공개 페이지에는 에디터를 절대 포함하지 말 것. JSON → HTML 서버 변환으로 분리.
3. **이미지 비용/성능** — 미디어 블로그 특성상 이미지가 많음. R2(egress 무료) + WebP 변환 + next/image로 대응.
4. **slug 충돌** — 한글 제목 → slug 자동 생성 시 중복/인코딩 처리 로직 필요.
5. **백업** — 자체 DB이므로 정기 백업 설정 (Supabase/Neon 자동 백업 확인).
6. **영상 임베드 성능** — YouTube iframe 다수 삽입 시 LCP 악화 → facade 패턴 적용.
7. **문의 폼 스팸** — Turnstile 필수.

---

## 8. 성공 지표 (KPI)

- 블로그 검색 유입 수 (GA4 organic)
- 문의 폼 제출 수 / 방문자 대비 전환율
- 포트폴리오 페이지 평균 체류 시간
- 모바일 Lighthouse 성능 점수 90+ 유지
