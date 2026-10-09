import { test, expect } from "@playwright/test";
import {
  createMockToken,
  mockRefreshApiFailure,
  mockRefreshApiSuccess,
  mockUserProfileApi,
  setAuthCookies,
} from "./helpers/auth-mock";

test.describe("Auth - Zero-Trust BFF Token Refresh Scenarios", () => {
  test("zero-trust check: GET /api/auth/tokens MUST NOT expose refreshToken", async ({
    request,
    context,
  }) => {
    await setAuthCookies(context);

    // Call the internal tokens endpoint
    const response = await request.get("/api/auth/tokens");
    expect(response.status()).toBe(200);

    const data = await response.json();

    // accessToken should be present
    expect(data.accessToken).toBeDefined();

    // CRITICAL: refreshToken MUST NOT be exposed to client JS
    expect(data.refreshToken).toBeUndefined();
  });

  test("proactive refresh: middleware refreshes expiring access token seamlessly", async ({
    page,
    context,
  }) => {
    // Access token expiring in 10 seconds (less than 1 minute threshold)
    const expiringSoonAccessToken = createMockToken({
      exp: Math.floor(Date.now() / 1000) + 10,
    });
    const validRefreshToken = createMockToken({
      exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    });

    await setAuthCookies(context, {
      accessToken: expiringSoonAccessToken,
      refreshToken: validRefreshToken,
    });

    const refreshedAccessToken = createMockToken({
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const refreshedRefreshToken = createMockToken({
      exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    });

    await mockRefreshApiSuccess(page, {
      accessToken: refreshedAccessToken,
      refreshToken: refreshedRefreshToken,
    });
    await mockUserProfileApi(page);

    // Navigate to protected profile
    await page.goto("/en/profile");

    // Page should load successfully without being logged out
    expect(page.url()).toContain("/profile");

    // Cookies should have been updated with refreshed tokens
    const cookies = await context.cookies();
    const currentAccessToken = cookies.find((c) => c.name === "accessToken");
    expect(currentAccessToken?.value).toBe(refreshedAccessToken);
  });

  test("revoked refresh token: BFF refresh failure clears cookies and redirects to login", async ({
    page,
    context,
    request,
  }) => {
    // Inject valid format but revoked tokens
    await setAuthCookies(context);

    // Mock backend refresh failing with 401
    await mockRefreshApiFailure(page, 401);

    // Directly call the BFF refresh route
    const refreshRes = await request.post("/api/auth/refresh");
    expect(refreshRes.status()).toBe(401);

    // Next navigation to profile should be redirected to login
    await page.goto("/en/profile");
    await page.waitForURL("**/auth/login*");
    expect(page.url()).toContain("/auth/login");
  });

  test("transient backend 500 error during refresh preserves user cookies", async ({
    page,
    context,
  }) => {
    // Access token expiring soon
    const expiringSoonAccessToken = createMockToken({
      exp: Math.floor(Date.now() / 1000) + 10,
    });
    const validRefreshToken = createMockToken({
      exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    });

    await setAuthCookies(context, {
      accessToken: expiringSoonAccessToken,
      refreshToken: validRefreshToken,
    });

    // Backend temporarily returns 500
    await mockRefreshApiFailure(page, 500);
    await mockUserProfileApi(page);

    await page.goto("/en/profile");

    // Transient failure must NOT wipe cookies
    const cookies = await context.cookies();
    const refreshToken = cookies.find((c) => c.name === "refreshToken");
    expect(refreshToken?.value).toBe(validRefreshToken);
  });
});
