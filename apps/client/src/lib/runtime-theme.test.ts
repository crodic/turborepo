import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const originalEnv = process.env;

async function importRuntimeTheme() {
  vi.resetModules();
  return import("./runtime-theme");
}

function resetThemeEnv() {
  process.env = { ...originalEnv };
  delete process.env.NEXT_PUBLIC_ENABLE_THEME_FEATURE;
  delete process.env.VITE_ENABLE_THEME_FEATURE;
  delete process.env.NEXT_PUBLIC_ENABLE_RUNTIME_THEME;
  delete process.env.NEXT_PUBLIC_API_URL;
}

describe("getRuntimeThemeServer", () => {
  beforeEach(() => {
    resetThemeEnv();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("does not call runtime theme API when global theme feature is off", async () => {
    process.env.VITE_ENABLE_THEME_FEATURE = "false";
    process.env.NEXT_PUBLIC_ENABLE_RUNTIME_THEME = "true";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { getRuntimeThemeServer } = await importRuntimeTheme();

    await expect(getRuntimeThemeServer()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not call runtime theme API when client runtime theme is off", async () => {
    process.env.NEXT_PUBLIC_ENABLE_THEME_FEATURE = "true";
    process.env.NEXT_PUBLIC_ENABLE_RUNTIME_THEME = "false";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { getRuntimeThemeServer } = await importRuntimeTheme();

    await expect(getRuntimeThemeServer()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls runtime theme API when both flags are enabled", async () => {
    process.env.NEXT_PUBLIC_ENABLE_THEME_FEATURE = "true";
    process.env.NEXT_PUBLIC_ENABLE_RUNTIME_THEME = "true";
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    const { getRuntimeThemeServer } = await importRuntimeTheme();

    await expect(getRuntimeThemeServer()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/themes/runtime/current?target=client",
      { cache: "no-store" }
    );
  });
});
