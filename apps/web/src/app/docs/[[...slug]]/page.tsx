import { notFound } from "next/navigation";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { DocsHub } from "@/components/docs/DocsHub";
import { getMDXComponents } from "@/mdx-components";
import { source } from "@/lib/source";
import { SITE_URL } from "@/utils/constants/site";
import type { Metadata } from "next";
import type { ReactElement } from "react";

interface DocsPageRouteProps {
  params: Promise<{ slug?: string[] }>;
}

function isHubSlug(slug: string[] | undefined): boolean {
  return !slug || slug.length === 0;
}

export default async function DocsPageRoute({
  params,
}: DocsPageRouteProps): Promise<ReactElement> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  // The `/docs` index renders the bespoke two-track hub instead of the stock
  // MDX card body; `content/docs/index.mdx` still supplies the page metadata.
  if (isHubSlug(slug)) {
    return (
      <DocsPage
        toc={[]}
        full
        tableOfContent={{ enabled: false }}
        breadcrumb={{ enabled: false }}
      >
        <DocsHub />
      </DocsPage>
    );
  }

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
  return source.generateParams();
}

export async function generateMetadata({
  params,
}: DocsPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const { title, description } = page.data;
  const canonical = `${SITE_URL}${page.url}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
