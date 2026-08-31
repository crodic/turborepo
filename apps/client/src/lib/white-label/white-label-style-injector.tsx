"use client";

import { useEffect } from "react";
import { isWhiteLabelEnabled } from "./white-label.config";
import type { WhiteLabelStyles } from "./white-label.types";
import {
  generateWhiteLabelCss,
  getGoogleFontHref,
  WHITE_LABEL_STYLE_TAG_ID,
} from "./white-label-utils";

function loadGoogleFont(fontFamily?: string) {
  const href = getGoogleFontHref(fontFamily);
  if (!href) return;

  if (document.querySelector(`link[href="${href}"]`)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export function WhiteLabelStyleInjector({
  styles,
}: {
  styles?: WhiteLabelStyles;
}) {
  useEffect(() => {
    if (!isWhiteLabelEnabled || !styles) {
      const existingStyle = document.getElementById(WHITE_LABEL_STYLE_TAG_ID);
      if (existingStyle) {
        existingStyle.remove();
      }
      return;
    }

    // 1. Load any custom Google fonts dynamically on client
    ["font-sans", "font-serif", "font-mono"].forEach((fontKey) => {
      loadGoogleFont(styles.light?.[fontKey]);
      loadGoogleFont(styles.dark?.[fontKey]);
    });

    // 2. Inject or update CSS variables style tag
    const css = generateWhiteLabelCss(styles);
    let styleTag = document.getElementById(
      WHITE_LABEL_STYLE_TAG_ID
    ) as HTMLStyleElement | null;

    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = WHITE_LABEL_STYLE_TAG_ID;
      document.head.appendChild(styleTag);
    }

    if (styleTag.textContent !== css) {
      styleTag.textContent = css;
    }
  }, [styles]);

  return null;
}
