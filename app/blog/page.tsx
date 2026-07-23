import { getPublishedPosts } from "./_queries/posts";
import { BlogList } from "./_components/BlogList";
import { pageMetadata } from "../_lib/seo";

export const metadata = pageMetadata(
  "블로그",
  "미디어 리터러시 · 그림책 · 아동심리학에 관한 글 모음.",
);

export const revalidate = 60; // ISR — refresh published list periodically

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  return <BlogList posts={posts} />;
}
