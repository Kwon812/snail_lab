import { NextRequest, NextResponse } from "next/server";
import { supabaseServerAuth } from "../../../../_lib/supabase-server";
import { buildGoogleAuthUrl } from "../../../../_lib/google-forms";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "g_oauth_state";

/** 관리자가 /admin/course-evaluation에서 "구글 계정 연동"을 누르면 여기로 온다 → 구글 동의화면으로. */
export async function GET(request: NextRequest) {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(buildGoogleAuthUrl(state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/google/oauth",
  });
  return res;
}
