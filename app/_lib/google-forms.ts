/**
 * Google Forms API 클라이언트 — 관리자가 /admin/course-evaluation에서 만든 문항으로
 * 실제 구글 폼을 생성한다. OAuth2(개인 구글 계정) 인증을 쓴다: 관리자가 1회
 * /admin/course-evaluation에서 자기 구글 계정을 연동하면(app/api/google/oauth) 그때 받은
 * refresh_token을 DB(google_oauth_connection)에 저장해두고, 이후 폼을 만들 때마다 이
 * refresh_token으로 access_token을 새로 발급받아 쓴다.
 *
 * 서비스 계정을 안 쓴 이유: Forms API는 Google Workspace의 도메인 위임 없이는 서비스 계정으로
 * 못 쓴다 — 이 프로젝트는 일반 Gmail 계정을 쓰므로 사람이 로그인하는 OAuth2가 유일한 방법이다.
 */
import "server-only";

const OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const FORMS_API_BASE = "https://forms.googleapis.com/v1/forms";
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3/files";

// forms.body: 폼 생성/수정. drive.file: API로 만든 파일을 이후 삭제(휴지통 이동)하는 데 필요.
export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/forms.body",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function clientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID가 설정되지 않았습니다.");
  return id;
}

function clientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET가 설정되지 않았습니다.");
  return secret;
}

export function googleRedirectUri(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${site.replace(/\/$/, "")}/api/google/oauth/callback`;
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_OAUTH_SCOPES,
    access_type: "offline",
    prompt: "consent", // 매번 consent를 강제해야 refresh_token이 응답에 포함된다.
    state,
  });
  return `${OAUTH_AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`구글 토큰 교환 실패 (${res.status}): ${body || res.statusText}`);
  }
  return res.json();
}

export async function getAccessTokenFromRefreshToken(refreshToken: string): Promise<string> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `구글 access token 재발급 실패 (${res.status}): ${body || res.statusText} — 연동이 끊어졌을 수 있습니다. /admin/course-evaluation에서 다시 연동해 주세요.`,
    );
  }
  const data: TokenResponse = await res.json();
  return data.access_token;
}

export async function getGoogleAccountEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.email ?? null;
}

export type SurveyQuestionType =
  | "SHORT_ANSWER"
  | "PARAGRAPH"
  | "MULTIPLE_CHOICE"
  | "CHECKBOX"
  | "SCALE";

export type SurveyQuestion = {
  title: string;
  type: SurveyQuestionType;
  required: boolean;
  options?: string[]; // MULTIPLE_CHOICE | CHECKBOX
  lowLabel?: string; // SCALE
  highLabel?: string; // SCALE
};

type FormsQuestionBody = Record<string, unknown>;

function buildQuestionBody(q: SurveyQuestion): FormsQuestionBody {
  const base = { required: q.required };
  switch (q.type) {
    case "SHORT_ANSWER":
      return { ...base, textQuestion: { paragraph: false } };
    case "PARAGRAPH":
      return { ...base, textQuestion: { paragraph: true } };
    case "MULTIPLE_CHOICE":
      return {
        ...base,
        choiceQuestion: { type: "RADIO", options: (q.options ?? []).map((value) => ({ value })) },
      };
    case "CHECKBOX":
      return {
        ...base,
        choiceQuestion: { type: "CHECKBOX", options: (q.options ?? []).map((value) => ({ value })) },
      };
    case "SCALE":
      return {
        ...base,
        scaleQuestion: {
          low: 1,
          high: 5,
          ...(q.lowLabel ? { lowLabel: q.lowLabel } : {}),
          ...(q.highLabel ? { highLabel: q.highLabel } : {}),
        },
      };
  }
}

async function formsFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${FORMS_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Forms API 오류 (${res.status}): ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export type CreatedGoogleForm = {
  formId: string;
  responderUri: string;
  editUri: string;
};

/**
 * 폼 생성 절차: ① title만으로 빈 폼 생성(Forms API 제약 — 생성 요청엔 title 외 다른 정보를
 * 넣을 수 없다) ② batchUpdate로 설명 + 문항을 순서대로 추가.
 */
export async function createGoogleForm(
  accessToken: string,
  input: { title: string; description?: string; questions: SurveyQuestion[] },
): Promise<CreatedGoogleForm> {
  const created = await formsFetch<{ formId: string; responderUri: string }>(accessToken, "", {
    method: "POST",
    body: JSON.stringify({ info: { title: input.title } }),
  });

  const requests: Record<string, unknown>[] = [];
  if (input.description) {
    requests.push({
      updateFormInfo: {
        info: { description: input.description },
        updateMask: "description",
      },
    });
  }
  input.questions.forEach((q, index) => {
    requests.push({
      createItem: {
        item: {
          title: q.title,
          questionItem: { question: buildQuestionBody(q) },
        },
        location: { index },
      },
    });
  });

  if (requests.length > 0) {
    await formsFetch(accessToken, `/${created.formId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });
  }

  return {
    formId: created.formId,
    responderUri: created.responderUri,
    editUri: `https://docs.google.com/forms/d/${created.formId}/edit`,
  };
}

/** 폼을 휴지통으로 이동 — 실패해도(이미 지워졌거나 권한 문제) DB 행 삭제 자체는 막지 않는다(best-effort). */
export async function trashGoogleForm(accessToken: string, formId: string): Promise<void> {
  await fetch(`${DRIVE_API_BASE}/${formId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trashed: true }),
  }).catch(() => {});
}
