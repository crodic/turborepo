import { test, expect } from "@playwright/test";
import {
  mockLoginApiFailure,
  mockLoginApiSuccess,
  mockUserProfileApi,
} from "./helpers/auth-mock";

test.describe("Auth - Login API Response Scenarios", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/auth/login");
  });

  test("should handle 401 Unauthorized (Invalid credentials) gracefully", async ({
    page,
  }) => {
    await mockLoginApiFailure(page, 401, "Invalid email or password");

    await page.fill('input[name="email"]', "wrong@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should display error toast or message
    await expect(
      page
        .locator('[data-sonner-toast][data-type="error"], .text-destructive')
        .first()
    ).toBeVisible();

    // Should remain on the login page
    expect(page.url()).toContain("/auth/login");
  });

  test("should handle 403 Forbidden (Inactive/unverified account)", async ({
    page,
  }) => {
    await mockLoginApiFailure(page, 403, "Account not verified or inactive");

    await page.fill('input[name="email"]', "unverified@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    await expect(
      page
        .locator('[data-sonner-toast][data-type="error"], .text-destructive')
        .first()
    ).toBeVisible();
    expect(page.url()).toContain("/auth/login");
  });

  test("should handle 429 Too Many Requests (Rate limit throttled)", async ({
    page,
  }) => {
    await mockLoginApiFailure(
      page,
      429,
      "Too many attempts from your IP. Please wait 1 minute."
    );

    await page.fill('input[name="email"]', "spammer@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    await expect(
      page
        .locator('[data-sonner-toast][data-type="error"], .text-destructive')
        .first()
    ).toBeVisible();
    expect(page.url()).toContain("/auth/login");
  });

  test("should handle 500 Server Error without crashing the page", async ({
    page,
  }) => {
    await mockLoginApiFailure(page, 500, "Internal server error occurred");

    await page.fill('input[name="email"]', "crash@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    await expect(
      page
        .locator('[data-sonner-toast][data-type="error"], .text-destructive')
        .first()
    ).toBeVisible();
    expect(page.url()).toContain("/auth/login");
  });

  test("should handle network failure gracefully", async ({ page }) => {
    await page.route("**/api/v1/user/auth/login", (route) => route.abort());

    await page.fill('input[name="email"]', "network@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    await expect(
      page.locator('[data-sonner-toast][data-type="error"]').first()
    ).toBeVisible();
    expect(page.url()).toContain("/auth/login");
  });

  test("should succeed, set auth cookies, and redirect to /profile", async ({
    page,
    context,
  }) => {
    await mockLoginApiSuccess(page);
    await mockUserProfileApi(page);

    await page.fill('input[name="email"]', "test.user@example.com");
    await page.fill('input[name="password"]', "CorrectPassword123!");
    await page.click('button[type="submit"]');

    // Should redirect to profile page
    await page.waitForURL("**/profile");
    expect(page.url()).toContain("/profile");

    // Verify cookies are set in browser
    const cookies = await context.cookies();
    const accessTokenCookie = cookies.find((c) => c.name === "accessToken");
    const refreshTokenCookie = cookies.find((c) => c.name === "refreshToken");

    expect(accessTokenCookie).toBeDefined();
    expect(refreshTokenCookie).toBeDefined();
    expect(accessTokenCookie?.httpOnly).toBe(true);
    expect(refreshTokenCookie?.httpOnly).toBe(true);
  });

  test("should respect 'from' query parameter and redirect to intended destination", async ({
    page,
  }) => {
    await page.goto("/en/auth/login?from=%2Fexample");
    await mockLoginApiSuccess(page);

    await page.fill('input[name="email"]', "test.user@example.com");
    await page.fill('input[name="password"]', "CorrectPassword123!");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/example");
    expect(page.url()).toContain("/example");
  });
});
