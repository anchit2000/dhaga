import { notFound } from "next/navigation";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { getMDXComponents } from "@/mdx-components";
import { blogSource } from "@/lib/blog-source";
import { ShareBar } from "@/components/blog/ShareBar";
import { Comments } from "@/components/blog/Comments";
import { QuoteHighlighter } from "@/components/blog/QuoteHighlighter";
import { BLOG_SITE_URL } from "@/utils/constants/blog";
import type { Metadata } from "next";
import type { ReactElement } from "react";

// Mirrors src/app/docs/[[...slug]]/page.tsx, resolving pages from the blog
// source instead of the docs source.
interface BlogPageRouteProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function BlogPageRoute({
  params,
}: BlogPageRouteProps): Promise<ReactElement> {
  const { slug } = await params;
  const page = blogSource.getPage(slug);
  if (!page) notFound();

  const MDXContent = page.data.body;
  // Leaf posts have a category + slug (e.g. ["engineering", "…"]); the /blog,
  // /blog/engineering, /blog/solutions landing pages don't get engagement UI.
  const isPost = (slug?.length ?? 0) >= 2;
  const url = `${BLOG_SITE_URL}/blog/${(slug ?? []).join("/")}`;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDXContent components={getMDXComponents()} />
        {isPost ? (
          <>
            <ShareBar url={url} title={page.data.title} />
            <QuoteHighlighter url={url} />
            <Comments />
          </>
        ) : null}
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

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
