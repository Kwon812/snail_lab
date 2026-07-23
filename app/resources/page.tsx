import { getPublicResources } from "./_queries/resources";
import { ResourcesList } from "./_components/ResourcesList";
import { pageMetadata } from "../_lib/seo";

export const metadata = pageMetadata(
  "자료실",
  "누구나 내려받을 수 있도록 공개한 강의 자료 모음.",
);

export const revalidate = 60;

export default async function ResourcesPage() {
  const resources = await getPublicResources();
  return <ResourcesList resources={resources} />;
}
