import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
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

  return staticPages.flatMap((page) =>
    routing.locales.map((locale) => ({
      url: `${baseUrl}/${locale}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    }))
  );
}
