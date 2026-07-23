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

/** Create a short-lived signed download URL for a resource (RLS: admin, or public if is_public). */
export async function signedResourceUrl(path: string): Promise<string> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.storage.from("resources").createSignedUrl(path, 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/**
 * 서명 URL로 파일을 받아 blob으로 내려받는다.
 * Supabase의 `download` 옵션(Content-Disposition 헤더)에 맡기면 한글 등 비ASCII 파일명이 깨지고,
 * <a download> 속성도 교차 출처 URL(서명 URL)에서는 브라우저가 무시하므로,
 * blob: URL(동일 출처 취급)에 파일명을 직접 지정해 우회한다.
 */
export async function downloadResource(path: string, fileName: string): Promise<void> {
  const url = await signedResourceUrl(path);
  const res = await fetch(url);
  if (!res.ok) throw new Error("파일을 내려받지 못했습니다.");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName.normalize("NFC");
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
