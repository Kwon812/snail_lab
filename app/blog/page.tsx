import { getPublishedPosts } from "./queries";
import { BlogList } from "./_components/BlogList";

export const revalidate = 60; // ISR — refresh published list periodically

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  return <BlogList posts={posts} />;
}
