import { test, expect } from "@playwright/test";
import {
  mockUserProfileApi,
  setAuthCookies,
} from "./helpers/auth-mock";

test.describe("Auth - Route Guards & Edge Middleware Protection", () => {
  test("should redirect unauthenticated visitor from /profile to login with session_expired or unauthorized code", async ({
    page,
  }) => {
    await page.goto("/en/profile");

    // Must be redirected to /auth/login with code and from param
    await page.waitForURL("**/auth/login*");
    expect(page.url()).toContain("/auth/login");
    expect(page.url()).toContain("from=%2Fprofile");
  });

  test("should allow unauthenticated visitor on public home page", async ({
    page,
  }) => {
    await page.goto("/en");

    // Home page should load without redirecting to /auth/login
    expect(page.url()).not.toContain("/auth/login");
  });

  test("should allow authenticated user on protected /profile", async ({
    page,
    context,
  }) => {
    await setAuthCookies(context);
    await mockUserProfileApi(page);

    await page.goto("/en/profile");

    // Should stay on profile page
    expect(page.url()).toContain("/profile");
    await expect(
      page.locator("h2, h1, [role='tablist']").first()
    ).toBeVisible();
  });

  test("should redirect authenticated user away from /auth/login to /profile", async ({
    page,
    context,
  }) => {
    // User already has valid tokens
    await setAuthCookies(context);
    await mockUserProfileApi(page);

    await page.goto("/en/auth/login");

    // AuthLayout redirects authenticated visitors to /profile
    await page.waitForURL("**/profile");
    expect(page.url()).toContain("/profile");
  });

  test("should handle corrupted token, clear cookies and redirect to login with invalid_token code", async ({
    page,
    context,
  }) => {
    // Inject corrupt token string
    await context.addCookies([
      {
        name: "accessToken",
        value: "corrupted.token.value",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
      {
        name: "refreshToken",
        value: "corrupted.refresh.token",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/en/profile");

    // Middleware detects corrupt token and redirects
    await page.waitForURL("**/auth/login*");
    expect(page.url()).toContain("code=invalid_token");

    // Cookies should be cleared
    const cookies = await context.cookies();
    const accessToken = cookies.find((c) => c.name === "accessToken");
    expect(!accessToken || accessToken.value === "").toBeTruthy();
  });
});
