import { notFound } from "next/navigation";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { getMDXComponents } from "@/mdx-components";
import { blogSource } from "@/lib/blog-source";
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
  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDXContent components={getMDXComponents()} />
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
