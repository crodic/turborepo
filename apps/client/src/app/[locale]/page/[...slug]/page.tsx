import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServerLayerRenderer } from "@/components/ui/ui-builder/server-layer-renderer";
import type {
  ComponentLayer,
  Variable,
} from "@/components/ui/ui-builder/types";
import { pageBuilderComponentRegistry } from "@/components/page-builder/registry";

type CmsPage = {
  title: string;
  slug: string;
  content: ComponentLayer;
  variables?: Variable[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
};

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCmsPage(slug.join("/"));

  if (!page) {
    return {};
  }

  const title = page.seoTitle || page.title;
  const description = page.seoDescription || page.ogDescription || undefined;
  const images = page.ogImage ? [{ url: page.ogImage }] : undefined;

  return {
    title,
    description,
    keywords: page.seoKeywords
      ?.split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    alternates: page.canonicalUrl
      ? { canonical: page.canonicalUrl }
      : undefined,
    robots: page.robots || undefined,
    openGraph: {
      title: page.ogTitle || title,
      description,
      images,
    },
  };
}

export default async function CmsDynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getCmsPage(slug.join("/"));

  if (!page) {
    notFound();
  }

  return (
    <ServerLayerRenderer
      page={page.content}
      componentRegistry={pageBuilderComponentRegistry}
      variables={page.variables ?? []}
    />
  );
}

async function getCmsPage(slug: string) {
  const apiUrl = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL;
  const response = await fetch(
    `${apiUrl}/api/v1/public/cms-pages/by-slug/${encodeURI(slug)}`,
    {
      next: { revalidate: 60 },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to load page");
  }

  return (await response.json()) as CmsPage;
}
