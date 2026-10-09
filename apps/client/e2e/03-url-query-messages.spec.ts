import { test, expect } from "@playwright/test";

test.describe("Auth - URL Query Notification Banners & Toasts", () => {
  test("should display session expired alert banner when code=session_expired", async ({
    page,
  }) => {
    await page.goto("/en/auth/login?code=session_expired");

    const alertBanner = page.locator('[role="alert"], .border-destructive');
    await expect(alertBanner.first()).toBeVisible();
  });

  test("should display invalid token alert banner when code=invalid_token", async ({
    page,
  }) => {
    await page.goto("/en/auth/login?code=invalid_token");

    const alertBanner = page.locator('[role="alert"], .border-destructive');
    await expect(alertBanner.first()).toBeVisible();
  });

  test("should trigger success toast on verification=success", async ({
    page,
  }) => {
    await page.goto("/en/auth/login?verification=success");

    const toast = page.locator('[data-sonner-toast][data-type="success"]');
    await expect(toast.first()).toBeVisible();
  });

  test("should trigger error toast on verification=failed", async ({
    page,
  }) => {
    await page.goto("/en/auth/login?verification=failed");

    const toast = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(toast.first()).toBeVisible();
  });

  test("should trigger success toast on reset=success", async ({ page }) => {
    await page.goto("/en/auth/login?reset=success");

    const toast = page.locator('[data-sonner-toast][data-type="success"]');
    await expect(toast.first()).toBeVisible();
  });

  test("should trigger error toast on social=failed", async ({ page }) => {
    await page.goto("/en/auth/login?social=failed");

    const toast = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(toast.first()).toBeVisible();
  });

  test("should clean up query parameters after displaying toast notification", async ({
    page,
  }) => {
    await page.goto("/en/auth/login?verification=success");

    // Wait for clean URL
    await page.waitForFunction(
      () => !window.location.search.includes("verification=success")
    );
    expect(page.url()).not.toContain("verification=success");
  });
});
