"use client";

import { supabaseBrowser } from "./supabase-browser";

/**
 * Upload an image to the public `media` bucket and return its public URL.
 * Requires an authenticated session (RLS: authenticated write).
 */
export async function uploadImage(file: File): Promise<string> {
  const supabase = supabaseBrowser();
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("media").getPublicUrl(path);
  // Fallback: build the public URL by hand if getPublicUrl ever returns empty.
  const url =
    data?.publicUrl ||
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`;
  return url;
}
