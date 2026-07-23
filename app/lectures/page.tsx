import type { Metadata } from "next";
import { getPublishedLectures } from "./_queries/lectures";
import { LecturesList } from "./_components/LecturesList";

export const metadata: Metadata = {
  title: "강의 소개",
  description: "미디어 리터러시 · 그림책 · 아동심리학, 수준과 목표에 맞춰 선택하는 온·오프라인 강의 커리큘럼.",
};

export const revalidate = 60;

export default async function LecturesPage() {
  const lectures = await getPublishedLectures();
  return <LecturesList lectures={lectures} />;
}
