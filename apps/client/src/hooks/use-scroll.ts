"use client";
import { useSyncExternalStore } from "react";

export function useScroll(threshold: number) {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener("scroll", callback, { passive: true });
      return () => window.removeEventListener("scroll", callback);
    },
    () => window.scrollY > threshold,
    () => false
  );
}
