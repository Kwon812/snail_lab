import { getPublishedLectures } from "./queries";
import { LecturesList } from "./_components/LecturesList";

export const revalidate = 60;

export default async function LecturesPage() {
  const lectures = await getPublishedLectures();
  return <LecturesList lectures={lectures} />;
}
