import { getPublicResources } from "./_queries/resources";
import { ResourcesList } from "./_components/ResourcesList";
import { pageMetadata } from "../_lib/seo";

export const metadata = pageMetadata(
  "자료실",
  "강의 자료 목록과 공개 자료 다운로드.",
);

export const revalidate = 60;

export default async function ResourcesPage() {
  const resources = await getPublicResources();
  return <ResourcesList resources={resources} />;
}
