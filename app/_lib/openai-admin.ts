/**
 * OpenAI Admin API (Organization API) 클라이언트 — 수강생별 Project + Project 전용
 * Service Account(=API 키)를 발급하는 데 쓴다. Organization Owner가 발급한 Admin API 키가
 * 필요하다 (https://platform.openai.com/settings/organization/admin-keys).
 *
 * Service Account를 쓰는 이유: 일반 Project API 키는 대시보드에서 사람이 만들어야 하지만,
 * Service Account는 API로 만들 수 있고 생성 응답에 실제 키 값이 그 순간에만 포함된다 —
 * "발급 즉시 1회만 노출" 요구사항과 정확히 맞는다.
 */
import "server-only"; // 조직 전체 권한의 Admin 키를 다루므로 클라이언트 번들에 섞이면 빌드 타임에 바로 에러가 나게 한다.

const OPENAI_API_BASE = "https://api.openai.com/v1";

function adminKey(): string {
  const key = process.env.OPENAI_ADMIN_API_KEY;
  if (!key) throw new Error("OPENAI_ADMIN_API_KEY가 설정되지 않았습니다.");
  return key;
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${OPENAI_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${adminKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI Admin API 오류 (${res.status}): ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export type OpenAIProject = {
  id: string;
  object: "organization.project";
  name: string;
  created_at: number;
  archived_at: number | null;
  status: "active" | "archived";
};

export async function createOpenAIProject(name: string): Promise<OpenAIProject> {
  return adminFetch<OpenAIProject>("/organization/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function archiveOpenAIProject(projectId: string): Promise<void> {
  await adminFetch(`/organization/projects/${projectId}/archive`, { method: "POST" });
}

/**
 * Service Account를 지운다. Service Account 소속 API 키는 일반 API 키 삭제 엔드포인트로
 * 지울 수 없고(OpenAI가 에러로 거절함) 반드시 이 엔드포인트로 service account 자체를
 * 지워야 한다 — 학생 키를 실제로 죽이는 데 꼭 필요한 호출.
 */
export async function deleteProjectServiceAccount(projectId: string, serviceAccountId: string): Promise<void> {
  await adminFetch(`/organization/projects/${projectId}/service_accounts/${serviceAccountId}`, {
    method: "DELETE",
  });
}

/**
 * 학생 키를 실제로 무효화한다 — 프로젝트를 archive하는 것만으론 부족하다. Service Account
 * 소속 키는 일반 API 키 삭제 엔드포인트로 못 지우고 service account 자체를 지워야만 하고,
 * 게다가 archive는 "이미 archive된 프로젝트에선 하위 리소스를 못 건드릴 수 있다"는 보고가
 * 있어서, 순서가 중요하다: ① service account를 먼저 지운다(실패하면 이 함수가 던진다 —
 * 호출부는 "키가 아직 살아있을 수 있다"고 관리자에게 경고해야 한다) ② 그다음 프로젝트를
 * archive한다(조직 정리용 — 이건 실패해도 키 자체엔 영향 없으니 조용히 무시한다).
 *
 * 다만 OpenAI 커뮤니티에는 "키를 지워도/archive해도 한동안(길게는 몇 시간) 계속 동작한다"는
 * 보고가 다수 있다 — OpenAI 쪽 인증 캐시 전파 지연으로 보이는 알려진 이슈라, 이 함수가
 * 성공해도 "즉시" 반영을 우리가 보장할 순 없다. 그래서 발급 시 요청 속도 상한(RPM/TPM)과
 * 예산 감시 크론을 같이 걸어둔 것 — 이 지연 구간에서 실제로 새는 비용을 줄여주는 역할이다.
 */
export async function revokeOpenAIAccess(projectId: string, serviceAccountId: string | null): Promise<void> {
  if (serviceAccountId) {
    await deleteProjectServiceAccount(projectId, serviceAccountId);
  }
  await archiveOpenAIProject(projectId).catch(() => {});
}

export type OpenAIServiceAccount = {
  id: string;
  object: string;
  name: string;
  role: string;
  created_at: number;
  api_key: {
    id: string;
    object: string;
    name: string;
    value: string;
    created_at: number;
  };
};

/** Service Account 생성 — 응답의 api_key.value가 실제 키 값이며, 이후 다시 조회할 수 없다. */
export async function createProjectServiceAccount(
  projectId: string,
  name: string,
): Promise<OpenAIServiceAccount> {
  return adminFetch<OpenAIServiceAccount>(`/organization/projects/${projectId}/service_accounts`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

type ProjectRateLimit = {
  id: string;
  model: string;
  max_requests_per_1_minute?: number;
  max_tokens_per_1_minute?: number;
};

/**
 * 프로젝트별 분당 요청/토큰 상한 적용 — 수강생 1인당 과금 폭주를 막는 안전장치.
 * OPENAI_PROJECT_RPM_LIMIT / OPENAI_PROJECT_TPM_LIMIT을 채워야 동작하고, 비워두면
 * 조직 기본값을 그대로 둔 채 아무것도 하지 않는다. 발급 흐름에서는 best-effort로 호출하며
 * (실패해도 키 발급 자체는 막지 않음) 호출부에서 반드시 try/catch로 감싼다.
 */
export async function applyProjectRateLimits(projectId: string): Promise<void> {
  const rpm = process.env.OPENAI_PROJECT_RPM_LIMIT;
  const tpm = process.env.OPENAI_PROJECT_TPM_LIMIT;
  if (!rpm && !tpm) return;

  const { data } = await adminFetch<{ data: ProjectRateLimit[] }>(
    `/organization/projects/${projectId}/rate_limits?limit=100`,
  );

  await Promise.all(
    data.map((limit) =>
      adminFetch(`/organization/projects/${projectId}/rate_limits/${limit.id}`, {
        method: "POST",
        body: JSON.stringify({
          ...(rpm ? { max_requests_per_1_minute: Number(rpm) } : {}),
          ...(tpm ? { max_tokens_per_1_minute: Number(tpm) } : {}),
        }),
      }),
    ),
  );
}

/**
 * 프로젝트에서 쓸 수 있는 모델을 허용목록으로 제한 — 값비싼 모델을 실습용 키로 못 쓰게 막는다.
 * OPENAI_PROJECT_ALLOWED_MODELS(쉼표구분, 예: "gpt-4o-mini,gpt-4.1-mini")를 채워야 동작한다.
 * 이 엔드포인트는 계정/조직 등급에 따라 지원되지 않을 수 있으므로 반드시 best-effort로 호출한다
 * (호출부에서 try/catch로 감싸고, 실패해도 키 발급을 막지 않는다).
 *
 * 참고: 프로젝트별 "금액" 지출 한도는 이 글 작성 시점에 공개 API가 없다(대시보드 전용) — 필요하면
 * OpenAI 대시보드의 조직/프로젝트 Limits에서 직접 설정해야 한다.
 */
export async function applyProjectModelPermissions(projectId: string): Promise<void> {
  const allowed = process.env.OPENAI_PROJECT_ALLOWED_MODELS;
  if (!allowed) return;

  const modelIds = allowed
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (modelIds.length === 0) return;

  await adminFetch(`/organization/projects/${projectId}/model_permissions`, {
    method: "POST",
    body: JSON.stringify({ mode: "allow_list", model_ids: modelIds }),
  });
}

type CostsBucket = {
  results: { amount: { value: number; currency: string }; project_id: string | null }[];
};

/**
 * 프로젝트별 "금액" 한도는 API로 설정할 수 없어서(대시보드 전용), 대신 발급 이후의 누적 지출을
 * Costs API로 직접 집계해 예산 감시 크론(app/api/cron/vibe-budget-guard)에서 소비한다.
 * project_ids 서버 필터는 커뮤니티에 신뢰성 이슈 보고가 있어, 응답을 project_id로 다시 한번
 * 클라이언트 사이드에서 걸러 합산한다.
 */
export async function getProjectCostUSD(projectId: string, sinceUnixSeconds: number): Promise<number> {
  const params = new URLSearchParams({
    start_time: String(sinceUnixSeconds),
    bucket_width: "1d",
    group_by: "project_id",
    limit: "31",
  });
  // OpenAI의 다른 목록형 엔드포인트(rate_limits 등)와 동일하게 배열이 아니라 { data: [...] }로
  // 감싸서 온다 — 예전엔 여기서 그냥 배열을 기대하다가 "is not iterable"로 매번 실패했었다.
  const { data: buckets } = await adminFetch<{ data: CostsBucket[] }>(
    `/organization/costs?${params.toString()}`,
  );

  let total = 0;
  for (const bucket of buckets) {
    for (const result of bucket.results) {
      if (result.project_id === projectId) total += result.amount.value;
    }
  }
  return total;
}
