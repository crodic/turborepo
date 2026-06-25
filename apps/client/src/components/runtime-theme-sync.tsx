"use client";

import { useEffect } from "react";
import {
  IS_RUNTIME_THEME_ENABLED,
  RUNTIME_THEME_STORAGE_KEY,
  RUNTIME_THEME_STYLE_KEYS,
  type RuntimeTheme,
} from "@/lib/runtime-theme";

function applyRuntimeTheme(theme: RuntimeTheme | null) {
  if (!theme?.styles) return;

  const root = document.documentElement;
  const mode = root.classList.contains("dark") ? "dark" : "light";
  const styles = theme.styles[mode];

  Object.entries(styles).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
}

function clearRuntimeTheme() {
  const root = document.documentElement;

  RUNTIME_THEME_STYLE_KEYS.forEach((key) => {
    root.style.removeProperty(`--${key}`);
  });
}

export function RuntimeThemeSync({
  initialTheme,
}: {
  initialTheme: RuntimeTheme | null;
}) {
  useEffect(() => {
    if (!IS_RUNTIME_THEME_ENABLED) {
      localStorage.removeItem(RUNTIME_THEME_STORAGE_KEY);
      clearRuntimeTheme();
      return;
    }

    if (initialTheme) {
      localStorage.setItem(
        RUNTIME_THEME_STORAGE_KEY,
        JSON.stringify(initialTheme)
      );
      applyRuntimeTheme(initialTheme);
    }

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/themes/runtime/current?target=client`
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((theme: RuntimeTheme | null) => {
        if (theme) {
          localStorage.setItem(
            RUNTIME_THEME_STORAGE_KEY,
            JSON.stringify(theme)
          );
          applyRuntimeTheme(theme);
        } else {
          localStorage.removeItem(RUNTIME_THEME_STORAGE_KEY);
          clearRuntimeTheme();
        }
      })
      .catch(() => undefined);
  }, [initialTheme]);

  return null;
}
