import { http } from "@/lib/http";

export type CmsPage = {
  id: string;
  title: string;
  slug: string;
  locale: string;
  status: "draft" | "published";
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  robots?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export const getCmsPageBySlug = async (slug: string, locale: string) => {
  try {
    const { data } = await http.get<CmsPage>(
      `/public/cms-pages/by-slug/${slug}?locale=${locale}`
    );
    return data;
  } catch (error) {
    return null;
  }
};
