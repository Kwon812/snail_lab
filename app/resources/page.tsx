import { getPublicResources } from "./_queries/resources";
import { ResourcesList } from "./_components/ResourcesList";

export const revalidate = 60;

export default async function ResourcesPage() {
  const resources = await getPublicResources();
  return <ResourcesList resources={resources} />;
}
