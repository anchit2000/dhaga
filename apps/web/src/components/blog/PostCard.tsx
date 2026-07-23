import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatDisplayDate } from "@/lib/blog-posts";
import { BLOG_CATEGORIES } from "@/utils/constants/blog-categories";
import type { BlogPost } from "@/lib/blog-posts";
import type { ReactElement } from "react";

interface PostCardProps {
  post: BlogPost;
  // Show the category label in the eyebrow (used on the hub, where posts from
  // every category are mixed). Category landings omit it — it's redundant there.
  showCategory?: boolean;
}

function categoryLabel(slug: string): string {
  return BLOG_CATEGORIES.find((category) => category.slug === slug)?.label ?? slug;
}

// One post in an auto-generated list: title, description, date and tags, linking
// to the article. Presentational + server-rendered; brand tokens only.
export function PostCard({ post, showCategory = false }: PostCardProps): ReactElement {
  const displayDate = formatDisplayDate(post.date);

  return (
    <Link
      href={post.url}
      className="group flex min-h-[44px] flex-col rounded-2xl border border-seam bg-panel/60 p-6 transition-colors hover:border-amber/40"
    >
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-fog">
        {showCategory ? (
          <>
            <span className="text-amber">{categoryLabel(post.category)}</span>
            {displayDate ? <span aria-hidden>·</span> : null}
          </>
        ) : null}
        {displayDate ? (
          <time dateTime={post.date}>{displayDate}</time>
        ) : null}
      </div>

      <h3 className="mt-3 flex items-start gap-1.5 font-display text-lg leading-snug text-paper transition-colors group-hover:text-amber">
        <span>{post.title}</span>
        <ArrowUpRight className="mt-1 size-4 shrink-0 text-fog transition-colors group-hover:text-amber" />
      </h3>

      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-fog">
        {post.description}
      </p>

      {post.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-seam px-2 py-0.5 font-mono text-[10px] lowercase tracking-wide text-fog"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
