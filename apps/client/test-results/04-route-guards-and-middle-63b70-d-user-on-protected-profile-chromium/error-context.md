# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-route-guards-and-middleware.spec.ts >> Auth - Route Guards & Edge Middleware Protection >> should allow authenticated user on protected /profile
- Location: e2e/04-route-guards-and-middleware.spec.ts:29:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h2, h1, [role=\'tablist\']').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('h2, h1, [role=\'tablist\']').first() with timeout 5000ms
  - waiting for locator('h2, h1, [role=\'tablist\']').first()

```

```yaml
- button "Open Tanstack query devtools":
    - img
- region "Notifications alt+T"
- banner:
    - navigation:
        - link "Visel Art":
            - /url: /
        - navigation "Main":
            - list:
                - listitem:
                    - button "Features"
                - listitem:
                    - button "Platform"
                - listitem:
                    - link "Tech Stack":
                        - /url: /#tech-stack
                - listitem:
                    - link "Profile":
                        - /url: /profile
        - combobox:
            - img "en"
            - text: English
- main
- contentinfo:
    - link "Visel Art":
        - /url: /
    - paragraph: Enterprise-ready full-stack monorepo boilerplate crafted with clean architecture, strict type safety, and modern developer experience.
    - link "GitHub":
        - /url: https://github.com
    - link "Twitter":
        - /url: https://twitter.com
    - link "Turborepo":
        - /url: https://turborepo.org
    - heading "Product" [level=3]
    - list:
        - listitem:
            - link "Features":
                - /url: /#features
        - listitem:
            - link "Tech Stack":
                - /url: /#tech-stack
        - listitem:
            - link "User Profile":
                - /url: /profile
        - listitem:
            - link "Authentication":
                - /url: /auth/login
    - heading "Resources" [level=3]
    - list:
        - listitem:
            - link "Documentation":
                - /url: https://turbo.build/repo/docs
        - listitem:
            - link "GitHub":
                - /url: https://github.com
        - listitem:
            - link "Swagger API":
                - /url: http://localhost:8001/api/docs
        - listitem:
            - link "Next.js 15":
                - /url: https://nextjs.org/docs
    - heading "Legal" [level=3]
    - list:
        - listitem:
            - link "Privacy Policy":
                - /url: /pages/privacy-policy
        - listitem:
            - link "Terms of Service":
                - /url: /pages/terms-of-service
    - paragraph: © 2026 Visel Art. All rights reserved.
    - text: All systems operational
- alert
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import {
  3  |   createMockToken,
  4  |   mockUserProfileApi,
  5  |   setAuthCookies,
  6  | } from "./helpers/auth-mock";
  7  |
  8  | test.describe("Auth - Route Guards & Edge Middleware Protection", () => {
  9  |   test("should redirect unauthenticated visitor from /profile to login with session_expired or unauthorized code", async ({
  10 |     page,
  11 |   }) => {
  12 |     await page.goto("/en/profile");
  13 |
  14 |     // Must be redirected to /auth/login with code and from param
  15 |     await page.waitForURL("**/auth/login*");
  16 |     expect(page.url()).toContain("/auth/login");
  17 |     expect(page.url()).toContain("from=%2Fprofile");
  18 |   });
  19 |
  20 |   test("should allow unauthenticated visitor on public home page", async ({
  21 |     page,
  22 |   }) => {
  23 |     await page.goto("/en");
  24 |
  25 |     // Home page should load without redirecting to /auth/login
  26 |     expect(page.url()).not.toContain("/auth/login");
  27 |   });
  28 |
  29 |   test("should allow authenticated user on protected /profile", async ({
  30 |     page,
  31 |     context,
  32 |   }) => {
  33 |     await setAuthCookies(context);
  34 |     await mockUserProfileApi(page);
  35 |
  36 |     await page.goto("/en/profile");
  37 |
  38 |     // Should stay on profile page
  39 |     expect(page.url()).toContain("/profile");
> 40 |     await expect(page.locator("h2, h1, [role='tablist']").first()).toBeVisible();
     |                                                                    ^ Error: expect(locator).toBeVisible() failed
  41 |   });
  42 |
  43 |   test("should redirect authenticated user away from /auth/login to /profile", async ({
  44 |     page,
  45 |     context,
  46 |   }) => {
  47 |     // User already has valid tokens
  48 |     await setAuthCookies(context);
  49 |     await mockUserProfileApi(page);
  50 |
  51 |     await page.goto("/en/auth/login");
  52 |
  53 |     // AuthLayout redirects authenticated visitors to /profile
  54 |     await page.waitForURL("**/profile");
  55 |     expect(page.url()).toContain("/profile");
  56 |   });
  57 |
  58 |   test("should handle corrupted token, clear cookies and redirect to login with invalid_token code", async ({
  59 |     page,
  60 |     context,
  61 |   }) => {
  62 |     // Inject corrupt token string
  63 |     await context.addCookies([
  64 |       {
  65 |         name: "accessToken",
  66 |         value: "corrupted.token.value",
  67 |         domain: "localhost",
  68 |         path: "/",
  69 |         httpOnly: true,
  70 |         secure: false,
  71 |         sameSite: "Lax",
  72 |       },
  73 |       {
  74 |         name: "refreshToken",
  75 |         value: "corrupted.refresh.token",
  76 |         domain: "localhost",
  77 |         path: "/",
  78 |         httpOnly: true,
  79 |         secure: false,
  80 |         sameSite: "Lax",
  81 |       },
  82 |     ]);
  83 |
  84 |     await page.goto("/en/profile");
  85 |
  86 |     // Middleware detects corrupt token and redirects
  87 |     await page.waitForURL("**/auth/login*");
  88 |     expect(page.url()).toContain("code=invalid_token");
  89 |
  90 |     // Cookies should be cleared
  91 |     const cookies = await context.cookies();
  92 |     const accessToken = cookies.find((c) => c.name === "accessToken");
  93 |     expect(!accessToken || accessToken.value === "").toBeTruthy();
  94 |   });
  95 | });
  96 |
```
