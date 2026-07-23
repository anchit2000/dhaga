import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BlogPageHeader } from "@/components/blog/BlogPageHeader";
import { PostCard } from "@/components/blog/PostCard";
import { getAllPosts, getPostsByCategory } from "@/lib/blog-posts";
import { BLOG_CATEGORIES } from "@/utils/constants/blog-categories";
import type { ReactElement } from "react";

interface BlogIndexProps {
  title: string;
  description: string;
}

// Bespoke /blog hub. Auto-generated from the blog source: a masthead, a row of
// category tiles (with live post counts), then every post newest-first.
export function BlogIndex({ title, description }: BlogIndexProps): ReactElement {
  const posts = getAllPosts();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <BlogPageHeader eyebrow="dhaga. blog" title={title} description={description} />

      <section className="mt-12">
        <h2 className="font-mono text-xs uppercase tracking-widest text-fog">
          Browse by category
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {BLOG_CATEGORIES.map((category) => {
            const count = getPostsByCategory(category.slug).length;
            return (
              <Link
                key={category.slug}
                href={`/blog/${category.slug}`}
                className="cover-open group flex min-h-[44px] flex-col rounded-2xl border border-seam bg-panel/60 p-6 hover:border-amber/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg text-paper transition-colors group-hover:text-amber">
                    {category.label}
                  </span>
                  <ArrowRight className="size-4 text-fog transition-transform group-hover:translate-x-0.5 group-hover:text-amber" />
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-fog">
                  {category.description}
                </p>
                <span className="mt-4 font-mono text-[11px] uppercase tracking-widest text-fog">
                  {count} {count === 1 ? "post" : "posts"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-mono text-xs uppercase tracking-widest text-fog">
          Latest writing
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <PostCard key={post.url} post={post} showCategory />
          ))}
        </div>
      </section>
    </div>
  );
}
