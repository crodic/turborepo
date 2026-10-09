import { test, expect } from "@playwright/test";
import {
  mockLogoutApi,
  mockUserProfileApi,
  setAuthCookies,
} from "./helpers/auth-mock";

test.describe("Auth - Sign Out & Session Revocation Scenarios", () => {
  test("signing out clears cookies and redirects to /auth/login", async ({
    page,
    context,
  }) => {
    await setAuthCookies(context);
    await mockUserProfileApi(page);
    await mockLogoutApi(page);

    await page.goto("/en/profile");
    await expect(
      page.locator("h2, h1, [role='tablist']").first()
    ).toBeVisible();

    // Trigger logout via BFF route
    await page.evaluate(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/en/auth/login";
    });

    await page.waitForURL("**/auth/login*");
    expect(page.url()).toContain("/auth/login");

    // Cookies must be cleared
    const cookies = await context.cookies();
    const accessToken = cookies.find((c) => c.name === "accessToken");
    const refreshToken = cookies.find((c) => c.name === "refreshToken");

    expect(!accessToken || accessToken.value === "").toBeTruthy();
    expect(!refreshToken || refreshToken.value === "").toBeTruthy();

    // Trying to navigate back to profile should be redirected to login
    await page.goto("/en/profile");
    await page.waitForURL("**/auth/login*");
    expect(page.url()).toContain("/auth/login");
  });

  test("BFF logout route revokes session on backend and responds with success", async ({
    request,
    context,
  }) => {
    await setAuthCookies(context);

    const response = await request.post("/api/auth/logout");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.message).toBe("Success");
  });
});
