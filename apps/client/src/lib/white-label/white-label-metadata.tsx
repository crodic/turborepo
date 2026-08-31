"use client";

import { useEffect } from "react";
import { isWhiteLabelEnabled } from "./white-label.config";
import type { ActiveClientWhiteLabel } from "./white-label.types";

export function WhiteLabelMetadata({
  whiteLabel,
}: {
  whiteLabel?: ActiveClientWhiteLabel | null;
}) {
  useEffect(() => {
    if (!isWhiteLabelEnabled || !whiteLabel) return;

    // 1. Dynamic Favicon
    if (whiteLabel.siteFavicon) {
      let faviconLink =
        document.querySelector<HTMLLinkElement>("link[rel*='icon']");
      if (!faviconLink) {
        faviconLink = document.createElement("link");
        faviconLink.rel = "icon";
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = whiteLabel.siteFavicon;
    }

    // 2. Dynamic Title (if provided)
    const title =
      whiteLabel.siteTitle || whiteLabel.metaTitle || whiteLabel.brandName;
    if (title) {
      document.title = title;
    }
  }, [whiteLabel]);

  return null;
}
