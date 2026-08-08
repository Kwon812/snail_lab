import { NextRequest, NextResponse } from "next/server";
import { supabaseServerAuth } from "../../../../_lib/supabase-server";
import { exchangeCodeForTokens, getGoogleAccountEmail } from "../../../../_lib/google-forms";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "g_oauth_state";
const REDIRECT_BASE = "/admin/course-evaluation";

/** 구글 동의화면에서 승인 후 돌아오는 콜백 — code를 refresh_token으로 교환해 저장한다. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.cookies.get(STATE_COOKIE)?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`${REDIRECT_BASE}?google_error=${reason}`, request.url));
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  if (!code || !state || !cookieState || state !== cookieState) {
    return fail("state");
  }

  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("session");
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (err) {
    console.error("[google-oauth-callback] token exchange failed", err);
    return fail("token");
  }
  if (!tokens.refresh_token) {
    // 이미 연동된 상태에서 구글이 재동의를 스킵하면 refresh_token 없이 돌아올 수 있다.
    // 매 요청 prompt=consent를 강제해서 평소엔 발생하지 않지만, 방어적으로 처리한다.
    return fail("no_refresh_token");
  }

  const email = await getGoogleAccountEmail(tokens.access_token);

  const { error } = await supabase.from("google_oauth_connection").upsert({
    id: 1,
    email,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope,
  });
  if (error) {
    console.error("[google-oauth-callback] save failed", error.message);
    return fail("save");
  }

  const res = NextResponse.redirect(new URL(`${REDIRECT_BASE}?connected=1`, request.url));
  res.cookies.delete(STATE_COOKIE);
  return res;
}
