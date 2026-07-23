import { notFound } from "next/navigation";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { getMDXComponents } from "@/mdx-components";
import { blogSource } from "@/lib/blog-source";
import { isBlogIndexRoute, BLOG_DEFAULT_AUTHOR } from "@/lib/blog-posts";
import { blogAbsoluteUrl, blogOgImageUrl, buildBlogJsonLd } from "@/lib/blog-seo";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { CategoryIndex } from "@/components/blog/CategoryIndex";
import { ShareBar } from "@/components/blog/ShareBar";
import { Comments } from "@/components/blog/Comments";
import { QuoteHighlighter } from "@/components/blog/QuoteHighlighter";
import { BLOG_SITE_URL } from "@/utils/constants/blog";
import type { Metadata } from "next";
import type { ReactElement } from "react";

const RSS_URL = `${BLOG_SITE_URL}/blog/rss.xml`;

// Mirrors src/app/docs/[[...slug]]/page.tsx, resolving pages from the blog
// source instead of the docs source. The optional catch-all matches /blog,
// /blog/<category>, and every leaf post — so the bespoke hub/category landings
// are rendered from here (a sibling app/blog/page.tsx would be a route conflict)
// while leaf posts keep the MDX article treatment.
interface BlogPageRouteProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function BlogPageRoute({
  params,
}: BlogPageRouteProps): Promise<ReactElement> {
  const { slug } = await params;
  const page = blogSource.getPage(slug);
  if (!page) notFound();

  const title = page.data.title ?? "Blog";
  const description = page.data.description ?? "";

  // Hub and category landings render bespoke, auto-generated React — not the
  // hand-authored MDX card lists. The frontmatter is still used, for metadata.
  // These aren't `DocsPage`s, so they must claim the fumadocs `main` grid area
  // themselves (`DocsLayout`'s Container is a CSS grid with named areas); left
  // unplaced they auto-flow into the first gutter track and render half-width.
  if (isBlogIndexRoute(slug)) {
    return (
      <div className="w-full min-w-0 [grid-area:main]">
        {!slug || slug.length === 0 ? (
          <BlogIndex title={title} description={description} />
        ) : (
          <CategoryIndex
            categorySlug={slug[0]}
            title={title}
            description={description}
          />
        )}
      </div>
    );
  }

  // Leaf post: MDX article + engagement UI + structured data.
  const MDXContent = page.data.body;
  const url = blogAbsoluteUrl(slug);
  const author = page.data.author ?? BLOG_DEFAULT_AUTHOR;
  const jsonLd = buildBlogJsonLd({
    slug,
    title,
    description,
    url,
    author,
    date: page.data.date,
  });

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <script
        type="application/ld+json"
        // Structured data is trusted, build-time content derived from frontmatter.
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <DocsTitle>{title}</DocsTitle>
      <DocsDescription>{description}</DocsDescription>
      <DocsBody>
        <MDXContent components={getMDXComponents()} />
        <ShareBar url={url} title={title} />
        <QuoteHighlighter url={url} />
        <Comments />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams(): { slug?: string[] }[] {
  return blogSource.generateParams();
}

export async function generateMetadata({
  params,
}: BlogPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const page = blogSource.getPage(slug);
  if (!page) notFound();

  const title = page.data.title ?? "Blog";
  const description = page.data.description ?? "";
  const url = blogAbsoluteUrl(slug);
  const isPost = !isBlogIndexRoute(slug);
  const author = page.data.author ?? BLOG_DEFAULT_AUTHOR;
  const publishedTime = page.data.date
    ? new Date(page.data.date).toISOString()
    : undefined;
  const ogImage = blogOgImageUrl(title, slug);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      types: { "application/rss+xml": RSS_URL },
    },
    openGraph: {
      type: isPost ? "article" : "website",
      url,
      title,
      description,
      siteName: "Dhaga",
      images: [ogImage],
      ...(isPost
        ? {
            authors: [author],
            ...(publishedTime ? { publishedTime } : {}),
            ...(page.data.tags?.length ? { tags: page.data.tags } : {}),
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
