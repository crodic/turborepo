"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import React, { useSyncExternalStore } from "react";
import { DEFAULT_BRAND_NAME } from "./white-label.config";
import { useWhiteLabel } from "./white-label-provider";

type WhiteLabelLogoProps = {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
  fallback?: React.ReactNode;
};

const emptySubscribe = () => () => {};

export function WhiteLabelLogo({
  className,
  width = 140,
  height = 36,
  alt,
  fallback,
}: WhiteLabelLogoProps) {
  const { whiteLabel, isEnabled } = useWhiteLabel();
  const { theme, resolvedTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isEnabled || !whiteLabel) {
    return (
      <>{fallback ?? <span className="font-bold">{DEFAULT_BRAND_NAME}</span>}</>
    );
  }

  const isDark = isMounted && (resolvedTheme === "dark" || theme === "dark");
  const logoSrc = (isDark && whiteLabel.siteDarkLogo) || whiteLabel.siteLogo;
  const brandName = whiteLabel.brandName || DEFAULT_BRAND_NAME;

  if (!logoSrc) {
    return <>{fallback ?? <span className="font-bold">{brandName}</span>}</>;
  }

  return (
    <Image
      src={logoSrc}
      alt={alt || brandName}
      width={width}
      height={height}
      className={className || "h-8 w-auto object-contain"}
      priority
      unoptimized={logoSrc.startsWith("http")}
    />
  );
}
