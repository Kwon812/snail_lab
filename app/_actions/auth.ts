"use server";

import { redirect } from "next/navigation";
import { supabaseServerAuth } from "../_lib/supabase-server";

export async function signIn(email: string, password: string) {
  const supabase = await supabaseServerAuth();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { error: null };
}

export async function signOut() {
  const supabase = await supabaseServerAuth();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function getCurrentUser() {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
