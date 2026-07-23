"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabaseBrowser } from "../_lib/supabase-browser";
import {getCurrentUser} from "@/app/admin/_actions/auth";

/** True when a Supabase session exists in the browser (i.e. admin is logged in). */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setIsAdmin(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>{
      setIsAdmin(!!session?.user)}
    );
    return () => sub.subscription.unsubscribe();
  }, []);
  return isAdmin;
}

/** Renders children only for a logged-in admin (client-side check). */
export function AdminOnly({ children }: { children: ReactNode }) {
  return useIsAdmin() ? <>{children}</> : null;
}
