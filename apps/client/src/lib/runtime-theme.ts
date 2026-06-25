export type ThemeMode = "light" | "dark";
export type ThemeStyles = Record<ThemeMode, Record<string, string>>;

export type RuntimeTheme = {
  id: string;
  styles: ThemeStyles;
  updatedAt?: string;
};

export const RUNTIME_THEME_STORAGE_KEY = "runtime-theme:client";
export const IS_RUNTIME_THEME_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_RUNTIME_THEME !== "false";

export const RUNTIME_THEME_STYLE_KEYS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "font-sans",
  "font-serif",
  "font-mono",
  "radius",
  "shadow-color",
  "shadow-opacity",
  "shadow-blur",
  "shadow-spread",
  "shadow-offset-x",
  "shadow-offset-y",
  "letter-spacing",
  "spacing",
] as const;

export function generateRuntimeThemeCss(styles: ThemeStyles) {
  const block = (selector: string, mode: ThemeMode) => {
    const vars = Object.entries(styles[mode])
      .map(([key, value]) => `  --${key}: ${value};`)
      .join("\n");

    return `${selector} {\n${vars}\n}`;
  };

  return `${block(":root", "light")}\n${block(".dark", "dark")}`;
}

export async function getRuntimeThemeServer(): Promise<RuntimeTheme | null> {
  if (!IS_RUNTIME_THEME_ENABLED) return null;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/themes/runtime/current?target=client`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) return null;
    return (await response.json()) as RuntimeTheme | null;
  } catch {
    return null;
  }
}
