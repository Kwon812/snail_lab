"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadResourceFiles } from "../../../_lib/upload";
import { createResource, deleteResource, getResources, toggleResourcePublic, type ResourceItem } from "../_actions/resources";

/** 자료실 목록 (관리자 전용). */
export function useResources() {
  return useQuery({ queryKey: ["resources"], queryFn: () => getResources() });
}

/** 파일 업로드 + 자료 등록을 한 번에 처리 — 성공 시 목록 캐시를 무효화. */
export function useUploadResources() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description: string; files: File[] }) => {
      const paths = await uploadResourceFiles(input.files);
      return Promise.all(
        input.files.map((file, i) =>
          createResource({
            title: input.title.trim() || file.name.normalize("NFC"),
            description: input.description.trim() || undefined,
            path: paths[i],
            fileName: file.name.normalize("NFC"),
            fileType: file.type,
            fileSize: file.size,
          }),
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resources"] }),
  });
}

/** 자료 공개/비공개 전환 — 성공 시 목록 캐시를 무효화. */
export function useToggleResourcePublic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (r: ResourceItem) => toggleResourcePublic(r.id, !r.is_public),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resources"] }),
  });
}

/** 자료 삭제 (스토리지 파일 + 테이블 행) — 성공 시 목록 캐시를 무효화. */
export function useDeleteResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (r: ResourceItem) => deleteResource(r.id, r.path),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resources"] }),
  });
}
