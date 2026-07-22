import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow, Section } from "../../_components/ui";
import { getPostBySlug, getPublishedPosts, getPublishedSlugs } from "../queries";
import { PostAdminActions } from "../_components/PostAdminActions";
import { renderTiptap, injectHeadingIds, extractToc } from "../../_lib/render-tiptap";

export const revalidate = 60;

// 발행된 글을 빌드 시점에 정적 생성(SSG). 빌드 후 새 글은 on-demand로 생성(ISR).
export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function BlogPostPage({
  params,
}: {
  // Next.js 16 — params is async (Promise)
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const bodyHtml = injectHeadingIds(renderTiptap(post.content));
  const toc = extractToc(post.content);

  const related = (await getPublishedPosts())
    .filter((p) => p.slug !== slug)
    .slice(0, 3);

  return (
    <article className="pt-36 sm:pt-44">
      {/* Header */}
      <Section>
        <div className="mx-auto max-w-[980px]">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[14px] text-slate hover:text-ink"
            >
              <span className="rotate-180">
                <Arrow className="h-4 w-4" />
              </span>
              블로그 목록
            </Link>
            <PostAdminActions id={post.id} afterDelete="blog" />
          </div>
          <div className="mt-6">
            <span className="text-[13px] font-medium text-signal">{post.category}</span>
          </div>
          <h1 className="display mt-3 text-[34px] leading-[1.1] sm:text-[48px]">{post.title}</h1>
          <div className="mt-6 flex items-center gap-3 text-[14px] text-slate">
            <span>{post.date}</span>
            {post.viewCount > 0 && (
              <>
                <span className="h-1 w-1 rounded-full bg-dust" />
                <span>조회 {post.viewCount.toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      </Section>

      {/* Cover */}
      <Section className="mt-10">
        {post.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumbnail}
            alt={post.title}
            className="mx-auto aspect-[16/8] w-full max-w-[980px] rounded-stadium object-fill bg-white shadow-card"
          />
        ) : (
          <div
            className="mx-auto aspect-[16/8] w-full max-w-[980px] rounded-stadium shadow-card"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${post.tone.a}, ${post.tone.b})`,
            }}
          />
        )}
      </Section>

      {/* Body + TOC */}
      <Section className="mt-14">
        <div className="mx-auto grid max-w-[980px] grid-cols-1 gap-12 lg:grid-cols-[1fr_200px]">
          <div className="order-2 min-w-0 lg:order-1">
            {post.excerpt && (
              <p className="mb-8 text-[19px] leading-[1.65] text-ink">{post.excerpt}</p>
            )}
            <div className="rich" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

            {post.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-pill bg-white px-4 py-1.5 text-[13px] text-slate ring-1 ring-ink/10"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* TOC — sticky */}
          {toc.length > 0 && (
            <aside className="order-1 lg:order-2">
              <div className="sticky top-32">
                <p className="text-[13px] font-bold uppercase tracking-[0.04em] text-slate">목차</p>
                <ul className="mt-4 space-y-2.5 border-l border-ink/15 pl-4">
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`} className="text-[14px] text-slate hover:text-ink">
                        {t.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>
      </Section>

      {/* Related */}
      {related.length > 0 && (
        <Section className="mt-20">
          <div className="mx-auto max-w-[980px]">
            <h2 className="display text-[26px]">관련 글</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-[24px] bg-lifted shadow-card transition-transform hover:-translate-y-1"
                >
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail} alt={p.title} className="aspect-[16/10] w-full object-cover" />
                  ) : (
                    <div
                      className="aspect-[16/10] w-full"
                      style={{
                        background: `radial-gradient(circle at 35% 30%, ${p.tone.a}, ${p.tone.b})`,
                      }}
                    />
                  )}
                  <div className="p-5">
                    <h3 className="text-[16px] font-medium leading-[1.35]">{p.title}</h3>
                    <span className="mt-3 block text-[12px] text-slate">{p.date}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </Section>
      )}
    </article>
  );
}
