import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BlogPageHeader } from "@/components/blog/BlogPageHeader";
import { PostCard } from "@/components/blog/PostCard";
import { getPostsByCategory } from "@/lib/blog-posts";
import { BLOG_CATEGORIES } from "@/utils/constants/blog-categories";
import type { ReactElement } from "react";

interface CategoryIndexProps {
  categorySlug: string;
  title: string;
  description: string;
}

// Bespoke category landing (/blog/engineering, /blog/solutions, /blog/general).
// Auto-generated post grid, newest-first, filtered to this category.
export function CategoryIndex({
  categorySlug,
  title,
  description,
}: CategoryIndexProps): ReactElement {
  const posts = getPostsByCategory(categorySlug);
  const label =
    BLOG_CATEGORIES.find((category) => category.slug === categorySlug)?.label ??
    title;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <BlogPageHeader
        eyebrow={`dhaga. blog · ${label}`}
        title={title}
        description={description}
      >
        <Link
          href="/blog"
          className="inline-flex min-h-[44px] items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-fog transition-colors hover:text-amber"
        >
          <ArrowLeft className="size-3.5" />
          All writing
        </Link>
      </BlogPageHeader>

      <section className="mt-12">
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {posts.map((post) => (
              <PostCard key={post.url} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-fog">No posts here yet — check back soon.</p>
        )}
      </section>
    </div>
  );
}
