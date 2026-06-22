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
  content: unknown;
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
      page={normalizeLayer(page.content)}
      componentRegistry={pageBuilderComponentRegistry}
      variables={page.variables ?? []}
    />
  );
}

const DEFAULT_PAGE_CONTENT: ComponentLayer = {
  id: "page-root",
  type: "section",
  name: "Page",
  props: {
    className: "mx-auto max-w-5xl px-6 py-20",
  },
  children: [
    {
      id: "page-title",
      type: "h1",
      name: "Title",
      props: {
        className: "text-4xl font-bold tracking-tight",
      },
      children: "Page content is unavailable.",
    },
  ],
};

function isLayerLike(value: unknown) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { id?: unknown }).id === "string" &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

function normalizeLayer(
  value: unknown,
  fallback: ComponentLayer = DEFAULT_PAGE_CONTENT
): ComponentLayer {
  if (Array.isArray(value)) {
    const directLayer = value.find(isLayerLike);
    if (directLayer) {
      return normalizeLayer(directLayer, fallback);
    }

    const nestedLayer = value.find(
      (item) => isRecord(item) && getNestedLayerInput(item) !== undefined
    );
    return nestedLayer ? normalizeLayer(nestedLayer, fallback) : fallback;
  }

  if (isRecord(value)) {
    const nestedContent = getNestedLayerInput(value);

    if (nestedContent !== undefined && nestedContent !== value) {
      return normalizeLayer(nestedContent, fallback);
    }
  }

  if (!isLayerLike(value)) {
    return fallback;
  }

  const layer = value as ComponentLayer;
  const children = Array.isArray(layer.children)
    ? layer.children.map((child, index) =>
        normalizeLayer(child, {
          id: `${layer.id}-child-${index}`,
          type: "div",
          name: "Recovered layer",
          props: {},
          children: [],
        })
      )
    : layer.children;

  return {
    ...layer,
    props:
      typeof layer.props === "object" && layer.props !== null
        ? layer.props
        : {},
    children,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNestedLayerInput(value: Record<string, unknown>) {
  return (
    value.content ??
    value.page ??
    value.root ??
    value.layer ??
    value.data ??
    value.layers ??
    value.pages
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

  return unwrapCmsPage(await response.json());
}

function unwrapCmsPage(payload: unknown): CmsPage {
  if (isRecord(payload)) {
    if (isRecord(payload.data)) {
      return payload.data as CmsPage;
    }

    if (Array.isArray(payload.data) && isRecord(payload.data[0])) {
      return payload.data[0] as CmsPage;
    }
  }

  return payload as CmsPage;
}
