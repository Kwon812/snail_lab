import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS. Only for trusted server contexts
 * with no signed-in user session (cron jobs, webhooks). Never expose to the client.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
