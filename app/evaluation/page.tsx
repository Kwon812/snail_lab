import { getPublishedCourseEvaluations } from "./_queries/evaluations";
import { EvaluationsList } from "./_components/EvaluationsList";
import { pageMetadata } from "../_lib/seo";

export const metadata = pageMetadata(
  "강의평가",
  "강의별 설문지 목록과 참여 링크.",
);

export const revalidate = 60;

export default async function EvaluationPage() {
  const evaluations = await getPublishedCourseEvaluations();
  return <EvaluationsList evaluations={evaluations} />;
}
