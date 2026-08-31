import { useQuery } from "@tanstack/react-query";
import {
  CLIENT_THEME_CACHE_VERSION,
  CLIENT_THEME_VERSION_STORAGE_KEY,
  CLIENT_WHITE_LABEL_STORAGE_KEY,
  isWhiteLabelEnabled,
} from "./white-label.config";
import type { ActiveClientWhiteLabel } from "./white-label.types";

export const CLIENT_WHITE_LABEL_QUERY_KEY = [
  "active-white-label",
  "client",
] as const;

export function ensureClientThemeCacheVersion() {
  if (typeof window === "undefined") return;
  try {
    const currentVersion = localStorage.getItem(
      CLIENT_THEME_VERSION_STORAGE_KEY
    );
    if (currentVersion !== CLIENT_THEME_CACHE_VERSION) {
      localStorage.removeItem(CLIENT_WHITE_LABEL_STORAGE_KEY);
      localStorage.setItem(
        CLIENT_THEME_VERSION_STORAGE_KEY,
        CLIENT_THEME_CACHE_VERSION
      );
    }
  } catch {
    // Ignore localStorage access errors gracefully
  }
}

export function getCachedClientWhiteLabel(): ActiveClientWhiteLabel | null {
  if (typeof window === "undefined" || !isWhiteLabelEnabled) return null;
  ensureClientThemeCacheVersion();
  try {
    const raw = localStorage.getItem(CLIENT_WHITE_LABEL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveClientWhiteLabel) : null;
  } catch {
    return null;
  }
}

export function setCachedClientWhiteLabel(data: ActiveClientWhiteLabel | null) {
  if (typeof window === "undefined" || !isWhiteLabelEnabled) return;
  try {
    if (!data) {
      localStorage.removeItem(CLIENT_WHITE_LABEL_STORAGE_KEY);
    } else {
      localStorage.setItem(
        CLIENT_WHITE_LABEL_STORAGE_KEY,
        JSON.stringify(data)
      );
      localStorage.setItem(
        CLIENT_THEME_VERSION_STORAGE_KEY,
        CLIENT_THEME_CACHE_VERSION
      );
    }
  } catch {
    // Ignore localStorage quota errors
  }
}

export async function fetchActiveClientWhiteLabel(): Promise<ActiveClientWhiteLabel | null> {
  if (!isWhiteLabelEnabled) return null;

  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.SERVER_API_URL ||
      "http://localhost:8000";

    const response = await fetch(
      `${apiUrl}/api/v1/white-labels/active?target=client`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as ActiveClientWhiteLabel | null;
    if (data && typeof window !== "undefined") {
      setCachedClientWhiteLabel(data);
    }
    return data;
  } catch {
    return null;
  }
}

export function useActiveClientWhiteLabel(
  initialData?: ActiveClientWhiteLabel | null
) {
  return useQuery({
    queryKey: CLIENT_WHITE_LABEL_QUERY_KEY,
    queryFn: fetchActiveClientWhiteLabel,
    initialData: initialData ?? getCachedClientWhiteLabel,
    enabled: isWhiteLabelEnabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
