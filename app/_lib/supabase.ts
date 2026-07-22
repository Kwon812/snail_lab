import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the publishable (anon) key.
 * Writes are governed by RLS — see supabase/schema.sql.
 * (No service_role key: nothing here bypasses RLS.)
 */
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)가 설정되지 않았습니다.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
