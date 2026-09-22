import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { fetchPublishedCmsPages } from "@/services/cms-pages";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const staticPages = [
    { path: "", changeFrequency: "weekly" as const, priority: 1.0 },
    {
      path: "/auth/login",
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      path: "/auth/sign-up",
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPages.flatMap((page) =>
    routing.locales.map((locale) => ({
      url: `${baseUrl}/${locale}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    }))
  );

  const cmsPages = await fetchPublishedCmsPages();
  const cmsEntries: MetadataRoute.Sitemap = [];

  for (const page of cmsPages) {
    if (!page.translations || page.translations.length === 0) continue;

    for (const t of page.translations) {
      if (!t.slug) continue;
      // Skip pages marked with noindex
      if (t.robots && t.robots.toLowerCase().includes("noindex")) {
        continue;
      }

      cmsEntries.push({
        url: `${baseUrl}/${t.locale}/pages/${t.slug}`,
        lastModified: page.updatedAt ? new Date(page.updatedAt) : new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return [...staticEntries, ...cmsEntries];
}
