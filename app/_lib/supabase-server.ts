import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cookie-aware Supabase client for Server Components, Server Actions and
 * Route Handlers. Reads the auth session from cookies so RLS can see the
 * signed-in user (auth.uid()).
 */
export async function supabaseServerAuth() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component (read-only cookies) — proxy refreshes instead
          }
        },
      },
    },
  );
}
