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

/**
 * Upload any file to the private `resources` bucket (자료실).
 * Direct browser upload (bypasses the Server Action body-size limit).
 * Returns the storage path — download is via a signed URL (admin only).
 */
export async function uploadResourceFiles(
    files: File[],
): Promise<string[]> {
  const supabase = supabaseBrowser();

  const paths = await Promise.all(
      files.map(async (file) => {
        const ext = (file.name.normalize('NFC').split(".").pop() || "bin").toLowerCase();

        const path = `${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
            .from("resources")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type || undefined,
            });

        if (error) {
          throw new Error(error.message);
        }

        return path;
      }),
  );

  return paths;
}

/** Create a short-lived signed download URL for a private resource (admin only). */
export async function signedResourceUrl(path: string, fileName?: string): Promise<string> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.storage
    .from("resources")
    .createSignedUrl(path, 60, fileName ? { download: fileName.normalize('NFC') } : { download: true });
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
