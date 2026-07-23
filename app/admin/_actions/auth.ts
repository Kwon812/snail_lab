"use server";

import { supabaseServerAuth } from "../../_lib/supabase-server";

export async function signIn(email: string, password: string) {
  const supabase = await supabaseServerAuth();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { error: null };
}

// 로그아웃은 SignOutButton에서 브라우저 클라이언트로 처리(onAuthStateChange 즉시 반영).

export async function getCurrentUser() {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
