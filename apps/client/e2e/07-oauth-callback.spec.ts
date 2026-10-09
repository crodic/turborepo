import { test, expect } from "@playwright/test";
import {
  createMockToken,
  MOCK_USER,
  mockUserProfileApi,
} from "./helpers/auth-mock";

test.describe("Auth - OAuth & Social Callback Scenarios", () => {
  test("should complete exchange, set cookies, and redirect to /profile on valid token", async ({
    page,
    context,
  }) => {
    const accessToken = createMockToken();
    const refreshToken = createMockToken({
      exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    });

    // Mock exchange endpoint
    await page.route("**/api/v1/user/auth/social/exchange", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken,
          refreshToken,
          user: MOCK_USER,
        }),
      });
    });

    await mockUserProfileApi(page);

    await page.goto("/en/auth/oauth/callback?token=mock_valid_oauth_ticket");

    // Should redirect to /profile
    await page.waitForURL("**/profile");
    expect(page.url()).toContain("/profile");

    // Check cookies
    const cookies = await context.cookies();
    const accessTokenCookie = cookies.find((c) => c.name === "accessToken");
    expect(accessTokenCookie).toBeDefined();
    expect(accessTokenCookie?.httpOnly).toBe(true);
  });

  test("should redirect to /auth/login?social=failed when token parameter is missing", async ({
    page,
  }) => {
    await page.goto("/en/auth/oauth/callback");

    await page.waitForURL("**/auth/login?social=failed");
    expect(page.url()).toContain("social=failed");
  });

  test("should handle backend exchange failure and redirect to /auth/login?social=failed", async ({
    page,
  }) => {
    await page.route("**/api/v1/user/auth/social/exchange", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "Invalid social ticket" }),
      });
    });

    await page.goto("/en/auth/oauth/callback?token=invalid_ticket");

    await page.waitForURL("**/auth/login?social=failed");
    expect(page.url()).toContain("social=failed");
  });
});
