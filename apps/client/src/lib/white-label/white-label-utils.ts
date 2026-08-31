import type { WhiteLabelStyles } from "./white-label.types";

export const WHITE_LABEL_STYLE_TAG_ID = "client-white-label-styles";

const SYSTEM_FONTS = new Set([
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "system-ui",
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
  "fantasy",
]);

export function extractFontFamily(fontFamilyValue?: string): string | null {
  if (!fontFamilyValue) return null;
  const firstFont = fontFamilyValue.split(",")[0]?.trim().replace(/['"]/g, "");
  if (!firstFont) return null;

  return SYSTEM_FONTS.has(firstFont.toLowerCase()) ? null : firstFont;
}

export function getGoogleFontHref(fontFamily?: string): string | null {
  const family = extractFontFamily(fontFamily);
  if (!family) return null;

  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}:wght@300;400;500;600;700&display=swap`;
}

export function getGoogleFontHrefs(styles?: WhiteLabelStyles): string[] {
  if (!styles) return [];
  const hrefs = new Set<string>();

  const checkFont = (fontVal?: string) => {
    const href = getGoogleFontHref(fontVal);
    if (href) hrefs.add(href);
  };

  ["font-sans", "font-serif", "font-mono"].forEach((key) => {
    checkFont(styles.light?.[key]);
    checkFont(styles.dark?.[key]);
  });

  return Array.from(hrefs);
}

export function generateWhiteLabelCss(styles?: WhiteLabelStyles): string {
  if (!styles) return "";

  const generateBlock = (selector: string, values?: Record<string, string>) => {
    if (!values || Object.keys(values).length === 0) return "";
    const rules = Object.entries(values)
      .map(([key, val]) => {
        const prop = key.startsWith("--") ? key : `--${key}`;
        return `  ${prop}: ${val};`;
      })
      .join("\n");
    return `${selector} {\n${rules}\n}`;
  };

  // Target both root/html and .dark / html.dark with high specificity
  const lightCss = generateBlock(":root, html", styles.light);
  const darkCss = generateBlock(".dark, html.dark", styles.dark);

  return [lightCss, darkCss].filter(Boolean).join("\n\n");
}
