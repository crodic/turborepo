export type ThemeMode = "light" | "dark";

export type WhiteLabelStyles = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

export type ActiveClientWhiteLabel = {
  id: string | number;
  slug: string;
  name: string;
  target: "admin" | "client";
  brandName?: string | null;
  siteTitle?: string | null;
  siteTagline?: string | null;
  copyrightText?: string | null;
  siteLogo?: string | null;
  siteDarkLogo?: string | null;
  siteFavicon?: string | null;
  ogImage?: string | null;
  twitterImage?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  styles?: WhiteLabelStyles;
  updatedAt?: string;
};

export type WhiteLabelContextValue = {
  whiteLabel: ActiveClientWhiteLabel | null;
  isEnabled: boolean;
  isLoading: boolean;
};
