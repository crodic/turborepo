import { BrowserContext, Page } from "@playwright/test";

export const MOCK_USER = {
  id: 1,
  email: "test.user@example.com",
  firstName: "Test",
  lastName: "User",
  fullName: "Test User",
  role: "USER",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
};

/**
 * Creates a valid base64url-encoded JWT token that satisfies jose.decodeJwt.
 */
export function createMockToken(payload: Record<string, any> = {}): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");

  const defaultPayload = {
    id: 1,
    email: "test.user@example.com",
    role: "USER",
    sessionId: 10,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour valid
    ...payload,
  };

  const body = Buffer.from(JSON.stringify(defaultPayload)).toString(
    "base64url"
  );
  return `${header}.${body}.mock_signature`;
}

/**
 * Helper to inject authentication cookies directly into the Playwright BrowserContext.
 */
export async function setAuthCookies(
  context: BrowserContext,
  tokens?: { accessToken?: string; refreshToken?: string }
) {
  const accessToken = tokens?.accessToken ?? createMockToken();
  const refreshToken =
    tokens?.refreshToken ??
    createMockToken({ exp: Math.floor(Date.now() / 1000) + 86400 * 7 });

  await context.addCookies([
    {
      name: "accessToken",
      value: accessToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "refreshToken",
      value: refreshToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

/**
 * Mocks successful user login response from the backend API.
 */
export async function mockLoginApiSuccess(
  page: Page,
  tokens?: { accessToken?: string; refreshToken?: string }
) {
  const accessToken = tokens?.accessToken ?? createMockToken();
  const refreshToken =
    tokens?.refreshToken ??
    createMockToken({ exp: Math.floor(Date.now() / 1000) + 86400 * 7 });

  await page.route("**/api/v1/user/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken,
        refreshToken,
        tokenExpires: Date.now() + 3600 * 1000,
        user: MOCK_USER,
      }),
    });
  });
}

/**
 * Mocks failed user login response from the backend API.
 */
export async function mockLoginApiFailure(
  page: Page,
  status = 401,
  message = "Invalid email or password"
) {
  await page.route("**/api/v1/user/auth/login", async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({
        statusCode: status,
        message,
      }),
    });
  });
}

/**
 * Mocks user profile endpoint.
 */
export async function mockUserProfileApi(page: Page, user = MOCK_USER) {
  await page.route("**/api/v1/user/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(user),
    });
  });
}

/**
 * Mocks user logout endpoint on the backend.
 */
export async function mockLogoutApi(page: Page) {
  await page.route("**/api/v1/user/auth/logout", async (route) => {
    await route.fulfill({
      status: 204,
      body: "",
    });
  });
}

/**
 * Mocks backend token refresh endpoint.
 */
export async function mockRefreshApiSuccess(
  page: Page,
  tokens?: { accessToken?: string; refreshToken?: string }
) {
  const accessToken = tokens?.accessToken ?? createMockToken();
  const refreshToken =
    tokens?.refreshToken ??
    createMockToken({ exp: Math.floor(Date.now() / 1000) + 86400 * 7 });

  await page.route("**/api/v1/user/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken,
        refreshToken,
        tokenExpires: Date.now() + 3600 * 1000,
      }),
    });
  });
}

export async function mockRefreshApiFailure(page: Page, status = 401) {
  await page.route("**/api/v1/user/auth/refresh", async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({
        statusCode: status,
        message: "Refresh token revoked or invalid",
      }),
    });
  });
}
