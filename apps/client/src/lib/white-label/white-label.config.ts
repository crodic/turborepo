export const isWhiteLabelEnabled =
  process.env.NEXT_PUBLIC_ENABLE_WHITE_LABEL !== "false";

export const CLIENT_WHITE_LABEL_STORAGE_KEY = "active-white-label:client";
export const CLIENT_THEME_VERSION_STORAGE_KEY = "client-theme-cache-version";
export const CLIENT_THEME_CACHE_VERSION = "v1.0.0";

export const DEFAULT_BRAND_NAME = "Visel Art";
export const DEFAULT_SITE_TITLE = "Visel Art - Creative Platform";
export const DEFAULT_SITE_TAGLINE = "Creative Design & Modern Platform";
export const DEFAULT_COPYRIGHT = `© ${new Date().getFullYear()} Visel, All rights reserved`;
export const DEFAULT_FAVICON = "/favicon.png";
