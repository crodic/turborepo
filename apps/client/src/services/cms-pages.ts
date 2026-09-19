import { http } from "@/lib/http";

export type CmsPageTranslation = {
  locale: string;
  slug?: string;
  title: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  robots?: string;
};

export type CmsPageApiResponse = {
  id: string;
  status: "draft" | "published";
  translations: CmsPageTranslation[];
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CmsPage = CmsPageTranslation & {
  id: string;
  status: "draft" | "published";
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const getCmsPageBySlug = async (
  slug: string,
  locale: string
): Promise<CmsPage | null> => {
  try {
    const { data } = await http.get<CmsPageApiResponse>(
      `/api/v1/public/cms-pages/by-slug/${slug}?locale=${locale}`
    );

    if (!data || !data.translations || data.translations.length === 0) {
      return null;
    }

    const translation =
      data.translations.find((t) => t.locale === locale) ||
      data.translations[0];

    return {
      id: data.id,
      status: data.status,
      publishedAt: data.publishedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      ...translation,
    };
  } catch {
    return null;
  }
};
